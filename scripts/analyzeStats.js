const glob = require('glob');

glob('../stats', file => {
  console.log('file', file)
})

console.log(__dirname)