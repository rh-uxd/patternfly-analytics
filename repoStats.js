const { execSync } = require('child_process');
const fs = require('fs-extra');
const glob = require('glob');
const { getLocalRepoStats } = require('./getLocalRepoStats');
const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient();

const repos = require('./repos.json').repos;

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
