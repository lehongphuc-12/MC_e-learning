import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const {FileBlob,SpreadsheetFile}=await import(pathToFileURL('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1111-570-0_26.1111.570.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs'));
const src='D:/Đồ_Án_Tốt_Nghiệp/REPORT_V1/Report5_Unit Test_V2.xlsx';
const outDir='D:/Đồ_Án_Tốt_Nghiệp/MC_e-learning/outputs/01a16979-2c42-70b2-99f7-907593c91bbc';
const out=`${outDir}/Report5_Unit Test_V2_completed.xlsx`;
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(src));
const fn=wb.worksheets.getItem('Functions');
const stats=wb.worksheets.getItem('Statistics');
const functionRows=[
[13,'CreateCourse','CourseService','CreateCourseAsync','CRS_01','Create Course','Creates a course for the authenticated instructor, validates the selected category and course data, and applies the draft or approval-submission rules.','1. Instructor is authenticated. 2. Required course fields and price are valid. 3. Selected category exists when supplied. 4. Submission prerequisites are met when requesting admin approval.'],
[14,'UpdateCourse','CourseService','UpdateCourseAsync','CRS_02','Update Course','Updates an instructor-owned course, validates changes and prevents direct publishing; validates course content when submission for admin approval is requested.','1. Course exists and belongs to the authenticated instructor. 2. Update fields and selected category are valid. 3. Approval prerequisites are met when requesting admin approval.'],
[15,'DeleteCourse','CourseService','DeleteCourseAsync','CRS_03','Delete Course','Deletes an instructor-owned course after existence, ownership and related enrollment/payment constraints are checked according to the service policy.','1. Course exists and belongs to the authenticated instructor. 2. Deletion is permitted by enrollment and payment rules.'],
[16,'View Module','ModuleService','GetModulesByCourseIdAsync','MOD_01','View Module','Retrieves the course modules in display order and maps their lesson information for the course-management view.','1. CourseId is valid. 2. Course modules and their related lesson records are available.'],
[17,'Create Module','ModuleService','CreateModulesBulkAsync','MOD_02','Create Module','Creates modules and their lesson entries in bulk, applying the request defaults and mapping associated lesson video references.','1. Authenticated instructor owns the course. 2. Module and lesson inputs satisfy required validation. 3. Any referenced video-storage data is valid.'],
[18,'Update Module','ModuleService','UpdateModuleAsync','MOD_03','Update Module','Updates the selected module fields and ordering after validating that the module exists and belongs to the instructor’s course.','1. Module exists and belongs to a course owned by the authenticated instructor. 2. Updated values are valid.'],
[19,'Delete Module','ModuleService','DeleteModuleAsync','MOD_04','Delete Module','Deletes the selected module and its dependent lesson records according to the module deletion policy.','1. Module exists and belongs to a course owned by the authenticated instructor. 2. Dependent lesson data can be handled by the deletion policy.'],
[20,'View Lesson','LessonService','GetLessonsByCourseIdAsync','LES_01','View Lesson','Retrieves course lessons in the configured order and maps lesson/material details required by the management view.','1. CourseId is valid. 2. Lesson and related material records are available.'],
[21,'Create Lesson','LessonService','CreateLessonsBulkAsync','LES_02','Create Lesson','Creates lessons in bulk and coordinates the video-upload workflow: create upload sessions, upload the files to R2, and complete sessions to attach object keys.','1. Authenticated instructor owns the course. 2. Lesson data and selected video files satisfy validation. 3. Upload sessions are valid and completed for their matching lessons.'],
[22,'Update Lesson','LessonService','UpdateLessonAsync','LES_03','Update Lesson','Updates lesson information and coordinates a replacement-video upload through an R2 upload session and completion step.','1. Lesson exists and belongs to the authenticated instructor’s course. 2. Updated fields are valid. 3. Replacement upload session matches the lesson and uploaded object.'],
[23,'Delete Lesson','LessonService','DeleteLessonAsync','LES_04','Delete Lesson','Deletes lesson media through DeleteVideoAsync and then deletes the lesson record, applying the configured cleanup behavior for storage failures.','1. Lesson exists and belongs to the authenticated instructor’s course. 2. Associated media/object keys and dependent records are available to the cleanup workflow.']
];
// Extend the existing table with its current row style and preserve the workbook's column layout.
fn.getRange('A22:H22').copyTo(fn.getRange('A23:H33'),'all');
fn.getRange('A23:F33').values=functionRows.map(r=>r.slice(0,6));
fn.getRange('G23:H33').values=functionRows.map(r=>r.slice(6,8));
fn.getRange('A23:H33').format.wrapText=true;
fn.getRange('A23:H33').format.verticalAlignment='center';
fn.getRange('A23:H33').format.rowHeight=48;
fn.getRange('A34:H34').clear({applyTo:'contents'});

