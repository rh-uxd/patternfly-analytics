import pandas as pd
import os
import xlsxwriter
from datetime import datetime

REPOS_ALL = 'repos_all'

do_collect = False


if do_collect:
    print("----------- running the collector code -------")
    os.system('node src/static-analysis/cli.js collect -j -p')
    print("----------- collector done -------------------")

# Find the directory with the csv files
today = datetime.today()
today_str = "%d-%02d-%02d" % (today.year, today.month, today.day)
in_dir = "stats-static/" + today_str


def clean_undefined(x) -> str:
    if "undefined" in x:
        return ''
    if "null" in x:
        return ''

    return x


bikes = []
for file in os.listdir(in_dir):
    if file.endswith('.csv'):
        print(file)
        df = pd.read_csv('%s/%s' % (in_dir, file))
        df = df.map(clean_undefined)
        df = df.map(lambda x: str.lstrip(x))
        bikes.append(df)

df = pd.concat(bikes, axis=0, ignore_index=True)
df = df.rename(columns={'          name': 'name'})
df = df.sort_values(by=['name'])

os.mkdir('reports')
today_report_dir = 'reports/%s' %(today_str)
os.mkdir(today_report_dir)

df.to_csv('%s/repos_all.csv' % (today_report_dir), index=False, )

writer = pd.ExcelWriter("%s/%s.xlsx" %(today_report_dir, REPOS_ALL), engine='xlsxwriter')
df.to_excel(writer,
            sheet_name=REPOS_ALL,
            freeze_panes=tuple([1, 1]),
            index=False)

for column in df:
    column_len = max(df[column].astype(str).map(len).max(), len(column))
    col_idx = df.columns.get_loc(column)
    writer.sheets[REPOS_ALL].set_column(col_idx, col_idx, column_len)
writer.close()

print("Output is in %s/%s.xlsx" % (today_report_dir, REPOS_ALL))