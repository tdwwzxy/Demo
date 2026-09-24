'use strict';
const $=s=>document.querySelector(s);
const state={report:null,all:[],range:'3y',page:0,total:0,visible:[],hover:-1};
const fmt=(n,d=5)=>n==null?'—':Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=s=>new Date(s).toLocaleString('zh-CN',{hour12:false});
async function api(url,options){const r=await fetch(url,options);if(!r.ok){const text=await r.text();let msg;try{const j=JSON.parse(text);msg=j.error||j.message;}catch{}throw Error(msg||`请求失败 (${r.status})`);}return r.json();}
function error(e){$('#error').textContent=e.message;$('#error').hidden=false;}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,5000);}
async function load(){
  $('#error').hidden=true;
  const [r,all]=await Promise.all([api('/api/report'),api('/api/series?from=1900-01-01')]);
  state.report=r;state.all=all;
  $('#ratio').textContent=fmt(r.latest.normalized,5);$('#ratio-note').textContent=`低于均线 ${fmt(-r.latest.deviationPct,2)}%`;
  if(r.latest.deviationPct>=0)$('#ratio-note').textContent=`高于均线 ${fmt(r.latest.deviationPct,2)}%`;
  $('#close').textContent=fmt(r.latest.close,5);$('#sma').textContent=fmt(r.latest.ma3y,5);$('#count').textContent=fmt(r.totalRows,0);
  $('#trade-date').textContent=`交易日期 ${r.latestDate}`;$('#coverage').textContent=`${r.firstDate} — ${r.latestDate}`;
  $('#freshness').textContent=`行情截至 ${r.latestDate}　·　富途 US.ZNmain　·　${r.calendarAgeDays>4?'历史快照，建议更新行情':'已载入本地行情'}`;
  const check=r.latestProviderCheck;
  $('#provider-check').textContent=check?`最近核验 ${time(check.retrievedAt)}`:`获取于 ${time(r.retrievedAt)}`;
  $('#generated-at').textContent=`生成于 ${time(r.generatedAt)}`;
  $('#report-image').src=`/api/report.png?v=${encodeURIComponent(r.id)}`;
  $('#bands').innerHTML=r.bands.map(b=>{const lo=b.center-b.halfWidth,hi=b.center+b.halfWidth,active=r.latest.normalized>=lo&&r.latest.normalized<=hi;return `<div class="band-row ${active?'current':''}"><i class="band-mark"></i><b>${fmt(b.center,3)}</b><span class="interval">${fmt(lo,4)} – ${fmt(hi,4)}</span><span class="band-state">${active?'当前所在区域':'参考区域'}</span></div>`;}).join('');
  const info={'数据来源':r.source,'价格口径':'close · 日收盘价 · autype=0','行情获取时间':time(r.retrievedAt),'报表生成时间':time(r.generatedAt),'首个有效均线日期':r.firstNormalizedDate,'结算价缺失':`${r.missingSettlementRows} 条（保留为空）`,'PNG 输出路径':r.outputPath,'PNG SHA-256':r.pngSha256};
  $('#provenance').innerHTML=Object.entries(info).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  $('#sources').innerHTML=r.sources.map(s=>`<div class="source-file"><a href="/api/raw/${encodeURIComponent(s.name)}" target="_blank" rel="noopener">${esc(s.name)} ↗</a><span>${s.rows} 条</span><code>${esc(s.sha256)}</code></div>`).join('');
  draw();await table();
}
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n===b));document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==b.dataset.view);if(b.dataset.view==='overview')draw();window.scrollTo({top:0});}));
document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>{state.range=b.dataset.range;state.hover=-1;$('#tooltip').hidden=true;document.querySelectorAll('[data-range]').forEach(n=>n.classList.toggle('selected',n===b));draw();}));
async function table(){
  const q=new URLSearchParams({page:state.page,size:25});if($('#from-date').value)q.set('from',$('#from-date').value);if($('#to-date').value)q.set('to',$('#to-date').value);
  const r=await api(`/api/data?${q}`);state.total=r.total;
  $('#table-body').innerHTML=r.rows.map(p=>`<tr><td>${p.date}</td>${[p.open,p.high,p.low,p.close,p.settle].map(n=>`<td>${fmt(n,5)}</td>`).join('')}<td>${fmt(p.volume,0)}</td><td>${fmt(p.ma3y,5)}</td><td>${fmt(p.normalized,6)}</td><td class="${p.deviationPct<0?'negative':''}">${p.deviationPct==null?'—':fmt(p.deviationPct,2)+'%'}</td></tr>`).join('')||'<tr><td colspan="10">该日期范围没有记录</td></tr>';
  $('#table-count').textContent=`共 ${fmt(r.total,0)} 条 · 每页 25 条`;
  $('#page-number').textContent=`${state.page+1} / ${Math.max(1,Math.ceil(r.total/25))}`;
  $('#previous').disabled=state.page===0;$('#next').disabled=(state.page+1)*25>=r.total;
}
$('#previous').onclick=()=>{state.page--;table().catch(error);};$('#next').onclick=()=>{state.page++;table().catch(error);};
$('#date-filter').onsubmit=e=>{e.preventDefault();state.page=0;table().catch(error);};$('#clear-filter').onclick=()=>{$('#from-date').value='';$('#to-date').value='';state.page=0;table().catch(error);};
$('#regenerate').onclick=async()=>{const b=$('#regenerate');b.disabled=true;b.textContent='正在生成…';try{await api('/api/report/regenerate',{method:'POST',headers:{'X-Report-Client':'local-report'}});await load();toast('PNG、CSV 和清单已重新生成；行情日期保持为最新本地交易日。');}catch(e){error(e);}finally{b.disabled=false;b.textContent='↻ 重新生成报表';}};
$('#import-form').onsubmit=async e=>{e.preventDefault();const b=$('#import-button');b.disabled=true;try{const form=new FormData();form.append('file',$('#import-file').files[0]);await api('/api/data/import',{method:'POST',headers:{'X-Report-Client':'local-report'},body:form});state.page=0;await load();toast('数据已校验、导入并生成报表。');}catch(e){error(e);}finally{b.disabled=false;}};
const canvas=$('#chart'),ctx=canvas.getContext('2d');
function draw(){
  if(!state.all.length||$('#overview').hidden)return;
  const W=canvas.clientWidth,H=canvas.clientHeight;if(!W||!H)return;
  const dpr=window.devicePixelRatio||1;canvas.width=W*dpr;canvas.height=H*dpr;ctx.scale(dpr,dpr);
  const last=state.all.at(-1),cut=new Date(last.date+'T00:00:00Z');
  if(state.range==='6m')cut.setUTCMonth(cut.getUTCMonth()-6);else if(state.range==='1y')cut.setUTCFullYear(cut.getUTCFullYear()-1);else if(state.range==='3y'){cut.setUTCMonth(0,1);cut.setUTCFullYear(cut.getUTCFullYear()-2);}else cut.setUTCFullYear(1900);
  const rows=state.all.filter(p=>new Date(p.date+'T00:00:00Z')>=cut);state.visible=rows;if(!rows.length)return;
  const L=W<600?46:58,R=22,T=15,B=34,w=W-L-R,h=H-T-B;
  const min=Math.floor(Math.min(...rows.map(p=>p.normalizedLow))/.01)*.01-.005;
  const max=Math.ceil(Math.max(...rows.map(p=>p.normalizedHigh))/.01)*.01+.005;
  const t0=Date.parse(rows[0].date),t1=Date.parse(rows.at(-1).date)+86400000*10;
  const x=p=>L+(Date.parse(p.date)-t0)/(t1-t0)*w,y=v=>T+(max-v)/(max-min)*h;
  state.chart={L,R,T,B,w,h,t0,t1,W,H,x,y};
  ctx.clearRect(0,0,W,H);ctx.save();ctx.beginPath();ctx.rect(L,T,w,h);ctx.clip();
  state.report.bands.forEach(b=>{ctx.fillStyle='#fcf1f0';ctx.fillRect(L,y(b.center+b.halfWidth),w,y(b.center-b.halfWidth)-y(b.center+b.halfWidth));});
  ctx.font='10px "Segoe UI",sans-serif';ctx.lineWidth=1;ctx.setLineDash([3,4]);
  for(let v=Math.ceil(min/.01)*.01;v<=max;v+=.01){ctx.strokeStyle=Math.abs(v-1)<.00001?'#afc6bd':'#e6ede8';ctx.beginPath();ctx.moveTo(L,y(v));ctx.lineTo(L+w,y(v));ctx.stroke();}
  ctx.setLineDash([]);ctx.beginPath();rows.forEach((p,i)=>i?ctx.lineTo(x(p),y(p.normalizedHigh)):ctx.moveTo(x(p),y(p.normalizedHigh)));[...rows].reverse().forEach(p=>ctx.lineTo(x(p),y(p.normalizedLow)));ctx.closePath();ctx.fillStyle='#e9bcbc80';ctx.fill();
  ctx.beginPath();rows.forEach((p,i)=>i?ctx.lineTo(x(p),y(p.normalized)):ctx.moveTo(x(p),y(p.normalized)));ctx.strokeStyle='#ac3232';ctx.lineWidth=1.65;ctx.stroke();
  const p=rows.at(-1);ctx.beginPath();ctx.arc(x(p),y(p.normalized),3,0,Math.PI*2);ctx.fillStyle='#ac3232';ctx.fill();
  if(state.hover>=0&&rows[state.hover]){const p=rows[state.hover];ctx.setLineDash([3,3]);ctx.strokeStyle='#819d95';ctx.beginPath();ctx.moveTo(x(p),T);ctx.lineTo(x(p),T+h);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(x(p),y(p.normalized),4,0,Math.PI*2);ctx.fillStyle='#14766d';ctx.fill();}
  ctx.restore();ctx.fillStyle='#84958d';ctx.font='10px "Segoe UI",sans-serif';ctx.textAlign='right';
  const step=max-min>.15?.025:.01;for(let v=Math.ceil(min/step)*step;v<=max;v+=step)ctx.fillText(v.toFixed(step===.025?3:2),L-10,y(v)+3);
  ctx.textAlign='center';const labels=W<600?4:7;for(let i=0;i<labels;i++){const p=rows[Math.round((rows.length-1)*i/(labels-1))];ctx.fillText(p.date.slice(0,7),x(p),H-10);}
  $('#chart-period').textContent=`${rows[0].date} — ${rows.at(-1).date}　/　${rows.length} 个交易日`;
}
canvas.addEventListener('pointermove',e=>{const c=state.chart;if(!c)return;const bounds=canvas.getBoundingClientRect(),mx=e.clientX-bounds.left;let best=0,dist=Infinity;state.visible.forEach((p,i)=>{const d=Math.abs(c.x(p)-mx);if(d<dist){dist=d;best=i;}});state.hover=best;const p=state.visible[best];const tip=$('#tooltip');tip.innerHTML=`<b>${p.date}</b><br>归一化值　${fmt(p.normalized,6)}<br>收盘价　　${fmt(p.close,5)}<br>3 年均价　${fmt(p.ma3y,5)}<br>偏离　　　${fmt(p.deviationPct,2)}%`;tip.hidden=false;tip.style.left=Math.max(5,Math.min(mx+25,c.W-220))+'px';tip.style.top='25px';draw();});
canvas.addEventListener('pointerleave',()=>{state.hover=-1;$('#tooltip').hidden=true;draw();});new ResizeObserver(()=>draw()).observe(canvas);
load().catch(error);
