const fs = require('fs');
const glob = require('glob');

const result = {};

glob(`${__dirname}/${process.argv[2]}/*.json`, {ignore: ['**/all.json']}, (err, files) => {
  files.forEach(file => {
    const repoStats = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    Object.entries(repoStats).forEach(([key, imports]) => {
      result[key] = result[key] || {};
      const pkg = result[key];

      Object.entries(imports).forEach(([imp, count]) => {
        if (!(imp in pkg)) {
          pkg[imp] = 0;
        }

        pkg[imp] += count;
      });
    })
  });

  console.log(JSON.stringify(result, null, 2));
});