(() => {
const button=document.getElementById('demo-tests'),out=document.getElementById('result');if(!button)return;
const delay=ms=>new Promise(r=>setTimeout(r,ms));const assert=(a,m)=>{if(!a)throw Error(m);};
button.onclick=async()=>{button.disabled=true;out.textContent='正在运行独立模拟存档测试…\n';let passed=0,total=0;const checks=[];
 const test=async(name,fn)=>{total++;try{await fn();passed++;out.textContent+='✓ '+name+'\n';checks.push({name,ok:true});}catch(e){out.textContent+='✗ '+name+'：'+e.message+'\n';checks.push({name,ok:false,error:e.message});}};
 let app=window.CookiePilot2,e=app.engine,g=window.Game;e.set(Object.fromEntries(CookiePilotCore2.AUTO.map(k=>[k,false])));e.paused=false;
 const root=()=>document.getElementById('cookie-pilot-v2').shadowRoot;
 const click=s=>{const b=root().querySelector(s);assert(b,'缺少 '+s);b.click();};
 const page=key=>{
  if(key==='purchase'){
   click('[data-page="planning"]');click('[data-action="plan-tab"][data-arg="purchase"]');return;
  }
  if(['garden','magic','market','growth'].includes(key)){
   click('[data-page="automation"]');
   click(`[data-action="rule-group"][data-arg="${key}"]`);
   click(`[data-action="navigate"][data-arg="${key}"]`);
   return;
  }
  click(`[data-page="${key}"]`);
 };
 await test('只有顶栏入口，没有悬浮速控',()=>{assert(document.getElementById('topBar').contains(document.getElementById('cookie-pilot-entry')),'入口不在顶栏');assert(!document.getElementById('cookie-pilot-root'),'存在旧面板');app.show();assert(!root().getElementById('backdrop').hidden,'未打开');});
 await test('玩法规则直接进入分类和详情',()=>{
  page('automation');
  const workspace=root().getElementById('main');
  assert(workspace.querySelector('.rule-heading h2').textContent==='花园','默认模块应为花园');
  assert(workspace.querySelector('[aria-label="规则详情"]')&&workspace.querySelector('[aria-label="玩法状态"]'),'缺少规则或状态卡');
  assert(!workspace.textContent.includes('全玩法规则'),'出现规则大卡片总览');
  click('[data-action="rule-select"][data-arg="plant"]');
  assert(workspace.querySelector('[data-key="gardenSpend"]'),'补种规则不可修改');
  page('overview');page('automation');
  assert(workspace.querySelector('[data-action="rule-select"][data-arg="plant"][aria-pressed="true"]'),'规则选择未保留');
 });
 await test('紧凑总览、规划和玩法详情均可打开',()=>{
  for(const key of ['overview','purchase','automation','garden','magic','market','growth','storage','settings','history']){
   page(key);assert(!root().getElementById('main').textContent.includes('此模块暂时无法读取'),'模块错误 '+key);
  }
  page('overview');
  assert(root().querySelector('.window').getBoundingClientRect().width<=600,'总览超过预定宽度');
  assert(root().querySelectorAll('.next-job').length<=2,'首屏动作过多');
  click('[data-action="navigate"][data-arg="queue"]');
  assert(root().getElementById('main').textContent.includes('完整队列'),'完整队列不可用');
 });
 await test('真实成就字典可以读取，规划标签仍可切换',()=>{
  page('planning');
  click('[data-action="plan-tab"][data-arg="prestige"]');
  const workspace=root().getElementById('main');
  assert(!Array.isArray(g.AchievementsById)&&workspace.textContent.includes('建造者'),'无法读取成就字典');
  click('[data-action="plan-tab"][data-arg="lumps"]');
  assert(workspace.querySelector('[aria-label="糖块状态"]'),'无法从转生切换到糖块规划');
 });
 await test('糖块规划预览、确认、排队、收取和自动升级',async()=>{
  const workspace=root().getElementById('main'),farm=g.Objects.Farm,startLumps=g.lumps,startTime=g.lumpT;
  const initialLevel=farm.level;
  const planButton='[data-action="plan-tab"][data-arg="lumps"]';
  g.lumps=102;
  try{
   page('planning');click(planButton);
   click(`[data-action="lump-route"][data-arg="${farm.id}:9"]`);
   const field=root().getElementById('lump-target-level');
   assert(field.value==='9'&&workspace.textContent.includes('花园扩至 36 格'),'花园路线未更新目标');
   field.value='3';field.dispatchEvent(new Event('input',{bubbles:true}));
   assert(/到目标总花费5 颗/.test(workspace.textContent),'没有按逐级成本重算');
   assert(!e.c.lumpGoal,'预览已修改挂机');
   click('[data-action="assign-lump"]');
   assert(root().getElementById('confirm').open&&!e.c.lumpLevel,'花费未先确认');
   click('#confirm-cancel');
   assert(!e.c.lumpLevel,'取消后仍启用');
   click('[data-action="assign-lump"]');click('#confirm-ok');
   await delay(1400);
   assert(farm.level===2&&g.lumps===100&&e.c.lumpLevel,'未按保留量只升一级');
   page('overview');click('[data-action="navigate"][data-arg="queue"]');
   assert(/农场升至 3 级/.test(workspace.textContent),'升级没有进入挂机队列');
   page('planning');click(planButton);click('[data-key="lump"]');
   g.lumps=102;g.lumpT=Date.now()-g.lumpRipeAge-100;
   await delay(1400);
   assert(farm.level===3&&g.lumps===100&&!e.c.lumpLevel&&e.c.lump,'收取后未按预算完成目标，或干扰独立收取开关');
   page('history');
   assert(workspace.textContent.includes('糖块目标达成')&&workspace.textContent.includes('安全收取 1 颗糖块'),'没有执行记录');
  }finally{
   farm.level=initialLevel;g.lumps=startLumps;g.lumpT=startTime;
   e.set({lump:false,lumpLevel:false,lumpGoal:null});
  }
 });
 await test('20 次每秒连点与全局暂停',async()=>{e.set({click:true,rate:20});await delay(1300);const a=g.cookieClicks;await delay(1100);assert(g.cookieClicks-a>=15&&g.cookieClicks-a<=27,'实际频率 '+(g.cookieClicks-a));click('#pause');const b=g.cookieClicks;await delay(300);assert(g.cookieClicks===b,'暂停后仍点击');click('#pause');e.set({click:false});});
 await test('40 次每秒目标没有被低频调度限制',async()=>{e.set({click:true,rate:40});await delay(1300);const a=g.cookieClicks;await delay(1050);assert(g.cookieClicks-a>=29&&g.cookieClicks-a<=45,'实际频率 '+(g.cookieClicks-a));e.set({click:false});});
 await test('金饼干与驯鹿，默认跳过愤怒饼干',async()=>{e.set({golden:true,deer:true});await delay(1300);const a=g.spawn(),b=g.spawn('golden',true),c=g.spawn('reindeer');await delay(400);assert(a.popped&&c.popped&&!b.popped,'拾取不正确');e.set({golden:false,deer:false});g.shimmers=[];});
 await test('面纱与转生守卫',async()=>{e.set({click:true,rate:20});g.owned.add('Shimmering veil [off]');await delay(1200);const a=g.cookieClicks;await delay(200);assert(g.cookieClicks===a,'面纱被点击');g.owned.delete('Shimmering veil [off]');g.OnAscend=1;await delay(200);assert(g.cookieClicks===a,'转生时点击');g.OnAscend=0;e.set({click:false});});
 await test('特殊升级不在自动采购白名单',()=>{page('purchase');const rows=CookiePilotCore2.purchases(g,e.c);assert(!rows.find(r=>r.object.name==='One mind').auto,'One mind 可自动购买');assert(root().getElementById('main').textContent.includes('巧克力蛋'),'未展示特殊升级');});
 await test('浏览候选后按需确认交给挂机',()=>{
  page('purchase');
  const row=CookiePilotCore2.purchases(g,e.c).find(r=>r.auto&&r.id.startsWith('b:'));
  click(`[data-action="inspect-purchase"][data-arg="${row.id}"]`);
  assert(!e.c.target&&!e.c.purchase,'浏览候选改变执行策略');
  click(`[data-action="target"][data-arg="${row.id}"]`);
  assert(root().getElementById('confirm').open&&!e.c.purchase,'缺少启用确认');
  click('#confirm-ok');
  assert(e.c.target===row.id&&e.c.purchaseMode==='plan'&&e.c.purchase,'目标未交接');
  e.set({purchase:false,target:'',purchaseMode:'efficient'});
 });
 await test('花园格子选择与保护交互',()=>{page('garden');click('[data-action="tile"][data-arg="2,2"]');click('[data-action="protect-tile"]');assert(e.c.protectedTiles.includes('2,2'),'未保护格子');click('[data-action="protect-tile"]');assert(!e.c.protectedTiles.includes('2,2'),'未解除格子');});
 await test('独立预测不改变 Math.random',()=>{page('magic');const random=Math.random;const p=CookiePilotCore2.forecast(g,10);assert(p.length===10,'缺少预测');assert(Math.random===random,'预测污染全局 RNG');});
 await test('危险自动化需要实际确认',()=>{page('automation');click('[data-action="rule-group"][data-arg="market"]');const input=root().querySelector('[data-key="trade"]');input.click();assert(!e.c.trade&&root().getElementById('confirm').open,'未等待确认');click('#confirm-cancel');assert(!e.c.trade,'取消未生效');});
 await test('补给前备份失败不会发放资源',()=>{page('storage');click('#lab-toggle');g.demoFreeze=true;click('[data-action="grant"][data-arg="1"]');const before=g.cookies,original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cookie-pilot:backups:v2')throw Error('模拟存储已满');return original.call(this,k,v);};try{click('#confirm-ok');assert(g.cookies===before,'未备份仍发放');}finally{Storage.prototype.setItem=original;g.demoFreeze=false;}});
 await test('实验室正确补给，快照可导入',async()=>{page('storage');g.demoFreeze=true;const before=g.cookies;click('[data-action="grant"][data-arg="1"]');click('#confirm-ok');await delay(50);assert(Math.abs(g.cookies-before-g.unbuffedCps*60)<.1,'补给金额错误');const save=e.backups().find(x=>x.label==='实验室操作前');assert(save,'缺少重点快照');assert(g.ImportSaveCode(save.save),'快照无法导入');assert(Math.abs(g.cookies-before)<.1,'导入不一致');g.demoFreeze=false;});
 await test('广告显示可还原，主题可切换',()=>{e.set({ads:false,theme:'light'});assert(getComputedStyle(document.getElementById('support')).display!=='none','广告样式未撤销');assert(document.getElementById('cookie-pilot-v2').dataset.theme==='light','主题未切换');e.set({ads:true,theme:'dark'});assert(getComputedStyle(document.getElementById('support')).display==='none','未隐藏广告');});
 await test('前期存档显示解锁路径而不报错',()=>{window.Game=makePilotFixture('early');for(const key of['garden','magic','market','growth']){page(key);assert(!root().getElementById('main').textContent.includes('此模块暂时无法读取'),'前期模块错误');}window.Game=g;});
 await test('重复加载不会生成重复入口和工作台',async()=>{await new Promise((res,rej)=>{const s=document.createElement('script');s.src='extension/pilot.bundle.js';s.onload=res;s.onerror=rej;document.body.append(s);});assert(document.querySelectorAll('#cookie-pilot-v2').length===1&&document.querySelectorAll('#cookie-pilot-entry').length===1,'重复注入');});
 await test('卸载清理后可重新加载',async()=>{window.CookiePilot2.destroy();assert(!document.getElementById('cookie-pilot-v2')&&!document.getElementById('cookie-pilot-entry'),'卸载残留');await new Promise((res,rej)=>{const s=document.createElement('script');s.src='extension/pilot.bundle.js';s.onload=res;s.onerror=rej;document.body.append(s);});assert(window.CookiePilot2,'重新加载失败');window.CookiePilot2.engine.set(Object.fromEntries(CookiePilotCore2.AUTO.map(k=>[k,false])));window.CookiePilot2.show();});
 out.textContent+=`\n${passed}/${total} 通过 · 独立模拟存档`;out.dataset.passed=passed;out.dataset.total=total;out.dataset.results=JSON.stringify(checks);button.textContent=`${passed}/${total} 项通过`;button.disabled=false;
};
})();
