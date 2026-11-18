'use strict';
const C=window.STUDY, gate=new FitdModel.ConsentStorage(localStorage), store=new FitdModel.Store(gate,C), main=document.querySelector('#app');
let mode='random',entryAt=new Date().toISOString(),entryView='consent',lastVisible='';
const params=new URLSearchParams(location.search),review=params.get('review')==='1',channel=C.channels.includes(params.get('channel'))?params.get('channel'):'direct';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,text)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)} ↗</a>`;
const btn=(a,t,secondary=false)=>`<button type="button" data-action="${a}" class="${secondary?'secondary':''}">${t}</button>`;
const dt=t=>t?new Date(t).toLocaleString('zh-CN',{hour12:false}):'—';
const status={active:'进行中',completed:'已结束',incomplete:'未完成（保留）',technical_missing:'技术故障（缺失）',excluded:'未纳入分析'};
const exclusionLabels={unconfirmed:'未提交最终确认',declined:'拒绝保留明细',ineligible:'不符合条件',technical_problem:'技术问题',incomplete:'超时未完成'};
function error(e){let box=document.querySelector('#error');if(!box){box=document.createElement('p');box.id='error';box.className='error';box.role='alert';main.prepend(box);}box.textContent=e.message||String(e);}
function photo(){return `<figure class="campus-photos"><img src="assets/bnu-cat-01.jpg" alt="北师大校园秋日小猫组图"><img src="assets/bnu-cat-02.jpg" alt="北师大校园夜晚草地上的小猫"></figure>`;}
function tools(p){return `<details><summary>退出、撤回与数据保存</summary><p class="note">匿名编号 <code>${esc(p.id)}</code>。记录保存在当前浏览器，可在本页撤回。</p><div class="actions">${btn('technical','遇到技术问题，结束并标记缺失',true)}${btn('export-current','下载本次完整记录',true)}</div><form id="withdraw"><label class="check"><input type="checkbox" required>撤回参与并永久删除本次记录及所有事件</label><button class="danger">确认撤回并删除</button></form></details>`;}
function consent(){return `<p class="eyebrow">校园公益信息</p><h1>了解身边的流浪动物</h1><p class="lead">浏览校园动物信息，按自己的意愿选择是否进一步了解。</p><p>预计需要 3–5 分钟，可随时结束。本站不接收捐款。</p><p class="note">这是静态演示。体验记录只保存在当前浏览器。开始后会留下简要统计，结束时可选择是否保留具体选择。</p><div class="actions">${btn('begin-screen','开始浏览')}${btn('decline-consent','暂不参加',true)}</div><p class="note">伦理材料编号：${C.ethicsReference}</p>${review?'<details><summary>小组审阅：指定演示路径</summary><label><input type="radio" name="mode" value="random" checked>随机</label> <label><input type="radio" name="mode" value="fitd">登门槛组</label> <label><input type="radio" name="mode" value="control">对照组</label></details>':''}`;}
function screeningFields(){const qs=[['adult','我已年满 18 周岁'],['student','我是目前在校的大学生'],['chinese','我能阅读并理解中文说明'],['independent','我能独立操作网页并自主作出选择'],['prior','在本次浏览之前，我已参加过本研究的预测试或正式实验'],['designer','我参与过本研究方案或网页设计'],['hypothesis','在本次浏览开始前，我已知道本研究的具体分组或研究假设'],['comfortable','我能够接受校园流浪动物主题材料']];return qs.map(([key,q])=>`<fieldset><legend>${q}</legend><label><input type="radio" name="${key}" value="yes" required>是</label><label><input type="radio" name="${key}" value="no" required>否</label></fieldset>`).join('');}
function experiment(p){const end=btn('finish',p.stage==='petition'?'不签署，结束体验':p.stage==='request'?'暂不查看，结束体验':p.stage==='options'?'结束体验，查看说明':'暂不参与，结束体验',true);let html='';
  if(p.stage==='home')html=`<p class="eyebrow">校园流浪动物关爱</p><div class="hero"><div><h1>给身边的它们<br>多一份妥善照顾</h1><p class="lead">让关爱建立在科学与责任之上。</p><p>校园里的小猫有着各自的日常。关爱身边的流浪动物，不只是一次喂食，也需要持续、负责的照顾。</p><p>科学、人道的管理与负责任的养宠，有助于减少遗弃，让动物与社区更好地相处。</p></div>${photo()}</div><div class="actions">${btn('continue','继续了解')}${end}</div>`;
  if(p.stage==='petition')html=`<p class="eyebrow">公益倡议 / 自愿支持</p><h1>支持科学关爱校园流浪动物</h1><blockquote>我支持以科学、人道的方式关爱校园流浪动物，倡导负责任地养宠、不遗弃，并支持适当的绝育、救助和领养。</blockquote><p>如果你认同，请输入一个化名并勾选支持。化名原文不会被保存。</p><form id="petition"><label for="alias">你的化名（1–30 字）</label><input type="text" id="alias" name="alias" maxlength="30" required autocomplete="off" placeholder="请勿填写真实姓名"><label class="check"><input type="checkbox" id="support" required ${p.support?'checked':''}>我支持上述倡议。</label><button>提交支持并继续</button></form><div class="actions">${end}</div>`;
  if(p.stage==='request')html=`<p class="eyebrow">公益信息 / 自主选择</p><h1>你愿意了解捐助方式吗？</h1><p class="lead">为流浪动物提供帮助，可以从了解开始。</p><p>你是否愿意进一步了解如何通过公益组织支持动物保护与救助？你可以进入渠道页，查看相关机构的官方信息，再自主决定是否采取进一步行动。</p><p>本网站不接收捐款。查看信息不会产生费用，也不会自动发起支付。</p><div class="actions">${btn('options','查看捐助渠道')}${end}</div>`;
  if(p.stage==='options')html=`<p class="eyebrow">捐助渠道 / 机构信息</p><h1>了解动物保护组织的工作</h1><p>以下是公开的机构信息入口，供你了解其工作及支持方式，并非已核定的校园专项募款页。本站不接受付款，不追踪站外浏览或实际捐款。</p><div class="links">${C.charities.map(c=>`<a href="${c.url}" data-charity="${c.id}" target="_blank" rel="noopener noreferrer"><strong>${c.name} ↗</strong><span>${c.description}</span></a>`).join('')}</div><p class="note">主动点击后将在新标签页打开。本站记录点击，不代表对方网站成功加载；机构未参与或背书本研究。外部网站访问情况取决于当地网络。</p><div class="actions">${end}</div>`;
  if(p.stage==='debrief')html=`<p class="eyebrow">事后说明</p><h1>谢谢你的参与</h1><p class="lead">本研究关注：先回应一个小请求，是否会改变随后对较大请求的回应。</p><p>这是对“网络登门槛效应”的课堂适应性复现。登门槛组先接触支持倡议，再接触捐助信息请求；对照组直接接触相同的捐助信息请求。拒绝签署倡议会直接结束，不会被带入后续请求。</p><section><h2>本次体验</h2><p>组别：<strong>${p.condition==='fitd'?'登门槛组':'对照组'}</strong> · ${p.assignment==='random'?'随机分配':'手动指定 Demo 路径'}<br>状态：${status[p.status]}<br>匿名编号：<code>${p.id}</code></p><p class="note">主要指标是主动进入渠道页，次要指标是主动点击公益组织外链。点击不等同于真实捐款，也不能单独证明某一心理机制。</p></section><p>拒绝倡议或未点击链接仍是有效选择。超时未完成或报告技术问题的记录标为舍弃。撤回将删除记录。所有本次记录都是演示数据。</p><p>公开演示版只在当前浏览器保存体验记录。</p><div class="actions">${btn('export-current','下载本次完整记录')}<a class="button secondary" href="#/data">查看本机记录</a>${btn('restart','开始一条新体验',true)}</div>`;
  if(p.stage==='debrief'&&gate.pending)html=finalConsent(p);
  return `<div class="topline"><span class="pill">校园信息浏览</span><a href="#/">返回入口</a></div>${html}${p.stage==='debrief'&&!gate.pending?tools(p):p.stage!=='debrief'?'<div class="actions">'+btn('technical','页面出现技术问题，结束',true)+'</div>':''}`;
}
function finalConsent(p){return `<p class="eyebrow">体验结束 / 知情同意与事后说明</p><h1>谢谢你的参与</h1><p>本体验用于社会心理学课程研究，考察先回应小请求是否影响随后对捐助信息请求的回应。两条路径分别为先支持倡议再查看捐助请求，以及直接查看同一请求。为减少对选择的影响，具体目的在此说明。</p><p>本次组别：<strong>${p.condition==='fitd'?'登门槛组':'对照组'}</strong>。拒绝倡议、未进入渠道和未打开外链均为自主选择，不影响你的权益。本站不收款、不记录实际支付，点击不等于捐款。</p><h2>是否允许保留本次记录？</h2><p>拟保留匿名编号、入选筛选答案、分组、招募渠道、页面选择、浏览器时间及停留时长。不保存化名、姓名、学号、联系方式或 IP。</p><p>开始时已留下一条简要统计记录。本次具体选择暂存在页面内存中，符合条件且同意后才保存在此浏览器。刷新或关闭页面会丢弃尚未确认的具体选择，统计记录标记为未确认。</p><p>你可以拒绝保留选择明细。此时只保留本次统计记录和舍弃原因。符合条件且同意后，仍可通过结束页撤回；若记录已被导出，可提供匿名编号联系删除副本。</p><p>这是流程 Demo，记录不并入正式分析。正式采集的保留期限、样本量及补偿安排尚待固定。如有疑问，请联系向你分享本演示的课程小组。</p><p class="note">伦理材料编号：${C.ethicsReference}</p><form id="final-consent"><h2>确认参与条件</h2><p>请根据本次浏览开始前的情况回答。无需姓名、学号、手机号或身份证。不符合条件时，本次选择及筛选答案均不会保存。</p>${screeningFields()}<label class="check"><input type="checkbox" required>我已阅读事后说明，理解真实目的及数据用途，自愿允许保留本次匿名记录。</label><div class="actions"><button>同意并保存本次记录</button>${btn('decline-final','不同意保留选择明细',true)}</div></form>`;}
function csv(rows,fields){return '\ufeff'+[fields,...rows.map(r=>fields.map(k=>typeof r[k]==='object'?JSON.stringify(r[k]):r[k]??''))].map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');}
function download(name,value,type='application/json'){const url=URL.createObjectURL(new Blob([value],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function dataPage(d){return `<p class="eyebrow">仅当前浏览器 / 非服务器后台</p><h1>本机体验记录</h1><p>共 ${d.records.length} 条。不会自动汇总其他设备的数据。编号用于在此浏览器恢复记录，不是跨设备账号。</p><p class="note">纳入分析：1 表示采纳，0 表示舍弃。仅统计的记录不显示选择明细。</p><div class="actions">${btn('export-all','导出完整 JSON')}${btn('export-participants','导出参与者 CSV',true)}${btn('export-events','导出全部事件 CSV',true)}<a href="#/">返回入口</a></div><div class="table-wrap"><table><thead><tr><th>编号</th><th>组别 / 分配</th><th>状态</th><th>纳入分析</th><th>舍弃原因</th><th>渠道</th><th>签署</th><th>进入渠道</th><th>外链点击</th><th>恢复</th></tr></thead><tbody>${d.records.map(p=>{const r=storeSummary(p);return `<tr><td title="${p.id}">${p.id.slice(-8)}</td><td>${p.condition} / ${p.assignment}</td><td>${status[p.status]}</td><td>${r.include_in_analysis}</td><td>${exclusionLabels[r.exclusion_reason]||'—'}</td><td>${p.channel}</td><td>${r.petition_submitted??'缺失'}</td><td>${r.donation_options_opened??'缺失'}</td><td>${r.charity_outbound_clicked??'缺失'}</td><td>${p.summaryOnly?'—':`<button data-resume="${p.id}">打开</button>`}</td></tr>`;}).join('')||'<tr><td colspan="10">还没有记录。</td></tr>'}</tbody></table></div>${d.records.filter(p=>!p.summaryOnly).map(p=>`<details><summary>${p.id.slice(-8)} · ${dt(p.createdAt)} · ${p.events.length} 条事件</summary><p class="note">完整编号：<code>${p.id}</code> · 版本 ${esc(p.version)}。停留时长按本阶段开始到事件的累计毫秒数计算，包括后台停留，并非注意时长。</p><div class="table-wrap"><table><tr><th>事件</th><th>页面</th><th>选择</th><th>时间</th><th>停留 ms</th></tr>${p.events.map(e=>`<tr><td>${esc(e.name)}</td><td>${esc(e.stage)}</td><td>${esc(JSON.stringify(e.detail))}</td><td>${esc(e.at)}</td><td>${e.dwell_ms}</td></tr>`).join('')}</table></div></details>`).join('')}`;}
const storeSummary=p=>store.summary?store.summary(p):Object.assign({},p);
function render(){try{const d=store.load(),p=store.current(d),route=location.hash;
  document.querySelector('footer').hidden=!(review||p?.dataConsent==='accepted');
  if((route==='#/data'||route==='#/sources')&&!(review||p?.dataConsent==='accepted')){main.innerHTML='<h1>请先完成本次浏览</h1><a href="#/experiment">返回浏览</a>';return;}
  if(route==='#/data')main.innerHTML=dataPage(d);
  else if(route==='#/sources')main.innerHTML=`<p class="eyebrow">可追溯的真实材料</p><h1>材料来源与使用说明</h1><p>照片与外链使用用户提供的素材包和候选清单前两项。照片经授权转载，来源如下。</p>${photo()}<ol class="source-list">${C.sources.map(s=>`<li>${link(s.url,s.title)}<small>${esc(s.note)}</small></li>`).join('')}</ol><a href="#/">返回入口</a>`;
  else if(route==='#/experiment'&&p)main.innerHTML=experiment(p);
  else if(p&&gate.pending)main.innerHTML=experiment(p);
  else if(p)main.innerHTML=`<p class="eyebrow">匿名体验</p><h1>欢迎回来</h1><p>此浏览器已保存体验记录，无需注册或使用第三方账号。</p><section><p>匿名编号：<code>${p.id}</code><br>当前状态：${status[p.status]}</p></section><div class="actions"><a class="button" href="#/experiment">${p.status==='active'?'继续体验':'查看结束说明'}</a>${btn('restart','开始新体验',true)}<a href="#/data">本机记录</a></div>`;
  else main.innerHTML=entryView==='ineligible'?`<h1>感谢你的关注</h1><p>根据本次研究的统一条件，本次体验不纳入分析。只保留简要统计及舍弃原因。</p>${btn('back-consent','返回入口',true)}`:entryView==='left'?`<h1>已结束</h1><p>你未入组，没有保存筛选或选择数据。</p>${btn('back-consent','返回入口',true)}`:entryView==='declined'?`<h1>已结束</h1><p>你的选择明细已丢弃，本次只保留简要统计记录。</p>${btn('back-consent','返回入口',true)}`:entryView==='withdrawn'?`<h1>本次记录已删除</h1><p>该编号对应的记录及事件已删除。已下载或交付的文件副本不受此操作影响。</p>${btn('back-consent','返回入口',true)}`:consent();
  const visibleKey=p&&route==='#/experiment'?p.id+':'+p.stage:'';
  if(visibleKey&&visibleKey!==lastVisible&&p.status==='active')store.act('visible',p.stage);
  lastVisible=visibleKey;
}catch(e){main.innerHTML='<h1>无法安全保存或读取记录</h1><p>请检查浏览器是否允许本地存储，以及存储空间是否充足。恢复存储后刷新重试；为避免数据丢失，暂不继续体验。</p>';error(e);}}
async function serialized(fn){try{if(navigator.locks)await navigator.locks.request('fitd-demo',fn);else await fn();}catch(e){error(e);}}
main.addEventListener('change',e=>{if(e.target.name==='mode')mode=e.target.value;if(e.target.id==='support')serialized(()=>{const ok=store.act('support','petition',{support:e.target.checked});if(!ok)render();});});
main.addEventListener('submit',e=>{e.preventDefault();const form=e.target;
 serialized(async()=>{
   const record=store.current();
   if(form.id==='final-consent'){
     if(!gate.pending||record?.stage!=='debrief'||!form.reportValidity())return;
     const answers=Object.fromEntries(new FormData(form));
     if(!store.confirmEligibility(answers)){
       gate.decline('ineligible');
       entryView='ineligible';location.hash='/';render();return;
     }
     const draft=store.read(), confirmed=store.current(draft);
     confirmed.consentAt=new Date().toISOString();
     confirmed.dataConsent='accepted';
     store.event(confirmed,'data_use_confirmed');
     store.write(draft);
     gate.accept();
     render();
   } else if(form.id==='petition'){
     const alias=form.elements.alias.value.trim();
     if(!alias||alias.length>30){error(Error('请输入 1–30 字化名。'));return;}
     if(!document.querySelector('#support').checked)return;
     store.act('sign','petition');render();
   } else if(form.id==='withdraw'&&record){
     store.withdraw(record.id);
     entryView='withdrawn';location.hash='/';render();
   }
 });});
main.addEventListener('click',e=>{const a=e.target.closest('[data-action],[data-resume],[data-charity]');if(!a)return;const action=a.dataset.action;
 if(a.dataset.charity){e.preventDefault();try{const p=store.current();if(p&&store.act('outbound','options',{charity:a.dataset.charity})){window.open(C.charities.find(c=>c.id===a.dataset.charity).url,'_blank','noopener,noreferrer');}else render();}catch(err){error(err);}return;}
 serialized(async()=>{if(a.dataset.resume){if(store.resume(a.dataset.resume)){location.hash='/experiment';render();}return;}
 if(action?.startsWith('export-')){if(gate.pending)throw Error('请先在结束页确认是否保留记录。');const d=store.load(),p=store.current(d),today=new Date().toISOString().slice(0,10);if(action==='export-current'){if(p)download(`demo-${p.id}.json`,JSON.stringify({schema:2,exportedAt:new Date().toISOString(),record:p},null,2));}
 else if(action==='export-all')download(`demo-all-${today}.json`,JSON.stringify({...d,exportedAt:new Date().toISOString()},null,2));
 else if(action==='export-participants'){const rows=d.records.map(p=>store.summary(p));download(`demo-participants-${today}.csv`,csv(rows,['id','mode','version','condition','assignment','channel','status','stage','created_at','consent_at','entry_at','last_interaction','ended_at','screening','petition_submitted','donation_options_opened','charity_outbound_clicked','missing_reason','include_in_analysis','exclusion_reason']),'text/csv;charset=utf-8');}
 else {const rows=d.records.flatMap(p=>p.events.map(e=>({participant_id:p.id,...e,include_in_analysis:store.summary(p).include_in_analysis}))); download(`demo-events-${today}.csv`,csv(rows,['participant_id','id','name','detail','stage','at','dwell_ms','condition','channel','version','include_in_analysis']),'text/csv;charset=utf-8');}return;}
 if(action==='begin-screen'){
   if(!a.isConnected)return;
   if(!gate.pending){
     gate.begin();
     store.enroll(null,mode,channel,null,entryAt,true);
   }
   gate.markExcluded('unconfirmed');
   location.hash='/experiment';render();return;
 }
 if(action==='decline-final'&&gate.pending){gate.decline('declined');entryView='declined';location.hash='/';render();return;}
 if(action==='restart'){if(gate.pending){location.hash='/experiment';render();return;}store.reset();mode='random';entryView='consent';entryAt=new Date().toISOString();location.hash='/';render();return;}
 if(['decline-consent','leave-screen','back-consent'].includes(action)){entryView=action==='back-consent'?'consent':'left';render();return;}
 const p=store.current();if(p)store.act(action,p.stage);render();});});
window.addEventListener('hashchange',()=>{render();main.focus();});
window.addEventListener('storage',e=>{if(e.key===gate.key&&!gate.pending)render();});
window.addEventListener('pageshow',()=>render());
setInterval(()=>{try{const p=store.current();if(p?.status==='incomplete'&&location.hash==='#/experiment'&&!main.textContent.includes('事后说明'))render();}catch(e){error(e);}},5000);
// Probe before enrolling: blocked/full localStorage must never appear to succeed.
try{localStorage.setItem('fitd.probe','1');localStorage.removeItem('fitd.probe');render();}catch(e){error(Error('浏览器禁止本地存储，无法记录选择。请使用正常浏览模式并允许本地存储。'));}
