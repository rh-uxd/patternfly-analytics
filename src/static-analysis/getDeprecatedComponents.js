

const pf4NextPath = '@patternfly/react-core/next';

const pf4DeprecatedComponents = {
  'ApplicationLauncher': {
    exports: [
      'ApplicationLauncher',
      'ApplicationLauncherContext',
      'ApplicationLauncherItem',
      'ApplicationLauncherItemContext',
      'ApplicationLauncherContent',
      'ApplicationLauncherIcon',
      'ApplicationLauncherText',
      'ApplicationLauncherGroup',
      'ApplicationLauncherSeparator',
      'ApplicationLauncherProps',
      'ApplicationLauncherContentProps',
      'ApplicationLauncherIconProps',
      'ApplicationLauncherItemProps',
      'ApplicationLauncherTextProps'
    ]
  },
  'ContextSelector': {
    exports: [
      'ContextSelector',
      'ContextSelectorItem',
      'ContextSelectorFooter',
      'ContextSelectorProps',
      'ContextSelectorFooterProps',
      'ContextSelectorItemProps'
    ]
  },
  'Dropdown': {
    nextComponent: true,
    exports: [
      'Dropdown',
      'DropdownMenu',
      'DropdownWithContext',
      'dropdownConstants',
      'DropdownGroup',
      'DropdownItem',
      'DropdownSeparator',
      'BadgeToggle',
      'KebabToggle',
      'DropdownToggle',
      'DropdownToggleCheckbox',
      'DropdownToggleAction',
      'BadgeToggleProps',
      'BadgeToggle',
      'DropdownProps',
      'DropdownGroupProps',
      'DropdownItemProps',
      'DropdownMenuProps',
      'DropdownMenuItem',
      'SeparatorProps',
      'DropdownToggleProps',
      'DropdownToggleActionProps',
      'DropdownToggleCheckboxProps',
      'KebabToggleProps',
      'DropdownPosition',
      'DropdownDirection',
      'DropdownContext',
      'DropdownArrowContext'
    ]
  },
  'OptionsMenu': {
    exports: [
      'OptionsMenu',
      'OptionsMenuToggle',
      'OptionsMenuItemGroup',
      'OptionsMenuItem',
      'OptionsMenuSeparator',
      'OptionsMenuToggleWithText',
      'OptionsMenuPosition',
      'OptionsMenuDirection',
      'OptionsMenuProps',
      'OptionsMenuItemProps',
      'OptionsMenuItemGroupProps',
      'OptionsMenuToggleProps',
      'OptionsMenuToggleWithTextProps'
    ]
  },
  'PageHeader': {
    exports: [
      'PageHeader',
      'PageHeaderTools',
      'PageHeaderToolsGroup',
      'PageHeaderToolsItem',
      'PageHeaderProps',
      'PageHeaderToolsProps',
      'PageHeaderToolsGroupProps',
      'PageHeaderToolsItemProps'
    ]
  },
  'Select': {
    nextComponent: true,
    exports: [
      'Select',
      'SelectGroup',
      'SelectOption',
      'selectConstants',
      'SelectViewMoreObject',
      'SelectProps',
      'SelectState',
      'SelectGroupProps',
      'SelectOptionObject',
      'SelectOptionProps',
      'SelectContextInterface',
      'SelectContext',
      'SelectProvider',
      'SelectConsumer',
      'SelectVariant',
      'SelectPosition',
      'SelectDirection',
      'SelectFooterTabbableItems'
    ]
  },
  'Table': {
    path: '@patternfly/react-table',
    exports: [
      'Table',
      'TableProps',
      'IComputedData',
      'OnRowClick',
      'TableBodyProps',
      'TableBody',
      'TableHeader',
      'HeaderProps'
    ]
  },
  'Wizard': {
    nextComponent: true,
    exports: [
      'Wizard',
      'WizardContext',
      'WizardNav',
      'WizardNavItem',
      'WizardHeader',
      'WizardBody',
      'WizardFooter',
      'WizardToggle',
      'WizardStep',
      'WizardStepFunctionType',
      'WizardProps',
      'WizardBodyProps',
      'WizardContextType',
      'WizardContextProvider',
      'WizardContextConsumer',
      'WizardFooterProps',
      'WizardHeaderProps',
      'WizardNavProps',
      'WizardNavItemProps',
      'WizardToggleProps'
    ]
  }
};

