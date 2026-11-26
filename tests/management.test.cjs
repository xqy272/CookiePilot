const assert=require('node:assert/strict');
const test=require('node:test');
const C=require('../src/core.js');
const M=require('../src/management.js');
const {Engine}=require('../src/engine.js');
const fixture=require('./fixture.js');

function setup(modes,config={}){
 const g=fixture(),values=new Map();
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const e=new Engine(()=>g,storage);
 e.locked=true;
 e.set({...config,managed:{saveId:g.fullDate,modes}});
 return{g,e,storage,run:()=>M.execution(g,e.c)};
}

test('management is scoped to its save and stopping a profile restores manual settings',()=>{
 const {g,e,storage,run}=setup({events:'burst',market:'unknown'},{click:false,wrath:true,remember:true});
 assert.equal(run().click,true);
 assert.equal(run().clickMode,'buff');
 assert.equal(run().wrath,false);
 assert.deepEqual(e.c.managed.modes,{events:'burst'});
 const resumed=new Engine(()=>g,storage);
 resumed.locked=true;
 const golden=g.spawn(),wrath=g.spawn('golden',true);
 resumed.pulse();
 assert.equal(golden.popped,true);
 assert.equal(wrath.popped,false);
 g.fullDate++;
 assert.equal(run().click,false);
 g.fullDate--;
 resumed.set({managed:{...resumed.c.managed,modes:{}}});
 e.set({rate:24});
 assert.equal(run().click,false);
 assert.equal(run().wrath,true);
 assert.deepEqual(e.c.managed.modes,{});
});

test('managed garden plants parents, leaves a mutation space, harvests and selects the next seed',()=>{
 const {g,e,run}=setup({garden:'seeds'},{protectedTiles:['2,2'],reserveMode:'custom',reserve:100});
 const m=g.Objects.Farm.minigame;
 m.isTileUnlocked=(x,y)=>x>=2&&x<=3&&y>=2&&y<=3;
 m.plot=Array.from({length:6},()=>Array.from({length:6},()=>[0,0]));
 m.plants.thumbcorn.unlocked=0;
 m.getMuts=(n,mature)=>mature.bakerWheat>=2&&!m.plants.thumbcorn.unlocked?[['thumbcorn',.05]]:
  mature.bakerWheat&&mature.thumbcorn?[['bakeberry',.01]]:[];
 e.plant(run());
 e.plant(run());
 const parents=C.garden(g).cells.filter(tile=>tile.p);
 assert.equal(parents.length,2);
 assert(parents.every(tile=>tile.p.key==='bakerWheat'&&tile.key!=='2,2'));
 assert.equal(M.gardenPlan(g,run()).kind,'wait');
 const mutation=C.garden(g).cells.find(tile=>tile.unlocked&&tile.key!=='2,2'&&!tile.p);
 m.plot[mutation.y][mutation.x]=[m.plants.thumbcorn.id+1,80];
 e.plant(run());
 assert.equal(m.plants.thumbcorn.unlocked,1);
 assert.match(M.gardenPlan(g,run()).reason,/bakeberry|烘焙浆果|空格/);
 assert.deepEqual(m.plot[2][2],[0,0]);
 m.freeze=1;
 assert.equal(M.gardenPlan(g,run()).reason,'花园已冻结');
});

test('garden route rejects insufficient full recipe budget and preserves existing crops',()=>{
 const {g,e,run}=setup({garden:'seeds'},{gardenSpend:100,reserveMode:'custom',reserve:100});
 const m=g.Objects.Farm.minigame;
 m.plot=Array.from({length:6},()=>Array.from({length:6},()=>[0,0]));
 m.plants.thumbcorn.unlocked=0;
 g.cookies=15000;
 assert.match(M.gardenPlan(g,run()).reason,/等待.*种植预算/);
 e.plant(run());
 assert.equal(g.cookies,15000);
 assert(m.plot.flat().every(cell=>cell[0]===0));
});

