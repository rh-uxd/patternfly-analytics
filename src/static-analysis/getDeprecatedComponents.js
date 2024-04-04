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
      products: [],
      product_count_by_component: {}
    };

    // loop through each deprecated export (aka subcomponent)
    exports.map(subcomponent => {
      // Make sure to track components with "-deprecated" appended to name
      const deprecatedSubcomponents = [subcomponent, `${subcomponent}-deprecated`];
      deprecatedSubcomponents.map(subcompName => {
        // get product usage data for current subcomponent
        const productUses = sortedUsage.imports[subcompName];
        // exit if no products use current component
        if (!productUses) return;

        // add new entry for each deprecated subcomponent
        deprecatedUsage[component][subcomponent] = deprecatedUsage[component][subcomponent] || { 
          product_count: 0,
          products: {}
        };

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
            const subcomponentProducts = parentComponent[subcomponent].products;
            subcomponentProducts[productName] = subcomponentProducts[productName] || {};
            // Track product PF versions
            subcomponentProducts[productName].versions = subcomponentProducts[productName].versions || [];
            // some products (ex: Foreman-Console) declare PF dependency versions in another package
            const productVersions = versions || ['unknown'];
            subcomponentProducts[productName].versions = [...subcomponentProducts[productName].versions, ...productVersions];
            // Track product import paths for current subcomponent
            subcomponentProducts[productName].importPaths = subcomponentProducts[productName].importPaths || [];
            subcomponentProducts[productName].importPaths = [...subcomponentProducts[productName].importPaths, ...importPaths];
            parentComponent[subcomponent].product_count++;
          }
        });
      });
      // Add total count for subcomponent to product_count_by_component field for quick usage comparison across components
      const subcomponentProductCount = deprecatedUsage?.[component]?.[subcomponent]?.product_count;
      if (subcomponentProductCount) {
        deprecatedUsage[component].product_count_by_component[subcomponent] = subcomponentProductCount;
      }
    });
    // Sort product_count_by_component from highest to lowest usage
    deprecatedUsage[component].product_count_by_component = Object.fromEntries(
      Object
        .entries(deprecatedUsage[component].product_count_by_component)
        .sort(([compName1, compCount1], [compName2, compCount2]) => compCount2 - compCount1)
    ) 
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
