const path = require('path');
const glob = require('glob');

glob.sync(`${path.resolve(__dirname, '../stats')}/**/*.json`).forEach(file => {
  const stat = require(file);
  console.log(stat.date)
})
