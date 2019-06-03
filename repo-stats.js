const path = require('path');
const fs = require('fs');
const glob = require('glob');

// https://regex101.com/r/hcIlRX/1
const regex = /import\s+{?([\w\s,*]+)}?\s+from\s+['"](.*patternfly.*)['"]/gm;
const repoPath = path.resolve(__dirname, process.argv[2])

const result = {
  /* "packageName": {
    "importName": count,
  }*/
};

glob(`${repoPath}/**/*.{js,jsx,ts,tsx}`, (err, files) => {
  files.forEach(file => {
    const contents = fs.readFileSync(file, 'utf8');

    var regMatch;
    while (regMatch = regex.exec(contents)) {
      result[regMatch[2]] = result[regMatch[2]] || {};
      const pkg = result[regMatch[2]];
      regMatch[1]
        .split(',')
        .map(str => str.replace(/\s+as\s+.*/gm, ''))
        .map(str => str.replace(/\s/gm, ''))
        .filter(imp => imp)
        .forEach(imp => {
          if (!(imp in pkg)) {
            pkg[imp] = 0;
          }

          pkg[imp]++;
        });
    }
  });

  console.log(JSON.stringify(result, null, 2));
});
