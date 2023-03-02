const sortArr = arr => arr.sort((a,b) => b[1] - a[1]);
const arrToObj = arr => arr.reduce((acc, cur) => {
  acc[cur[0]] = cur[1];
  return acc;
}, {});

const getImportCategory = importPath => {
  const categoriesRegex = /\b(?:react-icons|utilities|layouts|react-charts|react-topology|react-table|react-code-editor|react-console|react-catalog-view-extension|react-log-viewer|react-virtualized-extension|extensions|quickstarts|react-styles|react-tokens)\b/gi;
  const matches = importPath.match(categoriesRegex);
  const category = matches ? matches[0] : 'components';
  return category;
}

const sortImportsByCount = importsObj => {
  const entriesArr = Object.entries(importsObj);
  const sortedEntriesArr = sortArr(entriesArr);
  const sortedEntriesObj = arrToObj(sortedEntriesArr);
  return sortedEntriesObj;
}

// Build object with imports grouped by category
const buildCategorizedImports = obj => {
  let categorizedImports = {};
  const importsArr = Object.entries(obj);
  importsArr.map(([importPath, importedItemsObj]) => {
    // get category based on import path & add field to categorizedImports if needed
    const category = getImportCategory(importPath);
    if (!categorizedImports[category]) {
      categorizedImports[category] = {};
    }
    // loop through importedItems & add to categorizedImports
    const importedItemsArr = Object.entries(importedItemsObj);
    importedItemsArr.map(([importName, importCount]) => {
      categorizedImports[category][importName] = categorizedImports[category][importName]
        ? categorizedImports[category][importName] += importCount
        : importCount;
    });
  });
  return categorizedImports;
}

// Sort categorized imports by quantity
const sortCategorizedImports = categorizedImportsObj => {
  let sortedCategorizedImports = {};
  const categorizedImportsArr = Object.entries(categorizedImportsObj);
  categorizedImportsArr.map(([category, importedItemsObj]) => {
    const sortedCategory = sortImportsByCount(importedItemsObj);
    sortedCategorizedImports[category] = sortedCategory;
  });
  return sortedCategorizedImports;
}

const getSortedImports = (importsObj) => {
  const importCategories = buildCategorizedImports(importsObj);
  const sortedCategories = sortCategorizedImports(importCategories);
  return sortedCategories;
}

module.exports = {
  getSortedImports
}
