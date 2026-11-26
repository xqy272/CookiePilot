const assert=require('node:assert/strict');
const test=require('node:test');
const C=require('../src/core.js');
const M=require('../src/management.js');
const {Engine}=require('../src/engine.js');
const make=require('./fixture.js');

function setup(modes,config={}){
 const g=make(),entries=new Map(),buttons=new Map();
 const storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
 const engine=new Engine(()=>g,storage,{nativeClick:id=>{
  if(!buttons.has(id))return false;
  buttons.get(id)();
  return true;
 }});
 engine.locked=true;
 engine.set({remember:true,managed:{saveId:g.fullDate,modes},...config});
 return {g,engine,buttons,storage,run:()=>M.execution(g,engine.c)};
}
function reward(g,name,id,price=1,unlocked=true){
 return g.Upgrades[name]={id,name,pool:'',unlocked,bought:false,getPrice:()=>price,buy(){
  if(!this.unlocked||g.cookies<price)return false;
  g.Spend(price);this.bought=true;g.owned.add(name);return true;
 }};
}

test('collect mode trains only after petting is available, reserves stock, and buys the four dragon rewards',()=>{
 const {g,engine,run}=setup({dragon:'collect',purchase:'efficient'});
 g.dragonLevel=5;
 g.owned.delete('Pet the dragon');
 assert.match(M.dragonPlan(g,run(),'collect').reason,/等待天堂升级/);
 g.owned.add('Pet the dragon');
 const buildings=[g.Objects.Cursor,g.Objects.Grandma,g.Objects.Farm];
 buildings.forEach((object,i)=>{
  object.amount=101;
  g.dragonLevels[5+i]={cost:()=>object.amount>=100,buy:()=>object.sacrifice(100),costStr:()=>object.name};
 });
 buildings[0].amount=100;
 assert.match(M.dragonPlan(g,run(),'collect').reason,/保留 1/);
 assert.equal(M.purchasePlan(g,run()).next.object,buildings[0]);
 engine.purchase(run());
 for(let i=0;i<3;i++)engine.dragon(run());
 assert.equal(g.dragonLevel,8);
 assert.deepEqual(buildings.map(object=>object.amount),[1,1,1]);
 const names=['Dragon claw','Dragon fang','Dragon scale','Dragon teddy bear'];
 const items=names.map((name,i)=>reward(g,name,900+i));
 assert.deepEqual(M.dragonRewardStatus(g),{missing:0,unlocked:4,bought:0});
 assert.equal(M.dragonPlan(g,run(),'collect').upgrade,items[3]);
 for(let i=0;i<4;i++)engine.dragon(run());
 assert.deepEqual(M.dragonRewardStatus(g),{missing:0,unlocked:0,bought:4});
 assert.equal(g.dragonLevel,8);
});

test('the Halloween research profile starts One mind only with a route to Halloween and resumes wrinkler yield afterward',()=>{
 const {g,engine,run}=setup({research:'seasonal',season:'collection',wrinklers:'yield'});
 ['Bingo center/Research facility','Specialized chocolate chips','Designer cocoa beans','Ritual rolling pins','Underworld ovens']
  .forEach(name=>g.owned.add(name));
 const drop=reward(g,'Skull cookies',900,100,false);
 g.halloweenDrops=[drop.name];
 g.elderWrath=0;
 g.wrinklers=[];
 const switcher=g.Upgrades[g.seasons.halloween.trigger];
 switcher.unlocked=0;
 assert.match(M.researchPlan(g,run()).reason,/等待万圣节/);
 switcher.unlocked=1;
 g.seasonUses=4;
 assert.match(M.researchPlan(g,run()).reason,/等待万圣节/);
 g.seasonUses=0;
 const oneMind=g.Upgrades['One mind'],buy=oneMind.buy;
 oneMind.buy=confirm=>{assert.equal(confirm,1);g.elderWrath=1;return buy.call(oneMind);};
 engine.research(run());
 assert(C.has(g,'One mind'));
 engine.season(run());
 assert.equal(g.season,'halloween');
 assert.equal(M.wrinklerMode(g,run()),'drops');
 drop.unlocked=true;
 assert.equal(M.wrinklerMode(g,run()),'yield');
 engine.season(run());
 assert(drop.bought);
 assert(!C.has(g,'Elder Pact'));
});

test('garden cycle switches soil via the game control, grows reward crops, and buys unlocked garden rewards',()=>{
 const {g,engine,buttons,run}=setup({garden:'cycle'});
 const m=g.Objects.Farm.minigame;
 m.soils={fertilizer:{id:1,name:'肥料',req:50}};
 m.nextSoil=Date.now()-1;
 m.plot=Array.from({length:6},()=>Array.from({length:6},()=>[0,0]));
 for(const plant of Object.values(m.plants))plant.unlocked=1;
 const sweet=reward(g,'Bakeberry cookies',900,100,false);
 buttons.set('gardenSoil-1',()=>{m.soil=1;m.nextSoil=Date.now()+600000;});
 assert.equal(M.gardenPlan(g,run()).kind,'soil');
 engine.plant(run());
 assert.equal(m.soil,1);
 const plan=M.gardenPlan(g,run());
 assert.equal(plan.tile.plant.key,'bakeberry');
 engine.plant(run());
 const {x,y}=plan.tile;
 m.plot[y][x][1]=m.plants.bakeberry.mature;
 assert.equal(M.gardenPlan(g,run()).kind,'harvest');
 const harvest=m.harvest;
 m.harvest=function(...args){sweet.unlocked=true;return harvest.call(this,...args);};
 engine.plant(run());
 assert.equal(M.gardenPlan(g,run()).upgrade,sweet);
 engine.plant(run());
 assert(sweet.bought);
 assert.equal(M.gardenPlan(g,run()).tile.plant.key,'bakeberry');
});

