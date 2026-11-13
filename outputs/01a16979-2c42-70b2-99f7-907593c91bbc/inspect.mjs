import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const mod=await import(pathToFileURL('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1111-570-0_26.1111.570.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs'));
const {FileBlob,SpreadsheetFile}=mod;
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load('D:/Đồ_Án_Tốt_Nghiệp/REPORT_V1/Report5_Unit Test_V2.xlsx'));
console.log((await wb.inspect({kind:'sheet',include:'id,name',maxChars:5000})).ndjson);
for (const sheetName of ['Functions','Statistics','Create Module','Update Lesson']) {
 const img=await wb.render({sheetName,autoCrop:'all',scale:1,format:'png'});
 await fs.writeFile(`D:/Đồ_Án_Tốt_Nghiệp/MC_e-learning/outputs/01a16979-2c42-70b2-99f7-907593c91bbc/${sheetName.replaceAll(' ','_')}_before.png`,new Uint8Array(await img.arrayBuffer()));
}
