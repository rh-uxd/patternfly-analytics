const fs = require('fs');
const glob = require('glob');

const result = {};

glob(`${__dirname}/stats/*.json`, {ignore: ['**/all.json']}, (err, files) => {
  files.forEach(file => {
    const repoRes = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    Object.entries(repoRes).forEach(([key, val]) => {
      if (!(key in result)) {
        result[key] = 0;
      }

      result[key] += val;
    })
  });

  console.log(JSON.stringify(result, null, 2));
});