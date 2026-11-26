const assert=require('node:assert/strict');
const test=require('node:test');
const C=require('../src/core.js');
const M=require('../src/management.js');
const {Engine}=require('../src/engine.js');
const make=require('./fixture.js');

function setup(modes={},config={},stage='late'){
 const g=make(stage),data=new Map();
 const storage={
  getItem:key=>data.get(key)??null,
  setItem:(key,value)=>data.set(key,value),
  removeItem:key=>data.delete(key)
 };
 const create=()=>{
  const engine=new Engine(()=>g,storage,{exclusive:()=>true});
  engine.locked=true;
  return engine;
 };
 const engine=create();
 engine.set({remember:true,managed:{saveId:g.fullDate,modes},...config});
 let time=Date.now();
 const tick=active=>{time+=1010;active.pulse(time);};
 return{g,storage,engine,create,tick,data};
}

test('function upgrades use the current play style and preserve the reserve',()=>{
 const g=make(),item=g.Upgrades['Lucky day'];
 g.UpgradesInStore=[item];
 g.ObjectsById=[];
 const base=C.config({golden:true,reserveMode:'custom',reserve:100});
 g.cookies=item.basePrice+99;
 assert.equal(C.purchasePlan(g,base).next,undefined);
 g.cookies++;
 assert.equal(C.purchasePlan(g,base).next.object,item);
 assert.equal(C.purchasePlan(g,{...base,golden:false}).next,undefined);
 assert.equal(C.purchasePlan(g,{...base,challenge:'noUpgrade'}).next,undefined);
 item.isVaulted=()=>true;
 assert.equal(C.purchasePlan(g,base).next,undefined);
});

test('managed purchase starts a new round without waiting for a distant minigame or bulk order',()=>{
 const {g,engine}=setup({purchase:'efficient',events:'idle',pantheon:'lineup',magic:'combo'},{bulk:100});
 g.ObjectsById.forEach(object=>{object.amount=0;});
 g.BuildingsOwned=0;
 g.cookies=16;
 g.cookiesPs=0;
 g.unbuffedCps=0;
 const run=M.execution(g,engine.c);
 const plan=M.purchasePlan(g,run);
 assert.equal(plan.next.object,g.Objects.Cursor);
 assert.equal(plan.next.qty,1);
 engine.purchase(run);
 assert.equal(g.Objects.Cursor.amount,1);
});

test('combo mode holds a predicted click buff, stacks it under Frenzy, and has a bounded wait',()=>{
 const {g,engine}=setup({magic:'combo'},{comboWait:30});
 const grimoire=g.Objects['Wizard tower'].minigame;
 grimoire.spells['conjure baked goods']={name:'Conjure Baked Goods',key:'conjure baked goods',costMin:5,costPercent:.1};
 for(let i=0;i<1000&&C.forecast(g,1)[0].effect!=='click frenzy';i++)grimoire.spellsCastTotal++;
 assert.equal(C.forecast(g,1)[0].effect,'click frenzy');
 const run=M.execution(g,engine.c),now=Date.now();
 assert.equal(engine.spellPlan(g,run,now,true).holding,true);
 assert.equal(engine.spellPlan(g,run,now+30001).key,'conjure baked goods');
 g.buffs.Frenzy={multCpS:7};
 assert.equal(engine.spellPlan(g,run,now+5000).key,'hand of fate');
 g.buffs['Click frenzy']={multClick:777};
 assert.equal(engine.spellPlan(g,run,now+5000).holding,true);
 grimoire.getFailChance=()=>1;
 grimoire.spells["haggler's charm"]={name:"Haggler's Charm",key:"haggler's charm",costMin:2,costPercent:.05};
 assert.equal(engine.spellPlan(g,run,now+31000).key,"haggler's charm");
});