test('managed spells choose a forecasted combo, pick their own golden cookie and obey magic reserve',()=>{
 const {g,e,run}=setup({magic:'yield'});
 const m=g.Objects['Wizard tower'].minigame;
 g.buffs.frenzy={multCpS:7};
 const lucky=C.forecast(g,80).find(item=>item.good&&!item.fail);
 m.spellsCastTotal=lucky.index;
 const untargeted=g.spawn();
 const plan=M.spellPlan(g,run(),0);
 assert.equal(plan.key,'hand of fate');
 assert.equal(plan.reason,'');
 e.cast(run());
 assert.equal(m.spellsCastTotal,lucky.index+1);
 assert.equal(untargeted.popped,false);
 assert.equal(e.picked,1);
 e.set({magicReserve:100});
 assert.match(M.spellPlan(g,run(),0).reason,/保留量|低风险/);
});

test('a bad spell sequence uses the disclosed cheap fallback rather than a destructive backfire',()=>{
 const {g,run}=setup({magic:'yield'});
 const m=g.Objects['Wizard tower'].minigame;
 m.getFailChance=()=>1;
 m.spells["haggler's charm"]={name:'Haggler',costMin:10,costPercent:.1};
 const plan=M.spellPlan(g,run(),0);
 assert.equal(plan.key,"haggler's charm");
 assert.match(plan.detail,/2%（1 小时）/);
});

test('market-managed positions share one budget and survive bank level changes without adopting unknown stock',()=>{
 const {g,e,run}=setup({market:'portfolio'},{marketBudget:20,marketMinSamples:5,marketCap:10});
 const market=g.Objects.Bank.minigame;
 g.cookies=1000;
 g.cookiesPsRawHighest=1;
 e.sampleMarket();
 const [first,second,unknown]=market.goodsById;
 first.val=second.val=10;
 unknown.stock=8;
 e.hist[first.id]=e.hist[second.id]=[10,12,14,16,18];
 e.trade(run());e.trade(run());e.trade(run());
 assert(first.stock>0&&second.stock>0);
 assert(g.cookies>=800);
 assert.equal(unknown.stock,8);
 const basis=e.ledger[first.id];
 g.Objects.Bank.level++;
 e.sampleMarket();
 assert.equal(e.ledger[first.id],basis);
 assert.equal(e.hist[first.id].length,1);
 first.last=0;
 first.val=20;
 e.hist[first.id]=[10,12,14,16,20];
 e.trade(run());
 assert.equal(first.stock,0);
 assert.equal(unknown.stock,8);
});

test('purchase management prioritizes an available building needed to unlock a selected minigame',()=>{
 const {g,e,run}=setup({purchase:'efficient',magic:'yield'},{bulk:10});
 const tower=g.Objects['Wizard tower'];
 tower.amount=0;
 tower.locked=false;
 const plan=M.purchasePlan(g,run());
 assert.equal(plan.next.object,tower);
 assert.equal(plan.next.qty,1);
 e.purchase(run());
 assert.equal(tower.amount,1);
 assert.equal(e.c.purchase,false);
});

test('Pantheon management preserves existing gods and pins additions to the save',()=>{
 const {g,e}=setup({pantheon:'lineup'});
 const m=g.Objects.Temple.minigame,god=m.gods.ruin;
 m.slotGod(god,0);
 g.owned.add('Kitten helpers');
 e.pulse();
 const lineup=[...e.c.managed.gods];
 assert.equal(lineup[0],god.id);
 assert(lineup.some(id=>id===m.gods.mother.id));
 e.set({click:true});
 e.pulse(Date.now()+1200);
 assert.deepEqual(e.c.managed.gods,lineup);
 assert(m.swaps>=e.c.swapReserve);
});

