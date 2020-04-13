const glob = require('glob');

const aggregated = {};

function getPackageStats(repoPath, repoName) {
  const result = {};

  function countDeps(dependencies) {
    if (!dependencies) {
      return;
    }
    Object.keys(dependencies).forEach(dep => {
      result[dep] = result[dep] || 0;
      result[dep]++;
      aggregated[dep] = aggregated[dep] || [];
      aggregated[dep].push(repoName);
    });
  }

  glob.sync(`${repoPath}/**/package.json`).forEach(file => {
    try {
      const packageJSON = require(file);
      countDeps(packageJSON.dependencies);
      countDeps(packageJSON.devDependencies);
    } catch(error) {
      console.error(`Problem parsing JSON file ${file}:\n${error}`);
    }
  });

  const ordered = {};
  Object.keys(result).sort().forEach(key => ordered[key] = result[key]);

  return ordered;
}

function getAggregatePackageStats() {
  const ordered = {};
  Object.keys(aggregated).sort().forEach(key => ordered[key] = aggregated[key].sort());

  return ordered;
}

module.exports = {
  getPackageStats,
  getAggregatePackageStats
}
