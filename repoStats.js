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
  }
];

if (!fs.existsSync('stats')) {
  fs.mkdirSync('stats');
}

repos.forEach(repo => {
  const repoName = repo.git.split('/').pop();
  execSync(`git clone "${repo.git}" "./tmp/${repoName}" --depth 1`);
  const results = getLocalRepoStats(`./tmp/${repoName}`);
  results.repo = repo.git;
  results.name = repo.name || repoName;

  fs.writeFileSync(`stats/${repo.name}.json`, JSON.stringify(results, null, 2));
});

