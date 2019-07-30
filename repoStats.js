const { execSync } = require('child_process');
const fs = require('fs-extra');
const glob = require('glob');
const { getLocalRepoStats } = require('./getLocalRepoStats');
const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient();

const repos = [
  {
    "git": "https://github.com/RedHatInsights/frontend-components",
    "name": "Insights-Library"
  },
  {
    "git": "https://github.com/RedHatInsights/drift-frontend",
    "name": "Insights-Frontend"
  },
  {
    "git": "https://github.com/openshift/console",
    "name": "OpenShift-Console"
  },
  {
    "git": "https://github.com/integr8ly/tutorial-web-app",
    "name": "Integreatly"
  },
  {
    "git": "https://github.com/project-koku/koku-ui",
    "name": "Cost-Management"
  },
  {
    "git": "git@github.com:ansible/awx-pf.git",
    "name": "Ansible",
    "private": true,
  },
  {
    "git": "https://gitlab.com/cloudigrade/frontigrade",
    "name": "Cloud-Meter"
  },
  {
    "git": "https://github.com/weldr/cockpit-composer",
    "name": "Cockpit-Composer"
  },
  {
    "git": "https://github.com/cockpit-project/cockpit",
    "name": "Cockpit"
  },
  {
    "git": "https://github.com/fusor/mig-ui",
    "name": "OpenShift-Migration-Tool"
  },
  {
    "git": "https://github.com/hawtio/hawtio-core",
    "name": "Fuse-Admin-Console"
  },
  {
    "git": "https://github.com/syndesisio/syndesis",
    "name": "Fuse-Online"
  },
  // https://docs.google.com/presentation/d/1nhOx4SheKFKRejtg7yHbANboeBywL7KCSvkc74UegzA
  {
    "git": "https://github.com/EnMasseProject/enmasse",
    "name": "AMQ-Everything-Else"
  },
  {
    "git": "https://github.com/strimzi-incubator/strimzi-kafka-console",
    "name": "AMQ-Streams"
  },
  {
    "git": "https://github.com/apache/qpid-dispatch",
    "name": "AMQ-Interconnect"
  },
  {
    "git": "https://github.com/3scale/porta",
    "name": "3Scale"
  },
  {
    "git": "https://github.com/Apicurio/apicurio-studio",
    "name": "Apicurito"
  },
  {
    "git": "https://github.com/kubevirt/web-ui",
    "name": "OpenShift-Cluster-Console-UI"
  },
  {
    "git": "https://github.com/kiali/kiali-ui",
    "name": "Kiali-App"
  },
  {
    "git": "https://github.com/aerogear/mobile-developer-console",
    "name": "Mobile-Dev-Console"
  },
];

if (!fs.existsSync('stats')) {
  fs.mkdirSync('stats');
}

require('yargs')
  .scriptName('repoStats')
  .usage('$0 ...flags')
  .command('collect', 'save stats locally', yargs => {
    yargs.option('p', {
      type: 'boolean',
      default: 'false',
      describe: 'whether to clone private repos'
    })
  }, argv => {
    const date = new Date().toISOString();
    const dir = `stats/${date.substr(0, 10)}`;
    fs.removeSync('./tmp');
    repos
      .filter(repo => argv.p || !repo.private) // Only public repos unless flag passed
      .forEach(repo => {
        const repoName = repo.git.split('/').pop();
        const tmpPath = `./tmp/${repoName}`;
        execSync(`git clone "${repo.git}" "${tmpPath}" --depth 1`);
        const results = getLocalRepoStats(`./tmp/${repoName}`);
        results.repo = repo.git;
        results.name = repo.name || repoName;
        results.date = date;

        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir);
        }
        fs.writeFileSync(`${dir}/${repo.name}.json`, JSON.stringify(results, null, 2));
      });
    console.log(`Collected stats for ${date} under ${dir}`);
  })
  .command('upload [folder]', 'upload stats to DynamoDB', yargs => {
    yargs.positional('folder', {
      type: 'string',
      describe: 'folder of stats to upload'
    })
  }, argv => {
    if (!argv.folder)
      throw new Error('Must specify folder under ./stats to upload');

    glob.sync(`./stats/${argv.folder}/*.json`).forEach(statFile => {
      console.log('uploading', statFile);
      const stat = require(statFile);
      const params = {
        TableName: 'repo-analytics',
        Item: {
          repoDate: `${stat.date}${stat.repo}`,
          ...stat
        }
      };

      docClient.put(params, (err, data) => {
        if (err) console.log(err);
      });
    });
  })
  .help()
  .argv
