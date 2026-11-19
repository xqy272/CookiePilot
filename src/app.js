(() => {
'use strict';
const C=window.CookiePilotCore2,E=window.CookiePilotEngine2;if(!C||!E||window.top!==window)return;
const demo=document.documentElement.dataset.cookiePilotDemo==='true';
if(!demo&&(location.hostname!=='orteil.dashnet.org'||!/^\/cookieclicker\/(?:index\.html)?$/.test(location.pathname)))return;
if(window.CookiePilot2){window.CookiePilot2.show();return;}window.CookiePilot?.destroy?.();
const esc=C.escape,F=C.fmt,T=C.time;
const icons={cookie:'M20 12a5 5 0 0 1-6-6 4 4 0 0 1-5-4A10 10 0 1 0 22 15a4 4 0 0 1-2-3ZM7 9h.01M10 16h.01M16 17h.01M6 14h.01',home:'m3 10 9-7 9 7v10H3ZM9 20v-7h6v7',rules:'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',buy:'M3 3h2l3 12h11l2-8H6M9 20h.01M18 20h.01',leaf:'M19 3C8 2 2 8 5 15s15 3 14-12ZM5 20 16 9',magic:'m4 20 13-13 3 3L7 23ZM4 3v4M2 5h4M17 1v4M15 3h4M21 15v4M19 17h4',market:'M3 3v18h18M7 15l4-5 4 3 6-8',growth:'M12 21V8M7 13l5-5 5 5M5 5h14',save:'M4 3h13l3 3v15H4ZM7 3v6h9V3M8 21v-7h8v7',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',pause:'M8 5v14M16 5v14',play:'m7 4 14 8-14 8Z',close:'m6 6 12 12M6 18 18 6',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',shield:'m12 2 8 4v7c0 5-8 9-8 9s-8-4-8-9V6ZM8 12l3 3 5-6',chevron:'m9 5 7 7-7 7',refresh:'M20 7a9 9 0 1 0 1 8M20 2v6h-6',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',flask:'M9 2h6M10 2v7l-6 10v3h16v-3L14 9V2M7 15h10',bell:'M6 17V9a6 6 0 0 1 12 0v8l2 2H4ZM10 22h4'};
const I=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]||icons.spark}"/></svg>`;
const host=document.createElement('div');host.id='cookie-pilot-v2';host.style.cssText='position:fixed;inset:0;z-index:1000000000;pointer-events:none;';const root=host.attachShadow({mode:'open'});(document.body||document.documentElement).append(host);
const engine=new E.Engine(()=>window.Game,localStorage,{hidden:()=>document.hidden,change:()=>{theme();render();},log:()=>{}});
let page='overview',search='',selectedTile='2,2',destroyed=false,timer,leaseRelease,leasePending=false,leaseEpoch=0,toastTimer,update=null,updateText='尚未检查',checking=false,lab=false,pending=null,liveAt=0,ruleAt=0,checkingAt=0;
const urls=new Set(),seen=new WeakSet();let audio=null;
const pages=[
 ['overview','总览'],['automation','玩法规则'],['planning','规划台'],
 ['history','操作记录'],['settings','挂机设置'],['storage','存档']
];
root.innerHTML=`<style>${window.CookiePilotStyles2||''}</style>
 <div class="backdrop" id="backdrop" hidden>
  <section class="window" role="dialog" aria-modal="true" aria-labelledby="cp-title">
   <header class="head">
    <div class="brand-icon">${I('cookie')}</div>
    <h1 class="wordmark" id="cp-title">Cookie Pilot</h1>
    ${demo?'<small>模拟存档</small>':''}
    <div class="grow"></div>
    <button type="button" id="pause" class="primary head-action" aria-label="暂停全部自动化">${I('pause')} 暂停</button>
    <button type="button" id="close" class="ghost head-action" aria-label="关闭工作台">${I('close')} 收起</button>
   </header>
   <nav class="workbench-nav" aria-label="工作台导航">
    ${pages.map(([key,name])=>`<button type="button" class="nav" data-page="${key}">${name}</button>`).join('')}
   </nav>
   <main class="main" id="main"></main>
  </section>
 </div>
 <div class="toast" id="toast" role="status" hidden></div>
 <dialog class="confirm" id="confirm" aria-labelledby="confirm-title" aria-describedby="confirm-text">
  <h3 id="confirm-title"></h3><p id="confirm-text"></p>
  <div class="actions"><button id="confirm-cancel">取消</button><button id="confirm-ok" class="primary">确认操作</button></div>
 </dialog>
 <input type="file" id="settings-file" accept="application/json,.json" hidden>`;
const $=id=>root.getElementById(id),main=$('main');
const entryHost=document.createElement('span');entryHost.id='cookie-pilot-entry';entryHost.style.cssText='display:inline-block;vertical-align:middle;margin:3px 8px 3px 5px;position:relative;z-index:5;';const entryRoot=entryHost.attachShadow({mode:'open'});entryRoot.innerHTML=`<style>${window.CookiePilotStyles2||''}</style><button type="button" class="entry" aria-label="打开 Cookie Pilot 工作台" aria-expanded="false">${I('cookie')} Pilot</button>`;
function mountEntry(){const top=document.getElementById('topBar');if(top&&!entryHost.isConnected)top.prepend(entryHost);else if(!top&&!entryHost.isConnected){const fallback=document.getElementById('game')||document.body;fallback.prepend(entryHost);}}
mountEntry();const observer=new MutationObserver(()=>{if(!entryHost.isConnected)mountEntry();});observer.observe(document.body,{childList:true,subtree:true});
const adStyle=document.createElement('style');adStyle.textContent='#support,#smallSupport,#sectionAd,.supportComment,.supportPlaceholder,.adBanner,.adsbygoogle{display:none!important}';
const media=window.matchMedia('(prefers-color-scheme: light)');
function theme(){const mode=engine.c.theme==='system'?(media.matches?'light':'dark'):engine.c.theme;for(const h of [host,entryHost])h.dataset.theme=mode;host.dataset.density=engine.c.density;if(engine.c.ads&&!adStyle.isConnected)(document.head||document.documentElement).append(adStyle);if(!engine.c.ads)adStyle.remove();}
media.addEventListener('change',theme);
const tag=(s,cls='')=>`<span class="tag ${cls}">${esc(s)}</span>`;
const btn=(text,action,arg='',cls='',disabled=false)=>`<button type="button" class="${cls}" data-action="${action}" data-arg="${esc(arg)}"${disabled?' disabled':''}>${text}</button>`;
const head=(title,sub,extra='')=>`<div class="heading"><div><h2>${title}</h2><p>${sub}</p></div>${extra}</div>`;
const note=s=>`<p class="note">${s}</p>`;
const block=(title,body,hint='')=>`<section class="block"><div class="block-head"><h3>${title}</h3><span>${hint}</span></div>${body}</section>`;
const row=(icon,title,sub,tail='')=>`<div class="row">${I(icon)}<div class="row-info"><strong>${title}</strong><p>${sub}</p></div>${tail}</div>`;
const field=(key,label,type='number',opts={})=>`<label class="field"><span>${label}</span><input data-key="${key}" aria-label="${label}" type="${type}" value="${esc(engine.c[key])}" ${opts.min!==undefined?`min="${opts.min}"`:''} ${opts.max!==undefined?`max="${opts.max}"`:''} step="${opts.step||'any'}"></label>`;
const select=(key,label,options,value=engine.c[key])=>`<label class="field"><span>${label}</span><select data-key="${key}" aria-label="${label}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
const check=(key,label)=>`<label class="check"><input type="checkbox" data-key="${key}" aria-label="${label}" ${engine.c[key]?'checked':''}>${label}</label>`;
const empty=(title,sub)=>`<div class="empty">${I('shield')}<h3>${title}</h3><p>${sub}</p></div>`;
const stats=items=>`<div class="summary">${items.map(([label,value])=>`<div><div class="value">${value}</div><label>${label}</label></div>`).join('')}</div>`;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').hidden=true;},5500);}
function show(value=true){
 engine.c.open=value;
 engine.persist();
 $('backdrop').hidden=!value;
 entryRoot.querySelector('button').setAttribute('aria-expanded',String(value));
 if(value){render();$('close').focus();}
 else entryRoot.querySelector('button').focus();
}
function navigate(next){
 page=next;
 shownView='';
 search='';
 main.scrollTop=0;
 render();
 root.querySelector('[data-page="'+activePage()+'"]')?.focus({preventScroll:true});
}
function ask(title,text,fn){
 pending=fn;
 $('confirm-title').textContent=title;
 $('confirm-text').textContent=text;
 $('confirm').showModal();
 $('confirm-cancel').focus();
}
function download(text,name,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type}));urls.add(url);const a=document.createElement('a');a.href=url;a.download=name;root.append(a);a.click();a.remove();setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},15000);}
const stamp=at=>new Date(at).toISOString().replace(/[:.]/g,'-');
const safeLink=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return'';}};
async function checkUpdate(){if(checking)return;checking=true;updateText='正在检查…';render();try{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);let response;try{response=await fetch(engine.c.releaseBase+'/'+engine.c.updateChannel+'.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});}finally{clearTimeout(timeout);}if(!response.ok)throw Error('HTTP '+response.status);const text=await response.text();if(text.length>100000)throw Error('更新清单过大');const data=JSON.parse(text);C.semver(data.version);if(!Array.isArray(data.gameVersions)||typeof data.notes!=='string'||!safeLink(data.userscript)||!safeLink(data.zip))throw Error('更新清单格式不正确');const available=C.newer(data.version,C.VERSION);update=available?data:null;updateText=available?'有新版本 '+data.version:'已安装 '+C.VERSION+' · 发布频道 '+data.version;checkingAt=Date.now();}catch(e){update=null;updateText='暂时无法检查：'+e.message+'；当前版本继续使用';}finally{checking=false;if(page==='settings')render();}}
function buffs(g){const list=Object.values(g.buffs||{});return list.length?`<div class="chips">${list.map(b=>`<span class="chip">${esc(b.dname||b.name)} · ${T(b.time/(g.fps||30))}</span>`).join('')}</div>`:note('当前没有临时增益。');}
function gardenPage(g,c){const info=C.garden(g);if(!info)return head('花园','生长、突变与收获。')+empty('花园尚未解锁','将农场升至 1 级，解锁后此处会读取真实花园。')+btn('规划解锁花园','plan-unlock','Farm');const{m,cells}=info,selected=cells.find(t=>t.key===selectedTile);let html=head('花园',`${m.plantsUnlockedN} / ${m.plantsN} 种子 · 下次生长 ${m.freeze?'已冻结':T(info.next)}`,tag(m.freeze?'冻结中':'正在生长',m.freeze?'':'good'));
 html+=`<div class="cols"><div><div class="garden" aria-label="真实花园">${cells.map(t=>`<button type="button" data-action="tile" data-arg="${t.key}" class="tile ${t.mature?'mature':''} ${t.key===selectedTile?'selected':''} ${c.protectedTiles.includes(t.key)?'protected':''}" ${!t.unlocked?'disabled':''} aria-label="${t.x+1},${t.y+1} ${esc(t.p?.name||'空地')}" title="${esc(t.p?.name||'空地')}"><span class="symbol">${t.p?'♧':'·'}</span><span class="plant-label">${esc(t.p?.name||'')}</span></button>`).join('')}</div><div class="tile-info">${selected?.p?`<strong>${esc(selected.p.name)}</strong><p class="note">年龄 ${F(selected.age)}% · 成熟 ${selected.p.mature}%<br>预计成熟 ${T(selected.eta)} · 枯萎 ${T(selected.death)}</p>`:'<span class="muted">选择格子查看植物或突变机会。</span>'}</div><div class="actions">${btn(c.protectedTiles.includes(selectedTile)?'取消格子保护':'保护此格','protect-tile',selectedTile)}${selected?.p?btn('收获此格','harvest-tile',selectedTile):''}${btn(m.freeze?'解冻花园':'冻结花园','freeze')}</div></div><div><h3>此格邻居的突变机会</h3>${selected&&!selected.p?C.mutations(g,selected.x,selected.y).map(x=>row('leaf',esc(x.name),'基础每次尝试概率；尚未计入土壤额外尝试',tag(F(x.chance*100,3)+'%'))).join('')||note('相邻植物尚不满足突变条件。'):note('突变需要空格；选择空地查看当前成熟邻居能够产生的结果。')}<div class="warning">生长时间是统计估算。点选格子上的保护标记会阻止助手收获和补种；不阻止游戏自然枯萎。</div></div></div>`;
 html+='<div class="actions">'+btn('收获规则','open-rule','harvest')+btn('补种规则','open-rule','plant')+'</div>';
 html+=block('种子收藏',`<div class="collection">${m.plantsById.map(p=>`<span class="${p.unlocked?'owned':''}">${p.unlocked?'✓ ':''}${esc(p.name)}</span>`).join('')}</div>`);return html;}
function magicPage(g,c){
 const m=C.mini(g,'Wizard tower'),p=C.mini(g,'Temple');
 let html=head('魔法与万神殿','法术预测、当前神灵和临时增益。');
 if(m){
  html+=stats([['当前魔力',F(m.magic)+' / '+F(m.magicM)],['恢复到满',T(C.manaSeconds(m,m.magicM,g.fps))],['累计施法',F(m.spellsCastTotal,0)]])+buffs(g);
  const spell=m.spells[c.spell];
  if(spell)html+=row('magic',esc(spell.name),'消耗 '+F(m.getSpellCost(spell))+' 魔力 · 反噬 '+F(m.getFailChance(spell)*100)+'%',btn('立即施法','cast-manual',c.spell));
  const forecast=C.forecast(g);
  html+=block('命运之手预测',check('prediction','显示条件预测')+
   (c.prediction?'<div class="forecast">'+forecast.map(item=>'<div><small>#'+item.index+' · '+(item.fail?'反噬':'成功')+
    '</small><span class="'+(item.good?'good':'bad')+'">'+esc(item.label)+'</span></div>').join('')+'</div>':'')+
   note('预测以当前季节、场上金饼干、建筑数及龙飞状态为条件。')+btn('施法规则','open-rule','cast','ghost'));
 }else html+=empty('魔法书尚未解锁','巫师塔升至 1 级后显示魔力、法术和预测。');
 html+=block('万神殿',p?facts(slots.map((slot,i)=>[slot,p.godsById[p.slot[i]]?.name||'空']))+
  note('当前剩余 '+p.swaps+' 次调换。')+btn('神灵规则','open-rule','pantheon','ghost'):
  empty('万神殿尚未解锁','神庙升至 1 级后可设置神灵。'));
 return html+btn('出售与回购规则','open-rule','godzamok','ghost');
}
function marketPage(g,c){const data=C.market(g,engine.hist);if(!data)return head('股市','价格位置、持仓和条件交易。')+empty('股市尚未解锁','银行升至 1 级后开始采集真实价格样本。');const{m,goods,overhead}=data;return head('股市','价格分位来自本机实际观察；不预测下一次涨跌。',tag('样本上限 2000 / 商品'))+stats([['游戏交易净额','$ '+F(m.profit)],['买入手续费',F((overhead-1)*100)+'%'],['银行办公室',String(m.officeLevel+1)]])+btn('条件交易规则','open-rule','trade','ghost')+`<div class="table-wrap"><table class="table"><thead><tr><th>商品</th><th>价格 / 分位</th><th>持仓 / 成本</th><th>固定买卖线（可选）</th><th>手动</th></tr></thead><tbody>${goods.map(r=>{const t=c.marketThresholds[r.q.id]||{buy:0,sell:0},lot=engine.ledger[r.q.id];return`<tr><td>${esc(r.q.name)}<small>${r.samples} 个样本</small></td><td class="num">$ ${F(r.price)}<small>${r.percentile===null?'尚无样本':F(r.percentile,0)+'% 分位'}</small></td><td class="num">${r.q.stock} / ${r.capacity}<small>${lot?.stock===r.q.stock?'成本 $'+F(lot.cost):'成本未记录'}</small></td><td><div class="actions"><input style="width:70px" type="number" min="0" step="any" data-market="${r.q.id}:buy" value="${t.buy}" aria-label="${esc(r.q.name)}买入价"><input style="width:70px" type="number" min="0" step="any" data-market="${r.q.id}:sell" value="${t.sell}" aria-label="${esc(r.q.name)}卖出价"></div></td><td><div class="actions">${btn('买 1','stock-buy',r.q.id)}${btn('卖出','stock-sell',r.q.id)}</div></td></tr>`;}).join('')}</tbody></table></div>`+note('固定买入线小于卖出线时，该商品改用固定价格条件；两个都填 0 恢复分位策略。银行等级、龙光环或本轮存档改变后重置样本。游戏图表的隐藏状态不影响助手。')+btn('导出本机价格样本','market-export');}
function growthPage(g,c){
 const dragon=g.dragonLevels?.[g.dragonLevel];
 const wrinklers=(g.wrinklers||[]).filter(w=>w.phase===2&&w.hp>0);
 const seasons=Object.entries(g.seasons||{}).map(([key,season])=>{
  const upgrades=Object.values(g.Upgrades||{}).filter(u=>u.season===key&&u.pool!=='toggle');
  return '<details class="advanced"><summary>'+esc(season.name)+' · '+upgrades.filter(u=>u.bought).length+' / '+upgrades.length+
   '</summary><div class="collection">'+upgrades.map(u=>'<span class="'+(u.bought?'owned':'')+'">'+
   (u.bought?'✓ ':'')+esc(u.dname||u.name)+'</span>').join('')+'</div></details>';
 });
 return head('长期成长','训练与光环、季节收藏和皱纹虫收益。')+
  block('龙与光环',row('spark','龙等级 '+g.dragonLevel,esc(C.plain(dragon?.action||'等待龙蛋')+' · '+C.plain(dragon?.costStr?.()||'')),btn('训练一级','dragon-manual'))+
   '<div class="actions">'+btn('训练规则','open-rule','dragon','ghost')+btn('光环规则','open-rule','aura','ghost')+btn('抚摸规则','open-rule','pet','ghost')+'</div>')+
  block('皱纹虫',facts([['当前数量',wrinklers.length+' 只'],['估算收益',F(wrinklers.reduce((sum,w)=>sum+C.wrinklerValue(g,w),0))+' 饼干']])+
   '<div class="actions">'+btn('收取普通皱纹虫','wrinklers-manual')+btn('收取规则','open-rule','wrinkler','ghost')+'</div>')+
  block('季节收藏',btn('季节规则','open-rule','season','ghost')+seasons.join(''));
}
function storagePage(g,c){const saves=engine.backups();return head('存档与实验室','重要操作留下可恢复的快照；实验室每次会话单独开启。')+`<div class="actions">${btn('立即备份','backup','','primary')}${btn('导出当前存档','export')}${btn('导出助手设置','settings-export')}${btn('导入助手设置','settings-import')}</div>`+note('保留最近 10 份普通快照与最多 5 份重点快照。迁移、组合出售和实验室快照会优先保留；请下载长期存档。')+block('快照记录',saves.map(s=>row('save',esc(s.label)+(s.pin?' · 重点':''),new Date(s.at).toLocaleString('zh-CN'),`<div class="actions">${btn('下载','backup-download',s.id)}${btn('恢复','restore',s.id)}</div>`)).join('')||note('尚无快照。'))+block('轻量实验室',`<label class="check"><input type="checkbox" id="lab-toggle" ${lab?'checked':''}>仅本次会话启用资源补给</label><div class="warning">补给会改变资源、累计产量、成就和转生进度。每次先备份，备份失败则不执行。还原快照会回退之后的游戏进度。</div><div class="actions">${[1,10,60].map(n=>`<button data-action="grant" data-arg="${n}" ${lab?'':'disabled'}>+ ${n} 分钟无增益产量</button>`).join('')}<button data-action="grant-lump" ${lab?'':'disabled'}>+ 1 糖块</button><button data-action="refill-magic" ${lab?'':'disabled'}>恢复全部魔力</button></div>`)+block('本次操作记录',engine.logs.slice(0,35).map(x=>`<div class="log"><time>${new Date(x.at).toLocaleTimeString('zh-CN')}</time><span>${esc(x.text)}</span></div>`).join('')||note('等待你开始。'));}
function settingsPage(g,c){return head('设置与更新','外观、运行保护与稳定的更新渠道。',tag('v'+C.VERSION))+`<div class="fields">${select('theme','界面主题',[['system','跟随系统'],['light','暖白'],['dark','石墨']])}${select('density','信息密度',[['comfortable','舒适'],['compact','紧凑']])}${field('backupMinutes','自动备份间隔 / 分钟','number',{min:1,max:120})}</div>`+block('运行偏好',check('background','标签页在后台时继续尝试运行')+note('浏览器可能降频、冻结或丢弃后台页面；不补发积压点击。')+check('remember','刷新后恢复已启用规则')+check('protectVeil','保护闪烁面纱，暂停点击和金饼干相关操作')+check('alerts','自然金饼干与驯鹿出现时提醒')+check('sound','事件提示音')+check('ads','隐藏游戏广告版面'))+note('扩展版的广告请求拦截在浏览器工具栏弹窗中控制。脚本版清理广告显示；网络拦截可交给已有广告拦截器。')+block('在线更新',`<div class="fields">${select('updateChannel','更新频道',[['stable','稳定版'],['beta','测试版']])}${field('releaseBase','更新发布根地址','url')}</div>${check('updateCheck','每天自动检查一次更新')}`+row('refresh',esc(updateText),update?esc(update.notes):'发布仓库：xqy272/CookiePilot',btn(checking?'检查中…':'检查更新','update'))+(update?`<div class="actions"><a href="${esc(safeLink(update.userscript))}" target="_blank" rel="noopener">打开油猴安装 / 更新页 ↗</a><a href="${esc(safeLink(update.zip))}" target="_blank" rel="noopener">下载完整版本 ↗</a></div>${note('适配游戏：'+esc(update.gameVersions.join('、'))+'。已安装的油猴脚本由管理器更新；更新后刷新游戏生效。本地扩展需替换文件并重新加载。')}`:'')+note('助手只读取版本清单，不下载执行远程代码。油猴完整脚本通过管理器更新。测试频道需要从该频道安装链接重新安装一次，随后由对应频道维护。'))+block('兼容性',row('shield','当前游戏 '+esc(g.version),C.compatible(g)?'已针对 2.058 接口适配':'未验证版本：只读信息保留，自动化停止',tag(C.compatible(g)?'已识别':'暂停',C.compatible(g)?'good':'warn'))+note('如果同时使用其他自动化 Mod，请关闭重叠操作。此助手不自动修改其他 Mod 的配置。')+`<div class="actions">${btn('关闭全部自动操作','preset','observe')}${btn('卸载本页助手','unload','','danger')}</div>`);}
const groups=[
 {id:'garden',name:'花园',icon:'leaf',rules:['harvest','plant'],analysis:'garden',link:'地块与种子'},
 {id:'magic',name:'魔法与万神殿',short:'魔法与神灵',icon:'magic',rules:['cast','pantheon','godzamok'],analysis:'magic',link:'法术与组合'},
 {id:'market',name:'股市',icon:'market',rules:['trade'],analysis:'market',link:'行情与持仓'},
 {id:'growth',name:'龙、季节与皱纹虫',short:'长期成长',icon:'growth',rules:['wrinkler','dragon','aura','pet','season'],analysis:'growth',link:'成长详情'},
 {id:'events',name:'点击与事件',icon:'spark',rules:['click','golden','deer','fortune','wrath']},
 {id:'supplies',name:'采购与糖块',icon:'buy',rules:['purchase','lump','lumpLevel']}
];
const shortRules={
 harvest:'种子收获',plant:'按布局补种',cast:'条件施法',pantheon:'神灵调换',godzamok:'爆发出售与回购',
 trade:'条件交易',wrinkler:'皱纹虫收取',dragon:'龙训练',aura:'光环切换',pet:'抚摸龙',season:'季节切换',
 click:'自动连点',golden:'金饼干',deer:'驯鹿',fortune:'幸运新闻',wrath:'愤怒饼干',purchase:'自动采购',lump:'糖块收取',lumpLevel:'糖块升级'
};
const unlocks={
 harvest:['Farm','农场'],plant:['Farm','农场'],cast:['Wizard tower','巫师塔'],pantheon:['Temple','神庙'],
 godzamok:['Temple','神庙'],trade:['Bank','银行']
};
const purchaseModes=[['efficient','按回本估算'],['target','持续购买指定目标'],['plan','完成一次规划目标']];
const reserveModes=[['none','不保留'],['lucky','当前幸运满额'],['frenzy','狂热幸运满额'],['custom','自定义']];
const castModes=[['mana','足够魔力时'],['full','满魔力'],['frenzy','7 倍生产增益'],['click','点击增益']];
const gardenModes=[['seeds','只收取新种子'],['mature','收取成熟植物'],['buff','达到生产倍率再收获']];
const layouts=[['rows','亲本行'],['checker','交错排列'],['fill','填满可种空地']];
const challengeModes=[['none','不启用'],['noClick','无点击'],['noUpgrade','无升级'],['both','无点击与无升级']];
const slots=['钻石槽','红宝石槽','翡翠槽'];
const selectedRules=new Map();
const lumpReserveModes=[['adaptive','按存档推荐'],['custom','自定保留量']];
let groupId='garden',planTab='purchase',shownView='',inspectedPurchase='',lumpDraft=null;

function activePage(){
 if(page==='queue')return'overview';
 if(['garden','magic','market','growth'].includes(page))return'automation';
 if(page==='purchase')return'planning';
 return page;
}
function automationGate(g,c){
 if(engine.startupHold)return'刷新后等待手动恢复';
 return C.gate(g,c,engine.env());
}
function tabs(items,current,action,label,cls='category-tabs'){
 return `<div class="${cls}" role="group" aria-label="${label}">${items.map(([key,name])=>
  `<button type="button" data-action="${action}" data-arg="${key}" aria-pressed="${key===current}">${esc(name)}</button>`
 ).join('')}</div>`;
}
function facts(items){
 return `<dl class="facts">${items.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
}
function ruleLock(g,key){
 const requirement=unlocks[key];
 if(requirement&&!C.mini(g,requirement[0]))return requirement[1]+'升至 1 级后可用';
 return'';
}
function lumpUpgradeReport(g,c,plan=C.lumpPlan(g,c)){
 if(plan.status==='done')return{label:'已达标',text:plan.reason,tone:'good'};
 if(plan.status==='unplanned')return{label:'待规划',text:plan.reason};
 if(['invalid','different-save'].includes(plan.status))return{label:'目标需确认',text:plan.reason,tone:'warn'};
 if(!c.lumpLevel)return{label:'已暂停',text:'已暂停此等级目标'};
 const gate=automationGate(g,c);
 if(gate)return{label:'已暂停',text:gate,tone:'warn'};
 if(['noUpgrade','both'].includes(c.challenge))return{label:'受保护',text:'无升级挑战保护',tone:'warn'};
 if(plan.status==='protected')return{label:'受保护',text:plan.reason,tone:'warn'};
 if(plan.status==='locked')return{label:'未解锁',text:plan.reason};
 if(plan.status==='waiting')return{label:'等预算',text:plan.reason};
 return{label:'待升级',text:plan.reason,tone:'good'};
}
function ruleReport(g,c,key){
 const locked=ruleLock(g,key);
 if(locked)return{label:'未解锁',text:locked};
 if(key==='lumpLevel')return lumpUpgradeReport(g,c);
 if(!c[key])return{label:'已关闭',text:'规则已关闭'};
 const gate=automationGate(g,c);
 if(gate)return{label:'已暂停',text:gate,tone:'warn'};
 const state=engine.states[key]||'';
 if(key==='harvest'||key==='plant'){
  const info=C.garden(g);
  if(info.m.freeze)return{label:'已冻结',text:'等待花园解除冻结',tone:'warn'};
  if(key==='plant'){
   const plan=C.plantingPlan(g,c,info);
   if(plan.tiles.length){
    const tile=plan.tiles[0];
    return{label:'待补种',tone:'good',text:C.tileName(tile)+' '+tile.plant.name+' · '+F(tile.cost)+' 饼干'};
   }
   if(/预算不足|暂缓/.test(plan.reason))return{label:'受保护',text:plan.reason,tone:'warn'};
   return{label:'等待',text:plan.reason};
  }
  if(key==='harvest'){
   const tile=C.harvestTargets(g,c,info)[0];
   if(tile)return{
    label:tile.mature?'待收获':'等成熟',
    tone:tile.mature?'good':'',
    text:C.tileName(tile)+' '+tile.p.name+(tile.mature?'已成熟':' · 预计 '+T(Math.max(info.next,tile.eta))+'后成熟')
   };
   const protectedCrop=info.cells.find(tile=>tile.unlocked&&tile.p&&c.protectedTiles.includes(tile.key));
   if(protectedCrop)return{label:'受保护',text:C.tileName(protectedCrop)+' 已标记保护，助手会跳过',tone:'warn'};
  }
 }
 if(key==='lump'){
  const lump=C.lumpWindow(g);
  if(!lump)return C.lumpBalance(g)===null?{label:'未解锁',text:'累计烘焙满 10 亿后开始生长'}:
   {label:'等待',text:'等待游戏初始化糖块计时'};
  if(lump.overripe)return{label:'等掉落',text:'等待游戏自然结算'};
  if(lump.remaining>0)return{label:'等成熟',text:T(lump.remaining)+'后可安全收取'};
  return{label:'待收取',text:'已到安全收取时间',tone:'good'};
 }
 if(key==='cast'){
  const cast=C.castPlan(g,c,engine.lastCast);
  if(!cast.reason)return{label:'待施法',text:cast.spell.name+' · 消耗 '+F(cast.cost)+' 魔力',tone:'good'};
  const timed=Number.isFinite(cast.seconds);
  return{label:timed?(cast.reason==='等待魔力'?'等魔力':'冷却中'):'等待条件',
   text:cast.reason+(timed?' · 约 '+T(cast.seconds):'')};
 }
 if(key==='pantheon'){
  const m=C.mini(g,'Temple');
  if(c.gods.some((god,index)=>god>=0&&m.slot[index]!==god)&&m.swaps-1<c.swapReserve){
   return{label:'保留次数',text:'剩 '+m.swaps+' 次调换 · 保留 '+c.swapReserve+' 次',tone:'warn'};
  }
 }
 if(key==='trade'&&!/^已(买入|卖出)/.test(state)){
  const goods=C.market(g,engine.hist).goods;
  if(goods.length&&goods.every(item=>item.samples<c.marketMinSamples&&!(c.marketThresholds[item.q.id]?.buy<c.marketThresholds[item.q.id]?.sell))){
   return{label:'等样本',text:'本机样本 '+Math.max(...goods.map(item=>item.samples))+' / '+c.marketMinSamples};
  }
 }
 if(/保护|不足|出售模式|暂停|暂缓|错误/.test(state))return{label:'受保护',text:state,tone:'warn'};
 if(key==='click'&&state.startsWith('运行中'))return{label:'运行中',tone:'good',text:'实际 '+F(engine.clickSample.rate,1)+' 次/秒 · 目标 '+c.rate+' 次/秒'};
 if(/已(买|卖|收|配|切|施)|完成|方案已匹配|正在|抚摸龙|补种 \d/.test(state)){
  return{label:'运行中',text:state,tone:'good'};
 }
 return{label:'等待',text:state&&state!=='已关闭'?state:'等待下一次规则检查'};
}

function purchaseControls(c){
 return `<div class="fields">
  ${select('purchaseMode','采购策略',purchaseModes)}
  ${select('reserveMode','库存保留策略',reserveModes)}
  ${c.reserveMode==='custom'?field('reserve','自定义库存保留','number',{min:0}):''}
  ${field('bulk','每次建筑数量','number',{min:1,max:100,step:1})}
  ${field('maxBuilding','单类建筑数量上限','number',{min:1,step:1})}
 </div><div class="check-list">${check('bridgePurchase','允许加快目标的过渡购买')}${check('holdCombo','点击爆发期间保留库存')}</div>`;
}
const ruleConfig={
 harvest(g){
  const info=C.garden(g);
  const protectedTiles=info.cells.filter(tile=>tile.unlocked&&tile.p&&engine.c.protectedTiles.includes(tile.key));
  const tile=info.cells.find(tile=>tile.key===selectedTile&&tile.unlocked)||
   C.harvestTargets(g,engine.c,info)[0]||protectedTiles[0];
  return check('harvest','自动收获成熟植物')+
   `<div class="fields">${select('gardenMode','收获策略',gardenModes)}
    ${engine.c.gardenMode==='buff'?field('harvestBuff','最低生产倍率','number',{min:1}):''}</div>`+
   (tile?`<div class="check-list"><label class="check"><input type="checkbox" data-protect="${tile.key}" aria-label="保护 ${C.tileName(tile)} 地块" ${engine.c.protectedTiles.includes(tile.key)?'checked':''}>保护 ${C.tileName(tile)} 地块</label></div>`:'');
 },
 plant(g){
  const picks=C.mini(g,'Farm').plantsById.filter(p=>p.unlocked&&p.plantable!==false).map(p=>[p.key,p.name]);
  return check('plant','按亲本布局自动补种')+`<div class="fields">
   ${select('seedA','种子 A',picks)}${select('seedB','种子 B',picks)}
   ${select('replantLayout','布局',layouts)}${field('gardenSpend','种植预算 / 可支配库存 %','number',{min:0,max:100})}</div>`;
 },
 cast(g){
  const m=C.mini(g,'Wizard tower');
  return check('cast','启用条件施法')+`<div class="fields">
   ${select('spell','目标法术',Object.entries(m.spells).filter(([key])=>key!=="gambler's fever dream").map(([key,s])=>[key,s.name]))}
   ${select('castCondition','触发条件',castModes)}${field('magicReserve','至少保留魔力','number',{min:0})}
   ${field('maxFail','最高反噬率 %','number',{min:0,max:100})}${field('castCooldown','冷却秒数','number',{min:1,step:1})}</div>`+
   check('prediction','计算命运之手预测')+check('predictOnlyGood','命运之手只接受增益或糖块预测');
 },
 pantheon(g,c){
  const m=C.mini(g,'Temple');
  const options=[[-1,'不自动调整'],...m.godsById.map(god=>[god.id,god.name])];
  return check('pantheon','保持神灵方案')+`<div class="fields">${slots.map((slot,i)=>select('god-'+i,slot,options,c.gods[i])).join('')}
   ${field('swapReserve','至少保留调换次数','number',{min:0,max:3,step:1})}</div>`;
 },
 godzamok(g,c){
  return check('godzamok','启用爆发出售与回购')+`<div class="fields">
   ${field('godzamokSell','每类最多出售','number',{min:1,step:1})}
   ${field('godzamokKeep','每类至少保留','number',{min:0,step:1})}</div>
   <div class="numeric-list">${g.ObjectsById.filter(o=>o.id>0).map(o=>`<label class="check">
   <input type="checkbox" data-godz="${o.id}" ${c.godzamokBuildings.map(String).includes(String(o.id))?'checked':''}>${esc(o.dname||o.name)}</label>`).join('')}</div>`;
 },
 trade(){
  return check('trade','启用条件交易')+`<div class="fields">
   ${field('marketBuy','买入分位 ≤ %','number',{min:0,max:49})}${field('marketSell','卖出分位 ≥ %','number',{min:51,max:100})}
   ${field('marketBudget','单笔预算 / 可支配库存 %','number',{min:0,max:100})}${field('marketCap','单项仓位上限','number',{min:1,step:1})}
   ${field('marketMinSamples','每项最少样本','number',{min:5,max:2000,step:1})}${field('marketProfit','最低净利润 %','number',{min:0})}</div>`;
 },
 wrinkler(){
  return check('wrinkler','按保留数量收取皱纹虫')+`<div class="fields">${field('wrinklerKeep','保留数量','number',{min:0,max:14,step:1})}</div>`+
   check('protectShiny','保护闪光皱纹虫');
 },
 dragon(g){
  return check('dragon','按目标等级训练')+`<div class="fields">${field('dragonMax','训练目标等级','number',{min:0,max:g.dragonLevels?.length-1||27,step:1})}</div>`;
 },
 aura(g){
  const options=[[-1,'不自动调整'],...Object.entries(g.dragonAuras||{}).map(([id,a])=>[id,(a.dname||a.name)+(g.dragonLevel<Number(id)+4?' · 未解锁':'')])];
  return check('aura','保持目标光环')+`<div class="fields">${select('aura0','主光环',options)}${select('aura1','副光环',options)}</div>`;
 },
 pet(){return check('pet','在原游戏龙面板打开时抚摸');},
 season(g){
  const options=[['','不切换'],...Object.entries(g.seasons||{}).map(([key,s])=>[key,s.name])];
  return check('season','保持目标季节')+`<div class="fields">${select('seasonTarget','目标季节',options)}</div>`;
 },
 click(){
  return check('click','启用自动连点')+`<div class="fields">${field('rate','目标次数 / 秒','number',{min:1,max:40,step:1})}
   ${select('clickMode','连点时机',[['always','持续点击'],['buff','仅点击增益期间']])}
   ${select('challenge','挑战保护',challengeModes)}</div>`+check('protectVeil','保护闪烁面纱');
 },
 golden(){return check('golden','拾取自然出现的金饼干');},
 deer(){return check('deer','拾取自然出现的驯鹿');},
 fortune(){return check('fortune','领取幸运新闻');},
 wrath(){return check('wrath','拾取愤怒饼干');},
 purchase(g,c){return check('purchase','启用自动采购')+purchaseControls(c)+btn('打开采购规划','plan-tab','purchase','ghost');},
 lump(){return check('lump','完全成熟后自动收取')+btn('查看糖块规划','plan-tab','lumps','ghost');},
 lumpLevel(g,c){
  const plan=C.lumpPlan(g,c);
  return (plan.object&&!['done','different-save'].includes(plan.status)?check('lumpLevel','让挂机执行此等级目标'):'')+
   btn('打开糖块规划','plan-tab','lumps','ghost');
 }
};
const descriptions={
 harvest:'按所选条件收获成熟植物，跳过保护格并保留培育亲本。',
 plant:'仅补种布局指定的空地，每次核对种子成本和库存。',
 cast:'每次施法前检查魔力、反噬率、预测条件和冷却。',
 pantheon:'逐个应用槽位配置，每次检查可用调换次数。',
 godzamok:'每次点击增益限执行一次，先备份并核对出售数量与回购预算。',
 trade:'按报价或本机分位交易，计入手续费。固定报价可在行情页设置。',
 wrinkler:'超过保留数量时，优先收取储量最多的可收取个体。',
 dragon:'训练可能消耗饼干或牺牲建筑，达到目标等级后停止。',
 aura:'切换光环会消耗一栋最高阶建筑。',
 pet:'打开原游戏的龙面板后执行，收齐掉落时等待。',
 season:'按设定切换季节，先检查解锁和库存。',
 click:'通过游戏的点击入口执行，显示实际生效频率。',
 golden:'只拾取仍在场的普通金饼干。',
 deer:'等待游戏自然生成驯鹿。',
 fortune:'只处理带有效 Fortune 效果的新闻。',
 wrath:'愤怒饼干可能触发负面效果。',
 purchase:'购买前核对保留线。规划目标完成一次后恢复按收益排序。',
 lump:'完全成熟后收取并开始下一轮生长。自然掉落由游戏结算。',
 lumpLevel:'每次升 1 级并核对糖块余额，达到规划等级后停止。'
};

function contextRows(g,c,group,key){
 if(group.id==='garden'){
  const info=C.garden(g);
  if(!info)return[['解锁条件','农场升至 1 级']];
  const tile=info.cells.find(tile=>tile.key===selectedTile&&tile.unlocked);
  const plants=info.cells.filter(tile=>tile.unlocked&&tile.p);
  const parents=plants.filter(tile=>[c.seedA,c.seedB].includes(tile.p.key)&&(c.protectedTiles.includes(tile.key)||c.plant&&c.replantLayout!=='fill'));
  return [
   ['亲本保护',parents.length?parents.slice(0,4).map(C.tileName).join('、')+' · '+parents.length+' 格':'尚无受保护亲本'],
   ['已保护地块',c.protectedTiles.length+' 格'],
   [tile?C.tileName(tile)+' 地块':'当前植株',tile?(tile.p?.name||'空地')+(tile.p?(tile.mature?' · 已成熟':' · 预计 '+T(Math.max(info.next,tile.eta))+'成熟'):''):plants.length+' 株'],
   ['已解锁种子',info.m.plantsUnlockedN+' / '+info.m.plantsN+' 种'],
   ['补种预算',F(Math.max(0,g.cookies-C.reserve(g,c))*c.gardenSpend/100)+' 饼干']
  ];
 }
 if(group.id==='magic'){
  const m=C.mini(g,'Wizard tower'),p=C.mini(g,'Temple');
  const spell=m?.spells[c.spell];
  return [
   ['当前魔力',m?F(m.magic)+' / '+F(m.magicM):'巫师塔升至 1 级解锁'],
   ['施法消耗',spell?F(m.getSpellCost(spell))+' · 反噬 '+F(m.getFailChance(spell)*100)+'%':'待选择法术'],
   ['调换次数',p?p.swaps+' 次':'神庙升至 1 级解锁'],
   ['钻石槽',p?.godsById[p.slot[0]]?.name||'空'],
   ...(engine.rebuy.length?[['组合回购','还剩 '+engine.rebuy.length+' 类待恢复']]:[])
  ];
 }
 if(group.id==='market'){
  const market=C.market(g,engine.hist);
  if(!market)return[['解锁条件','银行升至 1 级']];
  const unknown=unknownLots(market);
  return [['股市净额','$'+F(market.m.profit)],['买入手续费',F((market.overhead-1)*100)+'%'],
   ['成本未知的持仓',unknown.length?unknown.slice(0,3).map(x=>x.q.name+' '+x.q.stock+' 单位').join('、'):'无'],
   ['本机样本',market.goods.length?Math.max(...market.goods.map(item=>item.samples))+' / '+c.marketMinSamples:'尚无']];
 }
 if(group.id==='growth'){
  const wrinklers=(g.wrinklers||[]).filter(w=>w.phase===2&&w.hp>0);
  return [['龙等级',F(g.dragonLevel,0)],['当前季节',g.seasons?.[g.season]?.name||'常规'],
   ['皱纹虫',wrinklers.length+' 只 · 闪光 '+wrinklers.filter(w=>w.type===1).length+' 只']];
 }
 if(group.id==='events'){
  return [['本轮生效点击',F(engine.clicks,0)],['本轮事件拾取',F(engine.picked,0)],['面纱',C.veil(g,c)?'保护已生效':'当前未拦截']];
 }
 const plan=key==='purchase'?C.purchasePlan(g,c,{bridgedTarget:engine.bridgedTarget}):null;
 const lump=C.lumpWindow(g),balance=C.lumpBalance(g);
 if(key==='lumpLevel'){
  const target=C.lumpPlan(g,c);
  return [['糖块库存',balance===null?'尚未解锁':lumpCount(balance)],['最低保留',lumpCount(target.reserve??C.lumpBudget(g,c).reserve)],
   ...(target.object?[['等级目标',target.name+' '+target.current+' → '+target.target+' 级'],
    ['还需花费',lumpCount(target.totalCost)],...(target.shortfall?[['预算缺口',lumpCount(target.shortfall)]]:[])]:[])];
 }
 if(key==='lump')return [['糖块库存',balance===null?'尚未解锁':lumpCount(balance)],
  ['安全收取',lump?lump.overripe?'等待自然掉落':T(lump.remaining):'等待计时'],
  ['自然掉落',lump?T(lump.dropRemaining):'等待计时']];
 return [['饼干库存',F(g.cookies)],['保留线',F(plan?.target?.keep??C.reserve(g,c))],
  ...(plan?.target?[['目标',plan.target.name],['预算缺口',F(plan.target.shortfall)]]:[]),
  ['糖块',lump?F(g.lumps,0)+' 颗':'尚未解锁'],['安全成熟',lump?lump.overripe?'等待自然掉落':T(lump.remaining):'尚未解锁']];
}
function unknownLots(market){
 return market.goods.filter(({q})=>{
  const lot=engine.ledger[q.id];
  return q.stock>0&&(!lot||lot.stock!==q.stock||!Number.isFinite(lot.cost));
 });
}
function rulesView(g,c){
 const group=groups.find(item=>item.id===groupId);
 const key=selectedRules.get(group.id)||group.rules[0];
 const report=ruleReport(g,c,key);
 const locked=ruleLock(g,key);
 const action=group.analysis?btn(group.link,'navigate',group.analysis,'ghost'): '';
 return `<div class="rule-heading"><h2>${group.name}</h2>${action}</div>
  ${tabs(groups.map(item=>[item.id,item.name]),group.id,'rule-group','玩法分类')}
  ${tabs(group.rules.map(rule=>[rule,shortRules[rule]]),key,'rule-select','玩法规则','rule-tabs')}
  <div class="rule-layout">
   <section class="rule-card" aria-label="规则详情">
    <div class="card-title"><h3>${shortRules[key]}</h3>${tag(report.label,report.tone)}</div>
    <p class="rule-reason" data-current-rule="${key}">${esc(report.text)}</p>
    <p class="rule-copy">${esc(descriptions[key])}</p>
    ${locked?btn('规划解锁','plan-unlock',unlocks[key][0],'ghost'):ruleConfig[key](g,c)}
   </section>
   <section class="rule-card" aria-label="玩法状态"><h3>${group.name}状态</h3>
    ${facts(contextRows(g,c,group,key))}
   </section>
  </div>`;
}

function nextJobs(g,c){
 if(automationGate(g,c))return[];
 const jobs=[];
 const add=(key,title,seconds,detail)=>{
  if(Number.isFinite(seconds))jobs.push({key,title,seconds:Math.max(0,seconds),detail});
 };
 if(c.harvest){
  const info=C.garden(g);
  const tile=C.harvestTargets(g,c,info)[0];
  if(tile)add('harvest','收获 '+C.tileName(tile)+' 的'+tile.p.name,tile.mature?0:Math.max(info.next,tile.eta),'按花园生长速度估算');
 }
 if(c.plant){
  const tile=C.plantingPlan(g,c).tiles[0];
  if(tile)add('plant','在 '+C.tileName(tile)+' 补种'+tile.plant.name,0,'预计花费 '+F(tile.cost)+' 饼干');
 }
 if(c.cast){
  const cast=C.castPlan(g,c,engine.lastCast);
  if(cast.spell)add('cast','施放'+cast.spell.name,cast.seconds,'消耗 '+F(cast.cost)+' 魔力 · 保留 '+F(c.magicReserve));
 }
 if(c.lump){
  const lump=C.lumpWindow(g);
  if(lump&&!lump.overripe)add('lump','安全收取糖块',lump.remaining,'等游戏判定完全成熟');
 }
 if(c.lumpLevel&&!['noUpgrade','both'].includes(c.challenge)){
  const plan=C.lumpPlan(g,c);
  if(['ready','waiting'].includes(plan.status))add('lumpLevel',plan.name+'升至 '+(plan.current+1)+' 级',plan.nextSeconds,
   (plan.nextShortfall?'下一级还缺 '+lumpCount(plan.nextShortfall)+' · ':'消耗 '+lumpCount(plan.nextCost)+' · ')+
   '保留 '+lumpCount(plan.reserve)+' · 目标 '+plan.target+' 级');
 }
 if(c.purchase&&!engine.rebuy.length){
  const plan=C.purchasePlan(g,c,{bridgedTarget:engine.bridgedTarget});
  const item=plan.next||plan.target;
  if(item)add('purchase','买入 '+item.name,plan.seconds,plan.bridge?'过渡购买可缩短目标等待时间':
   item.shortfall>0?'还差 '+F(item.shortfall)+' 饼干 · 按当前被动产速估算':'买后预计保留 '+F(item.keep));
 }
 return jobs.sort((a,b)=>a.seconds-b.seconds);
}
function protections(g,c){
 if(automationGate(g,c))return[];
 const items=[];
 for(const key of ['harvest','plant','cast','pantheon','trade','godzamok','dragon','aura','wrinkler','season','click','purchase','lumpLevel']){
  if(!c[key])continue;
  const report=ruleReport(g,c,key);
  if(report.tone==='warn')items.push({key,title:shortRules[key],text:report.text});
 }
 if(c.trade){
  const market=C.market(g,engine.hist);
  const lot=market&&unknownLots(market)[0];
  if(lot)items.push({key:'trade',title:'股市 · '+lot.q.name,text:lot.q.stock+' 单位持仓的成本未知'});
 }
 return items;
}
function jobRows(jobs,compact){
 return jobs.map(({key,title,seconds,detail})=>
  `<button type="button" class="next-job" data-action="open-rule" data-arg="${key}">
   <span><strong>${esc(title)}</strong>${compact?'':`<small>${esc(detail)}</small>`}</span>
   <span class="eta">${seconds>0?'约 '+T(seconds):'条件满足'}</span>${I('chevron')}
  </button>`).join('');
}
function activity(g,c){
 const gate=automationGate(g,c),n=C.AUTO.filter(key=>c[key]).length;
 const title=engine.startupHold?'等待恢复挂机':engine.paused?'挂机已暂停':
  gate?'挂机等待':!n?'挂机待启用':document.hidden?'正在后台尝试挂机':'正在挂机';
 const message=gate||(n?'已启用 '+n+' / '+C.AUTO.length+' 条规则':'在玩法规则中启用，或选择日常挂机');
 const elapsed=engine.runningMs>0?T(engine.runningMs/1000):'0秒';
 return `<section class="run-summary" aria-label="本轮挂机状态">
  <div class="run-label">${I(gate?'shield':'spark')}<div><strong>${title}</strong><small>${esc(message)}</small></div></div>
  <div class="run-counts">运行 <b>${elapsed}</b> · 本轮 <b>${F(engine.actions,0)} 次动作</b></div>
 </section>`;
}
function compactOverview(g,c){
 const gate=automationGate(g,c);
 const jobs=nextJobs(g,c);
 const [first,...rest]=protections(g,c);
 const choose=C.AUTO.some(key=>c[key])?'':btn('配置日常挂机','preset','idle','ghost');
 return `<div class="overview">
  ${activity(g,c)}
  <section aria-label="下一步执行"><div class="card-title"><h3>下一步</h3>${btn('完整队列','navigate','queue','ghost')}</div>
   ${jobs.length?jobRows(jobs.slice(0,2),true):`<p class="queue-empty">${gate?'恢复后重新检查动作。':'等待自然事件或规则条件。'}${choose}</p>`}
  </section>
  ${first?`<button type="button" class="guard-summary" data-action="open-rule" data-arg="${first.key}">
   ${I('shield')}<span><strong>${esc(first.title)}</strong> · ${esc(first.text)}</span>
   ${rest.length?`<small>另 ${rest.length} 项</small>`:I('chevron')}</button>`:''}
  <div class="group-shortcuts" role="group" aria-label="玩法入口">${groups.map(group=>
   btn(esc(group.short||group.name)+`<small>${group.rules.filter(key=>c[key]).length}/${group.rules.length}</small>`,'rule-group',group.id)
  ).join('')}</div>
 </div>`;
}
function queuePage(g,c){
 const jobs=nextJobs(g,c),held=protections(g,c);
 const gate=automationGate(g,c);
 return `<div class="rule-heading"><h2>完整队列</h2>${btn('回到总览','navigate','overview','ghost')}</div>
  <section class="rule-card queue-card" aria-label="预计执行">
   <h3>预计执行</h3>${jobs.length?jobRows(jobs,false):note(esc(gate||'等待自然事件或规则条件。'))}
  </section>
  ${held.length?`<section class="rule-card queue-card" aria-label="执行保护"><h3>执行保护</h3>
   ${held.map(item=>row('shield',esc(item.title),esc(item.text),btn('打开规则','open-rule',item.key,'ghost'))).join('')}</section>`:''}`;
}
function logsPage(){
 return head('操作记录','本轮生效点击 '+F(engine.clicks,0)+' · 事件拾取 '+F(engine.picked,0)+' · 动作 '+F(engine.actions,0))+
  (engine.logs.map(entry=>`<div class="log"><time>${new Date(entry.at).toLocaleTimeString('zh-CN',{hour12:false})}</time><span>${esc(entry.text)}</span></div>`).join('')||note('尚无操作记录。'));
}
function planningPage(g,c){
 const tabsHtml=tabs([['purchase','采购与收益'],['combo','爆发组合'],['lumps','糖块与解锁'],['prestige','转生目标']],planTab,'plan-tab','规划类型');
 let detail;
 try{
  if(planTab==='purchase')detail=purchasePlanning(g,c);
  else if(planTab==='combo')detail=comboPlanning(g,c);
  else if(planTab==='lumps')detail=lumpPlanning(g,c);
  else detail=prestigePlanning(g,c);
 }catch(error){detail=empty('此规划暂时无法读取',esc(error.message));}
 return '<div class="rule-heading"><h2>规划台</h2></div>'+tabsHtml+detail;
}
function purchasePlanning(g,c){
 const rows=C.purchases(g,c);
 const plan=C.purchasePlan(g,c,{rows,bridgedTarget:engine.bridgedTarget});
 const filtered=rows.filter(item=>!search||item.name.toLowerCase().includes(search.toLowerCase()));
 const selected=filtered.find(item=>item.id===inspectedPurchase)||filtered.find(item=>item.id===plan.target?.id)||filtered[0];
 const choices=filtered.map(item=>`<button type="button" class="candidate" data-action="inspect-purchase" data-arg="${esc(item.id)}"
  aria-pressed="${item.id===selected?.id}"><span><strong>${esc(item.name)}</strong>
  <small>${esc(item.kind)} · ${F(item.price)} 饼干</small></span>
  ${item.id===plan.target?.id?tag('当前目标','good'):item.blocked?tag('已屏蔽','warn'):''}</button>`).join('');
 let detail=note('没有符合搜索条件的候选。');
 if(selected){
  const target=c.purchaseMode==='plan'&&c.target===selected.id;
  const challenge=['noUpgrade','both'].includes(c.challenge)&&selected.id.startsWith('u:');
  const mayPlan=selected.auto&&!selected.blocked&&!challenge;
  detail=`<div class="card-title"><h3>${esc(selected.name)}</h3>${tag(selected.kind)}</div>
   ${facts([['数量',F(selected.qty,0)],['估算增产',F(selected.delta)+'/秒'],['预计回本',T(selected.pp)],
    ['买后预计保留',F(selected.keep)],['当前预算缺口',F(selected.shortfall)],['预计可购',selected.shortfall?T(selected.eta):'预算已足']])}
   <div class="actions">
    ${mayPlan?target?btn('取消挂机目标','target',''):btn('交给挂机','target',selected.id,'primary'):''}
    ${btn('手动购买','buy',selected.id)}
    ${btn(selected.blocked?'取消屏蔽':'加入黑名单','block',selected.id,'ghost')}
   </div>
   ${note(esc(selected.quality||'此项涉及特殊效果，由玩家决定。'))}`;
 }
 return `<div class="rule-layout plan-layout">
  <section class="rule-card" aria-label="建筑与升级"><h3>建筑与升级</h3>
   <label class="field"><span>筛选候选</span><input id="purchase-search" aria-label="筛选候选" type="text" value="${esc(search)}"></label>
   <div class="candidates">${choices||note('没有候选。')}</div></section>
  <section class="rule-card" aria-label="采购目标详情">${detail}</section>
 </div>
 <details class="advanced"><summary>采购设置</summary>${check('purchase','启用自动采购')}${purchaseControls(c)}</details>`;
}
const lumpCount=value=>F(value,0)+' 颗';
function lumpSelection(g,c,advice=C.lumpAdvice(g,c)){
 if(lumpDraft)return lumpDraft;
 const plan=C.lumpPlan(g,c);
 if(plan.object&&plan.status!=='done')return c.lumpGoal;
 if(advice)return advice;
 const object=g.Objects?.Farm||g.ObjectsById[0];
 return{buildingId:object.id,level:object.level+1};
}
function lumpAdviceRow(g,c,draft,advice){
 if(!advice)return'';
 const plan=C.lumpPlan(g,c,advice);
 if(!plan.object)return'';
 const saving=c.lumpReserveMode==='adaptive'&&plan.balance!==null&&plan.balance<plan.reserve;
 const picked=draft.buildingId===advice.buildingId&&draft.level===advice.level;
 const headline=saving?'先把库存攒到 '+lumpCount(plan.reserve):'建议下一步 · '+advice.label;
 const detail=saving?'还差 '+lumpCount(Math.ceil(plan.reserve-plan.balance))+'，存满后可为「'+advice.label+'」继续积攒预算。':
  '花费 '+lumpCount(plan.totalCost)+' · '+advice.reason;
 return `<section class="lump-advice" aria-label="糖块分配建议">${row('growth',esc(headline),esc(detail),
  picked?'':btn('查看建议','lump-route',advice.buildingId+':'+advice.level,'ghost'))}</section>`;
}
function lumpRoutes(g,c,draft,openings){
 const routes=openings.map(({buildingId,level,label})=>[g.ObjectsById[buildingId],level,label]);
 routes.push([g.Objects?.Farm,9,'花园 6×6']);
 const market=C.mini(g,'Bank'),office=market?.offices?.[market.officeLevel];
 if(office?.cost)routes.push([g.Objects?.Cursor,office.cost[1],'股市办公室门槛']);
 const buttons=routes.filter(([object,level])=>object&&object.level<level).map(([object,level,label])=>{
  const plan=C.lumpPlan(g,c,{buildingId:object.id,level});
  return btn(label+' · '+lumpCount(plan.totalCost),'lump-route',object.id+':'+level,
   draft.buildingId===object.id&&draft.level===level?'selected':'',!plan.object);
 });
 return buttons.length?`<details class="advanced"><summary>其他糖块路线</summary>
  <div class="actions lump-routes" aria-label="常用糖块路线">${buttons.join('')}</div></details>`:'';
}
function lumpEstimate(g,c,draft){
 const plan=C.lumpPlan(g,c,{buildingId:draft.buildingId,level:draft.level});
 if(!plan.object)return note(esc(plan.reason));
 const {object,current,target}=plan;
 const manual=C.lumpPlan(g,c,{buildingId:object.id,level:current+1});
 const goal=c.lumpGoal;
 const assigned=c.lumpLevel&&goal?.saveId===g.fullDate&&current>=goal.fromLevel&&goal.buildingId===object.id&&goal.level===target;
 const unlock=C.LUMP_UNLOCKS.find(item=>item.building===object.name);
 const effects=[];
 if(unlock&&current===0&&target>=1)effects.push('解锁'+unlock.feature);
 if(object.name==='Farm'&&current<9&&target>current)effects.push('花园扩至 '+C.FARM_TILES[Math.min(target,9)-1]+' 格');
 const market=C.mini(g,'Bank'),office=market?.offices?.[market.officeLevel];
 if(object.name==='Cursor'&&office?.cost&&current<office.cost[1]&&target>=office.cost[1]){
  effects.push('达到股市办公室的等级要求，还需拥有 '+office.cost[0]+' 个光标');
 }
 if(current<10&&target>=10&&object.levelAchiev10&&!object.levelAchiev10.won){
  effects.push('解锁成就「'+(object.levelAchiev10.dname||object.levelAchiev10.name)+'」');
 }
 let bakingChange='';
 if(manual.status==='ready'&&C.has(g,'Sugar baking')){
  const before=Math.min(C.LUMP_BAKING_CAP,manual.balance);
  const after=Math.min(C.LUMP_BAKING_CAP,manual.balance-manual.nextCost);
  if(after<before)bakingChange=note('升一级后糖块烘焙加成会从 +'+F(before)+'% 变为 +'+F(after)+'%。');
 }
 return facts([
  ['当前等级',current+' 级'],
  ['下一级',plan.nextCost?lumpCount(plan.nextCost)+(plan.nextShortfall?' · 缺 '+lumpCount(plan.nextShortfall):''):'已达标'],
  ['到目标总花费',lumpCount(plan.totalCost)],
  ['目标预算',plan.status==='done'?'已达标':plan.balance===null?'等待糖块解锁':
   plan.shortfall?'缺 '+lumpCount(plan.shortfall)+(Number.isFinite(plan.seconds)?' · 约 '+T(plan.seconds):''):'已备齐']
 ])+(effects.length?note(esc(effects.join(' · '))):'')+bakingChange+
  (plan.shortfall&&Number.isFinite(plan.seconds)?note('等待时间按每轮 1 颗和当前生长速度估算。'):'')+
  `<div class="actions lump-actions">
   ${btn(assigned?'已交给挂机':'交给挂机','assign-lump','','primary',assigned||plan.status==='done'||!C.compatible(g)||!g.fullDate)}
   ${btn('手动升 1 级','level',object.id,'',manual.status!=='ready'||!C.compatible(g))}
  </div>`;
}
function lumpStatus(g,c,draft){
 const balance=C.lumpBalance(g),window=C.lumpWindow(g);
 const {reserve,baking,unlock}=C.lumpBudget(g,c,g.ObjectsById[draft.buildingId],draft.level);
 const cap=C.LUMP_BAKING_CAP;
 let explanation='';
 if(c.lumpReserveMode==='adaptive'){
  if(!baking)explanation='尚未购买糖块烘焙，推荐保留 0 颗。';
  else if(unlock)explanation='可用 1 颗解锁小游戏。其他升级保留 '+lumpCount(cap)+' 以维持满额加成。';
  else explanation='糖块烘焙每颗提供 +1% 产量，保留 '+lumpCount(cap)+' 可维持满额。';
 }
 return facts([
  ['库存',balance===null?'尚未解锁':lumpCount(balance)],
  ['当前目标保留',lumpCount(reserve)],
  ['可分配',balance===null?'—':lumpCount(Math.max(0,balance-reserve))],
  ...(balance!==null&&baking?[['糖块烘焙加成','+'+F(Math.min(cap,balance))+'% 产量']]:[]),
  ['安全收取',window?window.overripe?'等待自然掉落':T(window.remaining):'等待生长'],
  ['自然掉落',window?T(window.dropRemaining):'等待生长']
 ])+(explanation?note(esc(explanation)):'');
}
function lumpPlanning(g,c){
 const openings=C.lumpOpenings(g,c),advice=C.lumpAdvice(g,c,openings);
 const draft=lumpSelection(g,c,advice),target=C.lumpPlan(g,c);
 const buildings=g.ObjectsById.filter(object=>object&&typeof object.levelUp==='function');
 const active=c.lumpGoal?row('growth',target.object?esc(target.name+' '+target.current+' → '+target.target+' 级'):'糖块等级目标',
  esc(lumpUpgradeReport(g,c,target).text),`<div class="actions">
   ${btn('升级规则','open-rule','lumpLevel','ghost')}${btn('取消目标','cancel-lump','','ghost')}
  </div>`):'';
 return lumpAdviceRow(g,c,draft,advice)+active+`<div class="rule-layout plan-layout">
  <section class="rule-card" aria-label="等级目标">
   <h3>等级目标</h3>
   <div class="fields">
    <label class="field"><span>建筑</span><select id="lump-building">${buildings.map(object=>
     '<option value="'+object.id+'"'+(draft.buildingId===object.id?' selected':'')+'>'+esc(object.dname||object.name)+'</option>').join('')}</select></label>
    <label class="field"><span>目标等级</span><input id="lump-target-level" type="number" min="1" step="1" value="${esc(draft.level||'')}"></label>
   </div>
   <div id="lump-estimate">${lumpEstimate(g,c,draft)}</div>
  </section>
  <section class="rule-card" aria-label="糖块状态">
   <h3>糖块状态</h3>
   <div id="lump-balances">${lumpStatus(g,c,draft)}</div>
   <div class="fields">
    ${select('lumpReserveMode','保留策略',lumpReserveModes)}
    ${c.lumpReserveMode==='custom'?field('lumpReserve','最低保留量','number',{min:0,step:1}):''}
   </div>
   ${check('lump','完全成熟后自动收取')}
   ${C.lumpBalance(g)===null?note('累计烘焙满 10 亿后开始生长。'):''}
  </section>
 </div>`+lumpRoutes(g,c,draft,openings);
}
function prestigePlanning(g,c){
 const gained=C.prestige(g),chips=gained+C.num(g.heavenlyChips),gap=Math.max(0,c.ascendTarget-gained);
 const upgrades=Object.values(g.UpgradesByPool?.prestige||{}).filter(u=>u&&!u.bought);
 const chosen=upgrades.find(u=>String(u.id)===c.heavenlyTarget);
 const price=chosen?C.num(chosen.getPrice?.(),C.num(chosen.basePrice)):0;
 const missing=Object.values(g.AchievementsById||{}).filter(a=>a&&!a.won&&a.pool!=='shadow').slice(0,35);
 return block('声望与天堂升级预算',`<div class="fields">
  ${field('ascendTarget','目标新增声望','number',{min:0})}
  ${select('heavenlyTarget','目标天堂升级',[['','不指定'],...upgrades.map(u=>[u.id,u.dname||u.name])])}
 </div>`+facts([
  ['预计新增声望',F(gained,0)],['目标差额',gap?F(gap,0):'已达标'],['预计可用筹码',F(chips,0)],
  ...(chosen?[['升级价格',F(price)],['购入后余',chips>=price?F(chips-price):'缺 '+F(price-chips)],
   ['解锁前置',chosen.parents?.filter(u=>!u.bought).map(u=>u.dname||u.name).join('、')||'已满足']]:[])
 ])+note('确认后先创建重点快照，再打开游戏自己的转生确认。')+btn('准备转生','ascend','', 'primary'))+
  block('待完成成就',missing.map(a=>row('shield',esc(a.dname||a.name),esc(C.plain(a.desc)),tag('未完成'))).join('')||note('暂无可显示成就。'));
}
function comboPlanning(g,c){
 return block('当前增益',buffs(g))+
  block('组合设置',check('holdCombo','点击爆发期间暂缓采购和交易')+`<div class="fields">${select('clickMode','连点时机',[['always','持续点击'],['buff','仅点击增益期间']])}</div>`+
   `<div class="actions">${btn('条件施法','open-rule','cast')}${btn('神灵调换','open-rule','pantheon')}${btn('出售与回购','open-rule','godzamok')}</div>`)+
  (C.mini(g,'Wizard tower')?btn('查看法术预测','navigate','magic','ghost'):note('将巫师塔升至 1 级可查看施法条件。'));
}

const renderers={overview:compactOverview,queue:queuePage,planning:planningPage,history:logsPage,
 automation:rulesView,garden:gardenPage,magic:magicPage,market:marketPage,growth:growthPage,storage:storagePage,settings:settingsPage};
function focusSelector(element){
 if(!element||!main.contains(element))return'';
 if(element.id)return '#'+CSS.escape(element.id);
 for(const name of ['key','protect','market','godz']){
  if(element.dataset[name]!==undefined)return '[data-'+name+'="'+CSS.escape(element.dataset[name])+'"]';
 }
 if(element.dataset.action)return '[data-action="'+CSS.escape(element.dataset.action)+'"][data-arg="'+CSS.escape(element.dataset.arg||'')+'"]';
 return'';
}
function render(){
 if(destroyed)return;
 const view=page==='automation'?page+groupId+selectedRules.get(groupId):page==='planning'?page+planTab:page;
 const sameView=shownView===view;
 const top=sameView?main.scrollTop:0;
 const opened=sameView?[...main.querySelectorAll('details')].map(item=>item.open):[];
 const focus=sameView?focusSelector(root.activeElement):'';
 const active=activePage();
 for(const nav of root.querySelectorAll('[data-page]')){
  if(nav.dataset.page===active)nav.setAttribute('aria-current','page');
  else nav.removeAttribute('aria-current');
 }
 try{
  main.innerHTML=C.ready(engine.g)?renderers[page](engine.g,engine.c):head('正在连接游戏','等待 Cookie Clicker 加载完成。');
 }catch(err){main.innerHTML=empty('此模块暂时无法读取',esc(err.message));}
 shownView=view;
 [...main.querySelectorAll('details')].forEach((item,index)=>{item.open=!!opened[index];});
 main.scrollTop=top;
 if(focus)main.querySelector(focus)?.focus({preventScroll:true});
 live();
}
function live(){
 const button=$('pause');
 const label=engine.paused?'恢复全部自动化':'暂停全部自动化';
 if(button.getAttribute('aria-label')!==label){
  button.innerHTML=I(engine.paused?'play':'pause')+(engine.paused?' 继续':' 暂停');
  button.setAttribute('aria-label',label);
 }
 for(const node of root.querySelectorAll('[data-rule-status]')){
  const key=node.dataset.ruleStatus;
  node.textContent=engine.c[key]?engine.states[key]||'等待检查':'已关闭';
 }
}
function releaseLease(){
 leaseEpoch++;
 leaseRelease?.();
 engine.locked=false;
 engine.lastPulse=0;
}
function wantsLease(){
 return !destroyed&&C.AUTO.some(k=>engine.c[k])&&!C.gate(engine.g,engine.c,{paused:engine.paused,hidden:document.hidden});
}
async function lease(){
 if(!wantsLease()){
  if(leasePending||engine.locked)releaseLease();
  return;
 }
 if(leasePending||engine.locked)return;
 if(!navigator.locks?.request){engine.locked=true;return;}
 leasePending=true;
 const epoch=leaseEpoch;
 try{
  await navigator.locks.request('cookie-pilot:automation:v1',{ifAvailable:true},async lock=>{
   if(!lock||epoch!==leaseEpoch||!wantsLease())return;
   engine.locked=true;
   await new Promise(resolve=>{leaseRelease=resolve;});
   engine.locked=false;
   leaseRelease=null;
  });
 }catch{engine.locked=false;}
 finally{leasePending=false;}
}
function togglePause(){
 engine.setPaused(!engine.paused);
 if(engine.paused)releaseLease();
 void lease();
 if(engine.c.open)render();
 else live();
}
function beep(){if(!engine.c.sound)return;try{if(!audio)audio=new AudioContext();if(audio.state!=='running')return;const o=audio.createOscillator(),v=audio.createGain();o.connect(v);v.connect(audio.destination);o.frequency.value=760;v.gain.setValueAtTime(.025,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.15);o.start();o.stop(audio.currentTime+.17);}catch{}}
function loop(){if(destroyed)return;const now=performance.now();engine.click(now);if(now>=ruleAt){ruleAt=now+200;engine.pulse();if(engine.c.alerts)for(const s of engine.g?.shimmers||[]){if(!seen.has(s)&&['golden','reindeer'].includes(s.type)){seen.add(s);toast(s.type==='reindeer'?'驯鹿出现了':s.wrath?'愤怒饼干出现了':'金饼干出现了');beep();}}}
 if(now>=liveAt){
  liveAt=now+1000;
  void lease();
  live();
  if(engine.c.open&&!$('confirm').open&&!root.activeElement?.matches('input,select,textarea')&&Date.now()-(engine.lastUI||0)>2000){
   engine.lastUI=Date.now();render();
  }
 }
 if(!demo&&engine.c.updateCheck&&C.ready(engine.g)&&Date.now()-checkingAt>86400000){checkingAt=Date.now();void checkUpdate();}
 const activelyClicking=engine.c.click&&!['noClick','both'].includes(engine.c.challenge)&&engine.locked&&!C.gate(engine.g,engine.c,engine.env())&&!C.veil(engine.g,engine.c)&&(engine.c.clickMode!=='buff'||C.clickBuff(engine.g));
 const delay=activelyClicking?Math.max(5,Math.min(100,(engine.next.click||0)-performance.now())):100;timer=setTimeout(loop,delay);
}
function preset(name){
 const off=Object.fromEntries(C.AUTO.map(key=>[key,false]));
 const options={
  idle:['日常挂机',{click:true,clickMode:'always',golden:true,deer:true,fortune:true,lump:true,purchase:true}],
  active:['主动爆发',{click:true,clickMode:'buff',golden:true,deer:true,holdCombo:true}],
  garden:['花园培育',{harvest:true,gardenMode:'seeds'}],observe:['仅看信息',{}]
 };
 const [label,value]=options[name];
 const on=C.AUTO.filter(key=>value[key]&&!engine.c[key]).map(key=>shortRules[key]);
 const disabled=C.AUTO.filter(key=>engine.c[key]&&!value[key]).map(key=>shortRules[key]);
 ask('应用'+label,'将启用：'+(on.join('、')||'无')+'\n将关闭：'+(disabled.join('、')||'无')+
  (value.purchase?'\n库存保留：'+reserveModes.find(([key])=>key===engine.c.reserveMode)[1]:'')+
  (engine.paused?'\n当前的暂停状态会保留。':''),()=>{
   engine.set({...off,...value});
   void lease();
   toast('已应用'+label);
  });
}
const dangerousRules={dragon:'将按目标等级自动训练龙，可能牺牲大量建筑。',aura:'会消耗最高阶建筑来维持你选定的光环方案。',pantheon:'将使用调换次数维持神灵方案。',godzamok:'点击增益时出售选定建筑，然后按预算回购。',season:'将花费饼干切换到你指定的季节。',trade:'将按条件买卖游戏中的股票，实际利润不能保证。',cast:'将按配置自动施法，可能反噬或改变资源。'};
function toggleProtection(key){
 const previous=engine.c.protectedTiles;
 engine.set({protectedTiles:previous.includes(key)?previous.filter(tile=>tile!==key):[...previous,key]});
}
function assignLumpGoal(draft){
 const g=engine.g;
 engine.syncLumpSettings();
 const goal={buildingId:draft?.buildingId,level:draft?.level,saveId:g.fullDate};
 const plan=C.lumpPlan(g,engine.c,goal);
 if(!C.compatible(g)||!Number.isSafeInteger(goal.saveId)||goal.saveId<=0){
  toast('等待受支持的存档加载');return;
 }
 if(!plan.object||plan.status==='done'){toast(plan.reason);return;}
 goal.fromLevel=plan.current;
 ask('交给挂机 · '+plan.name+' '+plan.target+' 级',
  '从 '+plan.current+' 级升至 '+plan.target+' 级，共需 '+lumpCount(plan.totalCost)+'，每次升级后至少保留 '+lumpCount(plan.reserve)+'。\n'+
  '此目标只需确认一次。Pilot 会逐级执行，达到目标时结束。',()=>{
   engine.syncLumpSettings();
   const fresh=C.lumpPlan(engine.g,engine.c,goal);
   if(!C.compatible(engine.g)||!fresh.object||fresh.status==='different-save'||fresh.reserve!==plan.reserve||fresh.totalCost>plan.totalCost){
    throw Error('存档、等级或保留量已变化，请重新确认');
   }
   if(fresh.status==='done'){toast(fresh.reason);return;}
   lumpDraft=null;
   engine.set({lumpGoal:goal,lumpLevel:true});
   engine.log('糖块挂机目标 · '+plan.name+' '+plan.target+' 级');
   void lease();
  });
}
root.addEventListener('input',event=>{
 const el=event.target;
 if(el.id!=='lump-target-level')return;
 const g=engine.g,c=engine.c;
 lumpDraft={buildingId:lumpSelection(g,c).buildingId,level:el.valueAsNumber};
 $('lump-estimate').innerHTML=lumpEstimate(g,c,lumpDraft);
 $('lump-balances').innerHTML=lumpStatus(g,c,lumpDraft);
});
root.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='lump-building'){
  const object=engine.g.ObjectsById[Number(el.value)];
  if(object){lumpDraft={buildingId:object.id,level:object.level+1};render();}
  return;
 }
 if(el.dataset.protect){toggleProtection(el.dataset.protect);return;}
 if(el.dataset.key){
  const key=el.dataset.key;
  const value=el.type==='checkbox'?el.checked:el.value;
  if(key.startsWith('god-')){
   const gods=[...engine.c.gods];gods[Number(key.slice(4))]=Number(value);engine.set({gods});return;
  }
  if(key==='lumpReserve'&&el.value===''){el.value=engine.c.lumpReserve;return;}
  if(key==='lumpLevel'&&value===true){
   el.checked=false;
   assignLumpGoal(engine.c.lumpGoal);return;
  }
  if(value===true&&dangerousRules[key]){
   el.checked=false;
   ask('开启'+shortRules[key],dangerousRules[key]+'\n请先检查目标、预算和保留量。',()=>{
    engine.set({[key]:true});void lease();
   });
   return;
  }
  engine.set({[key]:value});
  void lease();
  return;
 }
 if(el.dataset.godz){
  const ids=new Set(engine.c.godzamokBuildings.map(String));
  if(el.checked)ids.add(el.dataset.godz);else ids.delete(el.dataset.godz);
  engine.set({godzamokBuildings:[...ids]});
 }
 if(el.dataset.market){
  const [id,side]=el.dataset.market.split(':');
  const thresholds=structuredClone(engine.c.marketThresholds);
  thresholds[id]??={buy:0,sell:0};
  thresholds[id][side]=Number(el.value);
  engine.set({marketThresholds:thresholds});
 }
 if(el.id==='lab-toggle'){lab=el.checked;render();}
 if(el.id==='purchase-search'){search=el.value;render();}
});
root.addEventListener('pointerdown',()=>{if(engine.c.sound){try{audio??=new AudioContext();if(audio.state==='suspended')void audio.resume();}catch{}}});
entryRoot.querySelector('button').addEventListener('click',()=>show(!engine.c.open));
root.addEventListener('click',async event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.page){navigate(b.dataset.page);return;}if(b.id==='close'){show(false);return;}if(b.id==='pause'){togglePause();return;}if(b.id==='confirm-cancel'){pending=null;$('confirm').close();return;}if(b.id==='confirm-ok'){const action=pending;pending=null;$('confirm').close();try{await action?.();render();}catch(e){toast('未执行：'+e.message);engine.log('未执行：'+e.message);}return;}
 const action=b.dataset.action,arg=b.dataset.arg,g=engine.g,c=engine.c;
 try{
 if(action==='navigate'){navigate(arg);return;}
 if(action==='rule-group'){
  groupId=arg;navigate('automation');
  main.querySelector('[data-action="rule-group"][data-arg="'+CSS.escape(arg)+'"]')?.focus({preventScroll:true});
  return;
 }
 if(action==='rule-select'||action==='open-rule'){
  const group=groups.find(item=>item.rules.includes(arg));
  if(!group)return;
  groupId=group.id;
  selectedRules.set(groupId,arg);
  if(action==='open-rule'&&arg==='harvest')selectedTile=C.harvestTargets(g,c)[0]?.key||selectedTile;
  if(page==='automation'){shownView='';render();}
  else navigate('automation');
  main.querySelector('[data-action="rule-select"][data-arg="'+CSS.escape(arg)+'"]')?.focus({preventScroll:true});
  return;
 }
 if(action==='plan-tab'){
  planTab=arg;navigate('planning');
  main.querySelector('[data-action="plan-tab"][data-arg="'+CSS.escape(arg)+'"]')?.focus({preventScroll:true});
  return;
 }
 if(action==='plan-unlock'||action==='lump-route'){
  const [id,level]=arg.split(':').map(Number);
  const object=action==='plan-unlock'?g.Objects?.[arg]:g.ObjectsById?.[id];
  if(!object)return;
  lumpDraft={buildingId:object.id,level:action==='plan-unlock'?Math.max(1,object.level+1):level};
  planTab='lumps';
  if(page==='planning')render();
  else navigate('planning');
  $('lump-target-level')?.focus({preventScroll:true});
  return;
 }
 if(action==='assign-lump'){assignLumpGoal(lumpSelection(g,c));return;}
 if(action==='cancel-lump'){lumpDraft=null;engine.set({lumpGoal:null,lumpLevel:false});engine.log('已取消糖块等级目标');void lease();return;}
 if(action==='preset'){preset(arg);return;}
 if(action==='update'){await checkUpdate();return;}
 if(action==='inspect-purchase'){inspectedPurchase=arg;render();return;}
 if(action==='target'){
  const item=C.purchases(g,c).find(row=>row.id===arg);
  if(!arg){engine.set({purchaseMode:'efficient',target:''});return;}
  if(!item||!item.auto||item.blocked)throw Error('该候选暂不可自动购买');
  const apply=()=>{
   engine.set({purchase:true,target:arg,purchaseMode:'plan'});
   engine.log('规划采购目标：'+item.name);
   void lease();
  };
  if(!c.purchase)ask('启用自动采购','目标：'+item.name+'\n买后预计保留 '+F(item.keep)+' 饼干。',apply);
  else apply();
  return;
 }
 if(action==='block'){engine.set({blocked:c.blocked.includes(arg)?c.blocked.filter(x=>x!==arg):[...c.blocked,arg]});return;}
 if(action==='tile'){selectedTile=arg;render();return;}if(action==='protect-tile'){toggleProtection(arg);return;}
 if(action==='backup'){engine.backup();toast('已保存本地快照');render();return;}if(action==='export'){const e=engine.backup('导出前');download(e.save,'CookieClicker-'+stamp(e.at)+'.txt');return;}if(action==='backup-download'){const e=engine.backups().find(x=>x.id===arg);if(e)download(e.save,'CookieClicker-'+stamp(e.at)+'.txt');return;}
 if(action==='settings-export'){download(JSON.stringify({version:C.VERSION,settings:c},null,2),'CookiePilot-settings.json','application/json');return;}if(action==='settings-import'){$('settings-file').click();return;}if(action==='market-export'){download(JSON.stringify({context:engine.historyContext,samples:engine.hist,ledger:engine.ledger},null,2),'CookiePilot-market.json','application/json');return;}
 if(action==='unload'){ask('卸载本页助手','停止所有任务、移除界面与广告隐藏样式。已安装的加载器在刷新后仍可能重新加载；网络拦截由扩展独立管理。',destroy);return;}
 engine.manualGate();
 if(action==='buy'){
  const item=C.purchases(g,c).find(x=>x.id===arg);
  if(!item)throw Error('候选已变化');
  ask('购买 '+item.name,`数量 ${item.qty}，当前价格 ${F(item.price)}。\n${item.auto?'遵守库存保留线。':'由游戏处理特殊或未建模升级。'}`,()=>{
   engine.manualGate();
   const fresh=C.purchases(g,engine.c).find(x=>x.id===arg);
   if(g.buyMode===-1)throw Error('商店处于出售模式');
   if(!fresh||!fresh.affordable)throw Error('当前预算不足');
   engine.backup('手动采购前');
   if(fresh.id.startsWith('b:'))fresh.object.buy(fresh.qty);else fresh.object.buy();
  });
 }
 if(action==='harvest-tile'){const[x,y]=arg.split(',').map(Number),m=C.mini(g,'Farm');ask('收获植物','此操作会移除该格植物；未成熟时可能无法解锁种子。',()=>{engine.manualGate();engine.backup('手动收获前');m.harvest(x,y);});}
 if(action==='freeze'){const m=C.mini(g,'Farm');engine.backup('花园冻结切换前');const tool=m.tools?.freeze;if(tool?.func)tool.func();else throw Error('当前版本冻结接口不可用，请使用原花园按钮');render();}
 if(action==='cast-manual'){const m=C.mini(g,'Wizard tower'),s=m.spells[arg];ask('施放 '+s.name,`消耗 ${m.getSpellCost(s)} 魔力，当前反噬率 ${F(m.getFailChance(s)*100)}%。\n立即施放，不等待自动化触发条件。`,()=>{engine.manualGate();if(m.magic-m.getSpellCost(s)<engine.c.magicReserve)throw Error('魔力保留量不足');engine.backup('手动施法前');m.castSpell(s);});}
 if(action==='stock-buy'||action==='stock-sell'){const m=C.mini(g,'Bank'),q=m.goodsById[Number(arg)];ask((action==='stock-buy'?'买入 1 单位 ':'卖出全部 ')+q.name,'按确认时游戏价格成交；手动卖出可以处理成本未知的仓位。',()=>{engine.manualGate();engine.backup('手动交易前');if(action==='stock-buy'){const cost=m.getGoodPrice(q)*(1+.2*.95**m.brokers)*g.cookiesPsRawHighest;if(g.cookies-cost<C.reserve(g,engine.c))throw Error('库存保留线不足');if(!m.buyGood(q.id,1))throw Error('游戏暂不允许该交易');delete engine.ledger[q.id];}else{if(!m.sellGood(q.id,q.stock))throw Error('游戏暂不允许该交易');delete engine.ledger[q.id];}});}
 if(action==='level'){
  const object=g.ObjectsById[Number(arg)];
  const goal={buildingId:object?.id,level:object?.level+1,saveId:g.fullDate};
  const plan=C.lumpPlan(g,c,goal);
  if(plan.status!=='ready')throw Error(plan.reason);
  ask('提升 '+plan.name+' 等级','消耗 '+lumpCount(plan.nextCost)+'，保留至少 '+lumpCount(plan.reserve)+'。',()=>{
   engine.manualGate();
   engine.syncLumpSettings();
   const fresh=C.lumpPlan(engine.g,engine.c,goal);
   if(fresh.status!=='ready')throw Error(fresh.reason);
   if(fresh.object!==object||fresh.current!==plan.current)throw Error('建筑等级已变化，请重新确认');
   engine.backup('建筑升级前',true);
   object.levelUp();
  });
 }
 if(action==='dragon-manual'){const step=g.dragonLevels[g.dragonLevel];ask('训练龙','本级成本：'+C.plain(step?.costStr?.()||'无法升级')+'。可能牺牲建筑。',()=>{engine.manualGate();if(!C.has(g,'A crumbly egg')||!step.cost?.())throw Error('尚未解锁或材料不足');engine.backup('手动龙升级前',true);g.UpgradeDragon();});}
 if(action==='wrinklers-manual'){ask('收取普通皱纹虫','将普通皱纹虫交由游戏结算，保留全部闪光个体。',()=>{engine.manualGate();engine.backup('皱纹虫收取前');for(const w of g.wrinklers)if(w.phase===2&&w.type!==1)w.hp=0;});}
 if(action==='ascend'){ask('准备转生','先创建重点快照，再打开游戏自己的转生确认窗口。',()=>{engine.manualGate();engine.backup('转生前',true);engine.setPaused(true);releaseLease();show(false);g.Ascend();});}
 if(action==='restore'){const e=engine.backups().find(x=>x.id===arg);if(!e)throw Error('快照已不在列表中');ask('恢复 '+e.label,'将回退游戏到 '+new Date(e.at).toLocaleString('zh-CN')+'。先保存当前进度，恢复后所有自动化保持暂停。',()=>{engine.manualGate();engine.backup('恢复前',true);engine.setPaused(true);releaseLease();if(!g.ImportSaveCode(e.save))throw Error('游戏拒绝此存档');engine.set(C.config(e.settings));engine.rebuy=[];toast('已恢复存档；自动化已暂停');});}
 if(['grant','grant-lump','refill-magic'].includes(action)){if(!lab)throw Error('请先启用本次会话实验室');ask('确认资源补给',action==='grant'?`增加 ${arg} 分钟无临时增益的饼干产量，改变累计产量。` :action==='grant-lump'?'增加 1 糖块，改变资源与累计糖块统计。':'将当前魔法书魔力直接补满。',()=>{engine.manualGate();if(!lab)throw Error('实验室已关闭');engine.backup('实验室操作前',true);if(action==='grant'){const n=C.num(g.unbuffedCps)*Number(arg)*60;if(![1,10,60].includes(Number(arg))||!Number.isFinite(n)||!Number.isFinite(g.cookies+n)||!Number.isFinite(g.cookiesEarned+n)||n<=0||g.cookies+n===g.cookies)throw Error('产量为零或超过数值范围');g.Earn(n);}if(action==='grant-lump'){if(!g.canLumps?.())throw Error('糖块尚未解锁');g.gainLumps(1);}if(action==='refill-magic'){const m=C.mini(g,'Wizard tower');if(!m)throw Error('魔法书未解锁');m.magic=m.magicM;}engine.log('实验室：'+action);toast('操作完成，重点快照已保存');});}
 }catch(e){toast('未执行：'+e.message);}
});
$('settings-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('设置文件过大');const data=JSON.parse(await file.text()),cfg=C.config(data.settings||data);ask('导入助手设置','当前设置将被替换；所有自动化保持暂停。',()=>{engine.backup('导入设置前',true);engine.setPaused(true);releaseLease();engine.set(cfg);toast('设置已导入');});}catch(e){toast('导入失败：'+e.message);}event.target.value='';});
$('confirm').addEventListener('cancel',()=>{pending=null;});
function key(event){
 if(event.key==='Escape'&&engine.c.open&&!$('confirm').open){event.preventDefault();show(false);return;}
 if(event.key==='Tab'&&engine.c.open&&!$('confirm').open){
  const focus=[...root.querySelectorAll('button,input,select,textarea,a[href],summary')].filter(n=>!n.disabled&&n.getClientRects().length);
  const first=focus[0],last=focus.at(-1);
  if(event.shiftKey&&root.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&root.activeElement===last){event.preventDefault();first?.focus();}
 }
 if(event.altKey&&event.code==='KeyP'&&!event.repeat&&!event.composedPath().some(x=>x?.isContentEditable||/^(INPUT|SELECT|TEXTAREA)$/.test(x?.tagName||''))){
  event.preventDefault();
  if(event.shiftKey)togglePause();
  else show(!engine.c.open);
 }
}
function visibility(){
 engine.lastPulse=0;
 if(document.hidden&&!engine.c.background)releaseLease();
 void lease();
 if(engine.c.open&&!$('confirm').open)render();
}
function syncStorage(event){
 if(event.key===E.SETTINGS){
  const before=[engine.c.lumpGoal,engine.c.lumpLevel,engine.c.lumpReserve,engine.c.lumpReserveMode];
  if(!engine.syncLumpSettings()||JSON.stringify(before)===JSON.stringify([engine.c.lumpGoal,engine.c.lumpLevel,engine.c.lumpReserve,engine.c.lumpReserveMode]))return;
  void lease();
  if(engine.c.open&&!$('confirm').open)render();
  return;
 }
 if(event.key!==E.PAUSE||!['true','false'].includes(event.newValue))return;
 engine.paused=event.newValue==='true';
 engine.startupHold=false;
 engine.lastPulse=0;
 if(engine.paused)releaseLease();
 void lease();
 if(engine.c.open)render();
}
document.addEventListener('keydown',key,true);
document.addEventListener('visibilitychange',visibility);
window.addEventListener('storage',syncStorage);
function destroy(){
 destroyed=true;
 clearTimeout(timer);clearTimeout(toastTimer);
 releaseLease();engine.dispose();observer.disconnect();
 media.removeEventListener('change',theme);
 document.removeEventListener('keydown',key,true);
 document.removeEventListener('visibilitychange',visibility);
 window.removeEventListener('storage',syncStorage);
 host.remove();entryHost.remove();adStyle.remove();
 audio?.close().catch(()=>{});
 for(const url of urls)URL.revokeObjectURL(url);
 delete window.CookiePilot2;
}
window.CookiePilot2={version:C.VERSION,show:()=>show(true),destroy,engine};theme();render();if(engine.c.open)show(true);void lease();loop();
})();
