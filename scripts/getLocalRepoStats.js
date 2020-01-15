const fs = require('fs');
const glob = require('glob');

const getLocalRepoStats = repoPath => {
  const result = {
    files: {
      total: {
        withPatternfly: {}
      },
      withPatternfly: {}
    },
    imports: {
      /* "packageName": {
        "importName": count,
      }*/
    },
    classes: {
      // "className": count
    },
    scssVars: {
      // "varName": count
    }
  };

  const getExt = file => file.substr(file.lastIndexOf('.') + 1);
  const jsFiles = glob.sync(`${repoPath}/**/*.{js,jsx,ts,tsx}`);
  const styleFiles = glob.sync(`${repoPath}/**/*.{css,sass,scss,less}`);

  // https://regex101.com/r/hcIlRX/1
  const importRegex = /import\s+{?([\w\s,*]+)}?\s+from\s+['"](.*patternfly.*)['"]/gm;
  // https://regex101.com/r/GGCTuA/1
  const classRegex = /[^-\w](pf-[clu]-.*?)['"\s]/gm;
  // https://regex101.com/r/gpPax3/1
  const varRegex = /(--pf(-global)?-\w*-\w*-\w*-\w*)/gm;

  const matchClasses = (contents, file) => {
    const ext = getExt(file);
    let regMatch;
    for (let i = 0; regMatch = classRegex.exec(contents); i++) {
      if (i == 0) {
        result.files.withPatternfly[ext] = result.files.withPatternfly[ext] || {};
        result.files.withPatternfly[ext][file.replace(repoPath, '')] = true;
      }
      result.classes[regMatch[1]] = result.classes[regMatch[1]] || 0;
      result.classes[regMatch[1]]++;
    }
  }

  // Build { result: { imports } }
  jsFiles.forEach(file => {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || stat.isDirectory()) return;
    const ext = getExt(file);
    const contents = fs.readFileSync(file, 'utf8');
    let regMatch;
    for (let i = 0; regMatch = importRegex.exec(contents); i++) {
      if (i == 0) {
        result.files.withPatternfly[ext] = result.files.withPatternfly[ext] || {};
        result.files.withPatternfly[ext][file.replace(repoPath, '')] = true;
      }
      result.imports[regMatch[2]] = result.imports[regMatch[2]] || {};
      regMatch[1]
        .split(',')
        .map(str => str.replace(/\s+as\s+.*/gm, ''))
        .map(str => str.replace(/\s/gm, ''))
        .filter(imp => imp)
        .forEach(imp => {
          const pkg = result.imports[regMatch[2]];
          pkg[imp] = pkg[imp] || 0;
          pkg[imp]++;
        });
    }

    matchClasses(contents, file);
  });

  // Build { result: {scssVars: total: {}} }
  styleFiles.forEach(file => {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || stat.isDirectory()) return;
    const ext = getExt(file);
    const contents = fs.readFileSync(file, 'utf8');

    let regMatch;
    for (let i = 0; regMatch = varRegex.exec(contents); i++) {
      if (i == 0) {
        result.files.withPatternfly[ext] = result.files.withPatternfly[ext] || {};
        result.files.withPatternfly[ext][file.replace(repoPath, '')] = true;
      }
      result.scssVars[regMatch[1]] = result.scssVars[regMatch[1]] || 0;
      result.scssVars[regMatch[1]]++;
    }

    matchClasses(contents, file);
  });

  // Build { result: {files: total: {}} }
  jsFiles.concat(styleFiles)
    .map(getExt)
    .forEach(ext => {
      result.files.total[ext] = result.files.total[ext] || 0;
      result.files.total[ext]++;
    });

  Object.entries(result.files.withPatternfly).forEach(([key, val]) => {
    const files = Object.keys(val);
    result.files.withPatternfly[key] = {
      files
    };
    result.files.total.withPatternfly[key] = files.length;
  });

  return result;
}

module.exports = {
  getLocalRepoStats
};

