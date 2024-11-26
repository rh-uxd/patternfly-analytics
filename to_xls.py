import json
import pandas as pd
import os
from datetime import datetime, UTC

# Tabs in the resulting report sheet
REPOS_ALL_TAB = '1 All repositories'
COMPONENT_COUNT_TAB = '2 Component Count'
COMPONENT_DETAILS_TAB = '3 Component Details'


do_collect = False    # Set to True to trigger the collection from here
collect_args = "-j "  # Add -p to also collect private repos

if do_collect:
    print("----------- running the collector code -------")
    if '-p' not in collect_args:
        print("--   for public repos only --")
    os.system('node src/static-analysis/cli.js collect %s' % collect_args)
    print("----------- collector done -------------------")

# Find the directory with the csv files
today = datetime.now(UTC)
today_str = "%04d-%02d-%02d" % (today.year, today.month, today.day)
in_dir = "stats-static/" + today_str


# Helper method to clean up cell values by
#  turning 'undefined' and 'null' into empty cell
def clean_undefined(x: str) -> str:
    if "undefined" in x:
        return ''  # Return empty string if "undefined" is found
    if "null" in x:
        return ''  # Return empty string if "null" is found
    return x

def write_repos_all_tab():

    bikes = []
    for file in os.listdir(in_dir):
        if file.endswith('.csv'):
            print(file)
            df = pd.read_csv('%s/%s' % (in_dir, file))
            df = df.map(clean_undefined)
            df = df.map(lambda x: x.lstrip() if isinstance(x, str) else x)
            bikes.append(df)

    df = pd.concat(bikes, axis=0, ignore_index=True)
    df = df.rename(str.strip, axis='columns')  # strip blanks from all header names
    df = df.sort_values(by=['name'], key=lambda col: col.str.lower())

    for _index, row in df.iterrows():
        nam_s = row['name']
        url_s = row['url']
        out = '=HYPERLINK("{}","{}")'.format(url_s, nam_s)
        row['name'] = out

    # Now we can drop the url column
    df = df.drop(columns=['url'])

    df.to_excel(writer,
                sheet_name=REPOS_ALL_TAB,
                freeze_panes=tuple([1, 1]),
                index=False)
    for column in df:
        if column == 'name':
            column_len = 4  # 'name'
            tmp = df[column].astype(str)
            for value in tmp.values.tolist():
                val = value.split(',')
                if len(val) > 1:
                    val = val[1]
                else:
                    val = val[0]
                val = val.replace('"', '').replace(')', '')
                column_len = max(column_len, len(val))
        else:
            column_len = max(df[column].astype(str).map(len).max(), len(column))
        col_idx = df.columns.get_loc(column)
        writer.sheets[REPOS_ALL_TAB].set_column(col_idx, col_idx, column_len + 1)  # +1 for padding

def write_components_count_tab():
    items = []
    with open(in_dir + "/_all_product_uses.json") as input_file:
        data_all = json.load(input_file)
        imports = data_all['imports']

        for imp in imports:
            print(imp)
            import_dict = imports[imp]
            prod_count = import_dict['product_count']
            total_usage = import_dict['total_usage']
            d = {
                'Name': imp,
                'Product Count': prod_count,
                'Total Usage': total_usage}
            df = pd.DataFrame(d, index=[imp])
            items.append(df)

    df = pd.concat(items, axis=0, ignore_index=False)
    df = df.sort_values(by=['Name'], key=lambda col: col.str.lower())

    df.to_excel(writer,
                sheet_name=COMPONENT_COUNT_TAB,
                freeze_panes=tuple([1, 1]),
                index=False)
    for column in df:
        col_idx = df.columns.get_loc(column)
        column_len = max(df[column].astype(str).map(len).max(), len(column))
        writer.sheets[COMPONENT_COUNT_TAB].set_column(col_idx, col_idx, column_len + 1) # +1 for padding

def write_components_details_tab():
    items = []
    with open(in_dir + "/_all_product_uses.json") as input_file:
        data_all = json.load(input_file)
        imports = data_all['imports']

        imported_components = {}

        for imp in imports: # Imp is the toplevel import like 'Button'
            import_dict = imports[imp]

            for product in import_dict: # product is the product/project that uses the Button like MigrationToolkit
                if product in ['product_count', 'total_usage']:
                    continue
                print(product)

                prod_dict = import_dict[product]

                for pf_component in prod_dict:
                    if pf_component in ['unique_import_paths', 'repo_usage']:
                        continue
                    if pf_component.endswith('/'):
                        pf_component = pf_component.rstrip('/')

                    txt = imp + ":" + pf_component
                    if txt in imported_components.keys():
                        imported_components[txt].append(product)
                    else:
                        imported_components[txt] = [ product]

    for imported_component in imported_components:
        component_list = imported_components[imported_component]
        component_count = len(component_list)
        imp = imported_component.split(':')[0]
        pf_component = imported_component.split(':')[1]
        d = {
            'Name': imp,
            'Import Path': pf_component,
            'Count' : component_count,
            'Products': ", ".join(component_list)
            }
        df = pd.DataFrame(d, index=[imp])
        items.append(df)

    df = pd.concat(items, axis=0, ignore_index=False)
    df = df.sort_values(by=['Name', 'Import Path'], key=lambda col: col.str.lower())

    df.to_excel(writer,
                sheet_name=COMPONENT_DETAILS_TAB,
                freeze_panes=tuple([1, 1]),
                index=False)
    for column in df:
        col_idx = df.columns.get_loc(column)
        column_len = max(df[column].astype(str).map(len).max(), len(column))
        writer.sheets[COMPONENT_DETAILS_TAB].set_column(col_idx, col_idx, column_len + 1) # +1 for padding




if __name__ == "__main__":
    # Action starts here

    today_report_dir = 'reports/%s' % today_str
    os.makedirs(today_report_dir, exist_ok=True)

    report_name = "%s/%s.xlsx" % (today_report_dir, 'pf_report')
    writer = pd.ExcelWriter(report_name, engine='xlsxwriter')

    write_repos_all_tab()
    write_components_count_tab()
    write_components_details_tab()
    writer.close()

    print("Output is in %s  " % report_name)
