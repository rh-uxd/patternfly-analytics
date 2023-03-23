const fs = require('fs');
const glob = require('glob');

const patternflyAggs = {
  files: {
    total: {
      withPatternfly: {}
    }
  },
  imports: {

  },
  classes: {

  },
  cssVars: {

  }
};

const productUsage = {
  imports: {

  },
  classes: {

  },
  cssVars: {

  }
};

function getPatternflyStats(repoPath, repoName) {
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
    cssVars: {
      // "varName": count
    }
  };

  const getExt = file => file.substring(file.lastIndexOf('.') + 1);
  const jsFiles = glob.sync(`${repoPath}/**/*.{js,jsx,ts,tsx}`);
  const styleFiles = glob.sync(`${repoPath}/**/*.{css,sass,scss,less}`);

  const importRegex = /import\s+{?([\w\s,*]+)}?\s+from\s+['"](.*patternfly.*)['"]/gm;
  const classRegex = /[^-\w](pf-[clum]-[\w|\-]*)/gm
  const varRegex = /(--pf(-global)?[\w|\-]*)/gm;

  const matchClasses = (contents, file) => {
    const ext = getExt(file);
    let regMatch;
    let fileName;
    for (let i = 0; regMatch = classRegex.exec(contents); i++) {
      if (i == 0) {
        result.files.withPatternfly[ext] = result.files.withPatternfly[ext] || {};
        fileName = file.replace(repoPath, '');
        result.files.withPatternfly[ext][fileName] = true;
      }
      const className = regMatch[1];
      result.classes[className] = result.classes[className] || 0;
      result.classes[className]++;
      patternflyAggs.classes[className] = patternflyAggs.classes[className] || 0;
      patternflyAggs.classes[className]++;
      // update productUsage
      productUsage.classes[className] = productUsage.classes[className] || {
        "product_count": 0,
        "total_usage": 0
      };
      const classDataObj = productUsage.classes[className];
      if (!classDataObj[repoName]) {
        classDataObj[repoName] = { "repo_usage": 0 };
        classDataObj.product_count++;
      }
      classDataObj[repoName][fileName] = classDataObj[repoName][fileName] || 0;
      classDataObj[repoName][fileName]++;
      classDataObj[repoName].repo_usage++;
      classDataObj.total_usage++;
    }
  }

  // Check for /deprecated && /next, update component name to avoid counting as current component
  // Build { result: { imports } }
  jsFiles.forEach(file => {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || stat.isDirectory()) return;
    const ext = getExt(file);
    const contents = fs.readFileSync(file, 'utf8');
    let regMatch;
    let fileName;
    for (let i = 0; regMatch = importRegex.exec(contents); i++) {
      if (i == 0) {
        result.files.withPatternfly[ext] = result.files.withPatternfly[ext] || {};
        fileName = file.replace(repoPath, '');
        result.files.withPatternfly[ext][fileName] = true;
      }
      result.imports[regMatch[2]] = result.imports[regMatch[2]] || {};
      patternflyAggs.imports[regMatch[2]] = patternflyAggs.imports[regMatch[2]] || {};
      regMatch[1]
        .split(',')
        .map(str => str.replace(/\s+as\s+.*/gm, ''))
        .map(str => str.replace(/\s/gm, ''))
        .filter(imp => imp)
        .forEach(imp => {
          const pkgName = regMatch[2];
          let pkg = result.imports[pkgName];
          // update component name if deprecated or next component
          if (pkgName.includes('/deprecated')) {
            imp = `${imp}-deprecated`;
          } else if (pkgName.includes('/next')) {
            imp = `${imp}-next`;
          }
          pkg[imp] = pkg[imp] || 0;
          pkg[imp]++;
          pkg = patternflyAggs.imports[pkgName];
          pkg[imp] = pkg[imp] || 0;
          pkg[imp]++;
          // product usage
          productUsage.imports[imp] = productUsage.imports[imp] || { "product_count": 0, "total_usage": 0 };
          let component = productUsage.imports[imp]; // Card
          // Increment product count if repo not yet tracked
          if (!component[repoName]) {
            component.product_count++;
            component[repoName] = {
              "unique_import_paths": 0,
              "repo_usage": 0
            };
          }
          // Increment package import count if new import path
          if (!component[repoName][pkgName]) {
            component[repoName][pkgName] = {};
            component[repoName].unique_import_paths++;
          }
          component[repoName][pkgName][fileName] = component[repoName][pkgName][fileName] || 0;
          component[repoName][pkgName][fileName]++;
          component[repoName].repo_usage++;
          component.total_usage++;
        });
    }

    matchClasses(contents, file);
  });

  // Build { result: { cssVars: total: {} } }
  styleFiles.forEach(file => {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || stat.isDirectory()) return;
    const ext = getExt(file);
    const contents = fs.readFileSync(file, 'utf8');

    let regMatch;
    let fileName;
    for (let i = 0; regMatch = varRegex.exec(contents); i++) {
      if (i == 0) {
        result.files.withPatternfly[ext] = result.files.withPatternfly[ext] || {};
        fileName = file.replace(repoPath, '')
        result.files.withPatternfly[ext][fileName] = true;
      }
      // Variable to report on
      const cssVarName = regMatch[1];
      // Track for repo's json
      result.cssVars[cssVarName] = result.cssVars[cssVarName] || 0;
      result.cssVars[cssVarName]++;
      // Track for _all.json && _all_sorted.json reports
      patternflyAggs.cssVars[cssVarName] = patternflyAggs.cssVars[cssVarName] || 0;
      patternflyAggs.cssVars[cssVarName]++;
      // Track for _all_product_uses.json report
      productUsage.cssVars[cssVarName] = productUsage.cssVars[cssVarName] || {
        "product_count": 0,
        "total_usage": 0
      };
      let varDataObj = productUsage.cssVars[cssVarName];
      if (!varDataObj[repoName]) {
        varDataObj[repoName] = { "repo_usage": 0 };
        // Tally total number of unique products (by repoName)
        varDataObj.product_count++;
      }
      // Track which files, and how many times, where cssVarName is used per repo
      varDataObj[repoName][fileName] = varDataObj[repoName][fileName] || 0;
      varDataObj[repoName][fileName]++;
      varDataObj[repoName].repo_usage++;
      varDataObj.total_usage++;
    }

    matchClasses(contents, file);
  });

  // Build { result: { files: total: {} } }
  jsFiles.concat(styleFiles)
    .map(getExt)
    .forEach(ext => {
      result.files.total[ext] = result.files.total[ext] || 0;
      result.files.total[ext]++;
      patternflyAggs.files.total[ext] = patternflyAggs.files.total[ext] || 0;
      patternflyAggs.files.total[ext]++;
    });

  Object.entries(result.files.withPatternfly).forEach(([key, val]) => {
    const files = Object.keys(val);
    result.files.withPatternfly[key] = { files };
    result.files.total.withPatternfly[key] = files.length;
  });

  return result;
}

module.exports = {
  getPatternflyStats,
  patternflyAggs,
  productUsage
};