test('garden payout holds for the configured buff and honors protected tiles and frozen soil',()=>{
 const {g,engine,run}=setup({garden:'cycle'},{gardenCrop:'bakeberry',harvestBuff:7});
 const m=g.Objects.Farm.minigame,p=m.plants.bakeberry;
 p.unlocked=1;
 m.plot=Array.from({length:6},()=>Array.from({length:6},()=>[0,0]));
 m.plot[0][0]=[p.id+1,p.mature];
 engine.set({protectedTiles:['0,0']});
 g.buffs.Frenzy={multCpS:7};
 assert.notEqual(M.gardenPlan(g,run()).kind,'harvest');
 engine.set({protectedTiles:[]});
 delete g.buffs.Frenzy;
 assert.notEqual(M.gardenPlan(g,run()).kind,'harvest');
 p.ageTick=1;
 p.ageTickR=4;
 m.plot[0][0][1]=95;
 assert.equal(M.gardenPlan(g,run()).kind,'harvest');
 m.plot[0][0][1]=p.mature;
 g.buffs.Frenzy={multCpS:7};
 assert.equal(M.gardenPlan(g,run()).kind,'harvest');
 m.freeze=1;
 assert.match(M.gardenPlan(g,run()).reason,/冻结/);
});

test('market development reuses native office and broker rules and observes both caps',()=>{
 const {g,engine,buttons,run}=setup({market:'development',purchase:'efficient'},{marketOfficeCap:2,marketBrokerCap:1,marketCursorKeep:25});
 const m=g.Objects.Bank.minigame,cursor=g.Objects.Cursor;
 m.officeLevel=0;
 m.offices=[{cost:[100,2]},{cost:[200,4]},{cost:0}];
 m.brokers=0;
 m.getMaxBrokers=()=>10;
 m.getBrokerPrice=()=>100;
 cursor.amount=124;cursor.level=2;
 assert.match(M.marketDevelopment(g,{...run(),marketBrokerCap:0}).reason,/125/);
 assert.equal(M.purchasePlan(g,run()).next.object,cursor);
 engine.purchase(run());
 buttons.set('bankOfficeUpgrade',()=>{cursor.sacrifice(100);m.officeLevel++;});
 buttons.set('bankBrokersBuy',()=>{g.Spend(100);m.brokers++;});
 engine.trade(run());
 assert.equal(cursor.amount,25);
 assert.equal(m.officeLevel,1);
 engine.trade(run());
 assert.equal(m.brokers,1);
 assert(!M.marketDevelopment(g,run()).kind);
});

test('the loan requires a confirmed save and profitable pre-ascension burst and runs once per job',()=>{
 const {g,engine,run}=setup({market:'development',ascension:'cycle',magic:'combo',events:'burst'},{ascendTarget:1});
 const m=g.Objects.Bank.minigame,book=g.Objects['Wizard tower'].minigame;
 const now=Date.now();
 for(let i=0;i<1000&&C.forecast(g,1)[0].effect!=='click frenzy';i++)book.spellsCastTotal++;
 assert.equal(C.forecast(g,1)[0].effect,'click frenzy');
 const job={saveId:g.fullDate,round:[g.fullDate,g.startDate,g.seed].join(':'),phase:'prepare',
  name:'测试',target:1,prep:[],names:[],combo:{index:book.spellsCastTotal,until:now+30000}};
 m.officeLevel=2;
 m.loanTypes=[['Loan',1.5,120,.25,240,.2]];
 let loans=0;
 m.takeLoan=()=>{loans++;g.Spend(g.cookies*.2);return true;};
 g.buffs.Frenzy={name:'Frenzy',multCpS:7,time:3600};
 g.cookiesEarned=8e12;
 book.castSpell=()=>{
  book.spellsCastTotal++;
  g.shimmers.push({type:'golden',pop(){
   g.buffs['Click frenzy']={name:'Click frenzy',multClick:777,time:750};
   this.popped=true;
  }});
  return true;
 };
 g.computedMouseCps=5e8;
 engine.clickSample.rate=20;
 engine.saveAscent(g,job);
 engine.trade(run());
 assert.equal(loans,0);
 engine.set({marketLoan:1,marketLoanSave:g.fullDate+1});
 assert.equal(M.marketLoanPlan(g,run(),job,20),null);
 engine.set({marketLoan:1,marketLoanSave:g.fullDate});
 assert.equal(M.marketLoanPlan(g,run(),job,20),null);
 engine.cast(run(),now);
 const triggered=engine.ascentJob();
 assert.equal(triggered.combo.triggered,true);
 assert.equal(M.marketLoanPlan(g,run(),triggered,0),null);
 assert.equal(M.marketLoanPlan(g,run(),triggered,20),null);
 g.owned.add('Plastic mouse');
 g.wrinklers=[{type:1,phase:2}];
 assert.equal(M.marketLoanPlan(g,run(),triggered,20),null);
 g.wrinklers=[];
 engine.set({ascendTarget:2});
 assert.equal(M.marketLoanPlan(g,run(),triggered,20),null);
 engine.set({ascendTarget:1});
 assert.equal(M.marketLoanPlan(g,run(),triggered,20).kind,'loan');
 engine.trade(run());
 engine.trade(run());
 assert.equal(loans,1);
 assert(engine.ascentJob().loanUsed);
});
