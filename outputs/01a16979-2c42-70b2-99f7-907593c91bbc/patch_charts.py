from zipfile import ZipFile, ZIP_DEFLATED
from pathlib import Path
import os
src=Path(r'D:\Đồ_Án_Tốt_Nghiệp\MC_e-learning\outputs\01a16979-2c42-70b2-99f7-907593c91bbc\Report5_Unit Test_V2_completed.xlsx')
tmp=src.with_suffix('.patched.xlsx')
replacements={
'xl/drawings/charts/chart1.xml': [('Statistics!$F$24:$H$24','Statistics!$F$35:$H$35'), ('<c:cat><c:strLit><c:ptCount val="0" /></c:strLit></c:cat>','<c:cat><c:strRef><c:f>Statistics!$F$11:$H$11</c:f></c:strRef></c:cat>')],
'xl/drawings/charts/chart2.xml': [('Statistics!$C$24:$E$24','Statistics!$C$35:$E$35'), ('<c:cat><c:strLit><c:ptCount val="0" /></c:strLit></c:cat>','<c:cat><c:strRef><c:f>Statistics!$C$11:$E$11</c:f></c:strRef></c:cat>')],
}
with ZipFile(src,'r') as zin, ZipFile(tmp,'w',ZIP_DEFLATED) as zout:
 for item in zin.infolist():
  data=zin.read(item.filename)
  if item.filename in replacements:
   text=data.decode('utf-8')
   for old,new in replacements[item.filename]:
    if old not in text: raise ValueError(f'Expected chart fragment missing: {item.filename}: {old}')
    text=text.replace(old,new)
   data=text.encode('utf-8')
  zout.writestr(item,data)
os.replace(tmp,src)
print('Patched the two statistics chart data ranges and category labels.')