test('season management advances after a collection and respects the actual switch count',()=>{
 const {g,e,run}=setup({season:'collection'});
 g.santaDrops=[];g.reindeerDrops=['christmas cookie'];g.heartDrops=['valentines cookie'];
 for(const key of ['christmas','valentines'])g.Upgrades[key+' cookie'].unlocked=0;
 for(const data of Object.values(g.seasons)){
  const trigger=g.Upgrades[data.trigger],buy=trigger.buy;
  trigger.buy=()=>{if(buy()){g.seasonUses=(g.seasonUses||0)+1;return true;}};
 }
 assert.equal(M.seasonPlan(g,run()).key,'christmas');
 e.season(run());
 assert.equal(g.season,'christmas');
 assert.equal(run().deer,true);
 assert.match(M.seasonPlan(g,run()).reason,/继续收集/);
 g.Upgrades['christmas cookie'].unlocked=1;
 assert.equal(run().deer,false);
 assert.equal(M.seasonPlan(g,run()).upgrade,g.Upgrades['christmas cookie']);
 e.season(run());
 assert(g.Has('christmas cookie'));
 assert.equal(M.seasonPlan(g,run()).key,'valentines');
 e.season(run());
 assert.equal(g.season,'valentines');
 g.Upgrades['valentines cookie'].unlocked=1;
 assert.match(M.seasonPlan(g,run()).reason,/购买情人节饼干/);
 e.season(run());
 assert(g.Has('valentines cookie'));
 assert.equal(M.seasonPlan(g,run()).reason,'已收集支持的季节掉落');
 g.reindeerDrops.push('Bell biscuits');
 g.seasonUses=4;
 assert.match(M.seasonPlan(g,run()).reason,/4 次上限/);
});

test('season management buys unlocked rewards across seasons and keeps the Chocolate egg',()=>{
 const {g,e,run}=setup({season:'collection'});
 const makeReward=(name,id,cost)=>{
  const item={name,id,pool:'',unlocked:1,bought:0,getPrice:()=>cost,buy(){
   g.Spend(cost);
   this.bought=1;
   g.owned.add(name);
  }};
  g.Upgrades[name]=item;
  return item;
 };
 const reindeer=makeReward('Reindeer baking grounds',800,200);
 const sleigh=makeReward('Weighted sleighs',801,300);
 const dominion=makeReward("Santa's dominion",802,400);
 const halloween=makeReward('Skull cookies',803,100);
 const omelette=makeReward('Omelette',804,500);
 const chocolate=g.Upgrades['Chocolate egg'];
 g.santaDrops=[sleigh.name,reindeer.name];
 g.halloweenDrops=[halloween.name];
 g.easterEggs=[omelette.name,chocolate.name];
 g.season='easter';
 g.seasonUses=4;
 g.vault=[halloween.id];
 e.set({blocked:['u:'+sleigh.id]});
 assert.equal(M.seasonPlan(g,run()).upgrade,reindeer);
 e.season(run());
 assert(reindeer.bought);
 assert.equal(M.seasonPlan(g,run()).upgrade,omelette);
 e.season(run());
 assert.equal(M.seasonPlan(g,run()).upgrade,dominion);
 e.season(run());
 assert(dominion.bought);
 assert.equal(sleigh.bought,0);
 assert.equal(halloween.bought,0);
 assert.equal(chocolate.bought,0);
 assert.match(M.seasonPlan(g,run()).reason,/保护/);
 g.vault=[];
 e.season(run());
 assert(halloween.bought);
});

test('season purchases observe reserves and wait until click bursts finish',()=>{
 const {g,e,run}=setup({season:'collection'},{reserveMode:'custom',reserve:100,purchase:true});
 const item=g.Upgrades['christmas cookie'];
 g.reindeerDrops=[item.name];
 g.cookies=item.getPrice()+99;
 assert.match(M.seasonPlan(g,run()).reason,/等待购买预算/);
 g.cookies++;
 g.buffs['Click frenzy']={multClick:777};
 assert.match(M.seasonPlan(g,run()).reason,/爆发/);
 delete g.buffs['Click frenzy'];
 assert.equal(M.seasonPlan(g,run()).upgrade,item);
 e.pulse();
 assert(item.bought);
 assert.equal(g.cookies,100);
});