// Fix two source-sheet summary formulas that otherwise undercount or miscount test outcomes.
const createModule=wb.worksheets.getItem('Create Module');
createModule.getRange('A7').formulas=[['=COUNTIF(F40:T40,"P")']];
createModule.getRange('C7').formulas=[['=COUNTIF(F40:T40,"F")']];
const updateLesson=wb.worksheets.getItem('Update Lesson');
updateLesson.getRange('L7:N7').formulas=[['=COUNTIF(F29:HQ29,"N")','=COUNTIF(F29:HQ29,"A")','=COUNTIF(F29:HQ29,"B")']];

// Make room for 11 CRUD functions in the existing statistics report without adding a sheet.
stats.getRange('A24:I24').copyTo(stats.getRange('A35:I35'),'all');
stats.getRange('A26:I30').copyTo(stats.getRange('A37:I41'),'all');
stats.getRange('A23:I23').copyTo(stats.getRange('A24:I34'),'all');
const crud=[
['Create Course','CRS_01'],['Update Course','CRS_02'],['Delete Course','CRS_03'],
['View Module','MOD_01'],['Create Module','MOD_02'],['Update Module','MOD_03'],['Delete Module','MOD_04'],
['View Lesson','LES_01'],['Create Lesson','LES_02'],['Update Lesson','LES_03'],['Delete Lesson','LES_04']
];
for(let i=0;i<crud.length;i++){
 const row=24+i; const [sheetName,code]=crud[i];
 stats.getRange(`A${row}:B${row}`).values=[[i+13,code]];
 stats.getRange(`C${row}:I${row}`).formulas=[[
  `='${sheetName}'!A7`,`='${sheetName}'!D7`,`='${sheetName}'!F7`,
  `='${sheetName}'!L7`,`='${sheetName}'!M7`,`='${sheetName}'!N7`,`='${sheetName}'!O7`
 ]];
}
stats.getRange('B35').values=[['Sub total']];
stats.getRange('C35:I35').formulas=[['=SUM(C12:C34)','=SUM(D12:D34)','=SUM(E12:E34)','=SUM(F12:F34)','=SUM(G12:G34)','=SUM(H12:H34)','=SUM(I12:I34)']];
stats.getRange('D37:D41').formulas=[['=IFERROR((C35+D35)*100/I35,0)'],['=IFERROR(C35*100/I35,0)'],['=IFERROR(F35*100/I35,0)'],['=IFERROR(G35*100/I35,0)'],['=IFERROR(H35*100/I35,0)']];
stats.getRange('D42:D43').clear({applyTo:'contents'});
// Statistics details stay in rows 12-35; summary metrics now follow the expanded table.
// Move existing charts below the expanded report; their data references are repointed in the exported XLSX.
for(const chart of stats.charts.items){
 if(chart.title?.text==='Test Type') chart.setPosition('J45','R60');
 else if(chart.title?.text==='Passed Percent') chart.setPosition('A45','I60');
}
wb.recalculate();
const check=await wb.inspect({kind:'table',sheetId:'Statistics',range:'A11:I43',include:'values,formulas',tableMaxRows:40,tableMaxCols:9,maxChars:10000});
console.log(check.ndjson);
const outBlob=await SpreadsheetFile.exportXlsx(wb); await outBlob.save(out);
for(const sheetName of ['Functions','Statistics']){
 const img=await wb.render({sheetName,autoCrop:'all',scale:1,format:'png'});
 await fs.writeFile(`${outDir}/${sheetName.replaceAll(' ','_')}_after.png`,new Uint8Array(await img.arrayBuffer()));
}
console.log(`OUTPUT ${out}`);



