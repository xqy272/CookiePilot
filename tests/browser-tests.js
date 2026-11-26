(() => {
const button=document.getElementById('demo-tests'),out=document.getElementById('result');if(!button)return;
const delay=ms=>new Promise(r=>setTimeout(r,ms));const assert=(a,m)=>{if(!a)throw Error(m);};
async function waitFor(predicate,message){
 const until=Date.now()+3600;
 while(!predicate()){
  assert(Date.now()<until,message);
  await delay(50);
 }
}
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
  assert(root().querySelector('[data-action="rule-select"][data-arg="plant"][aria-pressed="true"]'),'规则选择未保留');
 });
 await test('工作台切换页面时保持同一尺寸与位置',()=>{
  const panel=root().querySelector('.window'),bounds=JSON.stringify(panel.getBoundingClientRect());
  for(const key of ['overview','purchase','automation','garden','magic','market','growth','storage','settings','history']){
   page(key);assert(!root().getElementById('main').textContent.includes('此模块暂时无法读取'),'模块错误 '+key);
   assert(JSON.stringify(panel.getBoundingClientRect())===bounds,'页面改变面板尺寸或位置 '+key);
  }
  page('overview');
  assert(root().querySelector('.window').getBoundingClientRect().width<=600,'总览超过预定宽度');
  assert(root().querySelectorAll('.next-job').length<=2,'首屏动作过多');
  click('[data-action="navigate"][data-arg="queue"]');
  assert(root().getElementById('main').textContent.includes('执行队列'),'执行队列不可用');
 });
 await test('统一托管入口，可预览组合并独立启停每种玩法',async()=>{
  const m=g.Objects.Farm.minigame;
  const frozen=m.freeze,stage=m.plants.bakeberry.unlocked,unlocked=m.plantsUnlockedN,buffer=structuredClone(m.plot);
  const managedBefore=structuredClone(e.c.managed);
  const bounds=JSON.stringify(root().querySelector('.window').getBoundingClientRect());
  try{
   e.set({managed:{saveId:0,modes:{}},harvest:false,plant:false,click:false,golden:false});
   m.freeze=0;m.plants.bakeberry.unlocked=0;m.plot[4][3]=[m.plants.bakeberry.id+1,70];
   page('overview');click('[data-action="navigate"][data-arg="management"]');
   const panel=root().getElementById('main');
   const modules=[...panel.querySelectorAll('[data-action="manage-module"]')].map(item=>item.dataset.arg);
   assert(['events','purchase','garden','magic','pantheon','market','dragon','season','wrinklers',
    'lumps','research','ascension'].every(key=>modules.includes(key)),'托管页没有覆盖各玩法');
   assert(JSON.stringify(root().querySelector('.window').getBoundingClientRect())===bounds,'新增托管页改变面板尺寸');
   click('[data-action="management-common"]');
   assert(root().getElementById('confirm-text').textContent.includes('花园')&&!e.c.managed.modes.garden,'预览组合改变了托管设置');
   click('#confirm-cancel');
   click('[data-action="manage-module"][data-arg="garden"]');
   assert(panel.querySelector('.route-next').textContent.includes('烘焙浆果'),'启动前看不到存档中的下一步');
   click('[data-action="start-management"][data-arg="garden"]');click('#confirm-ok');
   await waitFor(()=>m.plants.bakeberry.unlocked,'托管未在取得执行权后收获成熟种子');
   assert(m.plants.bakeberry.unlocked&&e.c.managed.modes.garden==='seeds'&&!e.c.harvest,'启用托管未执行收获，或覆写了单项规则');
   click('[data-action="manage-module"][data-arg="events"]');
   click('[data-action="start-management"][data-arg="events"]');click('#confirm-ok');
   const event=g.spawn();
   await waitFor(()=>event.popped,'托管未拾取金饼干');
   assert(event.popped&&e.c.managed.modes.events==='idle'&&!e.c.golden,'事件托管未调度原有拾取');
   click('[data-action="manage-module"][data-arg="garden"]');click('[data-action="stop-management"][data-arg="garden"]');
   assert(!e.c.managed.modes.garden&&e.c.managed.modes.events,'停止花园影响了其他托管');
   click('[data-action="manage-module"][data-arg="lumps"]');
   click('[data-action="sugar-plan"][data-arg="managed"]');
   assert(panel.querySelector('[aria-label="糖块托管"]'),'糖块入口未连接');
  }finally{
   m.freeze=frozen;m.plants.bakeberry.unlocked=stage;m.plantsUnlockedN=unlocked;m.plot=buffer;
   e.set({managed:managedBefore});
  }
 });
 await test('返回采购时保留搜索、展开与滚动位置',async()=>{
  page('purchase');
  const main=root().getElementById('main');
  const settings='details[data-state="purchase-settings"]';
  click(settings+' summary');
  main.scrollTop=10000;
  const top=main.scrollTop,header=root().querySelector('.workbench-nav').getBoundingClientRect().y;
  assert(top>0,'采购设置没有留在滚动区');
  await delay(2300);
  assert(root().querySelector(settings).open&&main.scrollTop===top,'自动刷新丢失页面位置');
  assert(root().querySelector('.workbench-nav').getBoundingClientRect().y===header,'滚动移动了导航');
  page('history');page('planning');
  assert(root().querySelector(settings).open&&main.scrollTop===top,'返回时丢失展开状态或滚动位置');
  const input=root().getElementById('purchase-search');
  input.value='农场';input.dispatchEvent(new Event('change',{bubbles:true}));
  page('history');page('planning');
  assert(root().getElementById('purchase-search').value==='农场','返回时筛选被清空');
  const reset=root().getElementById('purchase-search');
  reset.value='';reset.dispatchEvent(new Event('change',{bubbles:true}));
  click(settings+' summary');
 });
 await test('真实成就字典可以读取，规划标签仍可切换',()=>{
  page('planning');
  click('[data-action="plan-tab"][data-arg="prestige"]');
  const workspace=root().getElementById('main');
  assert(!Array.isArray(g.AchievementsById)&&workspace.textContent.includes('建造者'),'无法读取成就字典');
  click('[data-action="plan-tab"][data-arg="lumps"]');
  assert(workspace.querySelector('[aria-label="糖块状态"]'),'无法从转生切换到糖块规划');
 });
 await test('糖块分配建议、首颗投入和动态保留量',async()=>{
  const workspace=root().getElementById('main'),temple=g.Objects.Temple;
  const startLevel=temple.level,startLumps=g.lumps;
  try{
   temple.level=0;g.lumps=1;
   e.set({lumpReserveMode:'adaptive',lumpGoal:null,lumpLevel:false});
   page('planning');click('[data-action="plan-tab"][data-arg="lumps"]');
   click('[data-action="lump-view"][data-arg="single"]');
   assert(workspace.querySelector('[aria-label="糖块分配建议"]').textContent.includes('解锁万神殿'),'没有默认建议');
   assert(/当前目标保留0 颗/.test(workspace.textContent),'初期目标仍有保留门槛');
   click('[data-action="assign-lump"]');
   const confirmation=root().getElementById('confirm-text').textContent;
   assert(/执行范围仅 神庙/.test(confirmation)&&/每次升级后保留0 颗/.test(confirmation)&&/此升级任务结束/.test(confirmation),'确认未明确范围、保留量和结束条件');
   assert(root().getElementById('confirm-ok').textContent==='安排升级','确认按钮未说明动作');
   click('#confirm-ok');await delay(1400);
   assert(temple.level===1&&g.lumps===0&&!e.c.lumpLevel,'第一颗未执行推荐目标');
   g.lumps=7;g.owned.add('Sugar baking');
   click('[data-action="plan-tab"][data-arg="lumps"]');
   assert(/先把库存攒到 100 颗/.test(workspace.textContent)&&/当前目标保留100 颗/.test(workspace.textContent),'未建议保护已获得的糖块烘焙加成');
   const mode=workspace.querySelector('[data-key="lumpReserveMode"]');
   mode.value='custom';mode.dispatchEvent(new Event('change',{bubbles:true}));
   const amount=workspace.querySelector('[data-key="lumpReserve"]');
   amount.value='3';amount.dispatchEvent(new Event('change',{bubbles:true}));
   assert(/当前目标保留3 颗/.test(workspace.textContent),'自定数量未生效');
  }finally{
   temple.level=startLevel;g.lumps=startLumps;g.owned.delete('Sugar baking');
   e.set({lumpReserveMode:'adaptive',lumpReserve:100,lumpGoal:null,lumpLevel:false});
  }
 });
 await test('糖块规划预览、确认、排队、收取和自动升级',async()=>{
  const workspace=root().getElementById('main'),farm=g.Objects.Farm,startLumps=g.lumps,startTime=g.lumpT;
  const initialLevel=farm.level;
  const planButton='[data-action="plan-tab"][data-arg="lumps"]';
  g.lumps=102;
  try{
   e.set({lumpReserveMode:'custom',lumpReserve:100});
   page('planning');click(planButton);
   click('[data-action="lump-view"][data-arg="single"]');
   click('details[data-state="lump-routes"] summary');
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
   e.set({lump:false,lumpLevel:false,lumpGoal:null,lumpReserveMode:'adaptive'});
  }
 });
 await test('糖块持续托管一次授权后跨小游戏继续执行',async()=>{
  const workspace=root().getElementById('main'),{Temple,Farm}=g.Objects;
  const previous={temple:Temple.level,farm:Farm.level,lumps:g.lumps,cycle:g.lumpT};
  try{
   Temple.level=Farm.level=0;g.lumps=1;g.lumpT=Date.now();
   e.set({lump:false,lumpManaged:false,lumpLevel:false,lumpGoal:null,lumpReserveMode:'adaptive'});
   page('planning');click('[data-action="plan-tab"][data-arg="lumps"]');
   click('[data-action="lump-view"][data-arg="managed"]');
   assert(workspace.querySelector('[aria-label="糖块托管"]').textContent.includes('解锁万神殿'),'托管未预览下一步');
   click('[data-action="start-lump-managed"]');
   const info=root().getElementById('confirm-text').textContent;
   assert(info.includes('完全成熟后收取')&&info.includes('继续收取并储存')&&!e.c.lumpManaged,'托管未明确范围或未经确认启用');
   click('#confirm-ok');
   await waitFor(()=>Temple.level===1,'托管未在取得执行权后解锁万神殿');
   assert(Temple.level===1&&Farm.level===0&&g.lumps===0&&e.c.lumpManaged,'托管未等待下一颗');
   page('overview');click('[data-action="navigate"][data-arg="queue"]');
   assert(/农场升至 1 级/.test(workspace.textContent),'第二个目标未进入队列');
   g.lumpT=Date.now()-g.lumpRipeAge-100;
   await waitFor(()=>Farm.level===1,'托管未在收取成熟糖块后解锁花园');
   assert(Farm.level===1&&g.lumps===0&&e.c.lumpManaged,'没有自动收取并转到第二个目标');
   page('planning');click('[data-action="stop-lump-managed"]');
   assert(!e.c.lumpManaged&&!e.c.lump,'停止时托管的收取未退出');
  }finally{
   Temple.level=previous.temple;Farm.level=previous.farm;g.lumps=previous.lumps;g.lumpT=previous.cycle;
   e.set({lumpManaged:false,lumpManagedSave:0});
  }
 });
 await test('万神殿解锁后可从总览预览阵容并按次数预算应用',async()=>{
  const panel=root().getElementById('main'),m=g.Objects.Temple.minigame;
  const old={swaps:m.swaps,slots:[...m.slot],total:g.BuildingsOwned};
  try{
   g.BuildingsOwned=139;
   e.set({pantheon:false,gods:[-1,-1,-1],swapReserve:2});
   page('overview');
   assert(panel.querySelector('[aria-label="建议下一步"]').textContent.includes('万神殿'),'解锁后总览没有引导');
   click('[data-action="open-rule"][data-arg="pantheon"]');
   const recommend=panel.querySelector('[aria-label="推荐神灵阵容"]');
   assert(recommend.textContent.includes('Jeremy')&&recommend.textContent.includes('金饼干'),'未显示建议和代价');
   const purpose=recommend.querySelector('[data-key="pantheon-profile"]');
   purpose.value='lumps';purpose.dispatchEvent(new Event('change',{bubbles:true}));
   assert(panel.textContent.includes('Rigidel')&&panel.textContent.includes('139'),'没有根据建筑总数解释糖块条件');
   click('[data-action="apply-pantheon"]');
   assert(!e.c.pantheon&&m.swaps===3&&root().getElementById('confirm-text').textContent.includes('需要调换2 次'),'预览已动用次数或未说明次数');
   click('#confirm-ok');
   await waitFor(()=>m.slot[0]===m.gods.order.id,'万神殿未在取得执行权后应用阵容');
   assert(m.slot[0]===m.gods.order.id&&m.swaps===2&&m.slot[1]===-1,'未应用阵容或动用了保留次数');
   page('overview');click('[data-action="navigate"][data-arg="queue"]');
   assert(/红宝石槽配置 Jeremy/.test(panel.textContent),'恢复调换后要做的事不在队列');
  }finally{
   g.BuildingsOwned=old.total;m.swaps=old.swaps;m.slot=old.slots;
   for(const god of m.godsById)god.slot=m.slot.indexOf(god.id);
   e.set({pantheon:false,gods:[-1,-1,-1],swapReserve:1});
  }
 });
 await test('20 次每秒连点与全局暂停',async()=>{e.set({click:true,rate:20});await delay(1300);const a=g.cookieClicks;await delay(1100);assert(g.cookieClicks-a>=15&&g.cookieClicks-a<=27,'实际频率 '+(g.cookieClicks-a));click('#pause');const b=g.cookieClicks;await delay(300);assert(g.cookieClicks===b,'暂停后仍点击');click('#pause');e.set({click:false});});
 await test('40 次每秒目标没有被低频调度限制',async()=>{e.set({click:true,rate:40});await delay(1300);const a=g.cookieClicks;await delay(1050);assert(g.cookieClicks-a>=29&&g.cookieClicks-a<=45,'实际频率 '+(g.cookieClicks-a));e.set({click:false});});
 await test('金饼干与驯鹿，默认跳过愤怒饼干',async()=>{e.set({golden:true,deer:true});await delay(1300);const a=g.spawn(),b=g.spawn('golden',true),c=g.spawn('reindeer');await delay(400);assert(a.popped&&c.popped&&!b.popped,'拾取不正确');e.set({golden:false,deer:false});g.shimmers=[];});
 await test('面纱与转生守卫',async()=>{e.set({click:true,rate:20});g.owned.add('Shimmering veil [off]');await delay(1200);const a=g.cookieClicks;await delay(200);assert(g.cookieClicks===a,'面纱被点击');g.owned.delete('Shimmering veil [off]');g.OnAscend=1;await delay(200);assert(g.cookieClicks===a,'转生时点击');g.OnAscend=0;e.set({click:false});});
 await test('特殊升级不在自动采购白名单',()=>{page('purchase');const rows=CookiePilotCore2.purchases(g,e.c);assert(!rows.find(r=>r.object.name==='One mind').auto,'One mind 可自动购买');assert(root().getElementById('main').textContent.includes('巧克力蛋'),'未展示特殊升级');});
 await test('指定采购目标前说明执行范围和后续策略',()=>{
  page('purchase');
  const row=CookiePilotCore2.purchases(g,e.c).find(r=>r.auto&&r.id.startsWith('b:'));
  click(`[data-action="inspect-purchase"][data-arg="${row.id}"]`);
  assert(!e.c.target&&!e.c.purchase,'浏览候选改变执行策略');
  click(`[data-action="target"][data-arg="${row.id}"]`);
  assert(root().getElementById('confirm').open&&!e.c.purchase,'缺少启用确认');
  const confirmation=root().getElementById('confirm-text').textContent;
  assert(confirmation.includes(row.name)&&confirmation.includes('按预计回本继续采购'),'没有说明采购范围或完成后的策略');
  click('#confirm-ok');
  assert(e.c.target===row.id&&e.c.purchaseMode==='plan'&&e.c.purchase,'目标未交接');
  e.set({purchase:false,target:'',purchaseMode:'efficient'});
 });
 await test('更新入口支持检查与查看新版',async()=>{
  const fetchBefore=window.fetch;
  try{
   window.fetch=async()=>new Response(JSON.stringify({version:'9.0.0',gameVersions:['2.058'],
    notes:'模拟发行说明',userscript:'https://example.com/cookie.user.js',zip:'https://example.com/cookie.zip'}));
   page('settings');
   click('[data-action="update"]');
   await delay(200);
   const update=root().querySelector('[aria-label="在线更新"]');
   assert(update.textContent.includes('有新版本 9.0.0')&&update.querySelectorAll('a').length===2,'更新入口未显示可用发行包');
  }finally{
   window.fetch=async()=>new Response(JSON.stringify({version:CookiePilotCore2.VERSION,gameVersions:['2.058'],
    notes:'',userscript:'https://example.com/cookie.user.js',zip:'https://example.com/cookie.zip'}));
   click('[data-action="update"]');await delay(100);
   window.fetch=fetchBefore;
  }
 });
 await test('花园格子选择与保护交互',()=>{page('garden');click('[data-action="tile"][data-arg="2,2"]');click('[data-action="protect-tile"]');assert(e.c.protectedTiles.includes('2,2'),'未保护格子');click('[data-action="protect-tile"]');assert(!e.c.protectedTiles.includes('2,2'),'未解除格子');});
 await test('独立预测不改变 Math.random',()=>{page('magic');const random=Math.random;const p=CookiePilotCore2.forecast(g,10);assert(p.length===10,'缺少预测');assert(Math.random===random,'预测污染全局 RNG');});
 await test('危险自动化需要实际确认',()=>{page('automation');click('[data-action="rule-group"][data-arg="market"]');const input=root().querySelector('[data-key="trade"]');input.click();assert(!e.c.trade&&root().getElementById('confirm').open,'未等待确认');click('#confirm-cancel');assert(!e.c.trade,'取消未生效');});
 await test('补给前备份失败不会发放资源',()=>{page('storage');click('details[data-state="storage-lab"] summary');click('#lab-toggle');g.demoFreeze=true;click('[data-action="grant"][data-arg="1"]');const before=g.cookies,original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cookie-pilot:backups:v2')throw Error('模拟存储已满');return original.call(this,k,v);};try{click('#confirm-ok');assert(g.cookies===before,'未备份仍发放');}finally{Storage.prototype.setItem=original;g.demoFreeze=false;}});
 await test('实验室正确补给，快照可导入',async()=>{page('storage');g.demoFreeze=true;const before=g.cookies;click('[data-action="grant"][data-arg="1"]');click('#confirm-ok');await delay(50);assert(Math.abs(g.cookies-before-g.unbuffedCps*60)<.1,'补给金额错误');const save=e.backups().find(x=>x.label==='实验室操作前');assert(save,'缺少重点快照');assert(g.ImportSaveCode(save.save),'快照无法导入');assert(Math.abs(g.cookies-before)<.1,'导入不一致');g.demoFreeze=false;});
 await test('广告显示可还原，主题可切换',()=>{e.set({ads:false,theme:'light'});assert(getComputedStyle(document.getElementById('support')).display!=='none','广告样式未撤销');assert(document.getElementById('cookie-pilot-v2').dataset.theme==='light','主题未切换');e.set({ads:true,theme:'dark'});assert(getComputedStyle(document.getElementById('support')).display==='none','未隐藏广告');});
 await test('前期存档显示解锁路径而不报错',()=>{window.Game=makePilotFixture('early');for(const key of['garden','magic','market','growth']){page(key);assert(!root().getElementById('main').textContent.includes('此模块暂时无法读取'),'前期模块错误');}window.Game=g;});
 await test('全程挂机确认后实际完成首转并恢复经营',async()=>{
  const previous=structuredClone(e.c),previousPause=e.paused;
  const run=window.Game=makePilotFixture('ascension');
  e.setPaused(true);
  try{
   e.set({managed:{saveId:run.fullDate,modes:{ascension:'notice',research:'safe',garden:'seeds',
    market:'portfolio',dragon:'hatch'}},lumpManaged:true,lumpManagedSave:run.fullDate,lumpManagedMode:'unlocks',
    lumpLevel:false,ascendCombo:true});
   click('[data-page="planning"]');
   click('[data-action="plan-tab"][data-arg="prestige"]');
   assert(root().getElementById('main').textContent.includes('数字化'),'转生规划未列出可补的成就');
   click('[data-action="configure-ascension"]');
   click('details[data-state="manage-settings"] summary');
   click('input[data-key="ascendCombo"]');
   assert(!e.c.ascendCombo,'等待爆发设置未生效');
   page('overview');
   click('[data-action="navigate"][data-arg="management"]');
   click('[data-action="management-growth"]');
   assert(root().getElementById('confirm').open,'未显示自动操作范围');
   assert(e.c.managed.modes.ascension==='notice'&&e.c.managed.modes.research==='safe','确认前改动了既有托管范围');
   click('#confirm-ok');
   assert(e.c.managed.modes.ascension==='cycle'&&e.c.remember&&e.c.background,'托管、刷新恢复或后台运行未启用');
   assert(e.c.managed.modes.research==='seasonal'&&e.c.lumpManagedMode==='growth','未应用研究和糖块路线');
   assert(e.c.managed.modes.dragon==='collect'&&e.c.managed.modes.garden==='cycle'&&
    e.c.managed.modes.market==='development'&&e.c.marketLoan===0,'未应用成长路线或错误启用贷款');
   click('[data-action="manage-module"][data-arg="market"]');
   click('details[data-state="manage-settings"] summary');
   const setLoan=value=>{
    const loan=root().querySelector('select[data-key="marketLoan"]');
    loan.value=value;
    loan.dispatchEvent(new Event('change',{bubbles:true}));
   };
   setLoan('1');
   assert(root().getElementById('confirm').open&&e.c.marketLoan===0,'贷款授权之前已启用');
   click('#confirm-cancel');
   assert(e.c.marketLoan===0,'取消后贷款已启用');
   setLoan('1');
   click('#confirm-ok');
   assert(e.c.marketLoan===1&&e.c.marketLoanSave===run.fullDate,'贷款未绑定当前存档');
   setLoan('0');
   assert(e.c.marketLoan===0&&e.c.marketLoanSave===0,'关闭贷款后仍有授权');
   e.setPaused(false);
   await waitFor(()=>e.locked,'未取得独占锁');
   const now=Date.now();
   e.next={};
   for(let i=0;i<20;i++)e.pulse(now+1100*i);
   assert(run.resets===1&&run.heavenlyChips===351,'首转未正确结算');
   assert(run.permanentUpgrades[0]===run.Upgrades['Kitten helpers'].id,'未设置永久栏');
   assert(CookiePilotManagement.execution(run,e.c).purchase,'重开后未恢复采购');
   page('overview');
   assert(root().querySelector('[aria-label="挂机诊断"]'),'未展示最近成功动作');
  }finally{
   e.setPaused(true);
   e.clearPending(run);
   e.next={};
   window.Game=g;
   e.set(previous);
   e.setPaused(previousPause);
  }
 });
 await test('重复加载不会生成重复入口和工作台',async()=>{await new Promise((res,rej)=>{const s=document.createElement('script');s.src='extension/pilot.bundle.js';s.onload=res;s.onerror=rej;document.body.append(s);});assert(document.querySelectorAll('#cookie-pilot-v2').length===1&&document.querySelectorAll('#cookie-pilot-entry').length===1,'重复注入');});
 await test('卸载清理后可重新加载',async()=>{window.CookiePilot2.destroy();assert(!document.getElementById('cookie-pilot-v2')&&!document.getElementById('cookie-pilot-entry'),'卸载残留');await new Promise((res,rej)=>{const s=document.createElement('script');s.src='extension/pilot.bundle.js';s.onload=res;s.onerror=rej;document.body.append(s);});assert(window.CookiePilot2,'重新加载失败');window.CookiePilot2.engine.set(Object.fromEntries(CookiePilotCore2.AUTO.map(k=>[k,false])));window.CookiePilot2.show();});
 out.textContent+=`\n${passed}/${total} 通过 · 独立模拟存档`;out.dataset.passed=passed;out.dataset.total=total;out.dataset.results=JSON.stringify(checks);button.textContent=`${passed}/${total} 项通过`;button.disabled=false;
};
})();