test('ascension prep includes more than three milestones within one total budget and honors protection',()=>{
 const {g,engine,tick}=setup({ascension:'cycle'}, {reserveMode:'custom',reserve:50e18},'ascension');
 const cursor=g.Objects.Cursor;
 cursor.getSumPrice=()=>.00012e18;
 const buildings=[g.Objects.Farm,g.Objects.Mine,g.Objects.Temple,g.Objects.Portal];
 for(const [i,object] of buildings.entries()){
  object.amount=46;
  object.tieredAchievs={1:{tier:1,dname:['农场成就','矿坑成就','神庙成就','诡异夸克'][i],won:0}};
  const cost=[.00001e18,.00002e18,.00003e18,.526e18][i];
  object.getSumPrice=()=>cost;
  object.buy=quantity=>{g.Spend(cost);object.amount+=quantity;};
 }
 const {rows,total,budget}=M.ascensionPrep(g,engine.c);
 assert.equal(rows.length,5);
 assert(total<=budget);
 assert(rows.some(row=>row.achievement.dname==='诡异夸克'));
 const protectedPlan=M.ascensionPrep(g,C.config({...engine.c,blocked:['b:'+buildings[3].id]}));
 assert.equal(protectedPlan.rows.length,4);
 const limited=M.ascensionPrep({...g,cookies:50.05e18},engine.c);
 assert(limited.total<=limited.budget&&limited.rows.length<5);
 tick(engine);
 assert.equal(engine.ascentJob().prep.length,4);
 for(let i=0;i<4;i++)tick(engine);
 assert.equal(cursor.amount,200);
 assert.equal(buildings[3].amount,50);
 assert(engine.logs.some(entry=>entry.text.includes('诡异夸克')));
});

function prepareAscensionCombo(config={}){
 const result=setup({ascension:'cycle',magic:'yield',events:'idle'}, {comboWait:30,...config},'ascension');
 const {g}=result,book=g.Objects['Wizard tower'].minigame;
 for(let i=0;i<1000&&C.forecast(g,1)[0].effect!=='click frenzy';i++)book.spellsCastTotal++;
 assert.equal(C.forecast(g,1)[0].effect,'click frenzy');
 return {...result,book};
}

test('automatic ascension reserves one predicted spell, waits for the actual combo, then continues',()=>{
 const {g,engine,book,tick,create}=prepareAscensionCombo();
 book.castSpell=spell=>{
  assert.equal(spell.key,'hand of fate');
  book.spellsCastTotal++;
  g.buffs['Click frenzy']={multClick:777};
  return true;
 };
 tick(engine);
 const {combo}=engine.ascentJob();
 assert.equal(book.spellsCastTotal,combo.index);
 assert.equal(g.OnAscend,0);
 const resumed=create();
 tick(resumed);
 assert.deepEqual(resumed.ascentJob().combo,combo);
 g.buffs.Frenzy={multCpS:7};
 tick(resumed);
 assert.equal(book.spellsCastTotal,combo.index+1);
 tick(resumed);
 assert.equal(g.OnAscend,0);
 delete g.buffs['Click frenzy'];
 tick(resumed);
 tick(resumed);
 assert.equal(g.OnAscend,1);
});

test('ascension proceeds on timeout and can explicitly skip holding for a combo',()=>{
 const {g,engine,book,tick}=prepareAscensionCombo();
 tick(engine);
 const {combo}=engine.ascentJob();
 engine.pulse(combo.until+1);
 engine.pulse(combo.until+1101);
 assert.equal(book.spellsCastTotal,combo.index);
 assert.equal(g.OnAscend,1);
 const immediate=prepareAscensionCombo({ascendCombo:false});
 immediate.tick(immediate.engine);
 immediate.tick(immediate.engine);
 assert.equal(immediate.g.OnAscend,1);
});

