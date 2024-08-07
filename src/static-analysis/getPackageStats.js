const glob = require('glob');
const fsj = require("fs");
const path = require('path');

const aggregated = {};
const pfVersions = {};

function getPackageStats(repoPath, repoName, url) {
  const result = {};

  function countDeps(dependencies) {
    if (!dependencies) {
      return;
    }
    Object.keys(dependencies).forEach(dep => {
      result[dep] = result[dep] || 0;
      result[dep]++;
      if (dep.includes('patternfly')) {
        trackPfVersions(dependencies, dep);
      }
     // console.log(dep); //dependency name
      aggregated[dep] = aggregated[dep] || [];
      aggregated[dep].push(repoName);
    });
  }

  // called in countDeps to track PF dependency versions
  function trackPfVersions(dependencies, dep) {
    const pfVersion = dependencies[dep];
    result.patternflyVersions = result.patternflyVersions || {};
    result.patternflyVersions[dep] = result.patternflyVersions[dep] || [];
    if (!result.patternflyVersions[dep].includes(pfVersion)) {
      result.patternflyVersions[dep].push(pfVersion);
    }
    // track repo & pf package names
    pfVersions[repoName] = pfVersions[repoName] || {};
    pfVersions[repoName][dep] = pfVersions[repoName][dep] || [];
    // add dependency version
    if (!pfVersions[repoName][dep].includes(pfVersion)) {
      pfVersions[repoName][dep].push(pfVersion);
    }
}

  function outputDeps(dependencies, file) {
    if (!dependencies) {
      return;
    }

      //a way to get the dependency name/values out
      var pp, pq, prcve, prc, prce, prcon, prcore, pricon, predit, prlogv, pnext, prstyle, prtable, prtoken, prtop, pruf, prvirt, pf, pfr, pfre, r = null;
      var data = `
          name, url, @patternfly/patternfly, @patternfly/quickstarts, @patternfly/react-catalog-view-extension, @patternfly/react-charts, @patternfly/react-code-editor, @patternfly/react-console, @patternfly/react-core, @patternfly/react-icons, @patternfly/react-inline-edit-extension, @patternfly/react-log-viewer, @patternfly/patternfly-next, @patternfly/react-styles, @patternfly/react-table, @patternfly/react-tokens, @patternfly/react-topology, @patternfly/react-user-feedback, @patternfly/react-virtualized-extension, patternfly, patternfly-react, patternfly-react-extensions, react
          `;

      const courses = dependencies;
      const keys = Object.keys(courses);
      keys.forEach((key, index) => {

        if(key == '@patternfly/patternfly'){
          pp = courses[key];
        }
        else if(key == '@patternfly/quickstarts'){
          pq = courses[key];
        }
        else if(key == '@patternfly/react-catalog-view-extension'){
          prcve = courses[key];
        }
        else if(key == '@patternfly/react-charts'){
          prc = courses[key];
        }
        else if(key == '@patternfly/react-code-editor'){
          prce = courses[key];
        }
        else if(key == '@patternfly/react-console'){
          prcon = courses[key];
        }
        else if(key == '@patternfly/react-core'){
          prcore = courses[key];
        }
        else if(key == '@patternfly/react-icons'){
          pricon = courses[key];
        }
        else if(key == '@patternfly/react-inline-edit-extension'){
          predit = courses[key];
        }
        else if(key == '@patternfly/react-log-viewer'){
          prlogv = courses[key];
        }
        else if(key == '@patternfly/patternfly-next'){
          pnext = courses[key];
        }
        else if(key == '@patternfly/react-styles'){
          prstyle = courses[key];
        }
        else if(key == '@patternfly/react-table'){
          prtable = courses[key];
        }
        else if(key == '@patternfly/react-tokens'){
          prtoken = courses[key];
        }
        else if(key == '@patternfly/react-topology'){
          prtop = courses[key];
        }
        else if(key == '@patternfly/react-user-feedback'){
          pruf = courses[key];
        }
        else if(key == '@patternfly/react-virtualized-extension'){
          prvirt = courses[key];
        }
        else if(key == 'patternfly'){
          pf = courses[key];
        }
        else if(key == 'patternfly-react'){
          pfr = courses[key];
        }
        else if(key == 'patternfly-react-extensions'){
          pfre = courses[key];
        }
        else if(key == 'react'){
          r = courses[key];
        }



      });


       //working to get unique filename for each package.json found in a github repo...
        const filePath = file;
        const extractFilename = (path) => {
           const pathArray = path.split("/");
           const lastIndex = pathArray.length - 2;
           return pathArray[lastIndex];
        };

      //collect row for output object
       if(pp || pq || prcve ||prc || prce || prcon || prcore || pricon || predit || prlogv || pnext || prstyle || prtable || prtoken || prtop || pruf || prvirt || pf || pfr || pfre != null){

        data += `${repoName}-${extractFilename(filePath)}, ${url}, ${pp}, ${pq}, ${prcve}, ${prc}, ${prce}, ${prcon}, ${prcore}, ${pricon}, ${predit}, ${prlogv}, ${pnext}, ${prstyle}, ${prtable}, ${prtoken}, ${prtop}, ${pruf}, ${prvirt}, ${pf}, ${pfr}, ${pfre}, ${r}`;

        //write csv file of dependency for each package.json found
        const date = new Date().toISOString();
        const statsDir = path.resolve(__dirname, '../../stats-static');


        const statsDateDir = `${statsDir}/${date.substring(0, 10)}`;
        if (!fsj.existsSync(statsDateDir)) {
          fsj.mkdirSync(statsDateDir, true) // Create dir as it does not exist
        }
        fsj.writeFileSync(`${statsDateDir}/${repoName}-${extractFilename(filePath)}-data.csv`, data, "utf-8", (err) => {
          if (err) console.log(err);
          else console.log("Data saved");
        });
      }
  }

  glob.sync(`${repoPath}/**/package.json`).forEach(file => {
    try {
      const packageJSON = require(file);
      outputDeps(packageJSON.dependencies, file);
      outputDeps(packageJSON.peerDependencies, file);
      countDeps(packageJSON.dependencies);
      countDeps(packageJSON.devDependencies);
      countDeps(packageJSON.peerDependencies);
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

function getPFVersions() {
  return pfVersions;
}

module.exports = {
  getPackageStats,
  getAggregatePackageStats,
  getPFVersions
}