test('Santa training reaches the final reward after all regular gifts have unlocked',()=>{
 const {g,e,run}=setup({season:'collection'});
 g.season='christmas';
 g.owned.add('A festive hat');
 g.santaLevel=13;
 g.cookies=1e20;
 const gift=g.Upgrades['christmas cookie'];
 g.santaDrops=[gift.name];
 gift.bought=1;
 g.owned.add(gift.name);
 const final=g.Upgrades["Santa's dominion"]={name:"Santa's dominion",id:800,unlocked:0,bought:0,
  getPrice:()=>100,buy(){g.Spend(100);this.bought=1;g.owned.add(this.name);}};
 g.UpgradeSanta=()=>{g.santaLevel++;final.unlocked=1;};
 assert(M.seasonRewards(g).christmas.includes(final.name));
 assert.equal(M.seasonPlan(g,run()).next,14);
 e.season(run());
 assert.equal(M.seasonPlan(g,run()).upgrade,final);
 e.season(run());
 assert(final.bought);
});

test('season-triggered pickups stop when the corresponding drops are unlocked',()=>{
 const {g,e,run}=setup({season:'collection'});
 const drop=g.Upgrades['easter cookie'];
 g.easterEggs=[drop.name];
 g.season='easter';
 drop.unlocked=0;
 assert.equal(run().golden,true);
 assert.equal(run().wrinkler,true);
 assert.equal(M.wrinklerMode(g,e.c),'drops');
 e.set({managed:{...e.c.managed,modes:{...e.c.managed.modes,wrinklers:'yield'}}});
 assert.equal(M.wrinklerMode(g,e.c),'yield');
 drop.unlocked=1;
 assert.equal(run().golden,false);
 assert.equal(M.owner(g,e.c,'wrinkler'),'wrinklers');
 e.set({managed:{...e.c.managed,modes:{season:'collection'}}});
 assert.equal(run().wrinkler,false);
});

test('dragon and wrinkler routes respect the training boundary, restore menus and protect shiny individuals',()=>{
 const {g,e,run}=setup({dragon:'hatch',wrinklers:'drops'},{protectShiny:false});
 g.dragonLevel=4;
 e.dragon(run());e.dragon(run());
 assert.equal(g.dragonLevel,5);
 g.dragonLevel=8;g.specialTab='';
 e.pet(run());
 assert.equal(g.specialTab,'');
 assert.equal(g.petClicks,1);
 e.wrinkler(run());
 assert.equal(g.wrinklers[9].hp,0);
 assert(g.wrinklers[10].hp>0);
});

test('managed dragon buys an unlocked egg only when permitted by the current reserve',()=>{
 const {g,e,run}=setup({dragon:'hatch'},{reserveMode:'custom'});
 g.owned.delete('A crumbly egg');
 g.dragonLevel=0;
 const egg=g.Upgrades['A crumbly egg']={name:'A crumbly egg',unlocked:1,getPrice:()=>25,buy:()=>{
  g.Spend(25);g.owned.add('A crumbly egg');
 }};
 e.set({reserve:g.cookies});
 e.dragon(run());
 assert(!g.Has(egg.name));
 e.set({reserve:0});
 e.dragon(run());
 assert(g.Has(egg.name));
 assert.equal(g.dragonLevel,0);
});

test('refreshed paused management waits and carries a milestone notice through repeated pulses',()=>{
 const {g,e,storage}=setup({ascension:'notice',events:'idle'},{ascendTarget:1});
 g.cookiesEarned=27e12;
 const resumed=new Engine(()=>g,storage);
 resumed.locked=true;
 assert.equal(resumed.startupHold,true);
 resumed.pulse();
 assert(resumed.logs.every(item=>!item.text.includes('转生目标已达到')));
 resumed.setPaused(false);
 resumed.pulse(Date.now()+1500);
 resumed.pulse(Date.now()+3000);
 assert.equal(resumed.logs.filter(item=>item.text.includes('转生目标已达到')).length,1);
 assert.equal(g.OnAscend,0);
});
