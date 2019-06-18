const { execSync } = require("child_process");
const fs = require('fs');
const { getLocalRepoStats } = require('./getLocalRepoStats');

const repos = [
  {
    "git": "https://github.com/RedHatInsights/frontend-components",
    "name": "Insights Library"
  },
  {
    "git": "https://github.com/RedHatInsights/drift-frontend",
    "name": "Insights Frontend"
  },
  {
    "git": "https://github.com/openshift/console",
    "name": "OpenShift Console"
  },
  {
    "git": "https://github.com/integr8ly/tutorial-web-app",
    "name": "Integreatly"
  },
  {
    "git": "https://github.com/project-koku/koku-ui",
    "name": "Cost Management"
  },
  {
    "git": "git@github.com:ansible/awx-pf.git",
    "name": "Ansible"
  },
  {
    "git": "https://gitlab.com/cloudigrade/frontigrade",
    "name": "Cloud Meter"
  },
  {
    "git": "https://github.com/weldr/cockpit-composer",
    "name": "Cockpit Composer"
  },
  {
    "git": "https://github.com/cockpit-project/cockpit",
    "name": "Cockpit"
  },
  {
    "git": "https://github.com/fusor/mig-ui",
    "name": "OpenShift Migration Tool"
  },
  {
    "git": "https://github.com/hawtio/hawtio-core",
    "name": "Fuse Admin Console"
  },
  {
    "git": "https://github.com/syndesisio/syndesis",
    "name": "Fuse Online"
  },
  {
    "git": "https://github.com/syndesisio/syndesis-react",
    "name": "Fuse Online React"
  },
  {
    "git": "https://github.com/EnMasseProject/enmasse",
    "name": "AMQ Everything Else"
  },
  {
    "git": "https://github.com/strimzi-incubator/strimzi-kafka-console",
    "name": "AMQ Streams"
  },
  {
    "git": "https://github.com/apache/qpid-dispatch",
    "name": "AMQ Interconnect"
  },
  {
    "git": "https://github.com/3scale/porta",
    "name": "3Scale"
  },
  {
    "git": "https://github.com/Apicurio/apicurio-studio",
    "name": "Apicurito"
  },
];

if (!fs.existsSync('stats')) {
  fs.mkdirSync('stats');
}

repos.forEach(repo => {
  const repoName = repo.git.split('/').pop();
  const tmpPath = `./tmp/${repoName}`;
  if (!fs.existsSync(tmpPath)) {
    execSync(`git clone "${repo.git}" "${tmpPath}" --depth 1`);
  }
  const results = getLocalRepoStats(`./tmp/${repoName}`);
  results.repo = repo.git;
  results.name = repo.name || repoName;
  results.date = new Date().toISOString();

  fs.writeFileSync(`stats/${repo.name}.json`, JSON.stringify(results, null, 2));
});

