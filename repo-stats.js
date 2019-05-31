const path = require('path');
const fs = require('fs');
const glob = require('glob');

const regex = /import\s+{?([\w\s,]+)}?\s+from\s+.*patternfly\/react-core/gm;
const repoPath = path.resolve(__dirname, './tmp', process.argv[2])

const result = {};

glob(`${repoPath}/**/*.{js,jsx,ts,tsx}`, (err, files) => {
  files.forEach(file => {
    const contents = fs.readFileSync(file, 'utf8');

    var regMatch;
    while (regMatch = regex.exec(contents)) {
      regMatch[1]
        .split(',')
        .map(str => str.replace(/\s+as\s+.*/gm, ''))
        .map(str => str.replace(/\s/gm, ''))
        .filter(imp => imp)
        .forEach(imp => {
          if (!(imp in result)) {
            result[imp] = 0;
          }

          result[imp]++;
        });
    }
  });

  console.log(JSON.stringify(result, null, 2));
});
