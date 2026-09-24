import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const dist=path.join(root,'dist');
const source=path.join(root,'../src/main/resources/static');
const base=process.env.REPORT_URL||'http://127.0.0.1:8081';
await fs.mkdir(path.join(dist,'snapshot/raw'),{recursive:true});
async function get(route){const r=await fetch(base+route);if(!r.ok)throw Error(`${route}: ${r.status}`);return r;}
const report=await (await get('/api/report')).json();
report.outputPath='report.png';
const rows=[];
for(let page=0;rows.length<report.totalRows;page++){
 const batch=await (await get(`/api/data?page=${page}&size=500`)).json();
 if(!batch.rows.length)throw Error('Incomplete snapshot');
 rows.push(...batch.rows);
}
rows.sort((a,b)=>a.date.localeCompare(b.date));
await fs.writeFile(path.join(dist,'snapshot/report.json'),JSON.stringify(report));
await fs.writeFile(path.join(dist,'snapshot/rows.json'),JSON.stringify(rows));
await fs.writeFile(path.join(dist,'snapshot/manifest.json'),JSON.stringify(report,null,2));
for(const [route,file] of [['/api/report.png','report.png'],['/api/data.csv','data.csv']])
 await fs.writeFile(path.join(dist,'snapshot',file),Buffer.from(await (await get(route)).arrayBuffer()));
for(const s of report.sources){
 if(path.basename(s.name)!==s.name)throw Error('Unsafe source name');
 await fs.writeFile(path.join(dist,'snapshot/raw',s.name),Buffer.from(await (await get('/api/raw/'+encodeURIComponent(s.name))).arrayBuffer()));
}
let html=await fs.readFile(path.join(source,'index.html'),'utf8');
html=html.replaceAll('本地研究台','手机研究台').replace('工作空间 / LOCAL','工作空间 / MOBILE').replace('本地服务运行中','已发布行情快照').replace('Java 21 · Spring Boot · Maven','图表 · 筛选 · 下载').replace('● LOCALHOST','● 手机浏览版').replace('正在读取本地行情…','正在读取行情快照…').replace('本地历史记录','历史交易记录');
html=html.replace(/<button id="regenerate"[\s\S]*?<\/button>/,'');
html=html.replace(/<p class="notice">[\s\S]*?<\/details>/,`<p class="notice">手机浏览版 · 行情截至 ${report.latestDate}，不是实时行情。图表、筛选及下载可直接使用；新数据导入和报表重新生成需在电脑端完成，再重新发布。</p>`);
html=html.replaceAll('/api/report.png','/snapshot/report.png').replaceAll('/api/data.csv','/snapshot/data.csv').replaceAll('/api/manifest.json','/snapshot/manifest.json');
let js=await fs.readFile(path.join(source,'app.js'),'utf8');
const start=js.indexOf('async function api('),end=js.indexOf('\nfunction error',start);
js=js.slice(0,start)+`let snapshotPromise;
async function api(input){
 snapshotPromise??=Promise.all(['/snapshot/report.json','/snapshot/rows.json'].map(async u=>{const r=await fetch(u);if(!r.ok)throw Error('行情快照加载失败，请刷新重试');return r.json();})).catch(e=>{snapshotPromise=null;throw e;});
 const [report,rows]=await snapshotPromise;
 const url=new URL(input,location.origin);
 const from=url.searchParams.get('from')||'0000-01-01',to=url.searchParams.get('to')||'9999-12-31';
 if(from>to)throw Error('开始日期不能晚于结束日期');
 if(url.pathname==='/api/report')return report;
 const filtered=rows.filter(r=>r.date>=from&&r.date<=to);
 if(url.pathname==='/api/series')return filtered.filter(r=>r.normalized!=null);
 if(url.pathname==='/api/data'){const page=Number(url.searchParams.get('page')||0),size=Number(url.searchParams.get('size')||25);const ordered=filtered.slice().reverse();return {total:ordered.length,rows:ordered.slice(page*size,(page+1)*size)};}
 throw Error('手机浏览版不支持此操作');
}`+js.slice(end);
const removeStart=js.indexOf("$('#regenerate').onclick"),removeEnd=js.indexOf('const canvas=',removeStart);
js=js.slice(0,removeStart)+js.slice(removeEnd);
js=js.replaceAll('/api/report.png','/snapshot/report.png').replaceAll('/api/raw/','/snapshot/raw/').replace("'PNG 输出路径':r.outputPath,",'').replace("'已载入本地行情'","'已载入行情快照'");
await fs.writeFile(path.join(dist,'index.html'),html);
await fs.writeFile(path.join(dist,'app.js'),js);
let css=await fs.readFile(path.join(source,'styles.css'),'utf8');
css+='\n@media(max-width:600px){.page-title h1{font-size:1.65rem}.page-title{gap:16px}.actions{flex-wrap:wrap}.local-badge{white-space:nowrap}.freshness{flex-wrap:wrap;gap:8px}.freshness .right{margin-left:0}#date-filter{flex-wrap:wrap;gap:10px}.source-file{overflow-wrap:anywhere}.prose dd{overflow-wrap:anywhere}.range-group button{min-height:40px}.secondary,.primary{min-height:40px}}\n';
await fs.writeFile(path.join(dist,'styles.css'),css);
console.log(`Exported ${rows.length} rows; market date ${report.latestDate}; ${report.sources.length} sources`);