const pf5Deprecated = [
  '@patternfly/react-core/deprecated',
  '@patternfly/react-table/deprecated'
];

// combine all components from pf4DeprecatedObj into one array
const pf4DeprecatedArr = Object.entries(pf4DeprecatedComponents).reduce((acc, [parentComponentName, { exports }]) => [...acc, ...exports], []);

/*
1 - Loop through pf4DeprecatedArr
2 - For each deprecated component, get imports[component] from _all_product_uses.json
3 - Loop through products, excluding ‘product_count’ and ‘total_usage’, check each product name against version number from _all_pf_versions.json and keep only if using deprecated version of component
    - const prods = Object.keys(data).filter(key => !['product_count', 'total_usage'].includes(key));
4 - Need to repeat separately for Table components
*/

// pass in sortedUsage (reported in _all_product_uses.json)
// and pfVersions (reported in _all_pf_versions.json) from cli.js
const getDeprecatedComponents = (sortedUsage, pfVersions) => {
  let deprecatedUsage = {};
  Object.entries(pf4DeprecatedComponents).map(([component, data]) => {
    const {
      exports,
      nextComponent = false,
      path = '@patternfly/react-core'
    } = data;
    // track data for parent component
    deprecatedUsage[component] = { 
      product_count: 0,
      products: []
    };

    // loop through each deprecated export (aka subcomponent)
    exports.map(subcomponent => {
      // get product usage data for current subcomponent
      const productUses = sortedUsage.imports[subcomponent];
      // exit if no products use current component
      if (!productUses) return;

      // add new entry for each deprecated subcomponent
      deprecatedUsage[component][subcomponent] = { 
        product_count: 0,
        products: {}
      };

      console.log(subcomponent);
      Object.keys(productUses).map(productName => {
        // skip over non-product keys present on every object
        if (['product_count', 'total_usage'].includes(productName)) {
          return;
        }

        // check if product is using PF4, PF5, or both versions
        const versions = pfVersions?.[productName]?.[path];
        let isPF4 = false;
        let isPF5 = false;
        // Handle if no version found - plugin?
        if (versions) {
          versions.map(version => {
            // exit if both major versions already found
            if (isPF4 && isPF5) {
              return;
            }
            const majorVersion = version.split('.')[0];
            if (majorVersion.includes('4')) {
              isPF4 = true;
            }
            if (majorVersion.includes('5')) {
              isPF5 = true;
            }
          });
        }

        // Combine version number & import paths to confirm if deprecated usage
        const importPaths = Object.keys(productUses[productName]).filter(key => !['unique_import_paths', 'repo_usage'].includes(key));
        const isNext = importPaths.every(path => path.includes('next'));
        // assume deprecated if versions can't be tracked, else:
        // cannot be next component, must be PF4 OR be PF5 importing from deprecated
        const isDeprecated = !versions || (
          !isNext && (
            isPF4 ||
            (isPF5 && importPaths.some(path => path.includes('deprecated')))
          )
        );
        // If deprecated, save product name to component
        if (isDeprecated) {
          // add product to parent component tracking
          const parentComponent = deprecatedUsage[component];
          // avoid duplicates
          if (!parentComponent.products.includes(productName)) {
            parentComponent.products.push(productName);
          }
          parentComponent.product_count = parentComponent.products.length;

          // add product to subcomponent tracking
          parentComponent[subcomponent].products[productName] = {};
          // some products (ex: Foreman-Console) declare PF dependency versions in another package
          parentComponent[subcomponent].products[productName].versions = versions
            ? versions
            : ['unknown'];
          parentComponent[subcomponent].products[productName].importPaths = importPaths;
          parentComponent[subcomponent].product_count++;
        }
      });
    });
  });

  const sortedDeprecatedUsage = Object.fromEntries(
    Object
      .entries(deprecatedUsage)
      .sort(([name1, {product_count: count1}], [name2, {product_count: count2}]) => count2 - count1)
  );
  return sortedDeprecatedUsage;
};

module.exports = {
  pf4DeprecatedArr,
  getDeprecatedComponents
}
