const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const { getLocalRepoStats } = require('./getLocalRepoStats');
const repos = require('./repos.json').repos;

const statsDir = path.resolve(__dirname, '../stats');
const tmpDir = path.resolve(__dirname, '../tmp');

if (!fs.existsSync(statsDir)) {
  fs.mkdirSync(statsDir);
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
    const dir = `${statsDir}/${date.substr(0, 10)}`;
    fs.removeSync(tmpDir);
    repos
      .filter(repo => argv.p || !repo.private) // Only public repos unless flag passed
      .forEach(repo => {
        const repoName = repo.git.split('/').pop();
        const tmpPath = `${tmpDir}/${repoName}`;
        execSync(`git clone "${repo.git}" "${tmpPath}" --depth 1`);
        const results = getLocalRepoStats(tmpPath);
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
  .help()
  .argv