test('two automatic rounds survive engine restart and buy a verified plan once',()=>{
 const {g,engine,create,tick}=setup({ascension:'cycle',events:'idle',purchase:'efficient'}, {},'ascension');
 const first=M.ascensionPlan(g,engine.c);
 assert.equal(first.cost,390);
 assert.equal(first.target,390);
 assert.equal(first.gained,741);
 assert(!C.has(g,'Legacy'));
 tick(engine);
 assert.equal(g.Objects.Cursor.amount,200);
 tick(engine);
 assert.equal(g.OnAscend,1);
 assert.equal(g.heavenlyChips,741);
 const resumed=create();
 assert.equal(resumed.leaseGate(),'');
 for(let n=0;n<18&&resumed.ascentJob();n++)tick(resumed);
 assert.equal(g.resets,1);
 assert.equal(g.heavenlyChips,351);
 assert.equal(g.permanentUpgrades[0],g.Upgrades['Kitten helpers'].id);
 assert(!resumed.ascentJob());
 assert(resumed.backups().some(entry=>entry.pin&&entry.label.includes('自动转生前')));
 const next=M.ascensionPlan(g,resumed.c);
 assert.equal(next.cost,1111);
 assert.equal(next.target,760);
 g.cookiesEarned=g.HowManyCookiesReset(1500)-g.cookiesReset;
 assert.equal(M.ascensionPlan(g,resumed.c).ready,undefined);
 g.cookiesEarned=g.HowManyCookiesReset(1501)*1.0000001-g.cookiesReset;
 for(let n=0;n<10&&g.resets<2;n++)tick(resumed);
 tick(resumed);
 assert.equal(g.resets,2);
 assert.equal(g.heavenlyChips,0);
 assert(C.has(g,'Season switcher'));
 assert.equal(resumed.diagnostics().activity.text.includes('已开始下一轮'),true);
 assert.equal(M.execution(g,resumed.c).click,true);
});

test('ascension retries from the original normal save after a reload in heaven',()=>{
 const {g,engine,create,tick}=setup({ascension:'cycle'}, {},'ascension');
 tick(engine);
 tick(engine);
 tick(engine);
 assert(C.has(g,'Legacy'));
 g.OnAscend=0;
 g.heavenlyChips=0;
 g.prestige=0;
 g.owned.delete('Legacy');
 g.Upgrades.Legacy.bought=0;
 const resumed=create();
 for(let n=0;n<20&&resumed.ascentJob();n++)tick(resumed);
 assert.equal(g.resets,1);
 assert.equal(g.heavenlyChips,351);
});

test('a paused 3.0.0 ascent resumes at the permanent slot without buying its upgrades again',()=>{
 const {g,engine,create,tick,storage}=setup({ascension:'cycle'}, {},'ascension');
 for(let n=0;n<12;n++)tick(engine);
 assert.equal(g.OnAscend,1);
 const job=engine.ascentJob();
 assert.equal(job.phase,'buying');
 assert.equal(M.heavenlyBudget(g,job.names).rows.length,0);
 assert.equal(g.heavenlyChips,351);
 assert.equal(Array.isArray(g.UpgradesById),false);
 engine.stopForRecovery('自动转生未继续：(g.UpgradesById || []).filter is not a function');
 const settingsKey='cookie-pilot:settings:v2';
 const settings=JSON.parse(storage.getItem(settingsKey));
 storage.setItem(settingsKey,JSON.stringify({...settings,version:'3.0.0'}));
 const resumed=create();
 tick(resumed);
 assert.equal(g.permanentUpgrades[0],-1);
 assert.equal(g.resets,0);
 resumed.setPaused(false);
 for(let n=0;n<4;n++)tick(resumed);
 assert.equal(g.resets,1);
 assert.equal(g.heavenlyChips,351);
 assert.equal(g.permanentUpgrades[0],g.Upgrades['Kitten helpers'].id);
 assert(!resumed.ascentJob());
});

test('a distant heavenly target allows a growth ascension while retaining saved chips',()=>{
 const {g,engine}=setup({ascension:'cycle'}, {},'ascension');
 for(const item of g.UpgradesByPool.prestige.slice(0,11))item.bought=1;
 g.cookiesReset=g.HowManyCookiesReset(10001);
 g.cookiesEarned=g.HowManyCookiesReset(15002)-g.cookiesReset;
 g.Upgrades['Lasting fortune'].basePrice=50000;
 const plan=M.ascensionPlan(g,engine.c);
 assert.equal(plan.name,'积累声望并保留筹码');
 assert.equal(plan.cost,0);
 assert.deepEqual(plan.names,[]);
 assert.equal(plan.ready,true);
});

