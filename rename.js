const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const { repos } = require('./repos.json');

glob.sync('stats-static/**/*.json').forEach(file => {
  const stats = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const newRepo = repos.find(repo => repo.git === stats.repo);
  if (newRepo) {
    stats.name = newRepo.name;
    const newPath = path.join(path.dirname(file), `${newRepo.name}.json`); 
    fs.writeFileSync(newPath, JSON.stringify(stats, null, 2));
    fs.unlinkSync(file);
  }
});
