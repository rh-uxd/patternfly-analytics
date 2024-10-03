import pandas as pd
import os
from datetime import datetime, UTC

REPOS_ALL = 'repos_all'

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
def clean_undefined(x) -> str:
    if "undefined" in x:
        return ''
    if "null" in x:
        return ''

    return x

print("%s/%s" % (today, today_str))
# Action starts here
bikes = []
for file in os.listdir(in_dir):
    if file.endswith('.csv'):
        print(file)
        df = pd.read_csv('%s/%s' % (in_dir, file))
        df = df.map(clean_undefined)
        df = df.map(lambda x: str.lstrip(x))
        bikes.append(df)

df = pd.concat(bikes, axis=0, ignore_index=True)
df = df.rename(str.strip, axis='columns')  # strip blanks from all header names
df = df.sort_values(by=['name'], key=lambda col: col.str.lower())

today_report_dir = 'reports/%s' % today_str
os.makedirs(today_report_dir, exist_ok=True)

# Write a csv report
df.to_csv('%s/repos_all.csv' % today_report_dir, index=False, )

# Write Excel report.

# We need to format the name as hyperlink with the URL
for _index, row in df.iterrows():
    nam_s = row['name']
    url_s = row['url']
    out = '=HYPERLINK("{}","{}")'.format(url_s, nam_s)
    row['name'] = out

# Now we can drop the url column
df = df.drop(columns=['url'])

writer = pd.ExcelWriter("%s/%s.xlsx" % (today_report_dir, REPOS_ALL), engine='xlsxwriter')
df.to_excel(writer,
            sheet_name=REPOS_ALL,
            freeze_panes=tuple([1, 1]),
            index=False)

for column in df:
    if column == 'name':
        column_len = 4  # 'name'
        tmp = df[column].astype(str)
        for value in tmp.values.tolist():
            val = value.split(',')
            val = val[1]
            val = val.replace('"', '').replace(')', '')
            column_len = max(column_len, len(val))
    else:
        column_len = max(df[column].astype(str).map(len).max(), len(column))
    col_idx = df.columns.get_loc(column)
    writer.sheets[REPOS_ALL].set_column(col_idx, col_idx, column_len + 1)  # +1 for padding
writer.close()

print("Output is in %s/%s.xlsx" % (today_report_dir, REPOS_ALL))
