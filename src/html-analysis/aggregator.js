const path = require('path');
const fs = require('fs');
const glob = require('glob');

function aggregateClassNames(report) {
  const totalCounts = {};

  Object.values(report).forEach(pageClasses => {
    delete pageClasses.count;
    Object.entries(pageClasses).forEach(([className, count]) => {
      totalCounts[className] = totalCounts[className] + count || count;
    });
  })

  let csvString = 'className,count';

  Object.entries(totalCounts).forEach(([className, count]) => {
    csvString += `\n${className},${count}`;
  });

  return csvString;
}

function aggregateUrls(report) {
  let csvString = 'url,count';

  Object.entries(report)
    .sort((u1, u2) => u1[0].localeCompare(u2[0]))
    .forEach(([url, pageClasses]) => {
      csvString += `\n${url},${pageClasses.count}`;
    })
  
  return csvString;
}


glob.sync(path.join(__dirname, '../../stats-html/**/*.json')).forEach(file => {
  const report = require(file);

  fs.writeFileSync(path.join(path.dirname(file), './urlCounts.csv'), aggregateUrls(report));
  fs.writeFileSync(path.join(path.dirname(file), './classNames.csv'), aggregateClassNames(report));
})
