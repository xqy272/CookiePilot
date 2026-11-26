(() => {
'use strict';
const C=window.CookiePilotCore2,E=window.CookiePilotEngine2,M=window.CookiePilotManagement;
if(!C||!E||!M||window.top!==window)return;
const demo=document.documentElement.dataset.cookiePilotDemo==='true';
if(!demo&&(location.hostname!=='orteil.dashnet.org'||!/^\/cookieclicker\/(?:index\.html)?$/.test(location.pathname)))return;
if(window.CookiePilot2){window.CookiePilot2.show();return;}window.CookiePilot?.destroy?.();
const esc=C.escape,F=C.fmt,T=C.time;
const icons={cookie:'M20 12a5 5 0 0 1-6-6 4 4 0 0 1-5-4A10 10 0 1 0 22 15a4 4 0 0 1-2-3ZM7 9h.01M10 16h.01M16 17h.01M6 14h.01',home:'m3 10 9-7 9 7v10H3ZM9 20v-7h6v7',rules:'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',buy:'M3 3h2l3 12h11l2-8H6M9 20h.01M18 20h.01',leaf:'M19 3C8 2 2 8 5 15s15 3 14-12ZM5 20 16 9',magic:'m4 20 13-13 3 3L7 23ZM4 3v4M2 5h4M17 1v4M15 3h4M21 15v4M19 17h4',market:'M3 3v18h18M7 15l4-5 4 3 6-8',growth:'M12 21V8M7 13l5-5 5 5M5 5h14',save:'M4 3h13l3 3v15H4ZM7 3v6h9V3M8 21v-7h8v7',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',pause:'M8 5v14M16 5v14',play:'m7 4 14 8-14 8Z',close:'m6 6 12 12M6 18 18 6',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',shield:'m12 2 8 4v7c0 5-8 9-8 9s-8-4-8-9V6ZM8 12l3 3 5-6',chevron:'m9 5 7 7-7 7',refresh:'M20 7a9 9 0 1 0 1 8M20 2v6h-6',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',flask:'M9 2h6M10 2v7l-6 10v3h16v-3L14 9V2M7 15h10',bell:'M6 17V9a6 6 0 0 1 12 0v8l2 2H4ZM10 22h4'};
const I=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]||icons.spark}"/></svg>`;
const host=document.createElement('div');host.id='cookie-pilot-v2';host.style.cssText='position:fixed;inset:0;z-index:1000000000;pointer-events:none;';const root=host.attachShadow({mode:'open'});(document.body||document.documentElement).append(host);
const engine=new E.Engine(()=>window.Game,localStorage,{
 hidden:()=>document.hidden,exclusive:()=>!!navigator.locks?.request,
 nativeClick:id=>{
  const button=document.getElementById(id);
  if(!button)return false;
  button.click();
  return true;
 },
 change:()=>{theme();render();},notice:toast
});
let page='overview',search='',selectedTile='2,2',destroyed=false,timer,leaseRelease,leasePending=false,leaseEpoch=0,toastTimer,update=null,updateText='尚未检查',checking=false,lab=false,pending=null,liveAt=0,ruleAt=0,checkingAt=0;
let leaseInOtherTab=false;
const urls=new Set(),seen=new WeakSet();let audio=null;
const pages=[
 ['overview','总览','home'],['automation','玩法规则','rules'],['planning','规划台','buy'],
 ['history','记录','clock'],['settings','设置','settings'],['storage','存档','save']
];
const planTabs=[['purchase','采购与收益'],['combo','爆发组合'],['lumps','糖块与解锁'],['prestige','转生目标']];
const managementModules={
 garden:{title:'花园',link:'harvest',modes:[['seeds','培育新种子'],['cycle','育种、收藏与收益']],
  scope:'从当前种子和地块选择亲本、留空突变格并收获。保护格和无关作物保留。'},
 magic:{title:'魔法书',link:'cast',modes:[['combo','优先叠爆发'],['yield','收益与爆发']],
  scope:'预判召唤饼干和命运之手，收取本次法术召唤的金饼干。'},
 pantheon:{title:'万神殿',link:'pantheon',modes:[['lineup','补齐并维持阵容']],
  scope:'保留已在槽的神灵，按当前挂机方式推荐空槽。第一次配置后维持这套阵容，遵守调换次数预留。'},
 market:{title:'股市',link:'trade',modes:[['portfolio','分位交易'],['development','发展与交易']],
  scope:'积累报价后按分位买卖。多笔订单共用仓位预算，优先退出达到净利目标的已知成本仓位。'},
 dragon:{title:'养龙',link:'dragon',modes:[['hatch','孵化'],['collect','孵化与收齐掉落'],['develop','训练与主光环']],
  scope:'按预算购买龙蛋和已解锁掉落。龙达到 8 级并解锁抚摸后，持续收集掉落。'},
 season:{title:'季节收藏',link:'season',modes:[['collection','轮换并收集季节物品']],
  scope:'轮换四个季节、解锁掉落并按预算购买已解锁的普通奖励。优先购买有助于收藏的奖励。独立启用皱纹虫托管时按其方案收取。'},
 wrinklers:{title:'皱纹虫',link:'wrinkler',modes:[['yield','攒收益'],['drops','刷掉落']],
  scope:'按用途等待储量和数量，再回收普通皱纹虫。始终保留闪光个体。'},
 events:{title:'点击与事件',link:'click',modes:[['idle','日常挂机'],['burst','爆发连点']],
  scope:'收取金饼干、驯鹿和幸运新闻。按设定速度连点，并遵守面纱和挑战保护。'},
 purchase:{title:'采购',link:'purchase',modes:[['efficient','按回本采购']],
  scope:'根据实际库存和收益比较建筑与升级，遵守保留线、黑名单和数量上限。'},
 lumps:{title:'糖块',link:'lumpManaged',scope:'成熟收取，按授权路线解锁小游戏和提升建筑等级。'},
 research:{title:'研究与老太婆末日',modes:[['safe','研究到冥界烤箱'],['seasonal','万圣节需要时推进到一心'],['one-mind','推进到一心'],['full','推进到长者契约'],['pledge','长者契约后自动安抚']],
  scope:'依次购买已解锁的研究升级，遵守饼干保留线、黑名单和保险库。开启老太婆末日会改变自然金饼干和皱纹虫。'},
 ascension:{title:'转生',modes:[['notice','声望达标提醒'],['cycle','自动转生与重开']],
  scope:'监测新增声望，达到目标后提醒。'}
};
const defaultManagement={events:'idle',purchase:'efficient',garden:'seeds',magic:'combo',pantheon:'lineup',market:'portfolio',dragon:'hatch',wrinklers:'yield'};
const growthManagement={...defaultManagement,garden:'cycle',market:'development',dragon:'collect',season:'collection',
 research:'seasonal',ascension:'cycle'};
const basicGrowthModes={garden:'seeds',market:'portfolio',dragon:'hatch',research:'safe',ascension:'notice'};
const managementDraft=new Map();
let managementTab='garden';
const viewStates=new Map();
let shownView='',renderedControls='';
root.innerHTML=`<style>${window.CookiePilotStyles2||''}</style>
 <div class="backdrop" id="backdrop" hidden>
  <section class="window" role="dialog" aria-modal="true" aria-labelledby="cp-title">
   <header class="head">
    <div class="head-brand">
     <div class="brand-icon">${I('cookie')}</div>
     <div><h1 class="wordmark" id="cp-title">Cookie Pilot</h1>${demo?'<small>模拟存档</small>':''}</div>
    </div>
    <div class="grow"></div>
    <span class="runtime" id="runtime" role="status"></span>
    <button type="button" id="pause" class="primary head-action" aria-label="暂停全部自动化">${I('pause')} 暂停</button>
    <button type="button" id="close" class="ghost head-action" aria-label="收起工作台" title="收起工作台（Esc）">${I('close')}</button>
   </header>
   <nav class="workbench-nav" aria-label="工作台导航">
    ${pages.map(([key,name,icon])=>`<button type="button" class="nav" data-page="${key}">${I(icon)}${name}</button>`).join('')}
   </nav>
   <div class="view-controls" id="view-controls" hidden></div>
   <main class="main" id="main" tabindex="-1" aria-labelledby="view-title"></main>
  </section>
 </div>
 <div class="toast" id="toast" role="status" hidden></div>
 <dialog class="confirm" id="confirm" aria-labelledby="confirm-title" aria-describedby="confirm-text">
  <h3 id="confirm-title"></h3>
  <div id="confirm-text"></div>
  <div class="actions"><button type="button" id="confirm-cancel">取消</button><button type="button" id="confirm-ok" class="primary">确认</button></div>
 </dialog>
 <input type="file" id="settings-file" accept="application/json,.json" hidden>`;
const $=id=>root.getElementById(id),main=$('main'),viewControls=$('view-controls');
const entryHost=document.createElement('span');entryHost.id='cookie-pilot-entry';entryHost.style.cssText='display:inline-block;vertical-align:middle;margin:3px 8px 3px 5px;position:relative;z-index:5;';const entryRoot=entryHost.attachShadow({mode:'open'});entryRoot.innerHTML=`<style>${window.CookiePilotStyles2||''}</style><button type="button" class="entry" aria-label="打开 Cookie Pilot 工作台" aria-expanded="false">${I('cookie')} Pilot</button>`;
function mountEntry(){const top=document.getElementById('topBar');if(top&&!entryHost.isConnected)top.prepend(entryHost);else if(!top&&!entryHost.isConnected){const fallback=document.getElementById('game')||document.body;fallback.prepend(entryHost);}}
mountEntry();const observer=new MutationObserver(()=>{if(!entryHost.isConnected)mountEntry();});observer.observe(document.body,{childList:true,subtree:true});
const adStyle=document.createElement('style');adStyle.textContent='#support,#smallSupport,#sectionAd,.supportComment,.supportPlaceholder,.adBanner,.adsbygoogle{display:none!important}';
const media=window.matchMedia('(prefers-color-scheme: light)');
function theme(){const mode=engine.c.theme==='system'?(media.matches?'light':'dark'):engine.c.theme;for(const h of [host,entryHost])h.dataset.theme=mode;host.dataset.density=engine.c.density;if(engine.c.ads&&!adStyle.isConnected)(document.head||document.documentElement).append(adStyle);if(!engine.c.ads)adStyle.remove();}
media.addEventListener('change',theme);
const tag=(s,cls='')=>`<span class="tag ${cls}">${esc(s)}</span>`;
const btn=(text,action,arg='',cls='',disabled=false)=>`<button type="button" class="${cls}" data-action="${action}" data-arg="${esc(arg)}"${disabled?' disabled':''}>${text}</button>`;
const head=(title,sub='',extra='')=>`<div class="heading"><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div>${extra}</div>`;
const note=s=>`<p class="note">${s}</p>`;
const block=(title,body,hint='')=>`<section class="block"><div class="block-head"><h3>${title}</h3>${hint?`<span>${hint}</span>`:''}</div>${body}</section>`;
const row=(icon,title,sub,tail='')=>`<div class="row">${I(icon)}<div class="row-info"><strong>${title}</strong>${sub?`<p>${sub}</p>`:''}</div>${tail}</div>`;
const field=(key,label,type='number',opts={})=>`<label class="field"><span>${label}</span><input data-key="${key}" aria-label="${label}" type="${type}" value="${esc(engine.c[key])}" ${opts.min!==undefined?`min="${opts.min}"`:''} ${opts.max!==undefined?`max="${opts.max}"`:''} step="${opts.step||'any'}"></label>`;
const select=(key,label,options,value=engine.c[key])=>`<label class="field"><span>${label}</span><select data-key="${key}" aria-label="${label}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
const check=(key,label)=>`<label class="check"><input type="checkbox" data-key="${key}" aria-label="${label}" ${engine.c[key]?'checked':''}>${label}</label>`;
const empty=(title,sub)=>`<div class="empty">${I('shield')}<h3>${title}</h3><p>${sub}</p></div>`;
const stats=items=>`<div class="summary">${items.map(([label,value])=>`<div><div class="value">${value}</div><label>${label}</label></div>`).join('')}</div>`;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').hidden=true;},5500);}
function show(value=true){
 if(!value)rememberPosition();
 if(!value)closeConfirmation();
 if(!value)shownView='';
 engine.c.open=value;
 engine.persist();
 $('backdrop').hidden=!value;
 entryRoot.querySelector('button').setAttribute('aria-expanded',String(value));
 if(value){render();root.querySelector('[aria-current="page"]')?.focus({preventScroll:true});}
 else entryRoot.querySelector('button').focus();
}
function navigate(next,focus){
 page=next;
 render();
 const control=focus?root.querySelector(focus):null;
 (control||main).focus({preventScroll:true});
 if(control&&viewControls.contains(control))control.scrollIntoView({block:'nearest',inline:'nearest'});
}
function ask(title,details,fn){
 const {rows,message,button} = typeof details==='string'?{message:details}:details;
 pending=fn;
 $('confirm-title').textContent=title;
 $('confirm-text').innerHTML=(rows?facts(rows):'')+(message?`<p>${esc(message)}</p>`:'');
 $('confirm-ok').textContent=button||'确认';
 if(!$('confirm').open)$('confirm').showModal();
 $('confirm-cancel').focus();
}
function closeConfirmation(){
 const action=pending;
 pending=null;
 $('confirm').close();
 return action;
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
 html+=block('万神殿',p?facts(slots.map((slot,i)=>[slot,C.plain(p.godsById[p.slot[i]]?.name)||'空']))+
  note('剩余 '+p.swaps+' 次调换。')+btn('查看推荐阵容','open-rule','pantheon','ghost'):
  empty('万神殿尚未解锁','神庙升至 1 级后可设置神灵。'));
 return html+btn('出售与回购规则','open-rule','godzamok','ghost');
}
function marketPage(g,c){const data=C.market(g,engine.hist);if(!data)return head('股市','价格位置、持仓和条件交易。')+empty('股市尚未解锁','银行升至 1 级后开始采集真实价格样本。');const{m,goods,overhead}=data;return head('股市','价格分位来自本机实际观察；不预测下一次涨跌。',tag('样本上限 2000 / 商品'))+stats([['游戏交易净额','$ '+F(m.profit)],['买入手续费',F((overhead-1)*100)+'%'],['银行办公室',String(m.officeLevel+1)]])+btn('条件交易规则','open-rule','trade','ghost')+`<div class="table-wrap"><table class="table"><thead><tr><th>商品</th><th>价格 / 分位</th><th>持仓 / 成本</th><th>固定买卖线（可选）</th><th>手动</th></tr></thead><tbody>${goods.map(r=>{const t=c.marketThresholds[r.q.id]||{buy:0,sell:0},lot=engine.ledger[r.q.id];return`<tr><td>${esc(r.q.name)}<small>${r.samples} 个样本</small></td><td class="num">$ ${F(r.price)}<small>${r.percentile===null?'尚无样本':F(r.percentile,0)+'% 分位'}</small></td><td class="num">${r.q.stock} / ${r.capacity}<small>${lot?.stock===r.q.stock?'成本 $'+F(lot.cost):'成本未记录'}</small></td><td><div class="actions"><input style="width:70px" type="number" min="0" step="any" data-market="${r.q.id}:buy" value="${t.buy}" aria-label="${esc(r.q.name)}买入价"><input style="width:70px" type="number" min="0" step="any" data-market="${r.q.id}:sell" value="${t.sell}" aria-label="${esc(r.q.name)}卖出价"></div></td><td><div class="actions">${btn('买 1','stock-buy',r.q.id)}${btn('卖出','stock-sell',r.q.id)}</div></td></tr>`;}).join('')}</tbody></table></div>`+note('固定买入线小于卖出线时，该商品改用固定价格条件；两个都填 0 恢复分位策略。银行等级、龙光环或本轮存档改变后重置样本。游戏图表的隐藏状态不影响助手。')+btn('导出本机价格样本','market-export');}
function growthPage(g,c){
 const dragon=g.dragonLevels?.[g.dragonLevel];
 const drop=M.dragonRewardStatus(g);
 const wrinklers=(g.wrinklers||[]).filter(w=>w.phase===2&&w.hp>0);
 const rewards=M.seasonRewards(g);
 const seasons=Object.entries(g.seasons||{}).map(([key,season])=>{
  const names=new Set(rewards[key]||[]);
  const upgrades=Object.values(g.Upgrades||{}).filter(u=>names.has(u.name)||u.season===key&&u.pool!=='toggle');
  const unlocked=upgrades.filter(u=>u.unlocked&&!u.bought).length;
  return '<details class="advanced" data-state="season-'+esc(key)+'"><summary>'+esc(season.name)+' · 已买 '+upgrades.filter(u=>u.bought).length+' / '+upgrades.length+
   (unlocked?' · 已解锁待买 '+unlocked:'')+
   '</summary><div class="collection">'+upgrades.map(u=>'<span class="'+(u.bought?'owned':'')+'">'+
   (u.bought?'✓ ':'')+esc(u.dname||u.name)+'</span>').join('')+'</div></details>';
 });
 return head('长期成长','训练与光环、季节收藏和皱纹虫收益。')+
  block('龙与光环',row('spark','龙等级 '+g.dragonLevel,esc(C.plain(dragon?.action||'等待龙蛋')+' · '+C.plain(dragon?.costStr?.()||'')),btn('训练一级','dragon-manual'))+
   facts([['龙掉落已买',drop.bought+' / 4'],['已解锁待买',String(drop.unlocked)]])+
   '<div class="actions">'+btn('训练规则','open-rule','dragon','ghost')+btn('光环规则','open-rule','aura','ghost')+btn('抚摸规则','open-rule','pet','ghost')+'</div>')+
  block('皱纹虫',facts([['当前数量',wrinklers.length+' 只'],['估算收益',F(wrinklers.reduce((sum,w)=>sum+C.wrinklerValue(g,w),0))+' 饼干']])+
   '<div class="actions">'+btn('收取普通皱纹虫','wrinklers-manual')+btn('收取规则','open-rule','wrinkler','ghost')+'</div>')+
  block('季节收藏',btn('季节规则','open-rule','season','ghost')+seasons.join(''));
}
function storagePage(){
 const saves=engine.backups();
 const snapshots=saves.map(s=>row('save',esc(s.label)+(s.pin?' · 重点':''),new Date(s.at).toLocaleString('zh-CN'),`<div class="actions">
  ${btn('下载','backup-download',s.id)}${btn('恢复','restore',s.id)}</div>`)).join('');
 return head('存档')+`<div class="actions">
  ${btn('保存快照','backup','','primary')}${btn('导出游戏存档','export')}
 </div>`+block('本地快照',snapshots||note('尚无快照。'))+
 `<details class="advanced" data-state="storage-lab"><summary>资源补给</summary>
  <label class="check"><input type="checkbox" id="lab-toggle" ${lab?'checked':''}>在本次会话启用</label>
  ${lab?`<div class="warning">补给会改变游戏进度。每次补给前会保存一份快照。</div>`:''}
  <div class="actions">
   ${[1,10,60].map(n=>btn('+ '+n+' 分钟基础产量','grant',n,'',!lab)).join('')}
   ${btn('+ 1 糖块','grant-lump','','',!lab)}${btn('恢复全部魔力','refill-magic','','',!lab)}
  </div>
 </details>`;
}
function settingsPage(g){
 const compatible=C.compatible(g);
 const updateLinks=update?`<div class="actions update-links">
  <a href="${esc(safeLink(update.userscript))}" target="_blank" rel="noopener">更新油猴脚本 ↗</a>
  <a href="${esc(safeLink(update.zip))}" target="_blank" rel="noopener">下载扩展安装包 ↗</a>
 </div>${note('油猴更新后刷新游戏。解压安装的扩展需替换文件后重新加载。')}`:'';
 return head('设置','',tag('v'+C.VERSION))+
  `<section class="rule-card update-card" aria-label="在线更新">
   <div class="card-title"><h3>在线更新</h3>${btn(checking?'正在检查…':'检查更新','update','','',checking)}</div>
   ${note(esc(updateText))}${update?note(esc(update.notes)):''}
   ${updateLinks}
   ${select('updateChannel','更新频道',[['stable','稳定版'],['beta','测试版']])}
   ${check('updateCheck','每日检查更新')}
   <details class="advanced" data-state="release-source"><summary>更新源</summary>${field('releaseBase','发布根地址','url')}</details>
  </section>
  <div class="rule-layout settings-layout">
   <section class="rule-card"><h3>挂机与通知</h3>
    ${check('remember','刷新后恢复已启用规则')}${check('background','允许后台尝试运行')}
    ${check('protectVeil','保护闪烁面纱')}${check('alerts','提醒金饼干和驯鹿')}${check('sound','播放提醒音')}
   </section>
   <section class="rule-card"><h3>显示与快照</h3>
    ${select('theme','界面主题',[['system','跟随系统'],['light','暖白'],['dark','松绿']])}
    ${select('density','内容密度',[['comfortable','舒适'],['compact','紧凑']])}
    ${field('backupMinutes','自动备份间隔（分钟）','number',{min:1,max:120})}${check('ads','隐藏游戏广告')}
   </section>
  </div>`+
  block('配置管理',row('shield','Cookie Clicker '+esc(g.version),compatible?'':'当前游戏版本未验证，挂机已暂停',tag(compatible?'已适配':'已暂停',compatible?'good':'warn'))+
   `<div class="actions settings-actions">${btn('导出设置','settings-export')}${btn('导入设置','settings-import')}
    ${btn('关闭全部规则','preset','observe')}${btn('卸载本页助手','unload','','danger')}</div>`);
}
const groups=[
 {id:'garden',name:'花园',icon:'leaf',rules:['harvest','plant'],analysis:'garden',link:'地块与种子'},
 {id:'magic',name:'魔法与万神殿',short:'魔法与神灵',icon:'magic',rules:['cast','pantheon','godzamok'],analysis:'magic',link:'法术与组合'},
 {id:'market',name:'股市',icon:'market',rules:['trade'],analysis:'market',link:'行情与持仓'},
 {id:'growth',name:'龙、季节与皱纹虫',short:'长期成长',icon:'growth',rules:['wrinkler','dragon','aura','pet','season'],analysis:'growth',link:'成长详情'},
 {id:'events',name:'点击与事件',icon:'spark',rules:['click','golden','deer','fortune','wrath']},
 {id:'supplies',name:'采购与糖块',icon:'buy',rules:['purchase','lumpManaged','lump','lumpLevel']}
];
const shortRules={
 harvest:'种子收获',plant:'按布局补种',cast:'条件施法',pantheon:'神灵调换',godzamok:'爆发出售与回购',
 trade:'条件交易',wrinkler:'皱纹虫收取',dragon:'龙训练',aura:'光环切换',pet:'抚摸龙',season:'季节切换',
 click:'自动连点',golden:'金饼干',deer:'驯鹿',fortune:'幸运新闻',wrath:'愤怒饼干',purchase:'自动采购',
 lump:'糖块收取',lumpLevel:'单栋升级',lumpManaged:'糖块托管'
};
const unlocks={
 harvest:['Farm','农场'],plant:['Farm','农场'],cast:['Wizard tower','巫师塔'],pantheon:['Temple','神庙'],
 godzamok:['Temple','神庙'],trade:['Bank','银行']
};
const purchaseModes=[['efficient','按预计回本采购'],['target','持续购买同一目标'],['plan','买完目标后按回本采购']];
const reserveModes=[['none','不保留'],['lucky','当前幸运满额'],['frenzy','狂热幸运满额'],['custom','自定义']];
const castModes=[['mana','足够魔力时'],['full','满魔力'],['frenzy','7 倍生产增益'],['click','点击增益']];
const gardenModes=[['seeds','只收取新种子'],['mature','收取成熟植物'],['buff','达到生产倍率再收获']];
const layouts=[['rows','亲本行'],['checker','交错排列'],['fill','填满可种空地']];
const challengeModes=[['none','不启用'],['noClick','无点击'],['noUpgrade','无升级'],['both','无点击与无升级']];
const slots=['钻石槽','红宝石槽','翡翠槽'];
const selectedRules=new Map();
const lumpReserveModes=[['adaptive','按存档推荐'],['custom','自定保留量']];
const lumpManagedModes=[['growth','解锁与成长'],['unlocks','只解锁小游戏']];
const lumpViews=[['managed','持续托管'],['single','单栋升级']];
const pantheonProfiles=[['auto','按当前挂机规则'],['idle','被动产量'],['click','持续连点'],['lumps','糖块成熟']];
let groupId='garden',planTab='purchase',inspectedPurchase='',lumpDraft=null,lumpView='managed',pantheonProfile='auto';

function currentRule(group,g){
 const selected=selectedRules.get(group.id);
 if(selected)return selected;
 if(group.id==='magic'&&C.mini(g,'Temple')&&!C.mini(g,'Wizard tower'))return'pantheon';
 return group.rules[0];
}

function activePage(){
 if(['queue','management'].includes(page))return'overview';
 if(['garden','magic','market','growth'].includes(page))return'automation';
 if(page==='purchase')return'planning';
 return page;
}
function automationGate(g,c){
 if(engine.startupHold)return'刷新后等待手动继续';
 const env=engine.env();
 const reason=engine.leaseGate();
 if(reason||!env.follower)return reason;
 return leaseInOtherTab?'另一游戏标签页正在运行':'正在取得挂机执行权';
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
function lumpManagedReport(g,c,plan=C.lumpRoutePlan(g,c)){
 if(!c.lumpManaged)return{label:'未托管',text:'确认一次，按路线收取和分配'};
 if(plan.status==='different-save')return{label:'需重新确认',text:plan.reason,tone:'warn'};
 const gate=automationGate(g,c);
 if(gate)return{label:'已暂停',text:gate,tone:'warn'};
 if(plan.status==='protected')return{label:'分配受保护',text:plan.reason,tone:'warn'};
 const labels={ready:'待升级',waiting:'等糖块',locked:'等解锁',building:'等建筑',holding:'储存中'};
 return{label:labels[plan.status]||'等待',text:plan.reason,tone:['ready','holding'].includes(plan.status)?'good':''};
}
function ruleReport(g,c,key){
 const locked=ruleLock(g,key);
 if(locked)return{label:'未解锁',text:locked};
 if(key==='lumpLevel')return lumpUpgradeReport(g,c);
 if(key==='lumpManaged')return lumpManagedReport(g,c);
 if(!(key==='lump'?C.collectsLumps(g,c):c[key]))return{label:'已关闭',text:'规则已关闭'};
 const gate=automationGate(g,c);
 if(gate)return{label:'已暂停',text:gate,tone:'warn'};
 const state=engine.states[key]||'';
 if(M.modes(g,c).garden&&['harvest','plant'].includes(key)){
  const reason=engine.states.plant;
  return{label:'托管中',text:reason&&reason!=='已关闭'?reason:'等待花园托管检查',tone:'good'};
 }
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
  const cast=M.modes(g,c).magic?engine.spellPlan(g,c):C.castPlan(g,c,engine.lastCast);
  if(!cast.reason)return{label:'待施法',text:cast.spell.name+' · 消耗 '+F(cast.cost)+' 魔力',tone:'good'};
  const timed=Number.isFinite(cast.seconds);
  return{label:timed?(cast.reason==='等待魔力'?'等魔力':'冷却中'):'等待条件',
   text:cast.reason+(timed?' · 约 '+T(cast.seconds):'')};
 }
 if(key==='pantheon'){
  const plan=C.pantheonPlan(g,c.gods,c.swapReserve);
  const labels={ready:'待调换',waiting:'等次数',matched:'已就位',protected:'保留次数',invalid:'需检查',unplanned:'待选阵容'};
  return{label:labels[plan.status]||'等待',text:plan.reason+(plan.status==='waiting'&&Number.isFinite(plan.seconds)?' · 约 '+T(plan.seconds):''),
   tone:['invalid','protected'].includes(plan.status)?'warn':['ready','matched'].includes(plan.status)?'good':''};
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
function pantheonRecommendation(g,c){
 const advice=C.pantheonAdvice(g,c,pantheonProfile);
 if(!advice)return'';
 const plan=C.pantheonPlan(g,advice.gods,c.swapReserve);
 const configured=c.pantheon&&c.gods.every((id,i)=>id===advice.gods[i]);
 const moves=plan.moves?.length||0;
 const budget=moves?'需调换 '+moves+' 次 · 现在可用 '+plan.swaps+' 次':'推荐阵容已就位';
 return `<div class="pantheon-advice" aria-label="推荐神灵阵容">
  ${select('pantheon-profile','推荐用途',pantheonProfiles,pantheonProfile)}
  <h4>${esc(advice.title)}</h4>
  ${note(esc(budget+(pantheonProfile==='lumps'?' · '+advice.reason:'')))}
  <div class="actions">
   ${btn(configured?'已设为挂机阵容':'按此阵容挂机','apply-pantheon','','primary',configured||!C.compatible(g))}
   ${c.pantheon?btn('停止维持','stop-pantheon','','ghost'):''}
  </div>
  <ul class="spirit-list">${advice.picks.map(({slot,god,effect})=>`<li>
   <strong>${slots[slot]} · ${esc(C.plain(god.name).split(',')[0])}</strong><small>${esc(effect)}</small></li>`).join('')}</ul>
 </div>`;
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
  return pantheonRecommendation(g,c)+`<details class="advanced" data-state="custom-pantheon"><summary>自定义槽位</summary>
   ${check('pantheon','保持已设定的阵容')}<div class="fields">${slots.map((slot,i)=>select('god-'+i,slot,options,c.gods[i])).join('')}
   ${field('swapReserve','至少保留调换次数','number',{min:0,max:3,step:1})}</div></details>`;
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
 lump(g,c){return check('lump',C.managesLumps(g,c)?'停止托管后仍收取':'完全成熟后自动收取')+btn('查看糖块规划','sugar-plan','managed','ghost');},
 lumpManaged(g,c){
  return lumpManagedButton(g,c)+btn('查看托管路线','sugar-plan','managed','ghost');
 },
 lumpLevel(g,c){
  const plan=C.lumpPlan(g,c);
  return (plan.object&&!['done','different-save'].includes(plan.status)?check('lumpLevel','执行此建筑的等级任务'):'')+
   btn('打开单栋升级','sugar-plan','single','ghost');
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
 lumpLevel:'逐级提升指定建筑，达标后结束任务。糖块收取由独立开关控制。',
 lumpManaged:'成熟时收取，按路线升级，保留足够糖块后再花费。'
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
  if(key==='pantheon'&&p)return [['剩余调换',p.swaps+' / 3 次'],['预留次数',c.swapReserve+' 次'],
   ...slots.map((slot,i)=>[slot,C.plain(p.godsById[p.slot[i]]?.name)||'空'])];
  const spell=m?.spells[c.spell];
  return [
   ['当前魔力',m?F(m.magic)+' / '+F(m.magicM):'巫师塔升至 1 级解锁'],
   ['施法消耗',spell?F(m.getSpellCost(spell))+' · 反噬 '+F(m.getFailChance(spell)*100)+'%':'待选择法术'],
   ['调换次数',p?p.swaps+' 次':'神庙升至 1 级解锁'],
   ...slots.map((slot,i)=>[slot,C.plain(p?.godsById[p.slot[i]]?.name)||'空']),
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
 if(key==='lumpLevel'||key==='lumpManaged'){
  const target=key==='lumpManaged'?C.lumpRoutePlan(g,c):C.lumpPlan(g,c);
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
 const key=currentRule(group,g);
 const run=M.execution(g,c),managed=M.owner(g,c,key);
 const report=ruleReport(g,run,key);
 const locked=ruleLock(g,key);
 const action=group.analysis?btn(group.link,'navigate',group.analysis,'ghost'): '';
 const category=M.moduleForRule(key);
 return `<div class="rule-heading"><h2>${group.name}</h2><div class="actions">${action}${category?btn('玩法托管','manage-module',category,'ghost'):''}</div></div>
  <div class="rule-layout">
   <section class="rule-card" aria-label="规则详情">
    <div class="card-title"><h3>${shortRules[key]}</h3>${tag(report.label,report.tone)}</div>
    ${key==='pantheon'&&!locked?c.pantheon?`<p class="rule-reason">${esc(report.text)}</p>`:'':
      `<p class="rule-reason" data-current-rule="${key}">${esc(report.text)}</p><p class="rule-copy">${esc(descriptions[key])}</p>`}
    ${locked?btn('规划解锁','plan-unlock',unlocks[key][0],'ghost'):
      managed?note(esc(managementModules[managed].title)+'托管正在接管此规则。')+btn('设置托管','manage-module',managed,'ghost'):ruleConfig[key](g,c)}
   </section>
   <section class="rule-card" aria-label="玩法状态"><h3>游戏状态</h3>
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
 const managed=M.modes(g,c);
 const ascent=engine.ascentJob(g);
 if(ascent&&managed.ascension==='cycle'&&(g.OnAscend||g.AscendTimer||g.ReincarnateTimer)){
  add('ascension','完成转生 · '+ascent.name,0,engine.states.ascension||'按顺序完成天堂升级与重开');
  return jobs;
 }
 if(ascent?.combo&&managed.ascension==='cycle'){
  add('ascension','转生前等待一次爆发',Math.max(0,(ascent.combo.until-Date.now())/1000),
   '生产狂热与点击狂热叠加，超时后继续转生');
 }
 if(engine.rebuy.length){
  add('godzamok','回购建筑 · 余 '+engine.rebuy.length+' 项',0,engine.states.godzamok||'先恢复建筑库存');
  return jobs;
 }
 if(managed.garden){
  const plan=M.gardenPlan(g,c);
  if(plan.kind)add('plant',plan.reason,plan.seconds,'花园托管');
 }
 if(c.harvest&&!managed.garden){
  const info=C.garden(g);
  const tile=C.harvestTargets(g,c,info)[0];
  if(tile)add('harvest','收获 '+C.tileName(tile)+' 的'+tile.p.name,tile.mature?0:Math.max(info.next,tile.eta),'按花园生长速度估算');
 }
 if(c.plant&&!managed.garden){
  const tile=C.plantingPlan(g,c).tiles[0];
  if(tile)add('plant','在 '+C.tileName(tile)+' 补种'+tile.plant.name,0,'预计花费 '+F(tile.cost)+' 饼干');
 }
 if(c.cast){
  const cast=managed.magic?engine.spellPlan(g,c):C.castPlan(g,c,engine.lastCast);
  if(cast.spell)add('cast','施放'+C.plain(cast.spell.name),cast.seconds,'消耗 '+F(cast.cost)+' 魔力 · 保留 '+F(c.magicReserve));
  if(cast.holding&&!ascent?.combo)add('cast','等待生产狂热',cast.seconds,'保留当前命运之手序列和魔力 · 显示最长等待');
 }
 if(c.pantheon){
  const plan=C.pantheonPlan(g,c.gods,c.swapReserve);
  const move=plan.moves?.[0];
  if(move)add('pantheon',slots[move.slot]+'配置 '+C.plain(move.god.name).split(',')[0],plan.seconds,'消耗 1 次调换 · 保留 '+c.swapReserve+' 次');
 }
 if(C.collectsLumps(g,c)){
  const lump=C.lumpWindow(g);
  if(lump&&!lump.overripe)add('lump','安全收取糖块',lump.remaining,'等游戏判定完全成熟');
 }
 const lumpRule=c.lumpManaged?'lumpManaged':c.lumpLevel?'lumpLevel':'';
 if(lumpRule&&!['noUpgrade','both'].includes(c.challenge)){
  const plan=c.lumpManaged?C.lumpRoutePlan(g,c):C.lumpPlan(g,c);
  if(['ready','waiting'].includes(plan.status))add(lumpRule,plan.name+'升至 '+(plan.current+1)+' 级',plan.nextSeconds,
   (plan.nextShortfall?'下一级还缺 '+lumpCount(plan.nextShortfall)+' · ':'消耗 '+lumpCount(plan.nextCost)+' · ')+
   '保留 '+lumpCount(plan.reserve)+' · 目标 '+plan.target+' 级');
 }
 if(c.purchase&&!engine.rebuy.length){
  const plan=M.purchasePlan(g,c,{bridgedTarget:engine.bridgedTarget});
  const item=plan.next||plan.target;
  if(item)add('purchase','买入 '+item.name,plan.seconds,plan.unlock?'准备解锁'+plan.unlock:plan.bridge?'过渡购买可缩短目标等待时间':
   item.shortfall>0?'还差 '+F(item.shortfall)+' 饼干 · 按当前被动产速估算':'买后预计保留 '+F(item.keep));
 }
 if(managed.market){
  const orders=M.marketOrder(g,c,engine.hist,engine.ledger).orders||[];
  const order=orders.find(item=>item.side==='sell')||orders[0];
  const plan=M.marketLoanPlan(g,c,ascent,engine.clickSample.rate)||M.marketDevelopment(g,c);
  if(plan.kind==='loan'||plan.kind&&order?.side!=='sell')add('trade',plan.reason,0,'股市托管');
  else if(order)add('trade',(order.side==='sell'?'卖出 ':'买入 ')+order.row.q.name+' ×'+order.units,0,'股市托管');
 }
 if(managed.dragon){
  const plan=M.dragonPlan(g,c,managed.dragon);
  if(plan.kind)add('dragon',plan.reason,0,'养龙托管');
 }
 if(managed.season){
  const plan=M.seasonPlan(g,c);
  if(plan.kind)add('season',plan.reason,0,'季节托管 · 花费 '+F(plan.cost)+' 饼干');
 }
 if(managed.research){
  const plan=M.researchPlan(g,c);
  add('research',plan.reason,plan.upgrade?0:plan.seconds,plan.upgrade?'研究托管 · 花费 '+F(plan.cost)+' 饼干':'研究倒计时');
 }
 if(managed.ascension==='cycle'&&!ascent){
  const plan=M.ascensionPlan(g,c);
  if(plan.ready||plan.deficit>0)add('ascension','转生 · '+plan.name,plan.ready?0:plan.seconds,plan.reason);
 }
 return jobs.sort((a,b)=>a.seconds-b.seconds);
}
function protections(g,c){
 if(automationGate(g,c))return[];
 const items=[];
 for(const key of ['harvest','plant','cast','pantheon','trade','godzamok','dragon','aura','wrinkler','season','click','purchase','lumpManaged','lumpLevel']){
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
  `<button type="button" class="next-job" data-action="${key==='ascension'?'plan-tab':key==='research'?'manage-module':'open-rule'}" data-arg="${key==='ascension'?'prestige':key}">
   <span><strong>${esc(title)}</strong>${compact?'':`<small>${esc(detail)}</small>`}</span>
   <span class="eta">${seconds>0?'约 '+T(seconds):'条件已满足'}</span>${I('chevron')}
  </button>`).join('');
}
function runtimeState(g,c){
 const gate=automationGate(g,c),run=M.execution(g,c);
 const managed=M.modes(g,c);
 const count=C.AUTO.filter(key=>run[key]).length+Number(!!managed.ascension)+Number(!!managed.research);
 if(engine.paused)return{label:'已暂停',tone:'warn',message:engine.startupHold?gate:'所有挂机规则已暂停'};
 if(gate)return{label:'等待中',tone:'warn',message:gate};
 if(engine.ascentJob(g)&&(g.OnAscend||g.AscendTimer||g.ReincarnateTimer))return{label:'自动转生中',tone:'good',message:'正在完成天堂升级和重开'};
 if(engine.rebuy.length)return{label:'恢复建筑中',tone:'warn',message:engine.states.godzamok||'存在未完成的回购'};
 if(engine.throttled)return{label:'调度受限',tone:'warn',message:'浏览器拉长了运行间隔'};
 if(!count)return{label:'未启用',tone:'',message:'尚未启用挂机规则'};
 return{label:document.hidden?'后台运行':'运行中',tone:'good',message:'已启用 '+count+' 条规则'};
}
function activity(){
 const elapsed=engine.runningMs>0?T(engine.runningMs/1000):'0秒';
 return `<dl class="overview-stats" aria-label="本轮挂机统计">
  <div><dt>挂机时长</dt><dd>${elapsed}</dd></div>
  <div><dt>操作次数</dt><dd>${F(engine.actions,0)}</dd></div>
  <div><dt>生效点击</dt><dd>${F(engine.clicks,0)}</dd></div>
 </dl>`;
}
function nextSetup(g,c){
 const temple=C.mini(g,'Temple');
 if(temple&&temple.slot.every(id=>id<0)&&!c.gods.some(id=>id>=0)&&C.pantheonAdvice(g,c)){
  return row('magic','万神殿可配置阵容','查看适合当前挂机方式的神灵和调换预算。',btn('看阵容','open-rule','pantheon','ghost'));
 }
 if(!c.harvest){
  const seed=C.harvestTargets(g,{...c,gardenMode:'seeds'})[0];
  if(seed?.mature)return row('leaf','花园有成熟的新种子',esc(C.tileName(seed)+' · '+seed.p.name),btn('看收获规则','open-rule','harvest','ghost'));
 }
 if(!c.lumpManaged&&!c.lumpLevel&&C.lumpBalance(g)!==null){
  const {choice}=C.lumpRoutePlan(g,c);
  if(choice?.level===1)return row('growth','糖块可用于'+esc(choice.label),esc(choice.reason),btn('看托管路线','sugar-plan','managed','ghost'));
 }
 if(!c.cast&&C.mini(g,'Wizard tower')){
  return row('magic','魔法书可设置条件施法',esc(C.castPlan(g,c,engine.lastCast).reason||'当前法术已满足施放条件。'),btn('看施法规则','open-rule','cast','ghost'));
 }
 if(!c.trade){
  const market=C.market(g,engine.hist);
  if(market?.goods.length){
   const ready=market.goods.filter(item=>item.samples>=c.marketMinSamples).length;
   return row('market',ready?'股市已有可用价格样本':'股市正在积累报价',
    ready?'已达到采样门槛的商品 '+ready+' 种，可先核对预算和手续费。':'每种商品积累 '+c.marketMinSamples+' 个样本后，可按分位交易。',
    btn('看交易规则','open-rule','trade','ghost'));
  }
 }
 return'';
}
function managementNext(g,c,id,choice){
 const run=M.execution(g,c);
 switch(id){
  case 'garden':return M.gardenPlan(g,run).reason;
  case 'magic':{
   const plan=engine.spellPlan(g,run);
   return plan.reason||'可施放 '+C.plain(plan.spell.name)+' · '+plan.detail;
  }
  case 'pantheon':{
   const gods=c.managed.gods||M.pantheonLineup(g,run);
   if(!gods)return'等待万神殿解锁';
   const plan=C.pantheonPlan(g,gods,run.swapReserve);
   return plan.reason+(plan.status==='waiting'&&Number.isFinite(plan.seconds)?' · 约 '+T(plan.seconds):'');
  }
  case 'market':{
   const plan=M.marketOrder(g,run,engine.hist,engine.ledger),order=plan.orders?.find(item=>item.side==='sell')||plan.orders?.[0];
   const development=M.marketDevelopment(g,run);
   if(development.kind&&order?.side!=='sell')return development.reason;
   return order?(order.side==='sell'?'卖出 ':'买入 ')+order.row.q.name+' ×'+order.units:development.reason||plan.reason;
  }
  case 'dragon':{
   const plan=M.dragonPlan(g,run,choice);
   if(plan.kind)return plan.reason;
   const aura=choice==='develop'&&M.growthAura(g,run);
   if(aura)return '配置 '+(aura.aura.dname||aura.aura.name)+' · 牺牲 1 座 '+(aura.highest.dname||aura.highest.name);
   const drops=M.dragonRewardStatus(g);
   if(g.dragonLevel>=8&&C.has(g,'Pet the dragon')){
    if(drops.missing)return '抚摸龙 · 还缺 '+drops.missing+' 件掉落';
    if(drops.unlocked)return '已解锁待买 '+drops.unlocked+' 件 · '+plan.reason;
    return '龙掉落已买齐 · '+plan.reason;
   }
   return plan.reason;
  }
  case 'season':return M.seasonPlan(g,run).reason;
  case 'research':return M.researchPlan(g,run).reason;
  case 'wrinklers':{
   const plan=M.wrinklerPlan(g,run,choice);
   return plan.target?'可收取普通皱纹虫 · 估算 '+F(plan.value)+' 饼干':plan.reason;
  }
  case 'events':return C.veil(g,run)?'闪烁面纱保护中':choice==='burst'&&!C.clickBuff(g)?'等待点击增益与自然事件':
   '连点目标 '+run.rate+' 次/秒';
  case 'purchase':{
   const plan=M.purchasePlan(g,{...run,purchaseMode:'efficient',target:''});
   return plan.next?'可购买 '+plan.next.name+' · '+F(plan.next.price)+' 饼干':plan.reason;
  }
  case 'ascension':{
   const job=engine.ascentJob(g);
   if(choice==='cycle')return job?'正在执行 '+job.name+' · '+(engine.states.ascension||'按游戏实际进度接续'):M.ascensionPlan(g,c).reason;
   return c.ascendTarget>0?'预计新增 '+F(C.prestige(g),0)+' / '+F(c.ascendTarget,0)+' 声望':'先在转生规划中设定声望目标';
  }
  default:return C.lumpRoutePlan(g,run).reason;
 }
}
function managedScope(id,choice,c){
 const module=managementModules[id];
 if(id==='dragon')return module.scope+(choice==='develop'?
  '训练至设定的 '+c.dragonMax+' 级，可能牺牲建筑。达标后可为尚未设置的主光环消耗一座最高阶建筑。':
  choice==='collect'?'解锁抚摸后训练到最多 8 级，训练各消耗 100 个指针、老太婆、农场，并为每种留 1 个。':
   '训练最多至 5 级，先孵化并培养龙。');
 if(id==='garden'&&choice==='cycle')return module.scope+' 收齐种子后种植对应植物刷掉落，最后按预计收益种植。自动换土会遵守冷却和保护格。';
 if(id==='market'&&choice==='development')return module.scope+' 会用指针升级办公室至 '+c.marketOfficeCap+
  ' 级，至少保留 '+c.marketCursorKeep+' 个指针，并按预算雇最多 '+c.marketBrokerCap+' 名经纪人。转生爆发贷款需单独授权。';
 if(id==='season')return module.scope+' 每轮转生最多 '+c.managed.seasonLimit+' 次季节切换。';
 if(id==='magic')return module.scope+(choice==='combo'?'预测到点击狂热时等待生产狂热，超时后恢复日常施法。Haggler’s Charm 可推进序列，反噬时升级价格暂涨 2%。':
  '平时召唤饼干。不合适的序列可用 Haggler’s Charm 推进，反噬时升级价格暂涨 2%。');
 if(id==='research'&&choice==='pledge')return module.scope+' 长者契约后持续安抚。闪光皱纹虫或万圣节待收集时延后。';
 if(id==='research'&&choice==='seasonal')return module.scope+' 万圣节需要掉落时，推进到「一心」，暂时轮换普通皱纹虫，收齐后恢复原方案。';
 if(id==='ascension'&&choice==='cycle')return '筹码达标后，按总预算补齐临近成就并结算普通皱纹虫。若预测可叠加点击狂热，会按设定最多等一次。之后购买天堂升级、设置永久栏并重开。';
 return module.scope;
}
function managementFields(id,c,choice){
 let options='';
 if(id==='garden')options=field('gardenSpend','种植预算（可用饼干 %）','number',{min:0,max:100});
 if(id==='garden'&&choice==='cycle')options+=
  select('gardenCrop','收益作物',[['auto','按预计收益选择'],['bakeberry','烘焙浆果'],['queenbeet','女王甜菜'],
   ['duketater','公爵土豆'],['chocoroot','巧克力根'],['whiteChocoroot','白巧克力根']])+
  field('harvestBuff','收益收获最低生产倍率','number',{min:1,step:1})+check('gardenAutoSoil','自动切换土壤');
 if(id==='magic')options=field('magicReserve','保留魔力','number',{min:0})+
  field('castCooldown','施法冷却（秒）','number',{min:1,step:1})+
  field('comboWait','等待生产狂热上限（秒）','number',{min:30,max:1800,step:1});
 if(id==='ascension')options=field('ascendTarget','最低新增声望','number',{min:0})+
  check('ascendCombo','转生前等待一次可预测的爆发')+
  (c.ascendCombo?field('comboWait','等待爆发上限（秒）','number',{min:30,max:1800,step:1}):'');
 if(id==='pantheon')options=field('swapReserve','保留调换次数','number',{min:0,max:3,step:1});
 if(id==='market')options=field('marketBudget','总仓位预算（可用饼干 %）','number',{min:0,max:100})+
  field('marketMinSamples','最低报价样本数','number',{min:5,max:2000,step:1})+
  field('marketProfit','最低净利 %','number',{min:0})+
  field('marketCap','单项仓位上限','number',{min:1,max:10000,step:1})+
  field('marketBuy','买入分位 ≤ %','number',{min:0,max:49})+
  field('marketSell','卖出分位 ≥ %','number',{min:51,max:100});
 if(id==='market'&&choice==='development')options+=
  field('marketOfficeCap','办公室等级上限','number',{min:1,max:6,step:1})+
  field('marketCursorKeep','升级后保留指针','number',{min:1,max:1000,step:1})+
  field('marketBrokerCap','经纪人数上限','number',{min:0,max:100,step:1})+
  select('marketLoan','转生爆发贷款',[[0,'关闭'],[1,'贷 1 · 办公室 3 级'],[2,'贷 2 · 办公室 5 级'],[3,'贷 3 · 办公室 6 级']],
   c.marketLoanSave===engine.g?.fullDate?c.marketLoan:0);
 if(id==='dragon')options=field('dragonMax','训练等级上限','number',{min:0,max:27,step:1});
 if(id==='events')options=field('rate','连点目标次数 / 秒','number',{min:1,max:40,step:1});
 if(id==='purchase')options=select('reserveMode','饼干保留',reserveModes)+
  (c.reserveMode==='custom'?field('reserve','保留饼干数','number',{min:0}):'')+
  field('bulk','每次购买数量','number',{min:1,max:100,step:1})+
  field('maxBuilding','单类建筑数量上限','number',{min:1,step:1});
 return options?`<details class="advanced" data-state="manage-settings"><summary>设置预算与条件</summary><div class="fields">${options}</div></details>`:'';
}
function managementPage(g,c){
 const active=M.modes(g,c),module=managementModules[managementTab];
 const mode=active[managementTab];
 const choice=managementDraft.get(managementTab)||mode||module.modes?.[0]?.[0];
 const preview=choice?{...c,managed:{...c.managed,saveId:g.fullDate,modes:{...active,[managementTab]:choice}}}:c;
 const actions=managementTab==='lumps'?btn('打开糖块托管','sugar-plan','managed','primary'):
  btn(mode&&mode!==choice?'应用新方案':mode?'已开启托管':'开启托管','start-management',managementTab,'primary',
   !C.compatible(g)||!g.fullDate||mode===choice||managementTab==='ascension'&&choice==='cycle'&&!navigator.locks?.request)+
  (mode?btn('停止托管','stop-management',managementTab,'ghost'):'');
 const summary=managementNext(g,preview,managementTab,choice);
 return `<div class="rule-heading">
  <h2>玩法托管</h2>
   <div class="actions">${btn('启用全程挂机','management-growth','','primary',!C.compatible(g)||!g.fullDate||!navigator.locks?.request)}${btn('启用常用组合','management-common','','ghost',!C.compatible(g)||!g.fullDate)}${btn('执行队列','navigate','queue','ghost')}</div>
 </div>
 ${M.configured(c)&&c.managed.saveId!==g.fullDate?note('存档已切换。请在当前存档重新确认托管。'):''}
 <div class="management-layout">
  <div class="management-list" role="group" aria-label="选择托管玩法">${Object.entries(managementModules).map(([id,item])=>{
   const running=id==='lumps'?C.managesLumps(g,c):active[id];
   return `<button type="button" class="manage-choice" aria-pressed="${id===managementTab}" data-action="manage-module" data-arg="${id}">
    <span>${item.title}</span>${running?'<span class="managed-dot" aria-label="已托管"></span>':''}</button>`;
  }).join('')}</div>
  <section class="rule-card management-detail" aria-label="托管方案">
   <div class="card-title"><h3>${module.title}</h3>${mode||managementTab==='lumps'&&C.managesLumps(g,c)?tag(engine.paused?'已暂停':'已托管','good'):''}</div>
   ${module.modes?.length>1?select('management-profile','托管目标',module.modes,choice):''}
   <div class="route-next"><strong>下一步</strong><p>${esc(mode&&automationGate(g,c)||summary||'等待规则条件满足')}</p></div>
   <div class="actions">${actions}
    ${managementTab==='garden'?btn('查看地块','navigate','garden','ghost'):
     module.link?btn('查看规则','open-rule',module.link,'ghost'):
      managementTab==='ascension'?btn('调整声望目标','plan-tab','prestige','ghost'):''}
   </div>
   ${note(esc(managedScope(managementTab,choice,c)))}
   ${managementTab==='season'?select('managed-season-limit','本轮季节切换上限',Array.from({length:12},(_,i)=>[i+1,(i+1)+' 次']),c.managed.seasonLimit):''}
   ${managementTab==='season'&&M.halloweenResearchNeeded(g,preview)&&!C.has(g,'One mind')&&(!active.research||active.research==='safe')?
    btn('设置万圣节研究衔接','configure-halloween','','ghost'):''}
   ${managementFields(managementTab,c,choice)}
  </section>
 </div>`;
}
function compactOverview(g,c){
 const run=M.execution(g,c),status=runtimeState(g,c);
 const jobs=nextJobs(g,run);
 const [first,...rest]=protections(g,run);
 const enabled=M.active(g,c);
 const suggestion=nextSetup(g,run);
 const inspection=status.tone==='warn'?status.message:engine.states.system||'';
 return `<div class="overview">
  <div class="overview-heading"><h2>挂机总览</h2><div class="actions">
   ${btn('玩法托管','navigate','management','primary')}
   ${enabled?btn('查看队列','navigate','queue','ghost'):''}
  </div></div>
  ${activity()}
  <section class="rule-card overview-next" aria-label="下一步执行">
   <div class="card-title"><h3>下一步</h3>${enabled?'':btn('查看队列','navigate','queue','ghost')}</div>
   ${jobs.length?jobRows(jobs.slice(0,2),true):note(esc(status.tone==='good'?'等待自然事件或已启用规则的条件满足。':status.message+'。'))}
  </section>
  ${activityDiagnostics(inspection)}
  ${first?`<button type="button" class="guard-summary" data-action="open-rule" data-arg="${first.key}">
   ${I('shield')}<span><strong>${esc(first.title)}</strong> · ${esc(first.text)}</span>
   ${rest.length?`<small>另 ${rest.length} 项</small>`:I('chevron')}</button>`:''}
  ${suggestion?`<section class="lump-advice" aria-label="建议下一步">${suggestion}</section>`:''}
  <div class="group-shortcuts" role="group" aria-label="玩法入口">${groups.map(group=>{
   const count=group.rules.filter(key=>run[key]).length;
   return btn(I(group.icon)+`<span>${esc(group.short||group.name)}</span><small>${count}/${group.rules.length}</small>`,'rule-group',group.id,count?'enabled':'');
  }).join('')}</div>
 </div>`;
}
function queuePage(g,c){
 const run=M.execution(g,c);
 const jobs=nextJobs(g,run),held=protections(g,run);
 const gate=automationGate(g,c);
 return `<div class="rule-heading"><h2>执行队列</h2>${btn('返回总览','navigate','overview','ghost')}</div>
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
function activityDiagnostics(blocker=''){
 const {activity,failure}=engine.diagnostics();
 if(!blocker&&!activity&&!failure)return'';
 const summarize=item=>new Date(item.at).toLocaleTimeString('zh-CN',{hour12:false})+' · '+item.text;
 return `<section class="rule-card runtime-detail" aria-label="挂机诊断">${facts([
  ...(blocker?[['当前阻塞',blocker]]:[]),
  ...(activity?[['最近成功',summarize(activity)]]:[]),
  ...(failure?[['最近异常',summarize(failure)]]:[])
 ])}</section>`;
}
function planningPage(g,c){
 let detail;
 try{
  if(planTab==='purchase')detail=purchasePlanning(g,c);
  else if(planTab==='combo')detail=comboPlanning(g,c);
  else if(planTab==='lumps')detail=lumpPlanning(g,c);
  else detail=prestigePlanning(g,c);
 }catch(error){detail=empty('此规划暂时无法读取',esc(error.message));}
 const label=planTabs.find(([key])=>key===planTab)[1];
 return head(label)+detail;
}
function purchasePlanning(g,c){
 const rows=C.purchases(g,c);
 const plan=C.purchasePlan(g,c,{rows,bridgedTarget:engine.bridgedTarget});
 const filtered=rows.filter(item=>!search||item.name.toLowerCase().includes(search.toLowerCase()));
 const selected=filtered.find(item=>item.id===inspectedPurchase)||filtered.find(item=>item.id===plan.target?.id)||filtered[0];
 const choices=filtered.map(item=>`<button type="button" class="candidate" data-action="inspect-purchase" data-arg="${esc(item.id)}"
  aria-pressed="${item.id===selected?.id}"><span><strong>${esc(item.name)}</strong>
  <small>${esc(item.kind)} · ${F(item.price)} 饼干</small></span>
  ${c.purchase&&c.purchaseMode!=='efficient'&&item.id===plan.target?.id?tag('采购目标','good'):item.blocked?tag('已排除','warn'):''}</button>`).join('');
 let detail=note('没有符合搜索条件的候选。');
 if(selected){
  const target=c.purchaseMode==='plan'&&c.target===selected.id;
  const challenge=['noUpgrade','both'].includes(c.challenge)&&selected.id.startsWith('u:');
  const mayPlan=selected.auto&&!selected.blocked&&!challenge;
  detail=`<div class="card-title"><h3>${esc(selected.name)}</h3>${tag(selected.kind)}</div>
   ${facts([['数量',F(selected.qty,0)],['估算增产',F(selected.delta)+'/秒'],['预计回本',T(selected.pp)],
    ['买后预计保留',F(selected.keep)],['当前预算缺口',F(selected.shortfall)],['预计可购',selected.shortfall?T(selected.eta):'预算已足']])}
   <div class="actions">
    ${mayPlan?target?btn('移除指定目标','target',''):btn('设为采购目标','target',selected.id,'primary'):''}
    ${btn('手动购买','buy',selected.id)}
    ${btn(selected.blocked?'取消屏蔽':'加入黑名单','block',selected.id,'ghost')}
   </div>
   ${note(esc(selected.quality||'此项涉及特殊效果，由玩家决定。'))}`;
 }
 return `<div class="rule-layout plan-layout">
  <section class="rule-card" aria-label="建筑与升级"><h3>建筑与升级</h3>
   <label class="field"><span>筛选候选</span><input id="purchase-search" aria-label="筛选候选" type="text" value="${esc(search)}"></label>
   <div class="candidates" data-scroll="purchase-list">${choices||note('没有候选。')}</div></section>
  <section class="rule-card" aria-label="采购目标详情">${detail}</section>
 </div>
 <details class="advanced" data-state="purchase-settings"><summary>采购设置</summary>${check('purchase','启用自动采购')}${purchaseControls(c)}</details>`;
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
  picked?'':btn('选用建议','lump-route',advice.buildingId+':'+advice.level,'ghost'))}</section>`;
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
 return buttons.length?`<details class="advanced" data-state="lump-routes"><summary>其他糖块路线</summary>
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
 const available=plan.status==='done'?'已达标':plan.balance===null?'等待糖块解锁':plan.status==='protected'?plan.reason:
  plan.shortfall?'还差 '+lumpCount(plan.shortfall):'预算已足';
 return `<p class="target-cost"><strong>${current} → ${target} 级</strong><span>${esc(lumpCount(plan.totalCost)+' · '+available)}</span></p>
  <div class="actions lump-actions">
   ${btn(assigned?'已安排此升级':'安排此建筑升级','assign-lump','','primary',assigned||plan.status==='done'||!C.compatible(g)||!g.fullDate)}
   ${btn('立即升 1 级','level',object.id,'',manual.status!=='ready'||!C.compatible(g))}
  </div>${bakingChange}${effects.length?note(esc(effects.join(' · '))):''}
  <details class="advanced" data-state="lump-budget"><summary>预算明细</summary>${facts([
   ['升至下一级',plan.nextCost?lumpCount(plan.nextCost)+(plan.nextShortfall?' · 缺 '+lumpCount(plan.nextShortfall):''):'已达标'],
   ['到目标总花费',lumpCount(plan.totalCost)],
   ...(plan.shortfall?[['预计等到预算充足',T(plan.seconds)]]:[])
  ])}${plan.shortfall&&Number.isFinite(plan.seconds)?note('按每轮 1 颗和当前生长速度估算。'):''}</details>`;
}
function lumpStatus(g,c,draft){
 const balance=C.lumpBalance(g),window=C.lumpWindow(g);
 const {reserve,baking,unlock}=C.lumpBudget(g,c,g.ObjectsById[draft?.buildingId],draft?.level);
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
function lumpStatusCard(g,c,draft){
 return `<section class="rule-card" aria-label="糖块状态">
  <h3>糖块状态</h3>
  <div id="lump-balances">${lumpStatus(g,c,draft)}</div>
  <div class="fields">
   ${select('lumpReserveMode','保留策略',lumpReserveModes)}
   ${c.lumpReserveMode==='custom'?field('lumpReserve','最低保留量','number',{min:0,step:1}):''}
  </div>
  ${check('lump',C.managesLumps(g,c)?'停止托管后仍收取':'完全成熟后自动收取')}
 </section>`;
}
function lumpManagedButton(g,c){
 if(C.managesLumps(g,c))return btn('停止托管','stop-lump-managed');
 return btn('开启持续托管','start-lump-managed','','primary',!C.compatible(g)||!g.fullDate);
}
function lumpManagedPlanning(g,c){
 const plan=C.lumpRoutePlan(g,c);
 const report=lumpManagedReport(g,c,plan);
 const status=plan.choice?plan.reason+(plan.status==='waiting'&&Number.isFinite(plan.nextSeconds)?' · 约 '+T(plan.nextSeconds):''):plan.reason;
 return `<div class="rule-layout plan-layout">
  <section class="rule-card" aria-label="糖块托管">
   <div class="card-title"><h3>糖块托管</h3>${tag(report.label,report.tone)}</div>
   ${note('安全收取成熟糖块，按路线连续分配。')}
   ${select('lumpManagedMode','分配路线',lumpManagedModes)}
   <div class="route-next"><strong>${esc(plan.choice?.label||'当前状态')}</strong><p>${esc(status)}</p></div>
   ${c.lumpManaged&&report.text!==plan.reason?note(esc(report.text)):''}
   <div class="actions">${lumpManagedButton(g,c)}</div>
   <details class="advanced" data-state="managed-scope"><summary>路线与花费范围</summary>
    ${note('先用每次 1 颗解锁已拥有建筑的小游戏。优先支持已启用的玩法规则。')}
    ${c.lumpManagedMode==='growth'?note('随后把农场逐级升到 9 级，并按当前办公室的要求和已购买的手套升级光标。'):''}
    ${note('花费遵守右侧保留策略。当前目标全做完后，继续收取并储存。')}
    ${note('托管花费仅用于建筑等级。')}
   </details>
  </section>
  ${lumpStatusCard(g,c,plan.choice)}
 </div>`;
}
function lumpPlanning(g,c){
 if(lumpView==='managed')return lumpManagedPlanning(g,c);
 const openings=C.lumpOpenings(g,c),advice=C.lumpAdvice(g,c,openings);
 const draft=lumpSelection(g,c,advice),target=C.lumpPlan(g,c);
 const buildings=g.ObjectsById.filter(object=>object&&typeof object.levelUp==='function');
 const active=c.lumpGoal?row('growth',target.object?esc('升级任务 · '+target.name+' '+target.current+' → '+target.target+' 级'):'糖块升级任务',
  esc(lumpUpgradeReport(g,c,target).text),`<div class="actions">
   ${btn('升级规则','open-rule','lumpLevel','ghost')}${btn('取消任务','cancel-lump','','ghost')}
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
  ${lumpStatusCard(g,c,draft)}
 </div>`+lumpRoutes(g,c,draft,openings);
}
function prestigePlanning(g,c){
 const gained=C.prestige(g),chips=gained+C.num(g.heavenlyChips),gap=Math.max(0,c.ascendTarget-gained);
 const upgrades=Object.values(g.UpgradesByPool?.prestige||{}).filter(u=>u&&!u.bought);
 const chosen=upgrades.find(u=>String(u.id)===c.heavenlyTarget);
 const price=chosen?C.num(chosen.getPrice?.(),C.num(chosen.basePrice)):0;
 const missing=Object.values(g.AchievementsById||{}).filter(a=>a&&!a.won&&a.pool!=='shadow').slice(0,35);
 const job=engine.ascentJob(g),plan=M.ascensionPlan(g,c),mode=M.modes(g,c).ascension;
 const prep=!job&&g.buyMode!==-1?M.ascensionPrep(g,c):null;
 const route=job?facts([['正在执行',job.name],['当前阶段',({prepare:'转生前准备',ascending:'进入天堂',buying:'购买天堂升级',restarting:'开始下一轮'})[job.phase]],
  ...(engine.states.ascension?[['状态',engine.states.ascension]]:[]),
  ...(job.prep.length?[['待补齐',job.prep.map(item=>item.achievement||g.ObjectsById?.[item.id]?.dname).filter(Boolean).join('、')]]:[]),
  ...(job.combo?[['爆发等待上限',T(Math.max(0,(job.combo.until-Date.now())/1000))]]:[])]):
  facts([['下一套目标',plan.name||'等待规划'],['状态',plan.reason],
   ...(plan.cost!=null?[['整套成本',F(plan.cost,0)+' 筹码'],['本轮应增加',F(plan.target,0)+' 声望']]:[]),
   ...(plan.deficit>0&&Number.isFinite(plan.seconds)?[['按无增益产量估算',T(plan.seconds)]]:[]),
   ...(plan.rows?.length?[['采购顺序',plan.rows.map(({upgrade})=>upgrade.dname||upgrade.name).join('、')]]:[]),
   ...(prep?.rows.length?[['预计转生前成就',prep.rows.map(({achievement})=>achievement.dname||achievement.name).join('、')],
    ['成就准备费用上限',F(prep.total)+' / '+F(prep.budget)+' 饼干']]:[])]);
 return block('自动转生路线',route+btn(mode==='cycle'?'管理自动转生':'设置自动转生','configure-ascension','','primary'))+
 block('声望与天堂升级预算',`<div class="fields">
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

const renderers={overview:compactOverview,queue:queuePage,management:managementPage,planning:planningPage,history:logsPage,
 automation:rulesView,garden:gardenPage,magic:magicPage,market:marketPage,growth:growthPage,storage:storagePage,settings:settingsPage};
function actionSelector(action,arg){
 return '[data-action="'+CSS.escape(action)+'"][data-arg="'+CSS.escape(arg||'')+'"]';
}
function focusSelector(element){
 if(!element||!main.contains(element))return'';
 if(element.id)return '#'+CSS.escape(element.id);
 for(const name of ['key','protect','market','godz']){
  if(element.dataset[name]!==undefined)return '[data-'+name+'="'+CSS.escape(element.dataset[name])+'"]';
 }
 if(element.dataset.action)return actionSelector(element.dataset.action,element.dataset.arg);
 const key=element.closest('details[data-state]')?.dataset.state;
 if(key&&element.tagName==='SUMMARY')return 'details[data-state="'+CSS.escape(key)+'"] > summary';
 return'';
}
function rememberPosition(){
 if(!shownView||!engine.c.open)return;
 const expanded=Array.from(main.querySelectorAll('details[open][data-state]'),node=>node.dataset.state);
 const scrollers=Object.fromEntries(Array.from(main.querySelectorAll('[data-scroll]'),node=>[node.dataset.scroll,[node.scrollTop,node.scrollLeft]]));
 viewStates.set(shownView,{top:main.scrollTop,expanded,scrollers});
}
function renderControls(){
 let html='';
 if(page==='planning'){
  html=tabs(planTabs,planTab,'plan-tab','规划类型');
  if(planTab==='lumps')html+=tabs(lumpViews,lumpView,'lump-view','糖块执行方式','rule-tabs');
 }
 if(page==='automation'){
  const group=groups.find(item=>item.id===groupId);
  const rule=currentRule(group,engine.g);
  html=tabs(groups.map(({id,name,short})=>[id,short||name]),groupId,'rule-group','玩法分类')+
       tabs(group.rules.map(key=>[key,shortRules[key]]),rule,'rule-select','具体规则','rule-tabs');
 }
 if(html!==renderedControls){
  viewControls.innerHTML=html;
  viewControls.hidden=!html;
  renderedControls=html;
 }
}
function render(){
 if(destroyed)return;
 rememberPosition();
 const view=page==='automation'?[page,groupId,currentRule(groups.find(g=>g.id===groupId),engine.g)].join('/'):
  page==='planning'?[page,planTab,planTab==='lumps'?lumpView:''].join('/'):
  page==='management'?page+'/'+managementTab:page;
 const sameView=shownView===view;
 const focus=sameView?focusSelector(root.activeElement):'';
 const position=viewStates.get(view);
 const previous=focus?main.querySelector(focus):null;
 const selection=previous&&Number.isInteger(previous.selectionStart)?[previous.selectionStart,previous.selectionEnd,previous.selectionDirection]:null;
 const active=activePage();
 for(const nav of root.querySelectorAll('[data-page]')){
  if(nav.dataset.page===active)nav.setAttribute('aria-current','page');
  else nav.removeAttribute('aria-current');
 }
 renderControls();
 try{
  main.innerHTML=C.ready(engine.g)?renderers[page](engine.g,engine.c):head('正在连接游戏','等待 Cookie Clicker 加载完成。');
 }catch(err){main.innerHTML=empty('此模块暂时无法读取',esc(err.message));}
 const title=main.querySelector('h2,h3');
 if(title)title.id='view-title';
 shownView=view;
 if(engine.c.open){
  for(const detail of main.querySelectorAll('details[data-state]'))detail.open=!!position?.expanded.includes(detail.dataset.state);
  for(const node of main.querySelectorAll('[data-scroll]')){
   const offsets=position?.scrollers[node.dataset.scroll];
   if(offsets)[node.scrollTop,node.scrollLeft]=offsets;
  }
  main.scrollTop=position?.top||0;
  if(focus){
   const next=main.querySelector(focus);
   (next&&!next.disabled?next:main).focus({preventScroll:true});
   if(selection&&next?.setSelectionRange)next.setSelectionRange(...selection);
  }
 }
 live();
}
function live(){
 const button=$('pause');
 const label=engine.paused?'继续全部挂机规则':'暂停全部挂机规则';
 if(button.getAttribute('aria-label')!==label){
  button.innerHTML=I(engine.paused?'play':'pause')+(engine.paused?' 继续':' 暂停');
  button.setAttribute('aria-label',label);
 }
 const node=$('runtime'),status=runtimeState(engine.g,engine.c);
 if(node.textContent!==status.label)node.textContent=status.label;
 node.dataset.tone=status.tone;
 node.title=status.message;
}
function releaseLease(){
 leaseEpoch++;
 leaseRelease?.();
 leaseInOtherTab=false;
 engine.locked=false;
 engine.lastPulse=0;
}
function wantsLease(){
 return !destroyed&&engine.hasWork()&&!engine.leaseGate();
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
   if(epoch!==leaseEpoch||!wantsLease())return;
   leaseInOtherTab=!lock;
   if(!lock)return;
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
 const run=M.execution(engine.g,engine.c);
 const activelyClicking=run.click&&!['noClick','both'].includes(run.challenge)&&engine.locked&&!C.gate(engine.g,run,engine.env())&&!C.veil(engine.g,run)&&(run.clickMode!=='buff'||C.clickBuff(engine.g));
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
 ask('应用'+label,{
  rows:[['开启规则',on.join('、')||'无'],['关闭规则',disabled.join('、')||'无'],
   ...(name==='observe'&&M.configured(engine.c)?[['玩法托管','全部停止']]:[]),
   ...(value.purchase?[['饼干保留',reserveModes.find(([key])=>key===engine.c.reserveMode)[1]]]:[])],
  message:engine.paused?'当前已暂停，点击「继续」后执行。':'',
  button:'应用方案'
 },()=>{
   engine.set({...off,...value,...(name==='observe'?{managed:{...engine.c.managed,modes:{},gods:null}}:{})});
   void lease();
   toast('已应用'+label);
  });
}
function confirmManagement(id){
 const g=engine.g;
 if(!C.compatible(g)||!Number.isSafeInteger(g.fullDate)||g.fullDate<=0)return;
 const saveId=g.fullDate;
 engine.syncSharedSettings();
 const current=engine.c,catalog=managementModules[id],active=M.modes(g,current);
 const growth=id==='growth',bundle=growth||id==='common';
 const bundleModes=growth?growthManagement:defaultManagement;
 const choose=(key,selected)=>!selected||(growth&&basicGrowthModes[key]===selected);
 const chosen=bundle?Object.fromEntries(Object.entries(bundleModes).filter(([key])=>choose(key,active[key]))):
  {[id]:managementDraft.get(id)||active[id]||catalog.modes[0][0]};
 const sugarAvailable=c=>!(C.managesLumps(g,c)&&c.lumpManagedMode==='growth')&&
  !(c.lumpLevel&&c.lumpGoal?.saveId===saveId);
 const sugar=growth&&sugarAvailable(current);
 if(!Object.keys(chosen).length&&!sugar){toast('选定玩法已全部加入托管');return;}
 const next={...current,managed:{...current.managed,saveId,modes:{...active,...chosen}}};
 const mode=chosen[id];
 const automatic=growth||id==='ascension'&&mode==='cycle';
 if(automatic&&!navigator.locks?.request)throw Error('浏览器未提供独占锁，无法开启自动转生');
 const currentRun=M.execution(g,current),startup={};
 if(automatic&&!currentRun.click)startup.events='idle';
 if(automatic&&!currentRun.purchase)startup.purchase='efficient';
 const title=growth?'开启全程挂机':bundle?'开启常用托管组合':'开启'+catalog.title+'托管';
 const rows=bundle?[
  ['托管玩法',Object.keys(chosen).map(key=>managementModules[key].title).join('、')],
  ['饼干保留',reserveModes.find(([key])=>key===current.reserveMode)[1]],
  ['股市仓位上限',F(current.marketBudget,0)+'%'],
  ...(chosen.dragon?[['养龙范围',managedScope('dragon',chosen.dragon,current)]]:[]),
  ...(growth?[
   ['跨轮经营','自动备份、转生、购买天堂升级、分配永久栏并重开'],
   ...(chosen.market?[['股市发展',current.marketOfficeCap+' 级办公室 · 保留 '+current.marketCursorKeep+
    ' 个指针 · 最多 '+current.marketBrokerCap+' 名经纪人']]:[]),
   ['额外授权',[
    '开启后台运行与刷新恢复',chosen.season?'按上限切换季节':'',chosen.research?'万圣节需要时研究至一心并轮换普通皱纹虫':'',
    chosen.garden?'自动换土、收集并种植收益作物':'',sugar?'使用糖块解锁并扩建花园、发展股市':''
   ].filter(Boolean).join('、')]
  ]:[])
 ]:[['托管目标',catalog.modes.find(([key])=>key===mode)[1]],['预计下一步',managementNext(g,next,id,mode)],
  ...(automatic?[['同意持续运行','开启刷新自动恢复'+(Object.keys(startup).length?'，补上'+Object.keys(startup).map(key=>managementModules[key].title).join('、'):'')]]:[])];
 const message=bundle?'魔法书会为预判到的点击狂热保留魔力。Haggler’s Charm 可推进序列，反噬时升级价格暂涨 2%。'+
  (growth?'确认后启用上面列出的玩法，已选的进阶方案继续生效。':''):
  managedScope(id,mode,current);
 ask(title,{rows,message:message+(engine.paused?'\n点击「继续」后执行。':''),button:'确认托管'},()=>{
  if(!C.compatible(engine.g)||engine.g.fullDate!==saveId)throw Error('存档已变化，请重新确认');
  engine.syncSharedSettings();
  const previous=engine.c.managed,valid=previous.saveId===saveId;
  const selections=valid?{...previous.modes}:{};
  for(const [key,value] of Object.entries(chosen)){
   if(!bundle||choose(key,selections[key]))selections[key]=value;
  }
  for(const [key,value] of Object.entries(startup))if(!selections[key])selections[key]=value;
  const sugarStillFree=sugar&&sugarAvailable(engine.c);
  engine.set({...(automatic?{remember:true}:{}),
   ...(growth?{background:true}:{}),
   ...(sugarStillFree?{lumpManaged:true,lumpManagedSave:saveId,lumpManagedMode:'growth'}:{}),
   managed:{...previous,saveId,modes:selections,gods:valid?previous.gods:null}});
  engine.log(title+' · '+Object.keys(chosen).map(key=>managementModules[key].title).join('、'));
  void lease();
 });
}
function stopManagement(id){
 engine.syncSharedSettings();
 const current=engine.c.managed,modes={...current.modes};
 if(!M.modes(engine.g,engine.c)[id])return;
 delete modes[id];
 engine.set({managed:{...current,modes,gods:id==='pantheon'?null:current.gods}});
 managementDraft.delete(id);
 engine.log('已停止'+managementModules[id].title+'托管');
 void lease();
}
const dangerousRules={dragon:'将按目标等级自动训练龙，可能牺牲大量建筑。',aura:'会消耗最高阶建筑来维持你选定的光环方案。',pantheon:'将使用调换次数维持神灵方案。',godzamok:'点击增益时出售选定建筑，然后按预算回购。',season:'将花费饼干切换到你指定的季节。',trade:'将按条件买卖游戏中的股票，实际利润不能保证。',cast:'将按配置自动施法，可能反噬或改变资源。'};
function toggleProtection(key){
 const previous=engine.c.protectedTiles;
 engine.set({protectedTiles:previous.includes(key)?previous.filter(tile=>tile!==key):[...previous,key]});
}
function assignPantheon(){
 const g=engine.g,c=engine.c,advice=C.pantheonAdvice(g,c,pantheonProfile);
 if(!C.compatible(g)||!advice)return;
 const saveId=g.fullDate;
 const plan=C.pantheonPlan(g,advice.gods,c.swapReserve);
 const moves=plan.moves?.length||0;
 const waiting=Math.max(0,moves-plan.swaps);
 ask('设为万神殿挂机阵容',{
  rows:[...advice.picks.map(({slot,god})=>[slots[slot],C.plain(god.name).split(',')[0]]),
   ['当前需要调换',moves+' 次'],['预留次数',c.swapReserve+' 次']],
  message:[waiting?'其中 '+waiting+' 次等游戏恢复调换次数后执行。':'',
   '会调换已有神灵以维持这些槽位，直到停止维持。',engine.paused?'点击「继续」后执行。':''].filter(Boolean).join('\n'),
  button:'启用阵容'
 },()=>{
  const live=engine.g;
  const fresh=C.pantheonPlan(live,advice.gods,engine.c.swapReserve);
  if(!C.compatible(live)||live.fullDate!==saveId||fresh.m!==plan.m||
     (fresh.moves?.length||0)>moves||engine.c.swapReserve!==c.swapReserve){
   throw Error('神灵、存档或保留次数已变化，请重新确认');
  }
  engine.set({gods:advice.gods,pantheon:true});
  engine.log('万神殿阵容 · '+advice.title+' · '+advice.picks.map(({god})=>C.plain(god.name).split(',')[0]).join('、'));
  void lease();
 });
}
function startLumpManaged(mode=engine.c.lumpManagedMode){
 engine.syncSharedSettings();
 const g=engine.g,c=engine.c,saveId=g.fullDate;
 if(!C.compatible(g)||!Number.isSafeInteger(saveId)||saveId<=0){toast('等待受支持的存档加载');return;}
 const {lumpReserveMode,lumpReserve}=c;
 const proposed={...c,lumpManaged:true,lumpManagedSave:saveId,lumpManagedMode:mode};
 const plan=C.lumpRoutePlan(g,proposed);
 const reserve=C.lumpBudget(g,c).reserve;
 ask('开启糖块持续托管',{
  rows:[['收取','完全成熟后收取'],['分配路线',lumpManagedModes.find(([value])=>value===mode)[1]],
   ['下一步',plan.choice?plan.choice.label+' · 下一级 '+lumpCount(plan.nextCost):plan.reason],
   ['保留',c.lumpReserveMode==='custom'?lumpCount(reserve):'按存档推荐'],
   ['路线完成后','继续收取并储存']],
  message:[mode==='growth'?'依次解锁小游戏、扩建花园，再按办公室和手套门槛提升光标。':'每花 1 颗解锁一个已拥有建筑的小游戏。',
   c.lumpReserveMode==='adaptive'?'获得 Sugar baking 后，通常保留 100 颗，解锁小游戏时可用 1 颗。':'',
   c.lumpLevel?'当前单栋升级任务会暂停。':'',engine.paused?'点击「继续」后执行。':''].filter(Boolean).join('\n'),
  button:'确认托管'
 },()=>{
  engine.syncSharedSettings();
  const latest=engine.c;
  if(!C.compatible(engine.g)||saveId!==engine.g.fullDate||latest.lumpReserveMode!==lumpReserveMode||latest.lumpReserve!==lumpReserve){
   throw Error('存档或保留策略已变化，请重新确认');
  }
  engine.set({lumpManaged:true,lumpManagedMode:mode,lumpManagedSave:saveId,lumpLevel:false});
  engine.log('已开启糖块持续托管 · '+lumpManagedModes.find(([value])=>value===mode)[1]);
  void lease();
 });
}
function assignLumpGoal(draft){
 const g=engine.g;
 engine.syncSharedSettings();
 const goal={buildingId:draft?.buildingId,level:draft?.level,saveId:g.fullDate};
 const plan=C.lumpPlan(g,engine.c,goal);
 if(!C.compatible(g)||!Number.isSafeInteger(goal.saveId)||goal.saveId<=0){
  toast('等待受支持的存档加载');return;
 }
 if(!plan.object||plan.status==='done'){toast(plan.reason);return;}
 goal.fromLevel=plan.current;
 const existing=engine.c.lumpGoal;
 const replacing=engine.c.lumpLevel&&(existing?.buildingId!==goal.buildingId||existing?.level!==goal.level);
 const shortfall=plan.status==='locked'?'等待糖块解锁':plan.shortfall?'总预算还差 '+lumpCount(plan.shortfall):'总预算已足';
 const progress=plan.status==='ready'?'下一轮检查预计花费 '+lumpCount(plan.nextCost)+'，升至 '+(plan.current+1)+' 级。':
  plan.status==='protected'?'等待当前挑战轮回结束。':plan.status==='waiting'?plan.reason+'。':'';
 ask('安排 '+plan.name+'升至 '+plan.target+' 级',{
  rows:[['执行范围','仅 '+plan.name+' · '+plan.current+' → '+plan.target+' 级'],
   ['预计总花费',lumpCount(plan.totalCost)],['每次升级后保留',lumpCount(plan.reserve)],['当前预算',shortfall],
   ['完成后','此升级任务结束']],
  message:[replacing?'会替换当前的建筑升级任务。':'',engine.c.lumpManaged?'开启此任务会停止糖块持续托管。':'',
   engine.paused?'点击「继续」后检查预算。':progress].filter(Boolean).join('\n'),
  button:'安排升级'
 },()=>{
   engine.syncSharedSettings();
   const fresh=C.lumpPlan(engine.g,engine.c,goal);
   if(!C.compatible(engine.g)||!fresh.object||fresh.status==='different-save'||fresh.reserve!==plan.reserve||fresh.totalCost>plan.totalCost){
    throw Error('存档、等级或保留量已变化，请重新确认');
   }
   if(fresh.status==='done'){toast(fresh.reason);return;}
   lumpDraft=null;
   engine.set({lumpGoal:goal,lumpLevel:true,lumpManaged:false});
   engine.log('糖块挂机目标 · '+plan.name+' '+plan.target+' 级');
   void lease();
  });
}
root.addEventListener('input',event=>{
 const el=event.target;
 if(el.id!=='lump-target-level')return;
 const g=engine.g,c=engine.c;
 lumpDraft={buildingId:lumpSelection(g,c).buildingId,level:el.valueAsNumber};
 const details=$('lump-estimate');
 const expanded=details.querySelector('details')?.open;
 details.innerHTML=lumpEstimate(g,c,lumpDraft);
 if(expanded&&details.querySelector('details'))details.querySelector('details').open=true;
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
  if(key==='pantheon-profile'){pantheonProfile=value;render();return;}
  if(key==='management-profile'){managementDraft.set(managementTab,value);render();return;}
  if(key==='managed-season-limit'){
   const limit=Number(value);
   const apply=()=>{
    engine.syncSharedSettings();
    engine.set({managed:{...engine.c.managed,seasonLimit:limit}});
   };
   if(M.modes(engine.g,engine.c).season){
    el.value=engine.c.managed.seasonLimit;
    ask('调整季节切换上限',{rows:[['本轮累计上限',limit+' 次']],button:'保存上限'},apply);
   }else apply();
   return;
  }
  const dragonMode=key==='dragonMax'&&M.modes(engine.g,engine.c).dragon;
  const dragonLimit=dragonMode==='develop'?Infinity:dragonMode==='collect'?8:0;
  if(Math.min(Number(value),dragonLimit)>engine.c.dragonMax){
   const level=C.config({...engine.c,dragonMax:value}).dragonMax;
   el.value=engine.c.dragonMax;
   ask('提高龙训练上限',{rows:[['新目标等级',level+' 级']],message:'后续训练可能消耗建筑。',button:'提高上限'},()=>engine.set({dragonMax:level}));
   return;
  }
  if(key==='lumpManagedMode'&&engine.c.lumpManaged){
   el.value=engine.c.lumpManagedMode;
   if(value!==el.value)startLumpManaged(value);
   return;
  }
  if(key==='marketLoan'){
   const saveId=engine.g?.fullDate,id=C.config({...engine.c,marketLoan:value}).marketLoan;
   if(id===0){engine.set({marketLoan:0,marketLoanSave:0});return;}
   el.value=engine.c.marketLoanSave===saveId?engine.c.marketLoan:0;
   ask('授权转生爆发贷款',{
    rows:[['贷款',String(id)],['立即扣除库存',[20,40,50][id-1]+'%']],
    message:'只在本存档的转生前点击爆发中使用，每轮最多一次。脚本先核对办公室、库存及预计增益。到期前若未转生，原版会进入减产期。',
    button:'授权本存档'
   },()=>{
    if(!saveId||engine.g?.fullDate!==saveId)throw Error('存档已变，请重新确认');
    engine.set({marketLoan:id,marketLoanSave:saveId});
   });
   return;
  }
  if(['marketOfficeCap','marketBrokerCap','marketCursorKeep'].includes(key)&&M.modes(engine.g,engine.c).market==='development'){
   const saveId=engine.g.fullDate,next=C.config({...engine.c,[key]:value})[key];
   const raises=key==='marketCursorKeep'?next<engine.c[key]:next>engine.c[key];
   if(raises){
    el.value=engine.c[key];
    ask('扩大股市发展范围',{rows:[[el.getAttribute('aria-label'),String(next)]],
     message:'办公室升级会消耗指针，雇佣经纪人会花费饼干。',button:'保存额度'},()=>{
     if(engine.g?.fullDate!==saveId)throw Error('存档已变，请重新确认');
     engine.set({[key]:next});
    });
    return;
   }
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
root.addEventListener('click',async event=>{
 const b=event.target.closest('button');
 if(!b)return;
 if(b.dataset.page){navigate(b.dataset.page,'[data-page="'+b.dataset.page+'"]');return;}
 if(b.id==='close'){show(false);return;}
 if(b.id==='pause'){togglePause();return;}
 if(b.id==='confirm-cancel'){closeConfirmation();return;}
 if(b.id==='confirm-ok'){
  const action=closeConfirmation();
  try{await action?.();render();}
  catch(e){toast('未执行：'+e.message);engine.log('未执行：'+e.message);}
  return;
 }
 const action=b.dataset.action,arg=b.dataset.arg,g=engine.g,c=engine.c;
 try{
 if(action==='navigate'){navigate(arg);return;}
 if(action==='manage-module'&&Object.hasOwn(managementModules,arg)){
  managementTab=arg;navigate('management',actionSelector(action,arg));return;
 }
 if(action==='start-management'){confirmManagement(arg);return;}
 if(action==='stop-management'){stopManagement(arg);return;}
 if(action==='configure-ascension'){
  managementTab='ascension';
  managementDraft.set('ascension','cycle');
  navigate('management');
  return;
 }
 if(action==='configure-halloween'){
  managementTab='research';
  managementDraft.set('research','seasonal');
  navigate('management');
  return;
 }
 if(action==='management-common'){confirmManagement('common');return;}
 if(action==='management-growth'){confirmManagement('growth');return;}
 if(action==='rule-group'){
  groupId=arg;
  navigate('automation',actionSelector('rule-group',arg));
  return;
 }
 if(action==='rule-select'||action==='open-rule'){
  const group=groups.find(item=>item.rules.includes(arg));
  if(!group)return;
  groupId=group.id;
  selectedRules.set(groupId,arg);
  if(action==='open-rule'&&arg==='harvest')selectedTile=C.harvestTargets(g,c)[0]?.key||selectedTile;
  navigate('automation',actionSelector('rule-select',arg));
  return;
 }
 if(action==='plan-tab'){
  planTab=arg;
  navigate('planning',actionSelector('plan-tab',arg));
  return;
 }
 if(action==='sugar-plan'||action==='lump-view'){
  planTab='lumps';
  lumpView=arg;
  navigate('planning',actionSelector('lump-view',arg));
  return;
 }
 if(action==='plan-unlock'||action==='lump-route'){
  const [id,level]=arg.split(':').map(Number);
  const object=action==='plan-unlock'?g.Objects?.[arg]:g.ObjectsById?.[id];
  if(!object)return;
  lumpDraft={buildingId:object.id,level:action==='plan-unlock'?Math.max(1,object.level+1):level};
  planTab='lumps';
  lumpView='single';
  navigate('planning','#lump-target-level');
  $('lump-target-level')?.scrollIntoView({block:'nearest'});
  return;
 }
 if(action==='apply-pantheon'){assignPantheon();return;}
 if(action==='stop-pantheon'){engine.set({pantheon:false});engine.log('已停止维持神灵阵容');void lease();return;}
 if(action==='start-lump-managed'){startLumpManaged();return;}
 if(action==='stop-lump-managed'){
  engine.set({lumpManaged:false});
  engine.log('已停止糖块持续托管');
  void lease();
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
  const expected=engine.g.fullDate;
  ask('设为采购目标',{
   rows:[['采购目标',item.name+' ×'+item.qty],['当前价格',F(item.price)+' 饼干'],
    ['买完预计保留',F(item.keep)+' 饼干'],['完成后','按预计回本继续采购']],
   message:[c.purchase?'':'确认后开启自动采购。',c.bridgePurchase?'等待期间可能先买一笔能缩短等待的建筑。':'',
    engine.paused?'点击「继续」后检查预算。':''].filter(Boolean).join('\n'),
   button:'设定目标'
  },()=>{
   const liveGame=engine.g;
   if(liveGame.fullDate!==expected)throw Error('当前存档已变化，请重新选择');
   const fresh=C.purchases(liveGame,engine.c).find(row=>row.id===arg);
   if(!fresh||!fresh.auto||fresh.blocked||fresh.qty!==item.qty||
      ['noUpgrade','both'].includes(engine.c.challenge)&&arg.startsWith('u:'))throw Error('候选或执行条件已变，请重新选择');
   engine.set({purchase:true,target:arg,purchaseMode:'plan'});
   engine.log('规划采购目标：'+item.name);
   void lease();
  });
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
   engine.syncSharedSettings();
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
 if(action==='restore'){const e=engine.backups().find(x=>x.id===arg);if(!e)throw Error('快照已不在列表中');ask('恢复 '+e.label,'将回退游戏到 '+new Date(e.at).toLocaleString('zh-CN')+'。先保存当前进度，恢复后所有自动化保持暂停。',()=>{
  engine.manualGate();
  engine.backup('恢复前',true);
  engine.setPaused(true);
  releaseLease();
  if(!g.ImportSaveCode(e.save))throw Error('游戏拒绝此存档');
  engine.clearPending(g);
  engine.set(C.config(e.settings));
  toast('已恢复存档；自动化已暂停');
 });}
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
  const before=JSON.stringify(engine.c);
  if(!engine.syncSharedSettings()||before===JSON.stringify(engine.c))return;
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
