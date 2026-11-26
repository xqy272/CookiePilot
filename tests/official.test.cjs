const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'); const ref=process.env.COOKIE_PILOT_REFERENCE_DIR; if(!ref){test('official references (optional)',{skip:'Set COOKIE_PILOT_REFERENCE_DIR to the verified official source directory'},()=>{});return;}
const C=require('../src/core.js'),M=require('../src/management.js'),{Engine}=require('../src/engine.js'),make=require('./fixture.js');
const main=fs.readFileSync(path.join(ref,'main.js'),'utf8').replace(/\r\n/g,'\n'),grimoire=fs.readFileSync(path.join(ref,'minigameGrimoire.js'),'utf8').replace(/\r\n/g,'\n'),garden=fs.readFileSync(path.join(ref,'minigameGarden.js'),'utf8').replace(/\r\n/g,'\n'),market=fs.readFileSync(path.join(ref,'minigameMarket.js'),'utf8').replace(/\r\n/g,'\n'),temple=fs.readFileSync(path.join(ref,'minigamePantheon.js'),'utf8').replace(/\r\n/g,'\n');
const section=(s,a,b)=>{const start=s.indexOf(a),end=s.indexOf(b,start);assert(start>=0&&end>start,a);return s.slice(start,end);};
const memory=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
function context(g,m){const node={style:{},setAttribute(){},classList:{add(){},remove(){}},getBounds:()=>({left:0,right:10,top:0,bottom:10})};const ctx=vm.createContext({Game:g,M:m,EN:true,loc:s=>s,Beautify:String,LBeautify:String,l:()=>node,PlaySound(){},triggerAnim(){},console,document:{},Date});vm.runInContext('function choose(a){return a[Math.floor(Math.random()*a.length)]}',ctx);return ctx;}
const rngSource=section(main,'(function(a,b,c,d,e,f){','\n\nfunction bind');
test('automatic first ascension uses the official prices, prestige arithmetic, purchase API and slot dialog',()=>{
 const g=make('ascension'),ctx=context(g,null),data=new Map();
 const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
 g.Has=name=>!!g.Upgrades[name]?.bought||g.owned.has(name);
 g.Upgrade=function(){};
 vm.runInContext(section(main,'Game.HCfactor=3;','Game.GetHeavenlyMultiplier=function'),ctx);
 vm.runInContext(section(main,'Game.Upgrade.prototype.buy=function','Game.Upgrade.prototype.earn=function'),ctx);
 const originalAscend=g.Ascend;
 g.Ascend=confirm=>{
  if(!confirm)return originalAscend(confirm);
  g.EarnHeavenlyChips(g.cookiesEarned,true);
  g.OnAscend=1;
  g.BuildAscendTree();
 };
 const records=[];
 g.heavenlyChipsSpent=0;
 const originalBuild=g.BuildAscendTree;
 g.BuildAscendTree=purchased=>{if(purchased)records.push(purchased.name);originalBuild();};
 const engine=new Engine(()=>g,storage);
 engine.locked=true;
 engine.set({remember:true,managed:{saveId:g.fullDate,modes:{ascension:'cycle'}}});
 for(const item of M.ascensionPlan(g,engine.c).rows){
  const line=main.split('\n').find(line=>line.includes("new Game.Upgrade('"+item.name+"',"));
  const officialPrice=Number(/,\s*(\d+)\s*,\s*\[\d+,\d+\]/.exec(line||'')?.[1]);
  assert.equal(officialPrice,item.price,item.name);
  item.upgrade.buy=g.Upgrade.prototype.buy;
 }
 const slot=g.Upgrades['Permanent upgrade slot I'];
 assert(main.includes("Game.last.activateFunction=function(){Game.AssignPermanentSlot(0);};"));
 let prompted=0;
 slot.activateFunction=()=>{
  g.promptOn=1;
  g.promptL={querySelector:selector=>selector==='#promptContentPickPermaUpgrade'};
  prompted++;
 };
 g.ClosePrompt=()=>{g.promptOn=0;};
 for(let i=0,now=Date.now();i<18;i++)engine.pulse(now+i*1100);
 assert.equal(prompted,1);
 assert.equal(g.resets,1);
 assert.equal(g.heavenlyChipsSpent,390);
 assert.equal(g.heavenlyChips,351);
 assert.equal(g.permanentUpgrades[0],g.Upgrades['Kitten helpers'].id);
 assert.equal(records.length,10);
});
test('independent RNG matches the actual game string-seed stream for 10000 outputs',()=>{const ctx=vm.createContext({});vm.runInContext(rngSource,ctx);for(let seed=0;seed<100;seed++){const str='Pilot测试/'+seed;ctx.seed=str;vm.runInContext('Math.seedrandom(seed)',ctx);const random=C.rng(str);for(let i=0;i<100;i++)assert.equal(random(),vm.runInContext('Math.random()',ctx));}});
test('forecast agrees with actual 2.058 spell and shimmer initialization in 1200 cases',()=>{const g=make(),m=g.Objects['Wizard tower'].minigame;g.shimmerTypes.golden.n=0;g.elderWrath=0;g.chimeType=0;g.ascensionMode=0;g.bounds={left:0,right:1400,top:0,bottom:900};g.hasGod=()=>false;g.playGoldenCookieChime=()=>{};g.Has=()=>false;const ctx=context(g,m);vm.runInContext(rngSource,ctx);vm.runInContext(section(grimoire,'M.spells={','M.spellsById=[]'),ctx);
const init=section(main,'initFunc:function(me)','\n\t\t\t\tupdateFunc:function(me)').replace(/^initFunc:/,'').replace(/,\s*$/,'');ctx.init=vm.runInContext('('+init+')',ctx);g.shimmer=function(type,obj){this.type=type;this.forceObj=obj;this.force='';this.l={style:{},setAttribute(){}};g.shimmerTypes.golden.n++;ctx.init(this);ctx.spawned=this;};
for(const season of['','christmas','easter','halloween','valentines','fools'])for(const flight of[false,true])for(let n=0;n<100;n++){g.season=season;g.buffs=flight?{Dragonflight:{name:'Dragonflight'}}:{};g.shimmerTypes.golden.n=n%3;m.spellsCastTotal=n;g.BuildingsOwned=n%2?100:0;m.getFailChance=()=>.15+.15*g.shimmerTypes.golden.n;const expected=C.forecast(g,1)[0];ctx.seed=g.seed+'/'+n;vm.runInContext('Math.seedrandom(seed); var fail=Math.random()>=1-M.getFailChance(M.spells["hand of fate"]); if(fail)M.spells["hand of fate"].fail();else M.spells["hand of fate"].win();',ctx);assert.equal(ctx.spawned.force,expected.effect,season+' '+flight+' '+n);assert.equal(ctx.fail,expected.fail);}});
test('garden adapter calls actual harvest and useTool functions with correct costs and seed unlocks',()=>{const g=make(),m=g.Objects.Farm.minigame;g.keys=[];m.harvests=0;m.harvestsTotal=0;m.unlockSeed=p=>{p.unlocked=1;return true;};const ctx=context(g,m);vm.runInContext(section(garden,'M.useTool=function','\n\t\tM.getTile='),ctx);vm.runInContext(section(garden,'M.harvest=function','\n\t\tM.unlockSeed='),ctx);const e=new Engine(()=>g,memory());e.locked=true;e.harvest();assert.equal(m.plants.bakeberry.unlocked,1);assert.equal(m.plot[4][3][0],0);e.set({gardenSpend:10,replantLayout:'fill'});const before=g.cookies;e.plant();assert.equal(before-g.cookies,30000);});
test('managed garden chooses parents using the official mutation rules on a starter plot',()=>{
 const g=make(),m=g.Objects.Farm.minigame,ctx=context(g,m);
 g.keys=[];
 m.harvests=m.harvestsTotal=0;
 m.unlockSeed=p=>{p.unlocked=1;return true;};
 m.plants.thumbcorn.unlocked=0;
 m.plot.forEach(row=>row.forEach(tile=>{tile[0]=tile[1]=0;}));
 for(const [start,end] of [
  ['M.getMuts=function','M.computeBoostPlot=function'],
  ['M.useTool=function','M.computeStepT=function'],
  ['M.harvest=function','M.unlockSeed=']
 ])vm.runInContext(section(garden,start,end),ctx);
 const e=new Engine(()=>g,memory());
 e.locked=true;
 e.set({managed:{saveId:g.fullDate,modes:{garden:'seeds'}},protectedTiles:['2,2']});
 const run=()=>M.execution(g,e.c);
 assert.match(M.gardenPlan(g,run()).reason,/拇指玉米/);
 e.plant(run());
 e.plant(run());
 const planted=C.garden(g).cells.filter(tile=>tile.p);
 assert.equal(planted.length,2);
 assert(planted.every(tile=>tile.p.key==='bakerWheat'&&tile.key!=='2,2'));
 for(const tile of planted)m.plot[tile.y][tile.x][1]=m.plants.bakerWheat.mature;
 const target=C.garden(g).cells.find(tile=>tile.unlocked&&!tile.p&&tile.key!=='2,2');
 const mutations=C.mutations(g,target.x,target.y);
 assert(mutations.some(mutation=>mutation.key==='thumbcorn'));
 m.plot[target.y][target.x]=[m.plants.thumbcorn.id+1,m.plants.thumbcorn.mature];
 e.plant(run());
 assert.equal(m.plants.thumbcorn.unlocked,1);
 assert.deepEqual(m.plot[2][2],[0,0]);
});
test('market adapter uses official 2.058 price conversion, overhead and transaction lock',()=>{const g=make(),m=g.Objects.Bank.minigame,ctx=context(g,m);vm.runInContext(section(market,'M.buyGood=function','\n\t\tM.getRestingVal='),ctx);const e=new Engine(()=>g,memory());e.set({marketThresholds:{0:{buy:11,sell:30}},marketCap:5,marketBudget:100});e.locked=true;const before=g.cookies;e.trade();const q=m.goodsById[0];assert.equal(q.stock,5);assert.equal(before-g.cookies,10*(1+.2*.95**3)*g.cookiesPsRawHighest*5);q.val=40;const bank=g.cookies;e.trade();assert.equal(g.cookies,bank,'same tick sale must be blocked');q.last=0;e.trade();assert.equal(q.stock,0);assert.equal(g.cookies-bank,40*g.cookiesPsRawHighest*5);});
test('pantheon adapter consumes swaps using official slot semantics',()=>{const g=make(),m=g.Objects.Temple.minigame,ctx=context(g,m);vm.runInContext(section(temple,'M.useSwap=function','\n\t\tM.dragging=false'),ctx);const e=new Engine(()=>g,memory());e.locked=true;e.set({gods:[0,1,2],swapReserve:1});e.pantheon();e.pantheon();e.pantheon();assert.equal(m.swaps,1);assert.deepEqual(m.slot,[0,1,-1]);});
test('recommended Pantheon lineup agrees with the official drag, drop and swap recharge logic',()=>{
 const g=make(),m=g.Objects.Temple.minigame,ctx=context(g,m);
 const nodes=new Map(),bounds={left:0,right:10,top:0,bottom:10};
 ctx.TopBarOffset=0;
 ctx.l=id=>{
  if(!nodes.has(id))nodes.set(id,{style:{},getBounds:()=>bounds,appendChild(){},parentNode:{insertBefore(){}}});
  return nodes.get(id);
 };
 const now=Date.now();
 ctx.Date={now:()=>ctx.now};
 ctx.now=now;
 m.lastSwapT=0;
 vm.runInContext(section(temple,'M.useSwap=function','//external'),ctx);
 vm.runInContext(section(temple,'M.logic=function','M.draw=function'),ctx);
 g.owned.add('Kitten helpers');
 const config=C.config({click:true,swapReserve:1});
 const {gods}=C.pantheonAdvice(g,config,'click');
 const e=new Engine(()=>g,memory());
 e.set({gods});
 e.pantheon();e.pantheon();
 assert.deepEqual(m.slot,[gods[0],gods[1],-1]);
 assert.equal(m.swaps,1);
 assert.equal(m.dragging,false);
 const cooldown=C.pantheonPlan(g,gods,1,now).seconds;
 ctx.now=now+cooldown*1000-1;
 m.logic();
 assert.equal(m.swaps,1);
 ctx.now++;
 m.logic();
 assert.equal(m.swaps,2);
 e.pantheon();
 assert.deepEqual(m.slot,gods);
 assert.equal(m.swaps,1);
});
test('ClickCookie adapter preserves actual 50/s interval and game accounting',()=>{const g=make(),ctx=context(g,null);g.prefs={};g.autoclickerDetected=0;g.clicksThisSession=1;g.loseShimmeringVeil=()=>{};g.runModHook=()=>{};g.playCookieClickSound=()=>{};ctx.Date={now:()=>ctx.now};ctx.now=1000;vm.runInContext(section(main,'Game.ClickCookie=function','\n\t\tGame.mouseX=0;'),ctx);const e=new Engine(()=>g,memory());e.locked=true;e.set({click:true,rate:40});e.click(1000);assert.equal(g.cookieClicks,1);ctx.now=1010;g.ClickCookie();assert.equal(g.cookieClicks,1);ctx.now=1026;e.click(1026);assert.equal(g.cookieClicks,2);assert.equal(g.handmadeCookies,2*g.computedMouseCps);});
test('ripe harvest treats an official zero-yield meaty sugar lump as a settled cycle',()=>{
 const g=make(),ctx=context(g,null),e=new Engine(()=>g,memory());
 ctx.TopBarOffset=0;
 g.lumpCurrentType=3;
 vm.runInContext('Math.random=()=>0;'+section(main,'Game.gainLumps=function','Game.computeLumpType=function'),ctx);
 g.computeLumpType=()=>{};
 g.computeLumpTimes=()=>{};
 g.lumpT=Date.now()-g.lumpRipeAge-100;
 const before=g.lumps,cycle=g.lumpT;
 e.lump();
 assert.equal(g.lumps,before);
 assert.notEqual(g.lumpT,cycle);
 assert.match(e.logs[0].text,/获得 0 颗/);
 e.lump();
 assert.equal(e.actions,1);
});
test('confirmed sugar lump goal uses game-native charging and preserves the game prompt preference',()=>{
 const g=make(),ctx=context(g,null),farm=g.Objects.Farm,e=new Engine(()=>g,memory());
 g.prefs={askLumps:1};
 g.Prompt=()=>{throw Error('unexpected game prompt');};
 g.LoadMinigames=()=>{g.minigameLoads=(g.minigameLoads||0)+1;};
 ctx.TopBarOffset=0;
 ctx.building=farm;
 vm.runInContext(section(main,'Game.spendLump=function','Game.doLumps=function'),ctx);
 const levelUp=section(main,'this.levelUp=function(me){','this.refresh=function()');
 vm.runInContext('(function(){'+levelUp+'}).call(building)',ctx);
 farm.level=0;
 farm.minigameLoaded=false;
 e.locked=true;
 e.set({lumpLevel:true,lumpGoal:{buildingId:farm.id,level:1,saveId:g.fullDate}});
 e.attempt('lumpLevel',e.lumpLevel);
 assert.equal(farm.level,1);
 assert.equal(g.lumps,104);
 assert.equal(g.minigameLoads,1);
 assert.equal(g.recalculateGains,1);
 assert.equal(g.prefs.askLumps,1);
 assert.equal(e.c.lumpLevel,false);
});