test('auto ascent respects the shared pause and refuses to spend after authorization is revoked',()=>{
 const {g,engine,create,tick,storage}=setup({ascension:'cycle'}, {},'ascension');
 tick(engine);
 tick(engine);
 assert.equal(g.OnAscend,1);
 const other=create();
 other.setPaused(true);
 tick(engine);
 assert.equal(g.heavenlyChips,741);
 other.setPaused(false);
 other.set({managed:{saveId:g.fullDate,modes:{}}});
 tick(engine);
 assert.equal(g.heavenlyChips,741);
 assert.equal(g.resets,0);
});

test('ascension does not start when backup fails, in a challenge, or with protected shiny wrinklers',()=>{
 const {g,engine,tick}=setup({ascension:'cycle'}, {},'ascension');
 g.wrinklers=[{type:1,phase:2,hp:3}];
 tick(engine);
 assert.equal(g.OnAscend,0);
 g.wrinklers=[];
 engine.set({challenge:'noClick'});
 tick(engine);
 assert.equal(g.OnAscend,0);
 engine.set({challenge:'none'});
 engine.backup=()=>{throw Error('模拟存储失败');};
 tick(engine);
 assert.equal(g.OnAscend,0);
 assert.equal(engine.paused,true);
 assert.match(engine.diagnostics().failure.text,/模拟存储失败/);
});

test('Godzamok recovery restores the same run after reload without repeating the sale',()=>{
 const {g,engine,create,tick}=setup({}, {godzamok:true,godzamokBuildings:['2','3'],godzamokSell:2});
 g.hasGod=()=>1;
 g.buffs['Click frenzy']={multClick:777};
 const original=g.ObjectsById.map(o=>o.amount);
 engine.godzamok();
 assert.equal(engine.rebuy.length,1);
 assert.equal(g.ObjectsById[3].amount,original[3]-2);
 // The native save may predate the first repayment.
 g.ObjectsById[2].amount=original[2]-2;
 const resumed=create();
 tick(resumed);
 assert.equal(g.ObjectsById[2].amount,original[2]);
 tick(resumed);
 assert.equal(g.ObjectsById[3].amount,original[3]);
 assert.equal(resumed.rebuy.length,0);
 const cash=g.cookies;
 resumed.godzamok();
 assert.equal(g.cookies,cash);
});

test('research confirms One mind only for its save-scoped profile and honors season and shiny protection',()=>{
 const {g,engine}=setup({research:'safe'});
 const prior=['Bingo center/Research facility','Specialized chocolate chips','Designer cocoa beans','Ritual rolling pins','Underworld ovens'];
 prior.forEach(name=>g.owned.add(name));
 const oneMind=g.Upgrades['One mind'];
 assert.equal(M.researchPlan(g,engine.c).upgrade,undefined);
 const original=oneMind.buy;
 oneMind.buy=function(confirm){
  assert.equal(confirm,1);
  return original.call(this);
 };
 const set=mode=>engine.set({managed:{saveId:g.fullDate,modes:{research:mode}}});
 set('one-mind');
 engine.research();
 assert(C.has(g,'One mind'));
 ['Exotic nuts','Communal brainsweep','Arcane sugar','Elder Pact'].forEach(name=>g.owned.add(name));
 set('pledge');
 g.elderWrath=3;
 g.Upgrades['Elder Pledge']={id:900,name:'Elder Pledge',unlocked:true,getPrice:()=>1};
 assert.match(M.researchPlan(g,engine.c).reason,/闪光/);
 g.wrinklers=[];
 g.season='halloween';
 g.halloweenDrops=['Unowned cookie'];
 assert.match(M.researchPlan(g,engine.c).reason,/万圣节/);
 g.season='';
 assert.equal(M.researchPlan(g,engine.c).upgrade.name,'Elder Pledge');
});
