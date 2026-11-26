/* Cookie Pilot 3.0.0 · MIT · bundled locally; no remote executable code. */
/* Cookie Pilot 2 · MIT · pure analysis, never mutates the game. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CookiePilotCore2=api;})(globalThis,function(){
'use strict';
const VERSION='3.0.0', SUPPORTED='2.058';
const AUTO=['click','golden','wrath','deer','fortune','purchase','harvest','plant','trade','cast','lump','lumpLevel','lumpManaged','wrinkler','pet','dragon','season','pantheon','aura','godzamok'];
const MANAGED_MODES={
 events:['idle','burst'],purchase:['efficient'],garden:['seeds'],magic:['yield','combo'],pantheon:['lineup'],
 market:['portfolio'],dragon:['hatch','develop'],season:['collection'],wrinklers:['yield','drops'],
 research:['safe','one-mind','full','pledge'],ascension:['notice','cycle']
};
const LUMP_BAKING_CAP=100;
const LUMP_UNLOCKS=[
 {building:'Temple',feature:'万神殿',rules:['pantheon','godzamok'],reason:'神灵可持续提供加成，适合挂机。'},
 {building:'Farm',feature:'花园',rules:['harvest','plant'],reason:'尽早开始种植和培育种子。'},
 {building:'Wizard tower',feature:'魔法书',rules:['cast'],reason:'开始蓄魔，可在合适的条件下施法。'},
 {building:'Bank',feature:'股市',rules:['trade'],reason:'解锁交易、仓储和办公室。'}
];
const FARM_TILES=[4,6,9,12,16,20,25,30,36];
const defaults={schema:2,theme:'system',density:'comfortable',challenge:'none',open:false,background:false,remember:false,ads:true,protectVeil:true,alerts:true,sound:false,rate:20,clickMode:'always',reserveMode:'none',reserve:0,holdCombo:true,purchaseMode:'efficient',bridgePurchase:false,target:'',blocked:[],maxBuilding:10000,bulk:1,
gardenMode:'seeds',seedA:'bakerWheat',seedB:'thumbcorn',gardenSpend:10,protectedTiles:[],replantLayout:'rows',harvestBuff:1,
spell:'hand of fate',castCondition:'frenzy',maxFail:15,magicReserve:0,prediction:false,predictOnlyGood:true,castCooldown:60,comboWait:240,
marketBuy:20,marketSell:80,marketBudget:5,marketCap:100,marketMinSamples:30,marketProfit:2,marketThresholds:{},
lumpReserveMode:'adaptive',lumpReserve:LUMP_BAKING_CAP,lumpGoal:null,lumpManagedSave:0,lumpManagedMode:'growth',
wrinklerKeep:10,protectShiny:true,dragonMax:27,aura0:-1,aura1:-1,swapReserve:1,gods:[-1,-1,-1],
godzamokBuildings:[],godzamokKeep:1,godzamokSell:100,seasonTarget:'',ascendTarget:365,heavenlyTarget:'',
updateChannel:'stable',releaseBase:'https://raw.githubusercontent.com/xqy272/CookiePilot/main/dist',updateCheck:true,backupMinutes:10,
managed:{saveId:0,modes:{},gods:null,seasonLimit:4},
...Object.fromEntries(AUTO.map(k=>[k,false]))};
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b,d=a)=>Math.min(b,Math.max(a,num(v,d)));
const has=(g,n)=>!!g?.Has?.(n), aura=(g,n)=>num(g?.auraMult?.(n));
const mini=(g,name)=>g?.Objects?.[name]?.minigameLoaded?g.Objects[name].minigame:null;
function config(input={},startup=false){
 if(!input||typeof input!=='object'||Array.isArray(input))input={};const c=structuredClone(defaults);
 for(const k in c)if(typeof c[k]==='boolean'&&typeof input[k]==='boolean')c[k]=input[k];
 const ranges={rate:[1,40],reserve:[0,1e300],maxBuilding:[1,100000],bulk:[1,100],gardenSpend:[0,100],harvestBuff:[1,1000000],maxFail:[0,100],magicReserve:[0,1000],castCooldown:[1,86400],marketBuy:[0,49],marketSell:[51,100],marketBudget:[0,100],marketCap:[1,10000],marketMinSamples:[5,2000],marketProfit:[0,10000],lumpReserve:[0,100000],wrinklerKeep:[0,14],dragonMax:[0,100],aura0:[-1,100],aura1:[-1,100],swapReserve:[0,3],godzamokKeep:[0,10000],godzamokSell:[1,10000],ascendTarget:[0,1e300],backupMinutes:[1,120]};
 for(const [k,[a,b]]of Object.entries(ranges))c[k]=clamp(input[k],a,b,c[k]);
 for(const k of ['rate','maxBuilding','bulk','marketCap','marketMinSamples','wrinklerKeep','dragonMax','aura0','aura1','swapReserve','godzamokKeep','godzamokSell'])c[k]=Math.floor(c[k]);
 c.lumpReserve=Math.ceil(c.lumpReserve);
 c.comboWait=Math.round(clamp(input.comboWait,30,1800,c.comboWait));
 c.lumpGoal=lumpGoal(input.lumpGoal);
 if(!c.lumpGoal?.saveId)c.lumpLevel=false;
 if(Number.isSafeInteger(input.lumpManagedSave)&&input.lumpManagedSave>0)c.lumpManagedSave=input.lumpManagedSave;
 c.lumpManaged=c.lumpManaged&&!!c.lumpManagedSave;
 if(c.lumpManaged)c.lumpLevel=false;
 if(input.lumpManagedMode==='unlocks')c.lumpManagedMode='unlocks';
 if(['adaptive','custom'].includes(input.lumpReserveMode))c.lumpReserveMode=input.lumpReserveMode;
 else if(c.lumpLevel||c.lumpReserve!==LUMP_BAKING_CAP)c.lumpReserveMode='custom';
 const enums={theme:['system','dark','light'],density:['comfortable','compact'],challenge:['none','noClick','noUpgrade','both'],clickMode:['always','buff'],reserveMode:['none','lucky','frenzy','custom'],purchaseMode:['efficient','target','plan'],gardenMode:['seeds','mature','buff'],replantLayout:['rows','checker','fill'],castCondition:['mana','full','frenzy','click'],updateChannel:['stable','beta'],seasonTarget:['','christmas','easter','halloween','valentines','fools']};
 for(const[k,values]of Object.entries(enums))if(values.includes(input[k]))c[k]=input[k];
 for(const k of ['seedA','seedB','target','spell','heavenlyTarget'])if(typeof input[k]==='string')c[k]=input[k].slice(0,150);
 for(const k of ['blocked','protectedTiles','godzamokBuildings'])if(Array.isArray(input[k]))c[k]=[...new Set(input[k].filter(x=>typeof x==='string'||Number.isInteger(x)))].slice(0,1000);
 if(Array.isArray(input.gods))c.gods=[0,1,2].map(i=>Math.floor(clamp(input.gods[i],-1,30,-1)));
 c.managed=managementConfig(input.managed);
 if(input.marketThresholds&&typeof input.marketThresholds==='object')for(const[k,v]of Object.entries(input.marketThresholds).slice(0,30))if(/^\d+$/.test(k)&&v&&typeof v==='object')c.marketThresholds[k]={buy:clamp(v.buy,0,1e9),sell:clamp(v.sell,0,1e9)};
 if(typeof input.releaseBase==='string'){try{const u=new URL(input.releaseBase);if(u.protocol==='https:'&&!u.username&&!u.password)c.releaseBase=u.href.replace(/\/$/,'');}catch{}}
 if(startup&&!c.remember){
  for(const k of AUTO)c[k]=false;
  c.managed=managementConfig();
 }
 return c;
}
function managementConfig(input){
 const saveId=Number.isSafeInteger(input?.saveId)&&input.saveId>0?input.saveId:0;
 const modes={};
 if(saveId)for(const [key,choices] of Object.entries(MANAGED_MODES)){
  const mode=input.modes?.[key];
  if(choices.includes(mode))modes[key]=mode;
 }
 const gods=modes.pantheon&&Array.isArray(input.gods)&&input.gods.length===3?
  input.gods.map(id=>Number.isInteger(id)&&id>=0&&id<=30?id:-1):null;
 const seasonLimit=Math.floor(clamp(input?.seasonLimit,1,12,4));
 return{saveId,modes,gods,seasonLimit};
}
function migrate(old){return config({...old,click:old.autoClick,purchase:old.autoBuy,deer:old.reindeer,ads:old.adHide,remember:old.rememberAutomation},true);}
const ready=g=>!!(g?.ready&&typeof g.ClickCookie==='function'&&Number.isFinite(g.cookies));
const compatible=g=>String(g?.version)===SUPPORTED||g?.cookiePilotTest===true;
function gate(g,c,e={}){
 if(!ready(g))return'等待游戏加载';
 if(!compatible(g))return'游戏版本未验证，自动化已暂停';
 if(e.paused)return'全部自动化已暂停';
 if(!e.throughAscension&&(g.OnAscend||g.AscendTimer>0||g.ReincarnateTimer>0))return'转生中';
 if(g.promptOn)return'等待游戏对话框关闭';
 if(e.hidden&&!c.background)return'后台暂停';
 if(e.follower)return'另一游戏标签页正在运行';
 return'';
}
const veil=(g,c)=>c.protectVeil&&has(g,'Shimmering veil [off]');
const clickBuff=g=>Object.values(g.buffs||{}).some(b=>num(b.multClick,1)>1||b.name==='Cursed finger');
const cpsBuff=g=>Object.values(g.buffs||{}).reduce((a,b)=>a*num(b.multCpS,1),1);
function reserve(g,c,delta=0){
 const current=num(g.cookiesPs)+delta;
 if(c.reserveMode==='custom')return c.reserve;
 if(c.reserveMode==='lucky')return current*6000;
 if(c.reserveMode==='frenzy'){
  const unbuffed=num(g.unbuffedCps)+delta/Math.max(.01,cpsBuff(g));
  return Math.max(current,unbuffed*7)*6000;
 }
 return 0;
}
function fmt(n,d=2){if(!Number.isFinite(n))return'—';if(Math.abs(n)<1000)return n.toLocaleString('en-US',{maximumFractionDigits:d});const i=Math.floor(Math.log10(Math.abs(n))/3),u=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];return i<u.length?(n/1000**i).toFixed(d).replace(/\.?0+$/,'')+u[i]:n.toExponential(2);}
function time(s){if(!Number.isFinite(s))return'等待条件';if(s<=0)return'现在';if(s<60)return Math.ceil(s)+'秒';if(s<3600)return Math.floor(s/60)+'分'+Math.floor(s%60)+'秒';if(s<86400)return(s/3600).toFixed(1)+'小时';return(s/86400).toFixed(1)+'天';}
const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const kittens={'Kitten helpers':.1,'Kitten workers':.125,'Kitten engineers':.15,'Kitten overseers':.175,'Kitten managers':.2,'Kitten accountants':.2,'Kitten specialists':.2,'Kitten experts':.2,'Kitten consultants':.2,'Kitten assistants to the regional manager':.175,'Kitten marketeers':.15,'Kitten analysts':.125,'Kitten executives':.115,'Kitten admins':.11,'Kitten strategists':.105,'Kitten angels':.1,'Fortune #103':.05};
const fingers=['Thousand fingers','Million fingers','Billion fingers','Trillion fingers','Quadrillion fingers','Quintillion fingers','Sextillion fingers','Septillion fingers','Octillion fingers','Nonillion fingers','Decillion fingers','Undecillion fingers'];
const mice=['Plastic','Iron','Titanium','Adamantium','Unobtainium','Eludium','Wishalloy','Fantasteel','Nevercrack','Armythril','Technobsidian','Plasmarble','Miraculite','Aetherice','Omniplast'].map(x=>x+' mouse');
const flat={'Specialized chocolate chips':1.01,'Designer cocoa beans':1.02,'Underworld ovens':1.03,'Exotic nuts':1.04,'Arcane sugar':1.05,'Increased merriness':1.15,'Improved jolliness':1.15,'A lump of coal':1.01,'An itchy sweater':1.01,"Santa's dominion":1.2,'Fortune #100':1.01,'Fortune #101':1.07,'Dragon scale':1.03,'Wrinkler ambergris':1.06};
const useful=new Set(['Lucky day','Serendipity','Get lucky','Heavenly luck','Golden goose egg','Omelette','Fortune cookies']);
const goldenUpgrades=['Lucky day','Serendipity','Get lucky','Golden goose egg'];
const prestigePower=['Heavenly chip secret','Heavenly cookie stand','Heavenly bakery','Heavenly confectionery','Heavenly key'];
function functionalPriority(g,c,name){
 if((c.golden||c.wrath)&&goldenUpgrades.includes(name))return 100-goldenUpgrades.indexOf(name);
 if(c.golden&&g.season==='easter'&&name==='Omelette')return 90;
 if(g.prestige>0&&prestigePower.includes(name))return 80-prestigePower.indexOf(name);
 return 0;
}
const dangerous=new Set(['Chocolate egg','One mind','Communal brainsweep','Elder Pact','Bingo center/Research facility','Elder Pledge','Elder Covenant','Revoke Elder Covenant','Sugar frenzy','Sacrificial rolling pins']);
function upgradeClass(g,u){
 if(!u||u.bought||!u.unlocked)return'不可购买';if(u.isVaulted?.()||g.vault?.includes(u.id))return'保险库保护';
 if(u.priceLumps>0||u.pool==='prestige'||u.pool==='toggle'||u.pool==='tech'||u.pool==='debug'||u.clickFunction||u.choicesFunction||dangerous.has(u.name))return'特殊操作';
 if(useful.has(u.name)||prestigePower.includes(u.name))return'功能升级';
 if(kittens[u.name]||fingers.includes(u.name)||mice.includes(u.name)||u.name==='Fortune #104'||flat[u.name]||u.buildingTie||u.buildingTie1||u.pool==='cookie'&&typeof u.power==='number'||(g.GrandmaSynergies||[]).includes(u.name)||['Reinforced index finger','Carpal tunnel prevention cream','Ambidextrous','Ritual rolling pins','Naughty list','Elderwort biscuits'].includes(u.name))return'收益估算';
 return'需人工判断';
}
function estimate(g,change){
 const buy=change.upgrade, build=change.building, qty=change.qty||1;
 const H=n=>has(g,n)||buy?.name===n;
 const amount=o=>num(o?.amount)+(build&&o===build?qty:0), objs=g.ObjectsById||[], cursor=g.Objects?.Cursor, grandma=g.Objects?.Grandma;
 const currentCps=num(g.cookiesPs), currentClick=num(g.computedMouseCps), all=num(g.BuildingsOwned,objs.reduce((s,o)=>s+o.amount,0));
 const finger=fn=>{let a=fn(fingers[0])?.1:0;fingers.slice(1).forEach((n,i)=>{if(fn(n))a*=i===0?5:i===1?10:20;});if(fn('Unshackled cursors'))a*=25;return a;};
 const tier=(o,fn,amt)=>{let m=1;for(const u of Object.values(o.tieredUpgrades||{})){const t=g.Tiers?.[u.tier];if(t&&!t.special&&fn(u.name))m*=2+(g.ascensionMode!==1&&fn(o.unshackleUpgrade)&&fn(t.unshackleUpgrade)?o.id===1?.5:(20-o.id)*.1:0);}for(const u of o.synergies||[])if(fn(u.name))m*=u.buildingTie1===o?1+.05*amt(u.buildingTie2):1+.001*amt(u.buildingTie1);if(o.fortune&&fn(o.fortune.name))m*=1.07;if(o.grandma&&fn(o.grandma.name))m*=1+amt(grandma)*.01/(o.id-1);return m;};
 let base=0;
 for(const o of objs){
   let per=num(o.storedCps), ratio=tier(o,H,amount)/tier(o,n=>has(g,n),o=>num(o?.amount));
   if(o===cursor){const calc=(fn,non)=>{const base=.1*2**['Reinforced index finger','Carpal tunnel prevention cream','Ambidextrous'].filter(fn).length;return base+finger(fn)*non;};ratio*=calc(H,all+(build?qty:0)-amount(cursor))/Math.max(1e-300,calc(n=>has(g,n),all-num(cursor.amount)));}
   if(o===grandma){
    const add=(fn,amt)=>num(o.baseCps,1)+(fn('One mind')?.02*amt(o):0)+(fn('Communal brainsweep')?.02*amt(o):0)+(fn('Elder Pact')?.05*amt(g.Objects?.Portal):0);
    ratio*=add(H,amount)/add(n=>has(g,n),o=>num(o?.amount));
    if(buy&&(g.GrandmaSynergies||[]).includes(buy.name))ratio*=2;
    if(buy&&['Ritual rolling pins','Naughty list'].includes(buy.name))ratio*=2;
    if(buy?.name==='Elderwort biscuits')ratio*=1.02;
    if(buy?.pool==='kitten'&&has(g,'Cat ladies'))ratio*=1.29;
    ratio*=(1+aura(g,'Elder Battalion')*.01*(all+(build?qty:0)-amount(o)))/(1+aura(g,'Elder Battalion')*.01*(all-o.amount));
   }
   base+=per*ratio*amount(o);
 }
 if(has(g,'"egg"'))base+=9;
 let globalRatio=1,milk=num(g.milkProgress,num(g.AchievementsOwned)/25), extra=0;
 if(build)for(const a of Object.values(build.tieredAchievs||{}))if(!a.won&&g.Tiers?.[a.tier]?.achievUnlock<=amount(build))extra++;
 const milkMult=(has(g,"Santa's milk and cookies")?1.05:1)*(1+.05*aura(g,'Breath of Milk'))*num(g.eff?.('milk'),1)*({1:1.1,2:1.05,3:1.03}[g.hasGod?.('mother')]||1);
 for(const[name,power]of Object.entries(kittens))globalRatio*=(H(name)?1+(milk+extra/25)*power*milkMult:1)/(has(g,name)?1+milk*power*milkMult:1);
 if(buy?.pool==='cookie'&&typeof buy.power==='number')globalRatio*=1+buy.power/100;
 if(flat[buy?.name])globalRatio*=flat[buy.name];
 const predicted=base*num(g.globalCpsMult,1)*globalRatio;
 // Relative calculation keeps opaque additive contributions in the baseline.
 const originalBase=objs.reduce((s,o)=>s+num(o.storedCps)*num(o.amount),0)+(has(g,'"egg"')?9:0);
 const delta=(predicted-originalBase*num(g.globalCpsMult,1));
 const clickCalc=(fn,cps,non)=>2**['Reinforced index finger','Carpal tunnel prevention cream','Ambidextrous'].filter(fn).length+finger(fn)*non+cps*.01*(mice.filter(fn).length+(fn('Fortune #104')?1:0));
 const clickRatio=clickCalc(H,Math.max(0,currentCps+delta),all+(build?qty:0)-amount(cursor))/Math.max(1e-300,clickCalc(n=>has(g,n),currentCps,all-num(cursor?.amount)));
 return{delta:Math.max(0,delta),click:Math.max(0,currentClick*(clickRatio-1)),quality:'包含层级、协同、奶猫与部分里程碑的估算'};
}
function purchases(g,c){
 if(!ready(g))return[];const income=passiveIncome(g);const rows=[];
 for(const o of g.ObjectsById||[]){if(o.locked||o.amount>=c.maxBuilding)continue;const qty=Math.min(c.bulk,c.maxBuilding-o.amount);let price=qty===1?o.getPrice():o.getSumPrice?.(qty);if(!Number.isFinite(price))continue;rows.push({id:'b:'+o.id,name:o.dname||o.name,kind:'建筑',object:o,qty,price,...estimate(g,{building:o,qty}),auto:true});}
 for(const u of g.UpgradesInStore||[]){const cls=upgradeClass(g,u);if(['不可购买','保险库保护'].includes(cls))continue;let price=u.getPrice?.();if(!Number.isFinite(price))continue;const auto=['收益估算','功能升级'].includes(cls);rows.push({id:'u:'+u.id,name:u.dname||u.name,kind:cls,object:u,qty:1,price,...(auto?estimate(g,{upgrade:u}):{delta:0,click:0}),auto});}
 for(const r of rows){
  r.blocked=c.blocked.includes(r.id);
   const clickRate=c.click&&(c.clickMode!=='buff'||clickBuff(g))&&!['noClick','both'].includes(c.challenge)
    ?clamp(c.effectiveRate,0,c.rate,c.rate):0;
   r.gain=r.delta+r.click*clickRate;
  r.keep=reserve(g,c,num(r.delta));
  r.shortfall=Math.max(0,r.price+r.keep-g.cookies);
  r.eta=waitTime(r.shortfall,income);
  r.pp=r.gain>0?r.price/r.gain:Infinity;
  r.score=r.eta+r.pp;
  r.affordable=r.shortfall===0;
  r.priority=c.target===r.id;
   r.functionPriority=r.kind==='功能升级'?functionalPriority(g,c,r.object.name):0;
 }
  return rows.sort((a,b)=>(b.priority-a.priority)||((a.blocked?1:0)-(b.blocked?1:0))||
   (Number(b.affordable)*(b.functionPriority||0)-Number(a.affordable)*(a.functionPriority||0))||a.score-b.score||a.price-b.price);
}
const passiveIncome=g=>Math.max(0,num(g.cookiesPs)*(1-num(g.cpsSucked)));
const waitTime=(shortfall,income)=>shortfall<=0?0:income>0?shortfall/income:Infinity;
function purchasePlan(g,c,{rows=purchases(g,c),bridgedTarget=''}={}){
 const noUpgrades=['noUpgrade','both'].includes(c.challenge);
 const eligible=row=>row.auto&&!row.blocked&&(!noUpgrades||row.id.startsWith('b:'));
 const target=c.purchaseMode==='efficient'
   ?rows.find(row=>eligible(row)&&(row.gain>0||row.priority||row.affordable&&row.functionPriority>0))||
    rows.find(row=>eligible(row)&&row.functionPriority>0)
  :rows.find(row=>row.id===c.target);
 if(!target)return{reason:'等待可评估候选或指定目标'};
 if(!eligible(target))return{target,reason:noUpgrades&&target.id.startsWith('u:')?'无升级挑战保护：目标升级已暂停':'目标受保护，需要手动购买'};
 if(g.buyMode===-1)return{target,reason:'商店处于出售模式'};
 if(c.holdCombo&&clickBuff(g))return{target,reason:'爆发期间保留资源'};
 if(target.affordable)return{target,next:target,seconds:0};
 const income=passiveIncome(g);
 if(c.bridgePurchase&&bridgedTarget!==target.id&&income>0){
  let best,seconds=target.eta;
  for(const candidate of rows){
   if(!candidate.id.startsWith('b:')||candidate.id===target.id||!eligible(candidate)||!candidate.affordable||!(candidate.delta>0))continue;
   const held=reserve(g,c,num(target.delta)+candidate.delta);
   const missing=target.price+held-(g.cookies-candidate.price);
   const after=income+candidate.delta*Math.max(0,1-num(g.cpsSucked));
   const eta=waitTime(missing,after);
   if(eta+1<seconds){best=candidate;seconds=eta;}
  }
  if(best)return{target,next:best,seconds:0,bridge:true,targetSeconds:seconds};
 }
 return{target,seconds:target.eta,reason:'等待 '+target.name+' · 缺 '+fmt(target.shortfall)};
}
function manaSeconds(m,target,fps=30){if(!m||target>m.magicM)return Infinity;let a=Math.max(0,m.magic),frames=0;while(a<target&&frames<2000000){a+=Math.max(.002,Math.sqrt(a/Math.max(m.magicM,100)))*.002;frames++;}return frames>=2000000?Infinity:frames/fps;}
// Independent ARC4-based seeded generator matching the game's string-seed stream.
// No calls to Math.seedrandom / Math.random; forecasts cannot change game RNG.
function rng(seed){const key=[],s=Array.from({length:256},(_,i)=>i);let smear=0;for(let j=0;j<seed.length;j++){const k=j&255;smear^=(key[k]||0)*19;key[k]=(smear+seed.charCodeAt(j))&255;}let j=0;for(let i=0;i<256;i++){j=(j+s[i]+key[i%key.length])&255;[s[i],s[j]]=[s[j],s[i]];}let x=0,y=0;const next=n=>{let r=0;while(n--){x=(x+1)&255;y=(y+s[x])&255;[s[x],s[y]]=[s[y],s[x]];r=r*256+s[(s[x]+s[y])&255];}return r;};next(256);return()=>{let a=next(6),b=281474976710656,c=0;while(a<4503599627370496){a=(a+c)*256;b*=256;c=next(1);}while(a>=9007199254740992){a/=2;b/=2;c>>>=1;}return(a+c)/b;};}
const effectNames={'frenzy':'生产狂热','multiply cookies':'幸运奖励','click frenzy':'点击狂热','cookie storm':'饼干风暴','blab':'无收益闲话','building special':'建筑增益','cookie storm drop':'风暴碎片','free sugar lump':'糖块','clot':'凝块减产','ruin cookies':'损失饼干','cursed finger':'诅咒手指','blood frenzy':'长者狂热'};
function forecast(g,count=6){const m=mini(g,'Wizard tower'),spell=m?.spells?.['hand of fate'];if(!m||!spell||!compatible(g))return[];return Array.from({length:count},(_,i)=>{const random=rng(String(g.seed)+'/'+(m.spellsCastTotal+i)),fail=random()>=1-m.getFailChance(spell);if(['valentines','fools','easter','halloween'].includes(g.season))random();random();random();let choices;if(!fail){choices=['frenzy','multiply cookies'];if(!g.hasBuff?.('Dragonflight'))choices.push('click frenzy');if(random()<.1)choices.push('cookie storm','cookie storm','blab');if(g.BuildingsOwned>=10&&random()<.25)choices.push('building special');if(random()<.15)choices=['cookie storm drop'];if(random()<.0001)choices.push('free sugar lump');}else{choices=['clot','ruin cookies'];if(random()<.1)choices.push('cursed finger','blood frenzy');if(random()<.003)choices.push('free sugar lump');if(random()<.1)choices=['blab'];}const effect=choices[Math.floor(random()*choices.length)];return{index:m.spellsCastTotal+i,fail,effect,label:effectNames[effect],good:['frenzy','click frenzy','building special','blood frenzy','free sugar lump'].includes(effect)};});}
function garden(g){const m=mini(g,'Farm');if(!m)return null;const cells=[];for(let y=0;y<6;y++)for(let x=0;x<6;x++){const unlocked=m.isTileUnlocked(x,y),tile=m.plot[y][x],p=m.plantsById[tile[0]-1];const rate=p?(p.ageTick+p.ageTickR/2)*num(m.plotBoost?.[y]?.[x]?.[0],1)*(1+.05*aura(g,'Supreme Intellect')):0;cells.push({x,y,key:x+','+y,unlocked,p,age:tile[1],mature:p&&tile[1]>=p.mature,eta:p?Math.max(0,p.mature-tile[1])/(rate||1e-300)*m.stepT:Infinity,death:p&&!p.immortal?(100-tile[1])/(rate||1e-300)*m.stepT:Infinity});}return{m,cells,next:Math.max(0,m.nextStep-Date.now())/1000};}
function harvestTargets(g,c,info=garden(g)){
 if(!info||info.m.freeze)return[];
 const multiplier=c.gardenMode==='buff'?cpsBuff(g):1;
 return info.cells.filter(tile=>{
  if(!tile.unlocked||!tile.p||c.protectedTiles.includes(tile.key))return false;
  if(!tile.p.unlocked)return true;
  if(c.gardenMode==='seeds')return false;
  if(c.plant&&c.replantLayout!=='fill'&&[c.seedA,c.seedB].includes(tile.p.key))return false;
  return c.gardenMode!=='buff'||multiplier>=c.harvestBuff;
 }).sort((a,b)=>Number(b.mature)-Number(a.mature)||Number(a.p.unlocked)-Number(b.p.unlocked)||(a.mature?a.death-b.death:a.eta-b.eta));
}
const tileName=tile=>String.fromCharCode(65+tile.y)+(tile.x+1);
function lumpBalance(g){
 return g.canLumps?.()&&Number.isFinite(g.lumps)&&g.lumps>=0?g.lumps:null;
}
function lumpBudget(g,c,object,target){
 const baking=has(g,'Sugar baking');
 const unlock=object?.level===0&&target===1&&LUMP_UNLOCKS.some(item=>item.building===object.name);
 const reserve=c.lumpReserveMode==='custom'?c.lumpReserve:baking&&!unlock?LUMP_BAKING_CAP:0;
 return{reserve,baking,unlock};
}
function lumpOpenings(g,c){
 return LUMP_UNLOCKS.map(({building,feature,rules,reason})=>{
  const object=g.Objects?.[building];
  if(!object||object.level!==0)return null;
  const owned=object.amount>0;
  return{buildingId:object.id,level:1,label:'解锁'+feature,
   reason:owned?reason:'先购买一座'+(object.dname||object.name)+'，再解锁'+feature+'。',
   owned,enabled:rules.some(key=>c[key])};
 }).filter(Boolean).sort((a,b)=>Number(b.owned)-Number(a.owned)||Number(b.enabled)-Number(a.enabled));
}
function lumpMilestones(g){
 const farm=g.Objects?.Farm,cursor=g.Objects?.Cursor,market=mini(g,'Bank');
 const office=market?.offices?.[market.officeLevel];
 const farmStep=farm?.amount>0&&farm.level>=1&&farm.level<FARM_TILES.length?{
  buildingId:farm.id,level:farm.level+1,label:'扩建花园',
  reason:'种植格从 '+FARM_TILES[farm.level-1]+' 增至 '+FARM_TILES[farm.level]+' 格，农场 9 级达到 6×6。'
 }:null;
 const officeStep=office?.cost&&cursor?.amount>=office.cost[0]&&cursor.level<office.cost[1]?{
  buildingId:cursor.id,level:office.cost[1],label:'满足股市办公室的等级要求',
  reason:'光标数量已达标，补足等级后可在股市升级办公室。'
 }:null;
 const clickCap=has(g,'Aura gloves')?(has(g,'Luminous gloves')?20:10):0;
 const clickStep=cursor?.amount>0&&cursor.level<clickCap?{
  buildingId:cursor.id,level:cursor.level+1,label:'提升光标点击加成',
  reason:'每个有效光标等级让手套的点击加成增加 5 个百分点，当前上限 '+clickCap+' 级。'
 }:null;
 return{farmStep,officeStep,clickStep};
}
function lumpAdvice(g,c,openings=lumpOpenings(g,c)){
 if(openings[0]?.owned)return openings[0];
 const {farmStep,officeStep,clickStep}=lumpMilestones(g);
 if((c.harvest||c.plant)&&farmStep)return farmStep;
 if(c.trade&&officeStep)return officeStep;
 if(c.click&&clickStep)return clickStep;
 const milestone=farmStep||officeStep||clickStep||openings[0];
 if(milestone)return milestone;

 let best=null;
 for(const object of g.ObjectsById||[]){
  if(!object||!(object.amount>0)||!Number.isSafeInteger(object.level)||object.level<0)continue;
  const total=num(object.storedTotalCps,num(object.storedCps)*object.amount);
  const level=object.level+1;
  const score=total/(100+object.level)/level;
  if(score>(best?.score??0))best={object,level,score};
 }
 return best?{buildingId:best.object.id,level:best.level,label:'提升'+(best.object.dname||best.object.name)+'产量',
  reason:'按当前各建筑的产量和下一级成本估算，每颗糖块在这里带来的建筑增产较高。'}:null;
}
const managesLumps=(g,c)=>c.lumpManaged&&c.lumpManagedSave===g?.fullDate;
const collectsLumps=(g,c)=>c.lump||managesLumps(g,c);
function lumpRoutePlan(g,c,now=Date.now()){
 if(c.lumpManaged&&c.lumpManagedSave!==g.fullDate){
  return{status:'different-save',reason:'存档已变化，请在当前存档重新开启托管'};
 }
 if(g.ascensionMode===1||['noUpgrade','both'].includes(c.challenge)){
  return{status:'protected',reason:'挑战保护暂停糖块分配，成熟后仍可收取'};
 }
 if(lumpBalance(g)===null)return{status:'locked',reason:'累计烘焙满 10 亿后开始积攒糖块'};
 const openings=lumpOpenings(g,c),{farmStep,officeStep,clickStep}=lumpMilestones(g);
 const choice=openings.find(opening=>opening.owned)||(c.lumpManagedMode==='growth'&&(farmStep||officeStep||clickStep));
 if(!choice)return openings.length?{status:'building',reason:openings[0].reason}:
  {status:'holding',reason:'当前路线已达标，继续收取并积攒糖块'};
 return{...lumpPlan(g,{...c,lump:true},choice,now),choice};
}
function lumpWindow(g,now=Date.now()){
 if(lumpBalance(g)===null||![g.lumpT,g.lumpRipeAge,g.lumpOverripeAge].every(Number.isFinite)||
    g.lumpRipeAge<=0||g.lumpOverripeAge<=g.lumpRipeAge)return null;
 const age=now-g.lumpT;
 const ripeSeconds=g.lumpRipeAge/1000,dropSeconds=g.lumpOverripeAge/1000;
 return{
  remaining:Math.max(0,(g.lumpRipeAge-age)/1000),
  dropRemaining:Math.max(0,(g.lumpOverripeAge-age)/1000),
  overripe:age>=g.lumpOverripeAge,
  ripeSeconds,dropSeconds
 };
}
function lumpGoal(input){
 if(!input||!Number.isSafeInteger(input.buildingId)||input.buildingId<0||
    !Number.isSafeInteger(input.level)||input.level<1)return null;
 const {buildingId,level}=input;
 const saveId=Number.isSafeInteger(input.saveId)&&input.saveId>0?input.saveId:0;
 const fromLevel=Number.isSafeInteger(input.fromLevel)&&input.fromLevel>=0&&input.fromLevel<level?input.fromLevel:0;
 return{buildingId,level,saveId,fromLevel};
}
function lumpPlan(g,c,targetGoal=c.lumpGoal,now=Date.now()){
 if(!targetGoal)return{status:'unplanned',reason:'在规划台选择建筑和目标等级'};
 const goal=lumpGoal(targetGoal);
 const object=goal&&g.ObjectsById?.[goal.buildingId];
 if(!object||!Number.isSafeInteger(object.level)||object.level<0||typeof object.levelUp!=='function'){
  return{status:'invalid',reason:'建筑或目标等级不可用'};
 }
 const current=object.level,target=goal.level,levels=Math.max(0,target-current),nextCost=levels?current+1:0;
 const totalCost=levels%2===0?(levels/2)*(nextCost+target):levels*(current+(levels+1)/2);
 if(!Number.isSafeInteger(totalCost))return{status:'invalid',reason:'目标等级超出可计算的糖块预算'};
 const name=object.dname||object.name,balance=lumpBalance(g),{reserve}=lumpBudget(g,c,object,target);
 const plan={object,name,current,target,nextCost,totalCost,balance,reserve};
 if(goal.saveId&&goal.saveId!==g.fullDate)return{...plan,status:'different-save',reason:'当前存档已变化，请重新确认目标'};
 if(current<goal.fromLevel)return{...plan,status:'different-save',reason:'建筑等级已回退，请重新确认目标'};
 if(!levels)return{...plan,status:'done',reason:'已达到 '+name+' '+target+' 级'};
 if(balance===null)return{...plan,status:'locked',reason:'累计烘焙满 10 亿后解锁糖块'};
 const shortfall=Math.max(0,Math.ceil(totalCost+reserve-balance));
 const nextShortfall=Math.max(0,Math.ceil(nextCost+reserve-balance));
 const window=lumpWindow(g,now);
 const secondsFor=count=>{
  if(!count)return 0;
  if(!window)return Infinity;
  const collect=collectsLumps(g,c);
  const first=collect&&!window.overripe?window.remaining:window.dropRemaining;
  const interval=collect?window.ripeSeconds:window.dropSeconds;
  return first+(count-1)*interval;
 };
 const budget={...plan,shortfall,nextShortfall,seconds:secondsFor(shortfall),nextSeconds:secondsFor(nextShortfall)};
 if(g.ascensionMode===1)return{...budget,status:'protected',reason:'当前挑战轮回暂停糖块升级'};
 if(nextShortfall)return{...budget,status:'waiting',reason:(reserve?'保留 '+fmt(reserve,0)+' 颗后，':'')+'下一级还缺 '+fmt(nextShortfall,0)+' 颗糖块'};
 return{...budget,status:'ready',reason:'可升至 '+(current+1)+' 级 · 消耗 '+fmt(nextCost,0)+' 颗糖块'};
}
function pantheonAdvice(g,c,profile='auto'){
 const m=mini(g,'Temple');
 if(!m?.gods)return null;
 const canClick=!['noClick','both'].includes(c.challenge);
 const clickProfile=canClick&&(profile==='click'||profile==='auto'&&c.click&&c.clickMode==='always');
 const growLumps=profile==='lumps';
 const onMultiple=Number.isFinite(g.BuildingsOwned)&&g.BuildingsOwned%10===0;
 const kittensUseful=num(g.milkProgress)>0&&Object.keys(kittens).some(name=>has(g,name));
 const supporting=[kittensUseful?'mother':'',onMultiple&&!growLumps?'order':''];
 const priorities=growLumps?['order','industry',...supporting]:
  clickProfile?['labor','industry',...supporting]:['industry',...supporting];
 const gods=[-1,-1,-1];
 const picks=priorities.filter(key=>m.gods[key]).slice(0,3).map((key,slot)=>{
  const god=m.gods[key];
  gods[slot]=god.id;
  const nativeSlot=g.hasAura?.('Supreme Intellect')?Math.max(0,slot-1):slot;
  const effect={
   industry:'建筑产量 +'+[10,6,3][nativeSlot]+'%，金饼干与愤怒饼干间隔变长',
   labor:'点击 +'+[15,10,5][nativeSlot]+'%，建筑产量 −'+[3,2,1][nativeSlot]+'%',
   mother:'牛奶效果 +'+[10,5,3][nativeSlot]+'%，金饼干与愤怒饼干间隔变长',
   order:'建筑总数是 10 的倍数时，糖块可提前 '+[60,40,20][nativeSlot]+' 分钟安全收取'
  }[key];
  return{slot,god,key,effect};
 });
 const title=growLumps?'加快糖块成熟':clickProfile?'提高持续连点收益':'提高被动产量';
 const reason=growLumps&&!onMultiple?'当前共有 '+fmt(g.BuildingsOwned,0)+' 座建筑，凑到 10 的倍数时生效。':
  clickProfile?'适合持续连点规则。':'适合靠建筑持续生产的挂机。';
 return picks.length?{title,reason,gods,picks}:null;
}
function pantheonPlan(g,gods,keep,now=Date.now()){
 const m=mini(g,'Temple');
 if(!m)return{status:'locked',reason:'神庙升至 1 级解锁万神殿'};
 const chosen=gods.filter(id=>id>=0);
 if(!chosen.length)return{m,status:'unplanned',reason:'先选一套推荐阵容，或指定要保持的槽位'};
 if(chosen.some(id=>!m.godsById[id])||new Set(chosen).size!==chosen.length){
  return{m,status:'invalid',reason:'请为每个槽位选择不同的有效神灵'};
 }
 const slots=[...m.slot],moves=[];
 for(let slot=0;slot<3;slot++){
  const id=gods[slot];
  if(id<0||slots[slot]===id)continue;
  const previous=slots.indexOf(id);
  if(previous>=0)slots[previous]=slots[slot];
  slots[slot]=id;
  moves.push({slot,god:m.godsById[id]});
 }
 const swaps=Math.max(0,m.swaps-keep),plan={m,moves,swaps};
 if(!moves.length)return{...plan,status:'matched',reason:'当前神灵阵容已就位'};
 if(m.dragging)return{...plan,status:'dragging',reason:'等待手动拖动神灵结束'};
 if(swaps>0)return{...plan,status:'ready',seconds:0,reason:'可执行调换 · 尚需 '+moves.length+' 次'};
 if(keep>=3)return{...plan,status:'protected',reason:'当前保留全部 3 次调换'};
 const recovery=[16,4,1];
 let wait=Number.isFinite(m.swapT)?Math.max(0,(m.swapT-now)/1000+recovery[m.swaps]*3600):Infinity;
 for(let n=m.swaps+1;n<=keep;n++)wait+=recovery[n]*3600;
 return{...plan,status:'waiting',seconds:wait,reason:'等待调换次数，保留 '+keep+' 次'};
}
function castPlan(g,c,lastCast,now=Date.now()){
 const m=mini(g,'Wizard tower');
 if(!m)return{reason:'巫师塔升至 1 级解锁魔法书'};
 const spell=m.spells[c.spell];
 if(!spell)return{reason:'请选择有效法术'};
 if(veil(g,c))return{reason:'面纱保护中'};
 const cost=m.getSpellCost(spell),needed=cost+c.magicReserve;
 if(!Number.isFinite(cost)||needed>m.magicM)return{reason:'魔力上限不足以覆盖施法和保留量'};
 if(m.getFailChance(spell)*100>c.maxFail)return{reason:'反噬概率超过上限'};
 if(c.castCondition==='frenzy'&&cpsBuff(g)<7)return{reason:'等待至少 7 倍生产增益'};
 if(c.castCondition==='click'&&!clickBuff(g))return{reason:'等待点击增益'};
 if(c.prediction&&c.predictOnlyGood&&c.spell==='hand of fate'&&!forecast(g,1)[0]?.good){
  return{reason:'预测不符合策略，等待手动推进法术序列'};
 }
 if(c.spell==='spontaneous edifice'){
  const max=Math.max(0,...g.ObjectsById.map(o=>o.getPrice()));
  if(g.cookies-max/2<reserve(g,c))return{reason:'保留线不足以覆盖建筑法术'};
 }
 const required=c.castCondition==='full'?Math.max(needed,m.magicM-.01):needed;
 const cooldown=Math.max(0,(lastCast+c.castCooldown*1000-now)/1000);
 const mana=m.magic<required?manaSeconds(m,required,g.fps):0;
 const seconds=Math.max(mana,cooldown);
 return{m,spell,cost,seconds,reason:seconds>0?(mana>=cooldown?'等待魔力':'施法冷却中'):''};
}
function mutations(g,x,y){const m=mini(g,'Farm');if(!m)return[];const n={},nm={};for(const k in m.plants){n[k]=0;nm[k]=0;}for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++){if(xx===x&&yy===y)continue;const t=m.getTile(xx,yy),p=m.plantsById[t[0]-1];if(p){n[p.key]++;if(t[1]>=p.mature)nm[p.key]++;}}return m.getMuts(n,nm).map(([k,p])=>({key:k,name:m.plants[k].name,chance:p}));}
function layout(g,c,info=garden(g)){
 if(!info)return[];
 const unlocked=info.cells.filter(tile=>tile.unlocked);
 const minX=Math.min(...unlocked.map(tile=>tile.x)),minY=Math.min(...unlocked.map(tile=>tile.y));
 return unlocked.map(tile=>{
  const x=tile.x-minX,y=tile.y-minY;
  let seed;
  if(c.replantLayout==='fill')seed=c.seedA;
  else if(c.replantLayout==='checker')seed=(x+y)%2?null:(y%2?c.seedB:c.seedA);
  else seed=y%2?null:(x%2?c.seedB:c.seedA);
  return{...tile,seed};
 });
}
function plantingPlan(g,c,info=garden(g)){
 if(!info)return{reason:'农场升至 1 级解锁花园',tiles:[]};
 if(info.m.freeze)return{reason:'花园已冻结',tiles:[]};
 if(c.holdCombo&&clickBuff(g))return{reason:'爆发期间暂缓补种支出',tiles:[]};
 const keep=reserve(g,c),budget=Math.max(0,g.cookies-keep)*c.gardenSpend/100;
 const candidates=layout(g,c,info).flatMap(tile=>{
  if(tile.p||!tile.seed||c.protectedTiles.includes(tile.key))return[];
  const plant=info.m.plants[tile.seed];
  if(!plant?.unlocked||plant.plantable===false)return[];
  const cost=info.m.getCost(plant);
  return Number.isFinite(cost)&&cost>=0?[{...tile,plant,cost}]:[];
 });
 const tiles=candidates.filter(tile=>tile.cost<=budget&&g.cookies-tile.cost>=keep);
 const reason=tiles.length?'':candidates.length?'补种预算不足':'等待空格、已解锁种子或解除保护';
 return{tiles,keep,budget,reason};
}
function market(g,hist={}){const m=mini(g,'Bank');if(!m)return null;const overhead=1+.2*.95**m.brokers,scale=num(g.cookiesPsRawHighest);return{m,overhead,scale,goods:m.goodsById.filter(q=>q.active!==false).map(q=>{const samples=Array.isArray(hist[q.id])?hist[q.id]:[],price=m.getGoodPrice(q);return{q,price,buyCost:price*overhead*scale,capacity:m.getGoodMaxStock(q),samples:samples.length,percentile:samples.length?samples.filter(v=>v<=price).length/samples.length*100:null};})};}
function wrinklerValue(g,w){let v=w.sucked*1.1*(w.type===1?3:1)*(1+.2*aura(g,'Dragon Guts'));if(has(g,'Sacrilegious corruption'))v*=1.05;if(has(g,'Wrinklerspawn'))v*=1.05;v*=({1:1.15,2:1.1,3:1.05}[g.hasGod?.('scorn')]||1);return v;}
function prestige(g){const before=num(g.HowMuchPrestige?.(g.cookiesReset)),after=num(g.HowMuchPrestige?.(num(g.cookiesReset)+num(g.cookiesEarned)));return Math.max(0,Math.floor(after)-Math.floor(before));}
function semver(s){if(!/^\d+\.\d+\.\d+(?:-(?:beta|rc)\.\d+)?$/.test(s))throw Error('无效版本号');return s.split(/[.\-]/).map(x=>/^\d+$/.test(x)?Number(x):x);}
function newer(a,b){const x=semver(a),y=semver(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i];if(x.length===3||y.length===3)return x.length===3&&y.length>3;return (x[3]===y[3]?x[4]>y[4]:x[3]==='rc');}
return{VERSION,SUPPORTED,AUTO,MANAGED_MODES,defaults,config,migrate,num,clamp,has,aura,mini,ready,compatible,gate,veil,clickBuff,cpsBuff,reserve,fmt,time,escape,plain,upgradeClass,estimate,purchases,purchasePlan,manaSeconds,castPlan,rng,forecast,garden,harvestTargets,tileName,LUMP_BAKING_CAP,LUMP_UNLOCKS,FARM_TILES,lumpBalance,lumpBudget,lumpOpenings,lumpAdvice,lumpWindow,lumpPlan,managesLumps,collectsLumps,lumpRoutePlan,pantheonAdvice,pantheonPlan,mutations,layout,plantingPlan,market,wrinklerValue,prestige,semver,newer};
});

;
/* Cookie Pilot · MIT · read-only plans for sustained gameplay. */
(function(root,factory){
 const common=typeof module==='object'&&module.exports;
 const api=factory(common?require('./core.js'):root.CookiePilotCore2);
 if(common)module.exports=api;
 else root.CookiePilotManagement=api;
})(globalThis,function(C){
'use strict';

const ruleOwners={
 click:'events',golden:'events',wrath:'events',deer:'events',fortune:'events',
 purchase:'purchase',harvest:'garden',plant:'garden',cast:'magic',pantheon:'pantheon',
 trade:'market',dragon:'dragon',pet:'dragon',aura:'dragon',season:'season',wrinkler:'wrinklers',research:'research'
};
const moduleForRule=rule=>ruleOwners[rule]||'';
const configured=c=>Object.keys(c.managed.modes).length>0;
const modes=(g,c)=>g?.fullDate===c.managed.saveId?c.managed.modes:{};
const pending=c=>configured(c)||C.AUTO.some(rule=>c[rule]);
function active(g,c){
 const run=execution(g,c);
 const managed=modes(g,c);
 return C.AUTO.some(rule=>run[rule])||!!managed.ascension||!!managed.research;
}
function owner(g,c,rule){
 const id=ruleOwners[rule],active=modes(g,c);
 if(active[id])return id;
 if(active.season&&['deer','golden','wrinkler'].includes(rule)&&seasonActivity(g,rule))return'season';
 return'';
}
function seasonActivity(g,rule){
 if(rule==='deer')return g.season==='christmas'&&missingDrops(g,g.reindeerDrops).length>0;
 if(g.season==='easter')return missingDrops(g,g.easterEggs).length>0;
 return rule==='wrinkler'&&g.season==='halloween'&&missingDrops(g,g.halloweenDrops).length>0;
}
function wrinklerMode(g,c){
 const m=modes(g,c);
 return m.wrinklers||(m.season&&seasonActivity(g,'wrinkler')?'drops':'');
}
function execution(g,c){
 const m=modes(g,c);
 if(!Object.keys(m).length)return c;
 return{...c,
  ...(m.events?{click:true,clickMode:m.events==='burst'?'buff':'always',golden:true,deer:true,fortune:true,wrath:false}:{}),
  ...(m.purchase?{purchase:true,purchaseMode:'efficient',target:'',bridgePurchase:false}:{}),
  ...(m.garden?{harvest:true,plant:true,gardenMode:'seeds'}:{}),
  ...(m.magic?{cast:true}:{}),
  ...(m.pantheon?{pantheon:true,gods:c.managed.gods||[-1,-1,-1]}:{}),
  ...(m.market?{trade:true,marketThresholds:{}}:{}),
  ...(m.dragon?{dragon:true,pet:true,aura:m.dragon==='develop'}:{}),
  ...(m.season?{season:true,deer:seasonActivity(g,'deer')||!!m.events||c.deer,
   golden:seasonActivity(g,'golden')||!!m.events||c.golden}:{}),
  ...(wrinklerMode(g,c)?{wrinkler:true,protectShiny:true}:{})
 };
}

function pantheonLineup(g,c){
 const m=C.mini(g,'Temple'),advice=C.pantheonAdvice(g,c);
 if(!m||!advice)return null;
 const lineup=[...m.slot];
 const candidates=advice.gods.filter(id=>id>=0&&!lineup.includes(id));
 return lineup.map(id=>id>=0?id:candidates.shift()??-1);
}
function purchasePlan(g,c,options={}){
 const managed=modes(g,c);
 if(managed.purchase){
  for(const item of C.LUMP_UNLOCKS){
   const object=g.Objects?.[item.building];
   if(!object||object.amount||object.locked||
      !(C.managesLumps(g,c)||item.rules.some(rule=>managed[moduleForRule(rule)])))continue;
   const id='b:'+object.id;
   if(c.blocked.includes(id))continue;
   const plan=C.purchasePlan(g,{...c,bulk:1,purchaseMode:'target',target:id},
    {bridgedTarget:options.bridgedTarget});
   if(plan.next||Number.isFinite(plan.seconds)&&plan.seconds<=120)return{...plan,unlock:item.feature};
  }
  const plan=C.purchasePlan(g,c,options);
  if(!plan.next&&c.bulk>1&&g.BuildingsOwned<20){
   return C.purchasePlan(g,{...c,bulk:1},{bridgedTarget:options.bridgedTarget});
  }
  return plan;
 }
 return C.purchasePlan(g,c,options);
}

function spellPlan(g,c,lastCast,now=Date.now(),holdSince=now){
 const m=C.mini(g,'Wizard tower');
 if(!m)return{reason:'巫师塔升至 1 级解锁魔法书'};
 if(C.veil(g,c))return{reason:'面纱保护中'};
 const roll=C.rng(String(g.seed)+'/'+m.spellsCastTotal)();
 const known=(key)=>m.spells[key];
 const success=(key)=>known(key)&&roll<1-m.getFailChance(known(key));
 const hand='hand of fate',conjure='conjure baked goods',charm="haggler's charm";
 const burst=C.cpsBuff(g)>=7||C.clickBuff(g);
 const combo=modes(g,c).magic==='combo';
 const forecast=(burst||combo)&&success(hand)?C.forecast(g,1)[0]:null;
 const handAffordable=known(hand)&&m.getSpellCost(known(hand))+c.magicReserve<=m.magicM;
 if(combo&&forecast?.effect==='click frenzy'&&!forecast.fail&&handAffordable){
  if(C.cpsBuff(g)>=7&&!C.clickBuff(g)){
   return{...C.castPlan(g,{...c,spell:hand,castCondition:'frenzy',maxFail:100,prediction:false},lastCast,now),
    key:hand,detail:'生产狂热叠加点击狂热'};
  }
  const seconds=Math.max(0,c.comboWait-(now-holdSince)/1000);
  if(seconds>0)return{seconds,reason:'保留命运之手与魔力，等待生产狂热',holding:true};
 }
 let key,reason;
 if(burst&&forecast?.good&&!forecast.fail&&handAffordable&&!(combo&&forecast.effect==='click frenzy'&&C.clickBuff(g))){
  key=hand;
  reason='叠加当前增益，收取本次召唤的金饼干';
 }else if(success(conjure)&&m.getSpellCost(known(conjure))+c.magicReserve<=m.magicM){
  key=conjure;
  reason='预测成功，召唤饼干收益';
 }else if(known(charm)){
  key=charm;
  reason='推进法术序列'+(success(charm)?'，升级价格降低 2%（1 分钟）':'，升级价格上涨 2%（1 小时）');
 }else return{reason:'等待可用的低风险法术'};
 return{...C.castPlan(g,{...c,spell:key,maxFail:100,castCondition:'mana',prediction:false},lastCast,now),key,detail:reason};
}

const heavenlyRoutes=[
 {name:'首转基础',upgrades:['Legacy','Heavenly cookies','Heralds','How to bake your dragon','Heavenly luck',
  'Permanent upgrade slot I','Tin of british tea biscuits','Box of macarons','Box of brand biscuits','Tin of butter cookies']},
 {name:'解锁季节',upgrades:['Season switcher']},
 {name:'延长黄金饼干与加快研究',upgrades:['Lasting fortune','Persistent memory','Starter kit']},
 {name:'第二永久栏与开局建筑',upgrades:['Permanent upgrade slot II','Starter kitchen','Decisive fate']},
 {name:'生产折扣与协同',upgrades:['Kitten angels','Divine bakeries','Synergies Vol. I']},
 {name:'第三永久栏与高级协同',upgrades:['Permanent upgrade slot III','Synergies Vol. II']},
 {name:'黄金事件与糖块收益',upgrades:['Distilled essence of redoubled luck','Sugar baking']},
 {name:'第四永久栏',upgrades:['Permanent upgrade slot IV']},
 {name:'第五永久栏',upgrades:['Permanent upgrade slot V']},
 {name:'幸运新闻',upgrades:['Fortune cookies']},
 {name:'龙收藏',upgrades:['Pet the dragon']}
];
function heavenlyBudget(g,names){
 const rows=[],priced=new Set(),visiting=new Set();
 let cost=0,error='';
 function add(name){
  if(error||priced.has(name))return;
  const upgrade=g.Upgrades?.[name];
  if(!upgrade||upgrade.pool!=='prestige'||visiting.has(name)){
   error='无法核对天堂升级及其前置：'+name;
   return;
  }
  if(upgrade.bought||C.has(g,name))return;
  visiting.add(name);
  for(const parent of upgrade.parents||[]){
   if(parent===-1)continue;
   if(typeof parent==='string')add(parent);
   else if(parent?.name)add(parent.name);
   else error='无法核对 '+name+' 的前置';
  }
  visiting.delete(name);
  const price=upgrade.getPrice?.()??upgrade.basePrice;
  if(!Number.isSafeInteger(price)||price<0||upgrade.isVaulted?.()||g.vault?.includes(upgrade.id)||upgrade.showIf){
   error='天堂升级价格、保护或出现条件需确认：'+(upgrade.dname||name);
   return;
  }
  priced.add(name);
  rows.push({name,upgrade,price});
  cost+=price;
 }
 for(const name of names)add(name);
 return{rows,cost,error};
}
function ascensionPlan(g,c){
 const gained=C.prestige(g),balance=C.num(g.heavenlyChips),available=balance+gained;
 if(g.ascensionMode||c.challenge!=='none')return{gained,available,reason:'挑战保护：暂停自动转生'};
 const route=heavenlyRoutes.find(step=>step.upgrades.some(name=>!C.has(g,name)&&!g.Upgrades?.[name]?.bought));
 const names=route?.upgrades||[];
 const {rows,cost,error}=heavenlyBudget(g,names);
 const base=Math.floor(C.num(g.HowMuchPrestige?.(g.cookiesReset)));
 const floor=Math.max(1,Math.ceil(C.num(c.ascendTarget)));
 const direct=Math.max(floor,cost-balance,route?0:Math.ceil(base*.25));
 const bridge=!!(route&&!error&&base>=10000&&direct>=base*2&&gained<=direct*.75);
 const target=bridge?Math.max(floor,Math.ceil(base*.5)):direct;
 const cookiesAt=g.HowManyCookiesReset?.(base+target);
 const deficit=Number.isFinite(cookiesAt)?Math.max(0,cookiesAt-C.num(g.cookiesReset)-C.num(g.cookiesEarned)):null;
 const income=Math.max(0,C.num(g.unbuffedCps,g.cookiesPs)*(1-C.num(g.cpsSucked)));
 const seconds=deficit!=null&&income>0?deficit/income:Infinity;
 const name=bridge?'积累声望并保留筹码':route?.name||'继续积累声望';
 const result={name,names:bridge?[]:names,rows:bridge?[]:rows,cost:bridge?0:cost,gained,available,target,seconds,deficit};
 if(error)return{...result,reason:error};
 if(gained<target)return{...result,reason:'等待 '+name+' · 新增声望 '+C.fmt(gained,0)+' / '+C.fmt(target,0)};
 if(C.clickBuff(g))return{...result,reason:'等待本次点击爆发结束'};
 if(c.protectShiny&&g.wrinklers?.some(w=>w.type===1&&w.phase>0))return{...result,reason:'检测到闪光皱纹虫，等待玩家处理'};
 return{...result,ready:true,reason:'已达 '+name+' · 可以备份并自动转生'};
}
function ascensionPrep(g,c){
 const keep=C.reserve(g,c);
 const limit=Math.max(0,g.cookies-keep)*.01;
 const candidates=[];
 for(const object of g.ObjectsById||[]){
  if(object.locked||c.blocked.includes('b:'+object.id))continue;
  const milestones=Object.values(object.tieredAchievs||{})
   .filter(achievement=>!achievement.won)
   .map(achievement=>g.Tiers?.[achievement.tier]?.achievUnlock);
  if(object.name==='Cursor')milestones.push(200);
  const goal=Math.min(...milestones.filter(n=>n>object.amount&&n<=c.maxBuilding));
  const quantity=goal-object.amount;
  if(quantity<=0||quantity>25)continue;
  const cost=object.getSumPrice?.(quantity);
  if(Number.isFinite(cost)&&cost>=0&&cost<=limit)candidates.push({object,quantity,cost,goal});
 }
 return candidates.sort((a,b)=>a.cost-b.cost).slice(0,3);
}
function permanentSlots(g){
 const slots=g.permanentUpgrades||[];
 const eligible=(g.UpgradesById||[]).filter(u=>u?.bought&&u.unlocked&&!u.noPerm&&
  (u.pool===''||u.pool==='cookie')&&u.kitten);
 const owned=eligible.sort((a,b)=>b.basePrice-a.basePrice||b.id-a.id);
 for(const [slot,suffix] of ['I','II','III','IV','V'].entries()){
  if(!C.has(g,'Permanent upgrade slot '+suffix))continue;
  const existing=g.UpgradesById?.[slots[slot]];
  const upgrade=owned.find(u=>!slots.includes(u.id));
  if(upgrade&&(!existing||existing.kitten&&upgrade.basePrice>existing.basePrice))return{slot,upgrade};
 }
 return null;
}

const researchChain=['Bingo center/Research facility','Specialized chocolate chips','Designer cocoa beans',
 'Ritual rolling pins','Underworld ovens','One mind','Exotic nuts','Communal brainsweep','Arcane sugar','Elder Pact'];
function researchPlan(g,c){
 const mode=modes(g,c).research;
 if(!mode)return{reason:'研究托管已关闭'};
 if(g.ascensionMode===1||['noUpgrade','both'].includes(c.challenge))return{reason:'挑战保护：暂停研究采购'};
 if(c.holdCombo&&C.clickBuff(g))return{reason:'点击爆发期间暂缓研究采购'};
 const length=mode==='safe'?5:mode==='one-mind'?6:researchChain.length;
 let name=researchChain.slice(0,length).find(key=>!C.has(g,key));
 if(!name&&mode==='pledge'){
  if(!g.elderWrath||g.pledgeT>0)return{reason:'安抚生效，等待老太婆恢复愤怒'};
  if(g.wrinklers?.some(w=>w.type===1&&w.phase>0))return{reason:'闪光皱纹虫保护：暂缓安抚'};
  const halloweenMissing=missingDrops(g,g.halloweenDrops).length>0;
  const trigger=g.Upgrades?.[g.seasons?.halloween?.trigger];
  const canSwitch=modes(g,c).season&&trigger?.unlocked&&!trigger.isVaulted?.()&&C.num(g.seasonUses)<c.managed.seasonLimit;
  if(halloweenMissing&&(g.season==='halloween'||canSwitch)){
   return{reason:'等待万圣节皱纹虫掉落'};
  }
  name='Elder Pledge';
 }
 if(!name)return{reason:'已完成设定的研究阶段'};
 const upgrade=g.Upgrades?.[name];
 const display=upgrade?.dname||name;
 if(!upgrade?.unlocked||upgrade.bought)return{reason:'等待解锁 '+display,seconds:g.researchT>0?g.researchT/(g.fps||30):undefined};
 if(upgrade.isVaulted?.()||g.vault?.includes(upgrade.id)||c.blocked.includes('u:'+upgrade.id))return{reason:'已保护 '+display};
 const cost=upgrade.getPrice?.(),gap=cost+C.reserve(g,c)-g.cookies;
 if(!Number.isFinite(cost)||cost<0)return{reason:'无法核对 '+display+' 的价格'};
 if(gap>0)return{reason:'等待 '+display+' · 缺 '+C.fmt(gap)+' 饼干'};
 return{upgrade,cost,reason:(name==='Elder Pledge'?'购买安抚：':'采购研究：')+display};
}

const recipesByGarden=new WeakMap();
function gardenRecipes(m){
 const plants=Object.values(m.plants);
 const unlocked=plants.filter(plant=>plant.unlocked&&plant.plantable!==false);
 const signature=plants.map(plant=>plant.unlocked?'1':'0').join('');
 const cached=recipesByGarden.get(m);
 if(cached?.signature===signature)return cached.recipes;
 const recipes=[],counts=Object.fromEntries(plants.map(plant=>[plant.key,0]));
 function collect(parents){
  for(const [key,chance] of m.getMuts(counts,counts)){
   if(!m.plants[key]||m.plants[key].unlocked||chance<=0)continue;
   if(recipes.some(recipe=>recipe.key===key&&recipe.chance>=chance&&
      recipe.parents.every(([plant,n])=>counts[plant.key]>=n)))continue;
   recipes.push({key,chance,parents});
  }
 }
 for(const a of unlocked){
  for(let n=1;n<=8;n++){
   counts[a.key]=n;
   collect([[a,n]]);
  }
  counts[a.key]=0;
 }
 for(const [i,a] of unlocked.entries()){
  for(const b of unlocked.slice(i+1)){
   for(let n=1;n<8;n++){
    counts[a.key]=n;
    for(let j=1;j+n<=8;j++){
     counts[b.key]=j;
     collect([[a,n],[b,j]]);
    }
   }
   counts[a.key]=counts[b.key]=0;
  }
 }
 recipesByGarden.set(m,{signature,recipes});
 return recipes;
}

function breedLayout(info,protectedTiles){
 const {m,cells}=info;
 const open=cells.filter(tile=>tile.unlocked);
 const empty=open.filter(tile=>!tile.p&&!protectedTiles.includes(tile.key));
 const step=Math.max(1,m.stepT);
 const recipes=empty.length?gardenRecipes(m):[];
 let best=null;
 for(const center of empty){
  const neighbors=open.filter(tile=>tile!==center&&Math.abs(tile.x-center.x)<=1&&Math.abs(tile.y-center.y)<=1);
  const vacant=empty.filter(tile=>neighbors.includes(tile));
  for(const recipe of recipes){
   const parents=[];
   let available=true;
   let vacancies=0;
   for(const [plant,count] of recipe.parents){
    const planted=neighbors.filter(tile=>tile.p===plant).sort((a,b)=>a.eta-b.eta||b.death-a.death).slice(0,count);
    parents.push(...planted);
    for(let i=planted.length;i<count;i++){
     const tile=vacant[vacancies++];
     if(!tile){available=false;break;}
     const factor=C.num(m.plotBoost?.[tile.y]?.[tile.x]?.[0],1);
     const rate=(plant.ageTick+plant.ageTickR/2)*factor;
     parents.push({...tile,p:plant,eta:plant.mature/Math.max(rate,.001)*step,death:Infinity,plant});
    }
    if(!available)break;
   }
   if(!available)continue;
   const eta=Math.max(...parents.map(tile=>tile.eta));
   if(parents.some(tile=>tile.death<=eta))continue;
   const counts=Object.fromEntries(Object.keys(m.plants).map(key=>[key,0]));
   for(const tile of neighbors)if(tile.p&&tile.death>eta)counts[tile.p.key]++;
   for(const tile of parents)if(tile.plant)counts[tile.plant.key]++;
   const mature={...counts};
   for(const tile of neighbors)if(tile.p&&tile.death>eta&&tile.eta>eta)mature[tile.p.key]--;
   const chance=m.getMuts(counts,mature).find(([key])=>key===recipe.key)?.[1];
   if(!chance)continue;
   const missing=parents.filter(tile=>tile.plant).map(tile=>({...tile,delay:Math.max(0,eta-tile.eta),cost:m.getCost(tile.plant)}));
   const cost=missing.reduce((sum,tile)=>sum+tile.cost,0);
   if(!Number.isFinite(cost)||cost<0)continue;
   const score=eta/step+1/chance+missing.length;
   if(!best||score<best.score||score===best.score&&cost<best.cost)best={...recipe,center,eta,missing,cost,score};
  }
 }
 return{empty,best};
}

function gardenPlan(g,c,info=C.garden(g)){
 if(!info)return{reason:'农场升至 1 级解锁花园'};
 const {m,cells}=info;
 if(m.freeze)return{reason:'花园已冻结'};
 if(Object.values(m.plants).every(plant=>plant.unlocked))return{reason:'种子已收齐'};
 const visible=cells.filter(tile=>tile.unlocked&&tile.p&&!c.protectedTiles.includes(tile.key));
 const spores=['brownMold','crumbspore'].filter(key=>m.plants[key]&&!m.plants[key].unlocked);
 const crop=visible.filter(tile=>!tile.p.unlocked||spores.length&&tile.p.key==='meddleweed')
  .sort((a,b)=>Number(b.mature)-Number(a.mature)||(a.mature?a.death-b.death:a.eta-b.eta))[0];
 if(crop)return crop.mature?{kind:'harvest',tile:crop,seconds:0,reason:'收获 '+C.tileName(crop)+' '+crop.p.name}:
  {kind:'wait',seconds:Math.max(info.next,crop.eta),reason:'等待 '+C.tileName(crop)+' '+crop.p.name+' 成熟'};
 const {empty,best}=breedLayout(info,c.protectedTiles);
 const weed=m.plants.meddleweed;
 const wild=weed&&!weed.unlocked&&empty.some(tile=>!cells.some(neighbor=>neighbor.p&&neighbor.unlocked&&
  Math.abs(neighbor.x-tile.x)<=1&&Math.abs(neighbor.y-tile.y)<=1));
 const keep=C.reserve(g,c),budget=Math.max(0,g.cookies-keep)*c.gardenSpend/100;
 if(!best){
  if(wild)return{reason:'留空等待自然长出的杂草'};
  if(weed?.unlocked&&spores.length&&empty.length){
   const cost=m.getCost(weed);
   if(c.holdCombo&&C.clickBuff(g))return{reason:'点击爆发期间暂缓种植'};
   if(cost<=budget)return{kind:'plant',tile:{...empty[0],plant:weed,cost},keep,seconds:0,reason:'种一株杂草以培育孢子'};
   return{reason:'等待杂草种植预算'};
  }
  return{reason:m.plantsUnlockedN>=m.plantsN?'种子已收齐':'等待可培育的种子、空格或解除保护'};
 }
 const name=m.plants[best.key].name;
 const tile=best.missing.find(parent=>parent.delay<=m.stepT);
 const target='培育 '+name+' · 留空 '+C.tileName(best.center);
 if(!tile){
  const delay=best.missing.length?Math.min(...best.missing.map(parent=>parent.delay)):0;
  return{kind:'wait',reason:target+(delay?' · 等待亲本播种时机':' · 等待亲本生长和突变'),seconds:delay||Math.max(info.next,best.eta)};
 }
 if(c.holdCombo&&C.clickBuff(g))return{reason:'点击爆发期间暂缓种植'};
 if(best.cost>budget)return{reason:target+' · 等待 '+C.fmt(best.cost)+' 饼干种植预算'};
 return{kind:'plant',tile,keep,seconds:0,reason:target,cost:best.cost};
}

function marketOrder(g,c,hist,ledger){
 const data=C.market(g,hist);
 if(!data)return{reason:'银行升至 1 级解锁股市'};
 if(c.holdCombo&&C.clickBuff(g))return{reason:'爆发期间暂停交易'};
 const managed=!!modes(g,c).market;
 const liquid=Math.max(0,g.cookies-C.reserve(g,c));
 const basisFor=row=>ledger[row.q.id]?.stock===row.q.stock?ledger[row.q.id]:null;
 const invested=managed?data.goods.reduce((total,row)=>{
  const lot=basisFor(row);
  const cost=lot?C.num(lot.cookies,lot.cost*lot.stock*data.scale):0;
  return total+C.num(cost);
 },0):0;
 const budget=Math.max(0,Math.min(liquid,(liquid+invested)*c.marketBudget/100-invested));
 const orders=[];
 let samples=0;
 for(const row of data.goods){
  const q=row.q,t=c.marketThresholds[q.id],custom=t&&t.buy<t.sell;
  const sampled=row.samples>=c.marketMinSamples;
  if(sampled||custom)samples++;
  const low=custom?row.price<=t.buy:sampled&&row.percentile<=c.marketBuy;
  const high=custom?row.price>=t.sell:sampled&&row.percentile>=c.marketSell;
  const basis=basisFor(row)?.cost,units=q.stock;
  if(high&&units>0&&Number.isFinite(basis)&&row.price>=basis*(1+c.marketProfit/100)&&q.last!==1){
   orders.push({side:'sell',row,units,basis});
  }
  const quantity=Math.min(c.marketCap,row.capacity,Math.floor(budget/(row.buyCost||Infinity)));
  if(low&&units===0&&q.last!==2&&quantity>0)orders.push({side:'buy',row,units:quantity});
 }
 if(managed)orders.sort((a,b)=>Number(b.side==='sell')-Number(a.side==='sell')||
  (a.side===b.side&&a.side==='buy'?a.row.percentile-b.row.percentile:0));
 return{data,orders,budget,reason:orders.length?'':!samples?
  '等待每种商品积累 '+c.marketMinSamples+' 个报价样本':'等待报价、仓位和预算同时满足'};
}

function wrinklerPlan(g,c,managed=''){
 const live=(g.wrinklers||[]).filter(w=>w.phase===2&&w.hp>0);
 const limit=g.getWrinklersMax?.()??10;
 const keep=managed==='drops'?0:managed==='yield'?Math.max(0,limit-1):c.wrinklerKeep;
 if(live.length<=keep)return{reason:'保留 '+keep+' 只，目前 '+live.length+' 只'};
 const target=live.filter(w=>!(managed||c.protectShiny)||w.type!==1).sort((a,b)=>b.sucked-a.sucked)[0];
 if(!target)return{reason:'闪光皱纹虫受保护'};
 const value=C.wrinklerValue(g,target);
 if(managed==='yield'&&value<Math.max(1,C.num(g.unbuffedCps,g.cookiesPs))*1800){
  return{reason:'等待单只储量达到 30 分钟基础产量'};
 }
 if(managed==='drops'&&target.sucked<=0)return{reason:'等待普通皱纹虫开始储存饼干'};
 return{target,value};
}
function dragonPlan(g,c,mode){
 if(!C.has(g,'A crumbly egg')){
  return mode?collectUpgrade(g,c,'A crumbly egg','购买龙蛋','等待龙蛋解锁'):{reason:'等待获得龙蛋'};
 }
 const current=g.dragonLevel,cap=Math.min(c.dragonMax,g.dragonLevels.length-1,mode==='hatch'?5:Infinity);
 if(current>=cap)return{reason:'已达到训练目标 '+cap+' 级'};
 const step=g.dragonLevels[current],cost=current<5?1000000*2**current:0;
 if(cost&&g.cookies-cost<C.reserve(g,c))return{reason:'训练受到饼干保留线限制'};
 if(!step?.cost?.())return{reason:'等待材料 · '+C.plain(step?.costStr?.())};
 return{kind:'train',current,cap,step,reason:'训练至 '+(current+1)+' 级 · '+C.plain(step.costStr?.())};
}
function dragonDrops(g){
 return missingDrops(g,['Dragon scale','Dragon claw','Dragon fang','Dragon teddy bear']);
}
function growthAura(g,c){
 if(g.dragonAura||g.dragonLevel<Math.min(c.dragonMax,g.dragonLevels.length-1))return null;
 const name=g.dragonLevel>=19?'Radiant Appetite':c.click?'Dragon Cursor':'Breath of Milk';
 const aura=Object.values(g.dragonAuras||{}).find(item=>item.name===name);
 const id=aura?.id??Number(Object.keys(g.dragonAuras||{}).find(key=>g.dragonAuras[key]===aura));
 const highest=[...(g.ObjectsById||[])].reverse().find(object=>object.amount>0);
 return Number.isInteger(id)&&id>0&&g.dragonLevel>=id+4&&g.dragonAura2!==id&&highest?.amount>1?{id,aura,highest}:null;
}

function missingDrops(g,drops){
 return (drops||[]).filter(name=>!C.has(g,name)&&!g.HasUnlocked?.(name));
}
function collectUpgrade(g,c,name,action,waiting){
 const upgrade=g.Upgrades?.[name];
 if(!upgrade?.unlocked)return{reason:waiting};
 if(upgrade.isVaulted?.())return{reason:'保险库保护 · '+(upgrade.dname||name)};
 const cost=upgrade.getPrice();
 if(!Number.isFinite(cost)||cost<0||g.cookies-cost<C.reserve(g,c)){
  return{reason:'等待购买预算 · '+(upgrade.dname||name)};
 }
 return{kind:'buy',upgrade,cost,reason:action+' · '+(upgrade.dname||name)};
}
function seasonPlan(g,c){
 const groups=[
  {key:'christmas',missing:missingDrops(g,[...(g.santaDrops||[]),...(g.reindeerDrops||[])])},
  {key:'easter',missing:missingDrops(g,g.easterEggs)},
  {key:'halloween',missing:missingDrops(g,g.halloweenDrops)},
  {key:'valentines',missing:(g.heartDrops||[]).filter(name=>!C.has(g,name))}
 ];
 const canWrinkle=!!g.elderWrath||g.wrinklers?.some(w=>w.phase>0);
 const current=groups.find(group=>group.key===g.season&&group.missing.length);
 if(current&&(current.key!=='halloween'||canWrinkle)){
  if(current.key==='valentines'){
   const name=current.missing[0];
   return collectUpgrade(g,c,name,'购买情人节饼干','等待达到情人节饼干解锁条件 · '+(g.Upgrades?.[name]?.dname||name));
  }
  if(g.season==='christmas'&&current.missing.some(name=>g.santaDrops?.includes(name))){
   const next=C.num(g.santaLevel)+1;
   if(!C.has(g,'A festive hat'))return collectUpgrade(g,c,'A festive hat','购买节日帽以培养圣诞老人','等待圣诞节解锁节日帽');
   if(next<=14){
    const cost=next**next;
    return g.cookies>cost&&g.cookies-cost>=C.reserve(g,c)?{kind:'santa',next,cost,reason:'培养圣诞老人以解锁节日礼物'}:
     {reason:'等待圣诞老人培养预算'};
   }
  }
  return{reason:'继续收集 '+(g.seasons?.[current.key]?.name||current.key)+' · 缺 '+current.missing.length+' 件掉落'};
 }
 const available=groups.filter(group=>group.missing.length&&g.seasons?.[group.key]);
 if(!available.length)return{reason:'已收集支持的季节掉落'};
 const candidates=available.filter(group=>group.key!=='halloween'||canWrinkle);
 if(!candidates.length)return{reason:'等待老奶奶末日开启，万圣节掉落需要皱纹虫'};
 if(C.num(g.seasonUses)>=c.managed.seasonLimit)return{reason:'本轮季节切换已达 '+c.managed.seasonLimit+' 次上限'};
 for(const group of candidates){
  const season=g.seasons[group.key],upgrade=g.Upgrades?.[season.trigger];
  if(!upgrade?.unlocked||upgrade.isVaulted?.())continue;
  const cost=upgrade.getPrice();
  if(!Number.isFinite(cost)||cost<0||g.cookies-cost<C.reserve(g,c))return{reason:'等待 '+season.name+' 切换预算'};
  return{kind:'switch',key:group.key,upgrade,cost,reason:'切换至 '+season.name+' · 缺 '+group.missing.length+' 件掉落'};
 }
 return{reason:'等待季节切换器解锁'};
}

return{configured,modes,pending,active,owner,moduleForRule,execution,pantheonLineup,purchasePlan,spellPlan,gardenPlan,
 marketOrder,wrinklerMode,wrinklerPlan,dragonPlan,dragonDrops,growthAura,seasonPlan,
 heavenlyBudget,ascensionPlan,ascensionPrep,permanentSlots,researchPlan};
});

;
(function(root,factory){
 const common=typeof module==='object'&&module.exports;
 const api=factory(common?require('./core.js'):root.CookiePilotCore2,common?require('./management.js'):root.CookiePilotManagement);
 if(common)module.exports=api;
 else root.CookiePilotEngine2=api;
})(globalThis,function(C,M){
'use strict';
const SETTINGS='cookie-pilot:settings:v2',BACKUPS='cookie-pilot:backups:v2',HISTORY='cookie-pilot:market:v2',PAUSE='cookie-pilot:paused';
const ASCENT='cookie-pilot:ascent:v3',REBUY='cookie-pilot:rebuy:v3',DIAGNOSTICS='cookie-pilot:activity:v3';
const sharedKeys=['lump','lumpGoal','lumpReserveMode','lumpReserve','lumpLevel','lumpManaged','lumpManagedSave','lumpManagedMode',
 'managed','ascendTarget','comboWait','challenge','protectShiny','background','remember'];
const roundKey=g=>g?.fullDate&&g?.startDate?[g.fullDate,g.startDate,g.seed].join(':'):'';
function withSpecialMenu(g,tab,fn){
 if(g.specialTab||!g.ToggleSpecialMenu)return fn();
 g.specialTab=tab;
 try{return fn();}
 finally{
  g.ToggleSpecialMenu(0);
  g.specialTab='';
 }
}
class Engine{
 constructor(getGame,storage,hooks={}){this.getGame=getGame;this.storage=storage;this.hooks=hooks;this.paused=false;this.locked=false;this.states={};this.logs=[];this.next={};this.clicks=0;this.picked=0;this.disposed=false;this.hist={};this.ledger={};this.marketTick=null;this.lastBackup=Date.now();this.lastCast=0;this.godzamokBuff=null;this.rebuy=[];this.protectedSnapshot=null;
  this.actions=0;
  this.runningMs=0;
  this.lastPulse=0;
  this.throttled=false;
  this.clickSample={at:Date.now(),total:0,rate:0};
  this.bridgedTarget='';
  this.startupHold=false;
  this.magicHold=null;
  this.rebuyRound='';
  this.rebuyMarker='';
  this.rebuyTargets=[];
  this.lastActivity=null;
  this.lastFailure=null;
  this.lastDiagnosticWrite=0;
  let saved;try{saved=JSON.parse(storage.getItem(SETTINGS)||'null');if(saved?.schema>2)throw Error('设置来自更新版本');this.c=saved?C.config(saved):C.migrate(JSON.parse(storage.getItem('cookie-pilot:settings:v1')||'{}'));const h=JSON.parse(storage.getItem(HISTORY)||'{}');if(h&&typeof h==='object'){this.hist=h.hist||{};this.ledger=h.ledger||{};this.historyContext=h.context;}
   this.paused=storage.getItem(PAUSE)==='true';
   this.startupHold=!this.paused&&!this.c.remember&&M.pending(this.c);
   if(this.startupHold)this.paused=true;
  }
  catch(e){this.c=C.config();this.paused=true;this.log('设置恢复失败：'+e.message);}
  this.savedVersion=saved?.version||'1';
 }
 get g(){return this.getGame();}
 env(){return{paused:this.paused,hidden:this.hooks.hidden?.()||false,follower:!this.locked&&this.hasWork()};}
 hasWork(g=this.g){return M.active(g,this.c)||this.rebuyTargets.length>0;}
 leaseGate(){
  const g=this.g;
  const throughAscension=M.modes(g,this.c).ascension==='cycle'&&!!this.ascentJob(g);
  return C.gate(g,this.c,{paused:this.paused,hidden:this.hooks.hidden?.(),throughAscension});
 }
 set(update){this.c=C.config({...this.c,...update});this.persist(update);this.hooks.change?.();}
 setPaused(value){
  this.paused=value;
  this.startupHold=false;
  this.lastPulse=0;
  try{this.storage.setItem(PAUSE,String(value));}
  catch(e){this.paused=true;this.log('暂停设置保存失败：'+e.message);return false;}
  this.log(value?'手动暂停自动化':'继续自动化，按当前游戏状态重新检查');
  return true;
 }
 savedSharedSettings(){
  try{
   const saved=JSON.parse(this.storage.getItem(SETTINGS));
   if(saved?.schema!==2)return null;
   const settings=C.config(saved);
   return Object.fromEntries(sharedKeys.map(key=>[key,settings[key]]));
  }catch{return null;}
 }
 syncSharedSettings(){
  const saved=this.savedSharedSettings();
  if(!saved)return false;
  Object.assign(this.c,saved);
  return true;
 }
 persist(update={}){
  try{
   const saved=this.savedSharedSettings();
   if(saved)for(const key of sharedKeys)if(!Object.hasOwn(update,key))this.c[key]=saved[key];
   if(this.c.lumpManaged||!this.c.lumpGoal)this.c.lumpLevel=false;
   this.storage.setItem(SETTINGS,JSON.stringify({...this.c,version:C.VERSION}));
  }catch(e){this.paused=true;this.log('设置保存失败，自动化已暂停：'+e.message);}
 }
 log(text,actions=0){
  const at=Date.now();
  this.actions+=actions;
  this.logs.unshift({at,text});
  this.logs.length=Math.min(this.logs.length,120);
  if(actions>0&&this.g?.fullDate)this.lastActivity={at,text,saveId:this.g.fullDate};
  this.hooks.log?.(text);
 }
 diagnostics(){
  const saveId=this.g?.fullDate;
  const current=item=>item&&item.saveId===saveId?item:null;
  const persisted=this.readRecord(DIAGNOSTICS)||{};
  return{activity:current(this.lastActivity)||current(persisted.activity),failure:current(this.lastFailure)||current(persisted.failure)};
 }
 checkpointDiagnostics(now=Date.now(),force=false){
  if(!force&&(!this.locked||now-this.lastDiagnosticWrite<15000))return;
  const {activity,failure}=this.diagnostics();
  if(!activity&&!failure)return;
  try{
   this.storage.setItem(DIAGNOSTICS,JSON.stringify({activity,failure}));
   this.lastDiagnosticWrite=now;
  }catch{}
 }
 writeFailure(text){
  this.lastFailure={at:Date.now(),text,saveId:this.g?.fullDate};
  this.log(text);
  this.checkpointDiagnostics(Date.now(),true);
 }
 readRecord(key){
  try{return JSON.parse(this.storage.getItem(key)||'null');}
  catch{return null;}
 }
 state(k,text){this.states[k]=text;return false;}
 backups(){try{const rows=JSON.parse(this.storage.getItem(BACKUPS)||'[]');return Array.isArray(rows)?rows.filter(x=>x&&typeof x.save==='string'&&Number.isFinite(x.at)).slice(0,15):[];}catch{return[];}}
 backup(label='手动备份',pin=false){const g=this.g;if(!C.ready(g)||g.OnAscend||g.AscendTimer>0)throw Error('游戏未就绪或正在转生');const save=g.WriteSave(1);if(typeof save!=='string'||!save.length||save.length>2000000)throw Error('未取得有效存档');this.backupSerial=(this.backupSerial||0)+1;const entry={id:Date.now()+'-'+this.backupSerial,at:Date.now(),label,save,settings:structuredClone(this.c),pin,version:String(g.version)};const old=this.backups();const pinned=old.filter(x=>x.pin).slice(0,pin?4:5),normal=old.filter(x=>!x.pin).slice(0,9);this.storage.setItem(BACKUPS,JSON.stringify([entry,...pinned,...normal]));this.lastBackup=Date.now();return entry;}
 manualGate(){const reason=C.gate(this.g,this.c);if(reason)throw Error(reason);}
 attempt(k,fn,config=this.c){
  if(!config[k])return this.state(k,'已关闭');
  const reason=C.gate(this.g,config,this.env());
  if(reason)return this.state(k,reason);
  if(['noClick','both'].includes(this.c.challenge)&&k==='click')return this.state(k,'无点击挑战保护');
  if(['noUpgrade','both'].includes(this.c.challenge)&&['season','dragon','lumpLevel'].includes(k))return this.state(k,'无升级挑战保护');
  try{return fn.call(this);}
  catch(error){
   const managed=M.owner(this.g,this.c,k);
   if(managed){
    this.syncSharedSettings();
    const {modes,...settings}=this.c.managed;
    const remaining={...modes};
    delete remaining[managed];
    this.set({managed:{...settings,modes:remaining},[k]:false});
   }else{
    this.c[k]=false;
    this.persist({[k]:false});
   }
   this.state(k,'发生错误，已关闭');
   const name=({lumpLevel:'糖块升级',lumpManaged:'糖块托管',lump:'糖块收取',pantheon:'神灵调换'})[k]||k;
    this.writeFailure(name+' 已停止：'+error.message);
   return false;
  }
 }
 click(now=performance.now()){
  const g=this.g,c=M.execution(g,this.c);
  this.attempt('click',()=>{
   if(C.veil(g,c))return this.state('click','面纱保护中');
   if(c.clickMode==='buff'&&!C.clickBuff(g))return this.state('click','等待点击增益');
   if(now<(this.next.click||0))return;
   this.next.click=now+1000/c.rate;
   const before=g.cookieClicks;
   g.ClickCookie();
   this.clicks+=Math.max(0,g.cookieClicks-before);
   this.state('click','运行中 · '+c.rate+' 次/秒目标');
  },c);
 }
 persistMarket(){try{this.storage.setItem(HISTORY,JSON.stringify({hist:this.hist,ledger:this.ledger,context:this.historyContext}));}catch{}}
 sampleMarket(){const g=this.g,m=C.mini(g,'Bank');if(!m)return;const context=[g.startDate,g.Objects.Bank.level,g.dragonAura,g.dragonAura2].join(':');if(context!==this.historyContext){
  if(String(this.historyContext).split(':')[0]!==String(g.startDate))this.ledger={};
  this.hist={};this.marketTick=null;this.historyContext=context;
 }
  const marker=m.tickT!==undefined?String(m.tickT):Math.floor(Date.now()/60000);if(this.marketTick!==null&&num(m.tickT)<num(this.marketTick)||this.marketTick===null||m.tickT===undefined&&marker!==this.marketTick){for(const q of m.goodsById){const rows=Array.isArray(this.hist[q.id])?this.hist[q.id]:[];rows.push(m.getGoodPrice(q));this.hist[q.id]=rows.filter(Number.isFinite).slice(-2000);}if(this.locked||!M.active(g,this.c))this.persistMarket();}this.marketTick=marker;
 }
 pulse(now=Date.now()){
  if(this.disposed)return;
  if(C.ready(this.g)&&this.savedVersion!==C.VERSION&&!this.g.OnAscend&&!this.g.AscendTimer){try{this.backup('升级前设置与存档',true);this.savedVersion=C.VERSION;this.persist();this.log('已迁移至 '+C.VERSION);}catch(e){this.paused=true;this.state('system','迁移备份失败');}}
   if(now>=(this.next.recovery||0)){
    this.next.recovery=now+1000;
    this.loadRebuy();
    if(this.advancePending(now))return;
   }
   if(this.rebuyTargets.length||this.g?.OnAscend&&this.ascentJob(this.g))return;
   this.sampleMarket();
   const active=this.hasWork()&&!C.gate(this.g,this.c,this.env());
  const elapsed=now-this.lastPulse;
  if(active&&this.lastPulse&&elapsed>0){
   if(elapsed>1500){
    if(!this.throttled)this.log('浏览器调度出现长间隔 · 按当前存档重新检查');
    this.throttled=true;
   }else{
    if(this.throttled)this.log('浏览器调度恢复');
    this.throttled=false;
    this.runningMs+=elapsed;
   }
  }
  this.lastPulse=active?now:0;
  if(now-this.clickSample.at>=1000){
   this.clickSample={at:now,total:this.clicks,rate:(this.clicks-this.clickSample.total)*1000/(now-this.clickSample.at)};
  }
  const c=M.execution(this.g,this.c);
  for(const [key,name] of [['golden','金饼干'],['wrath','愤怒饼干'],['deer','驯鹿']]){
   this.attempt(key,()=>{
    const g=this.g;
    if(C.veil(g,this.c))return this.state(key,'面纱保护中');
    const events=[...(g.shimmers||[])].filter(s=>!s.popped&&!s.dead&&(key==='deer'?s.type==='reindeer':s.type==='golden'&&!!s.wrath===(key==='wrath')));
    let picked=0;
    for(const event of events){
     event.pop();
    if(event.popped||event.dead||!g.shimmers?.includes(event))picked++;
    }
    if(picked){
     this.picked+=picked;
     this.log('拾取 '+name+' ×'+picked,picked);
    }
    return this.state(key,'等待自然事件');
   },c);
  }
  this.attempt('fortune',()=>{
   const g=this.g,effect=g.TickerEffect;
   if(effect?.type==='fortune'&&g.tickerL?.click){
    g.tickerL.click();
    if(g.TickerEffect!==effect){this.picked++;this.log('收取幸运新闻',1);}
   }
   return this.state('fortune','等待幸运新闻');
  },c);
  if(now>=(this.next.slow||0)){
   this.next.slow=now+1000;
   if(M.configured(this.c))this.syncSharedSettings();
   const g=this.g;
   this.checkMilestones(g);
    if(this.considerAscension(g))return;
    for(const[k,fn]of [['godzamok',this.godzamok],['cast',this.cast],['research',this.research],['purchase',this.purchase],['harvest',this.harvest],['plant',this.plant],['trade',this.trade],['lump',this.lump],['lumpManaged',this.lumpManaged],['lumpLevel',this.lumpLevel],['wrinkler',this.wrinkler],['pet',this.pet],['dragon',this.dragon],['pantheon',this.pantheon],['aura',this.aura],['season',this.season]]){
    if(k==='lump'&&C.managesLumps(g,this.c))continue;
    if(k==='harvest'&&M.modes(g,this.c).garden)continue;
    const run=M.execution(g,this.c);
     const config=k==='research'?{...run,research:!!M.modes(g,this.c).research}:run;
     this.attempt(k,()=>fn.call(this,run),config);
     if(this.rebuyTargets.length)break;
   }
    this.checkpointDiagnostics(now);
  }
  if(C.ready(this.g)&&!this.g.OnAscend&&!this.g.AscendTimer&&!this.g.promptOn&&now-this.lastBackup>=this.c.backupMinutes*60000){try{this.backup('自动快照');}catch(e){this.lastBackup=now;this.log('自动备份失败：'+e.message);}}
 }
 checkMilestones(g){
  const modes=M.modes(g,this.c);
  if(!Object.keys(modes).length||C.gate(g,this.c,this.env()))return;
  if(modes.pantheon&&!this.c.managed.gods){
   const gods=M.pantheonLineup(g,M.execution(g,this.c));
   if(gods)this.set({managed:{...this.c.managed,gods}});
  }
  const reached=modes.ascension==='notice'&&this.c.ascendTarget>0&&C.prestige(g)>=this.c.ascendTarget;
  const milestone=[g.startDate,this.c.ascendTarget].join(':');
  if(reached&&milestone!==this.ascendNotice){
   this.ascendNotice=milestone;
   const message='转生目标已达到 · 新增声望 '+C.fmt(C.prestige(g),0);
   this.log(message);
   this.hooks.notice?.(message);
  }
 }
 ascentJob(g=this.g){
  if(!g?.fullDate)return null;
  const job=this.readRecord(ASCENT+':'+g.fullDate);
  return job?.saveId===g.fullDate&&typeof job.round==='string'&&Array.isArray(job.names)&&
   Array.isArray(job.prep)&&['prepare','ascending','buying','restarting'].includes(job.phase)?job:null;
 }
 saveAscent(g,job){
  const key=ASCENT+':'+g.fullDate;
  if(job)this.storage.setItem(key,JSON.stringify(job));
  else this.storage.removeItem(key);
 }
 clearPending(g=this.g){
  if(g?.fullDate)this.saveAscent(g,null);
  if(roundKey(g))this.saveRebuy(g,[],'');
  this.rebuy=[];
  this.rebuyTargets=[];
  this.rebuyRound='';
 }
 considerAscension(g){
  if(M.modes(g,this.c).ascension!=='cycle'||this.ascentJob(g)||C.gate(g,this.c,this.env())||this.readRecord(PAUSE)===true)return false;
  if(this.c.challenge!=='none')return this.state('ascension','挑战保护：暂停自动转生');
  if(this.hooks.exclusive?.()===false)return this.state('ascension','自动转生需要浏览器独占锁');
  const plan=M.ascensionPlan(g,this.c);
  if(!plan.ready)return this.state('ascension',plan.reason);
  try{
   const run=M.execution(g,this.c);
   const prep=g.buyMode===-1?[]:M.ascensionPrep(g,run).map(row=>({id:row.object.id,goal:row.goal}));
   this.backup('自动转生前 · '+plan.name,true);
   const job={saveId:g.fullDate,round:roundKey(g),resets:C.num(g.resets),names:plan.names,
    name:plan.name,target:plan.target,prep,phase:'prepare'};
   this.saveAscent(g,job);
   return this.advanceAscent(g,job);
  }catch(error){return this.stopForRecovery('自动转生未继续：'+error.message);}
 }
 advancePending(){
  const g=this.g;
  if(this.readRecord(PAUSE)===true)return this.rebuyTargets.length>0||!!g?.OnAscend;
  if(this.rebuyTargets.length){
   if(!C.gate(g,this.c,this.env())){
    try{this.restoreBuildings();}
    catch(error){return this.stopForRecovery('建筑回购未继续：'+error.message);}
   }
   return true;
  }
  const job=this.ascentJob(g);
  if(!job||!this.syncSharedSettings()||M.modes(g,this.c).ascension!=='cycle')return false;
  if(C.gate(g,this.c,{...this.env(),throughAscension:true}))return !!(g.OnAscend||g.AscendTimer||g.ReincarnateTimer);
  if(this.hooks.exclusive?.()===false)return this.state('ascension','自动转生需要浏览器独占锁');
  try{return this.advanceAscent(g,job);}
  catch(error){return this.stopForRecovery('自动转生未继续：'+error.message);}
 }
 stopForRecovery(message){
  this.setPaused(true);
  this.state('system',message);
  this.writeFailure(message);
  return true;
 }
 advanceAscent(g,job){
  if(g.AscendTimer>0||g.ReincarnateTimer>0)return true;
  if(job.round!==roundKey(g)){
   if(job.phase==='restarting'&&C.num(g.resets)>job.resets){
    g.WriteSave();
    this.log('自动转生完成 · '+job.name+' · 已开始下一轮',1);
    this.state('ascension','已开始下一轮');
    if(this.states.system?.startsWith('自动转生未继续'))delete this.states.system;
    this.checkpointDiagnostics(Date.now(),true);
   }
   this.saveAscent(g,null);
   return false;
  }
  if(g.OnAscend)return this.finishAscension(g,job);
  if(g.ascensionMode===1||this.c.challenge!=='none')return this.state('ascension','挑战保护：暂停自动转生');
  if(C.clickBuff(g))return this.state('ascension','等待本次点击爆发结束');
  if(this.c.protectShiny&&g.wrinklers?.some(w=>w.type===1&&w.phase>0))return this.state('ascension','检测到闪光皱纹虫，等待玩家处理');
  const budget=M.heavenlyBudget(g,job.names);
  if(budget.error)throw Error(budget.error);
  const gained=C.prestige(g);
  if(gained<Math.max(job.target,this.c.ascendTarget)||gained+C.num(g.heavenlyChips)<budget.cost){
   return this.state('ascension','等待当前存档恢复转生预算');
  }
  if(job.prep.length){
   const [item,...rest]=job.prep;
   const object=g.ObjectsById?.[item.id],quantity=item.goal-object?.amount;
   const cost=quantity>0&&object?.getSumPrice?.(quantity);
   const keep=C.reserve(g,this.c);
   if(g.buyMode!==-1&&object&&!object.locked&&!this.c.blocked.includes('b:'+object.id)&&
      item.goal<=this.c.maxBuilding&&quantity>0&&quantity<=25&&Number.isFinite(cost)&&cost>=0&&cost<=(g.cookies-keep)*.01){
    const previous=object.amount;
    object.buy(quantity);
    if(object.amount>previous){
     g.WriteSave();
     this.log('转生前补齐 '+(object.dname||object.name)+' ×'+(object.amount-previous),1);
    }
   }
   this.saveAscent(g,{...job,prep:rest});
   return true;
  }
  if(!job.collected){
   const worms=(g.wrinklers||[]).filter(w=>w.type!==1&&w.phase===2&&w.sucked>0&&w.hp>0);
   if(worms.length){
    this.saveAscent(g,{...job,collected:true});
    for(const worm of worms)worm.hp=0;
    this.log('转生前结算普通皱纹虫 ×'+worms.length,1);
    return true;
   }
  }
  if(typeof g.Ascend!=='function'||typeof g.Reincarnate!=='function')throw Error('缺少原版转生入口');
  g.WriteSave();
  if(this.rebuyMarker)this.saveRebuy(g,[],'');
  this.saveAscent(g,{...job,collected:true,phase:'ascending'});
  g.Ascend(1);
  if(!g.OnAscend&&!g.AscendTimer)throw Error('游戏未确认进入转生');
  this.log('自动转生 · '+job.name+' · 新增声望 '+C.fmt(gained,0),1);
  this.state('ascension','正在进入天堂');
  return true;
 }
 finishAscension(g,job){
  if(job.phase==='prepare')throw Error('处于手动转生界面，请核对当前任务');
  if(g.nextAscensionMode||this.c.challenge!=='none')throw Error('当前已选择挑战模式');
  const {rows,cost,error}=M.heavenlyBudget(g,job.names);
  if(error||cost>C.num(g.heavenlyChips))throw Error(error||'实际天堂筹码低于已计划预算');
  if(rows.length){
   const {upgrade,price}=rows[0];
   if(!upgrade.canBePurchased||typeof upgrade.buy!=='function')throw Error('暂不能购买 '+(upgrade.dname||upgrade.name));
   this.saveAscent(g,{...job,phase:'buying'});
   const before=g.heavenlyChips;
   upgrade.buy();
   if(!upgrade.bought||g.heavenlyChips!==before-price)throw Error('天堂升级成交结果与计划不一致');
   // The original purchase opens the slot picker before the rest of the tree is bought.
   if(upgrade.name.startsWith('Permanent upgrade slot ')&&g.promptOn&&
      g.promptL?.querySelector('#promptContentPickPermaUpgrade'))g.ClosePrompt();
   this.log('天堂升级 · '+(upgrade.dname||upgrade.name)+' · 花费 '+C.fmt(price,0)+' 筹码',1);
   this.state('ascension','天堂升级还剩 '+(rows.length-1)+' 项');
   return true;
  }
  const choice=M.permanentSlots(g);
  if(choice){
   g.permanentUpgrades[choice.slot]=choice.upgrade.id;
   g.BuildAscendTree?.();
   this.log('永久栏位 '+(choice.slot+1)+' · '+(choice.upgrade.dname||choice.upgrade.name),1);
   return true;
  }
  this.saveAscent(g,{...job,phase:'restarting'});
  this.state('ascension','正在开始下一轮');
  g.Reincarnate(1);
  if(g.OnAscend)throw Error('游戏未确认开始新一轮');
  return true;
 }
 purchase(c=this.c){
  const g=this.g;
  if(g.buyMode===-1)return this.state('purchase','商店处于出售模式');
  if(this.rebuy.length)return this.restoreBuildings();
  if(c.holdCombo&&C.clickBuff(g))return this.state('purchase','爆发期间保留资源');
  if(c.purchaseMode==='plan'&&c.target.startsWith('u:')&&g.UpgradesById?.[Number(c.target.slice(2))]?.bought){
   this.set({purchaseMode:'efficient',target:''});
   return this.state('purchase','规划升级已完成，等待下一笔采购');
  }
  const observed=this.clickSample.rate;
  const run=observed>0?{...c,effectiveRate:observed}:c;
  const plan=M.purchasePlan(g,run,{bridgedTarget:this.bridgedTarget});
  const item=plan.next;
  if(!item)return this.state('purchase',plan.reason);
  const building=item.id.startsWith('b:');
  const previous=building?item.object.amount:item.object.bought;
  const balance=g.cookies;
  if(building)item.object.buy(item.qty);
  else item.object.buy();
  const bought=building?Math.max(0,item.object.amount-previous):Number(!previous&&!!item.object.bought);
  if(!bought)return this.state('purchase','游戏暂未确认购买 '+item.name);
  const log= (plan.bridge?'过渡采购 ':'采购 ')+item.name+' ×'+bought+' · 花费 '+C.fmt(Math.max(0,balance-g.cookies))+' · 剩余 '+C.fmt(g.cookies);
  this.log(log,1);
  if(plan.bridge)this.bridgedTarget=plan.target.id;
  else if(this.bridgedTarget===item.id)this.bridgedTarget='';
  if(!plan.bridge&&c.purchaseMode==='plan'&&item.id===c.target&&bought>=item.qty)this.set({purchaseMode:'efficient',target:''});
  return this.state('purchase','已购买 '+item.name);
 }
 harvest(){
  const g=this.g,c=this.c,info=C.garden(g);
  if(!info)return this.state('harvest','农场升至 1 级解锁花园');
  if(info.m.freeze)return this.state('harvest','花园已冻结');
  const tile=C.harvestTargets(g,c,info).find(t=>t.mature);
  if(!tile)return this.state('harvest','等待成熟植物；保护格与亲本保留');
  const locked=!tile.p.unlocked;
  info.m.harvest(tile.x,tile.y);
  if(info.m.plot[tile.y][tile.x][0]!==0)return this.state('harvest','游戏暂未确认收获');
  this.log('收获 '+C.tileName(tile)+' '+tile.p.name+(locked&&tile.p.unlocked?' · 解锁新种子':''),1);
  return this.state('harvest','已收获 '+tile.p.name);
 }
 plant(c=this.c){
  const g=this.g,info=C.garden(g);
  if(M.modes(g,c).garden)return this.breed(c,info);
  const {tiles,keep,budget,reason}=C.plantingPlan(g,c,info);
  if(reason)return this.state('plant',reason);
  let used=0;
  const planted=[];
  for(const tile of tiles){
   const p=tile.plant,cost=info.m.getCost(p);
   if(!Number.isFinite(cost)||used+cost>budget||g.cookies-cost<keep||info.m.plot[tile.y][tile.x][0]!==0)continue;
   const before=g.cookies;
   info.m.useTool(p.id,tile.x,tile.y);
   if(info.m.plot[tile.y][tile.x][0]===p.id+1){
    used+=Math.max(0,before-g.cookies);
    planted.push(C.tileName(tile));
   }
   if(planted.length>=3)break;
  }
  if(planted.length)this.log('花园补种 '+planted.join('、')+' · 花费 '+C.fmt(used),planted.length);
  return this.state('plant',planted.length?'补种 '+planted.length+' 格':'等待空格、种子或种植预算');
 }
 breed(c,info){
  const g=this.g,plan=M.gardenPlan(g,c,info),tile=plan.tile;
  if(!tile)return this.state('plant',plan.reason);
  const field=info.m;
  if(plan.kind==='harvest'){
   const previous=field.plot[tile.y][tile.x];
   field.harvest(tile.x,tile.y);
   if(field.plot[tile.y][tile.x]===previous)throw Error('游戏未确认花园收获');
   this.log('花园托管 · '+plan.reason,1);
  }else{
   if(field.freeze||!field.isTileUnlocked(tile.x,tile.y)||field.plot[tile.y][tile.x][0]!==0||
      c.protectedTiles.includes(tile.key)||g.cookies-field.getCost(tile.plant)<plan.keep)return this.state('plant','地块或种植预算已变');
   const before=g.cookies;
   field.useTool(tile.plant.id,tile.x,tile.y);
   if(field.plot[tile.y][tile.x][0]!==tile.plant.id+1)throw Error('游戏未确认花园播种');
   this.log('花园托管 · '+C.tileName(tile)+' 种下 '+tile.plant.name+' · 花费 '+C.fmt(before-g.cookies),1);
  }
  this.state('harvest',plan.reason);
  return this.state('plant',plan.reason);
 }
 trade(c=this.c){
  const g=this.g;
  const {data,orders,reason}=M.marketOrder(g,c,this.hist,this.ledger);
  if(!data)return this.state('trade',reason);
  for(const {q} of data.goods){
   const lot=this.ledger[q.id];
   if(lot&&lot.stock!==q.stock){delete this.ledger[q.id];this.persistMarket();}
  }
  for(const {side,row,units,basis} of orders){
   const q=row.q;
   if(side==='sell'&&data.m.sellGood(q.id,units)){
    delete this.ledger[q.id];
    this.persistMarket();
    this.log('股市卖出 '+q.name+' ×'+units+' · 扣除买入手续费净额 $'+C.fmt((row.price-basis)*units),1);
    return this.state('trade','已卖出 '+q.name);
   }
   const before=g.cookies;
   if(side==='buy'&&data.m.buyGood(q.id,units)){
    this.ledger[q.id]={stock:q.stock,cost:row.price*data.overhead,cookies:Math.max(0,before-g.cookies)};
    this.persistMarket();
    this.log('股市买入 '+q.name+' ×'+q.stock+' · 含费单价 $'+C.fmt(row.price*data.overhead),1);
    return this.state('trade','已买入 '+q.name);
   }
  }
  return this.state('trade',reason||'等待游戏确认交易');
 }
 spellPlan(g,c,now=Date.now(),track=false){
  const book=C.mini(g,'Wizard tower');
  const key=[roundKey(g),book?.spellsCastTotal,c.managed.modes.magic].join('/');
  const since=this.magicHold?.key===key?this.magicHold.at:now;
  const plan=M.spellPlan(g,c,this.lastCast,now,since);
  if(track&&plan.holding&&this.magicHold?.key!==key)this.magicHold={key,at:now};
  return plan;
 }
 cast(c=this.c){
  const g=this.g,managed=M.modes(g,c).magic;
  const {m,spell,seconds,reason,key,detail}=managed?this.spellPlan(g,c,Date.now(),true):C.castPlan(g,c,this.lastCast);
  if(reason)return this.state('cast',reason+(Number.isFinite(seconds)?' · 约 '+C.time(seconds):''));
  this.backup('施法前');
  if(managed){
   if(!this.managedExecution('magic',g))return this.state('cast','魔法书托管已暂停');
   const fresh=this.spellPlan(g,M.execution(g,this.c));
   if(fresh.reason||fresh.key!==key||fresh.m!==m)return this.state('cast',fresh.reason||'施法条件已变化');
  }
  const before=key==='hand of fate'?new Set(g.shimmers):null;
  this.lastCast=Date.now();
  if(!m.castSpell(spell))return this.state('cast','游戏拒绝施法');
  this.log('施放 '+spell.name+' · 剩 '+C.fmt(m.magic)+' 魔力'+(detail?' · '+detail:''),1);
  if(before&&!C.veil(g,c)){
   const summoned=g.shimmers.find(item=>!before.has(item)&&item.type==='golden'&&!item.wrath&&!item.popped&&!item.dead);
   if(summoned){
    summoned.pop();
    if(summoned.popped||summoned.dead||!g.shimmers.includes(summoned)){
     this.picked++;
     this.log('魔法书托管 · 收取本次召唤的金饼干',1);
    }
   }
  }
  return this.state('cast','已施法');
 }
 managedExecution(id,g){
  return this.syncSharedSettings()&&!!M.modes(g,this.c)[id]&&!this.spendingGate(g);
 }
 research(c=this.c){
  const g=this.g,plan=M.researchPlan(g,c);
  if(!plan.upgrade)return this.state('research',plan.reason);
  this.backup('研究采购前');
  if(!this.managedExecution('research',g))return this.state('research','研究托管已暂停');
  const fresh=M.researchPlan(g,M.execution(g,this.c));
  if(fresh.upgrade!==plan.upgrade)return this.state('research',fresh.reason);
  const upgrade=fresh.upgrade,pledges=C.num(g.pledges);
  if(upgrade.name==='One mind')upgrade.buy(1);
  else upgrade.buy();
  const applied=upgrade.name==='Elder Pledge'?C.num(g.pledges)>pledges:!!upgrade.bought;
  if(!applied)return this.state('research','游戏暂未确认 '+(upgrade.dname||upgrade.name));
  this.log(fresh.reason+' · 花费 '+C.fmt(fresh.cost),1);
  return this.state('research',fresh.reason);
 }
 lump(managed=false){
  const g=this.g,window=C.lumpWindow(g);
  if(!window)return this.state('lump','糖块尚未解锁');
  if(window.remaining)return this.state('lump','等待安全成熟 · '+C.time(window.remaining));
  if(window.overripe)return this.state('lump','等待游戏自动掉落');
  const previous=g.lumpT,balance=g.lumps;
  this.backup('糖块收取前');
  if(managed===true&&(!this.syncSharedSettings()||!C.managesLumps(g,this.c)||this.spendingGate(g))){
   return this.state('lump','托管收取已暂停');
  }
  const fresh=C.lumpWindow(g);
  if(!fresh||fresh.remaining||fresh.overripe||g.lumpT!==previous)return this.state('lump','糖块周期已变化，重新检查');
  g.clickLump();
  if(g.lumpT===previous)return this.state('lump','游戏暂未确认收取');
  const gained=g.lumps-balance;
  this.log(gained>0?'安全收取 '+gained+' 颗糖块':'游戏已结算成熟糖块 · 本次获得 0 颗',1);
  return this.state('lump','等待下一颗糖块');
 }
 lumpLevel(){
  return this.spendLumpLevel('lumpLevel',C.lumpPlan);
 }
 lumpManaged(){
  const g=this.g;
  if(!this.syncSharedSettings()||!this.c.lumpManaged)return this.state('lumpManaged','已关闭');
  if(!C.managesLumps(g,this.c))return this.state('lumpManaged',C.lumpRoutePlan(g,this.c).reason);
  if(!this.spendingGate(g))this.lump(true);
  return this.spendLumpLevel('lumpManaged',C.lumpRoutePlan);
 }
 spendingGate(g){
  if(this.g!==g)return'当前存档已变化，重新检查';
  return C.gate(g,this.c,this.env())||(this.storage.getItem(PAUSE)==='true'?'全部自动化已暂停':'');
 }
 spendLumpLevel(key,readPlan){
  const g=this.g;
  if(!this.syncSharedSettings()||!this.c[key])return this.state(key,'等级目标已变化，重新检查');
  const gate=this.spendingGate(g);
  if(gate)return this.state(key,gate);
  if(key==='lumpLevel'&&['noUpgrade','both'].includes(this.c.challenge))return this.state(key,'无升级挑战保护');
  const plan=readPlan(g,M.execution(g,this.c));
  const finish=()=>{
   this.set({lumpLevel:false});
   this.log('糖块目标达成 · '+plan.name+' '+plan.target+' 级');
   return this.state(key,'已达到目标等级');
  };
  if(key==='lumpLevel'&&plan.status==='done')return finish();
  if(plan.status!=='ready')return this.state(key,plan.reason);
  this.backup('挂机糖块升级前',true);

  if(!this.syncSharedSettings()||!this.c[key]){
   return this.state(key,'等级目标已变化，重新检查');
  }
  const latestGate=this.spendingGate(g);
  if(latestGate)return this.state(key,latestGate);
  if(['noUpgrade','both'].includes(this.c.challenge))return this.state(key,'无升级挑战保护');
  const fresh=readPlan(g,M.execution(g,this.c));
  if(fresh.status!=='ready')return this.state(key,fresh.reason);
  if(fresh.object!==plan.object||fresh.current!==plan.current||fresh.target!==plan.target){
   return this.state(key,'等级目标已变化，重新检查');
  }

  const {object,current,nextCost}=fresh;
  const balance=g.lumps,prefs=g.prefs,askLumps=prefs?.askLumps;
  // The saved goal or route already authorizes this spend. Keep the native preference for other operations.
  try{
   if(askLumps)prefs.askLumps=0;
   object.levelUp();
  }finally{
   if(askLumps)prefs.askLumps=askLumps;
  }
  if(object.level!==current+1||g.lumps!==balance-nextCost)throw Error('游戏未确认升级与糖块扣款，请检查建筑后重新启用');
  this.log((key==='lumpManaged'?'糖块托管':'糖块升级')+' · '+fresh.name+' '+current+' → '+object.level+' 级 · 花费 '+nextCost+' 颗 · 剩 '+g.lumps+' 颗',1);
  if(key==='lumpLevel'&&object.level>=fresh.target)return finish();
  return this.state(key,fresh.name+'已升至 '+object.level+' 级');
 }
 wrinkler(c=this.c){
  const g=this.g;
  const {target,value,reason}=M.wrinklerPlan(g,c,M.wrinklerMode(g,c));
  if(!target)return this.state('wrinkler',reason);
  target.hp=0;
  this.log('收取'+(target.type===1?'闪光':'普通')+'皱纹虫 · 估算 '+C.fmt(value)+' 饼干',1);
  return this.state('wrinkler','等待游戏结算');
 }
 pet(c=this.c){
  const g=this.g;
  const managed=M.modes(g,c).dragon;
  if(!C.has(g,'Pet the dragon')||g.dragonLevel<(managed?8:4))return this.state('pet','等待解锁龙掉落');
  const missing=M.dragonDrops(g);
  if(!missing.length)return this.state('pet','本轮龙掉落已收集');
  if(g.specialTab==='dragon')g.ClickSpecialPic();
  else if(managed&&!g.specialTab&&g.ToggleSpecialMenu)withSpecialMenu(g,'dragon',()=>{
   g.ToggleSpecialMenu(1);
   g.ClickSpecialPic();
  });
  else return this.state('pet',managed?'等待当前特殊面板收起':'打开原游戏的龙面板后运行');
  const found=missing.filter(name=>C.has(g,name)||g.HasUnlocked?.(name));
  if(found.length)this.log('龙掉落：'+found.map(name=>g.Upgrades[name]?.dname||name).join('、'),found.length);
  return this.state('pet','抚摸龙 · 每秒一次');
 }
 dragon(c=this.c){
  const g=this.g,mode=M.modes(g,c).dragon;
  const plan=M.dragonPlan(g,c,mode);
  if(!plan.kind)return this.state('dragon',plan.reason);
  this.backup(plan.kind==='buy'?'购买龙蛋前':'龙升级前');
  if(mode){
   if(!this.managedExecution('dragon',g))return this.state('dragon','龙托管已暂停');
   const run=M.execution(g,this.c),fresh=M.dragonPlan(g,run,M.modes(g,run).dragon);
   if(fresh.kind!==plan.kind||fresh.current!==plan.current||fresh.upgrade!==plan.upgrade)return this.state('dragon',fresh.reason);
  }
  if(plan.kind==='buy'){
   plan.upgrade.buy();
   if(!C.has(g,plan.upgrade.name))throw Error('游戏未确认购买龙蛋');
   this.log('养龙托管 · '+plan.reason,1);
   return this.state('dragon','已购买龙蛋');
  }
  if(mode)withSpecialMenu(g,'dragon',()=>g.UpgradeDragon());
  else g.UpgradeDragon();
  if(g.dragonLevel<=plan.current)return this.state('dragon','等待游戏确认训练');
  this.log('龙升至 '+g.dragonLevel+' 级',1);
  return this.state('dragon','升级完成');
 }
 pantheon(c=this.c){
  const g=this.g,managed=M.modes(g,c).pantheon;
  const {m,moves,status,reason}=C.pantheonPlan(g,c.gods,c.swapReserve);
  if(status!=='ready')return this.state('pantheon',reason);
  const {slot,god}=moves[0];
  this.backup('神灵调换前');
  if(managed&&!this.managedExecution('pantheon',g))return this.state('pantheon','万神殿托管已暂停');
  const run=M.execution(this.g,this.c);
  const fresh=C.pantheonPlan(this.g,run.gods,run.swapReserve);
  if(fresh.status!=='ready'||fresh.m!==m||fresh.moves[0].god!==god||fresh.moves[0].slot!==slot){
   return this.state('pantheon',fresh.reason);
  }
  const before=m.swaps;
  if(m.dragGod&&m.hoverSlot&&m.dropGod){m.dragGod(god);m.hoverSlot(slot);m.dropGod();}
  else{m.useSwap(1);m.slotGod(god,slot);}
  if(m.slot[slot]!==god.id||m.swaps!==before-1)throw Error('游戏未确认神灵调换与次数扣除');
  this.log('设置神灵 '+C.plain(god.name)+' · 剩余 '+m.swaps+' 次调换',1);
  return this.state('pantheon','已配置槽位 '+(slot+1));
 }
 aura(c=this.c){
  const g=this.g,managed=M.modes(g,c).dragon;
  if(managed){
   const plan=M.growthAura(g,c);
   if(!plan)return this.state('aura','保留现有光环或等待训练完成与牺牲预算');
   this.backup('龙托管配置光环前');
   if(!this.managedExecution('dragon',g)||M.modes(g,this.c).dragon!=='develop')return this.state('aura','光环托管已暂停');
   const fresh=M.growthAura(g,M.execution(g,this.c));
   if(fresh?.id!==plan.id||fresh.highest!==plan.highest)return this.state('aura','光环或牺牲条件已变化');
   fresh.highest.sacrifice(1);
   g.dragonAura=fresh.id;
   g.recalculateGains=1;
   this.log('龙托管 · 启用 '+(fresh.aura.dname||fresh.aura.name),1);
   return this.state('aura','已启用主光环');
  }
  for(let slot=0;slot<2;slot++){const target=c['aura'+slot],current=slot?g.dragonAura2:g.dragonAura;if(target<0||target===current)continue;if(!g.dragonAuras?.[target]||g.dragonLevel<target+4||slot===1&&g.dragonLevel<g.dragonLevels.length-1)return this.state('aura','目标光环或第二槽位未解锁');if(target!==0&&target===(slot?g.dragonAura:g.dragonAura2))return this.state('aura','两个槽位不能配置同一光环');this.backup('光环切换前');const highest=[...g.ObjectsById].reverse().find(o=>o.amount>0);if(highest)highest.sacrifice(1);if(slot)g.dragonAura2=target;else g.dragonAura=target;g.recalculateGains=1;this.log('光环切换 '+(g.dragonAuras[target].dname||g.dragonAuras[target].name));return this.state('aura','已切换光环');}
  return this.state('aura','光环方案已匹配');
 }
 season(c=this.c){
  const g=this.g,key=c.seasonTarget;
  if(M.modes(g,c).season)return this.collectSeason(c);
  if(!key||g.season===key)return this.state('season',key?'已处于目标季节':'请选择目标季节');
  const season=g.seasons?.[key],upgrade=g.Upgrades?.[season?.trigger];
  if(!upgrade?.unlocked)return this.state('season','季节切换尚未解锁');
  if(g.cookies-upgrade.getPrice()<C.reserve(g,c))return this.state('season','切换成本超过预算');
  this.backup('季节切换前');
  upgrade.buy();
  if(g.season!==key)return this.state('season','等待游戏确认季节切换');
  this.log('切换季节 '+season.name,1);
  return this.state('season','已切换季节');
 }
 collectSeason(c){
  const g=this.g,plan=M.seasonPlan(g,c);
  if(!plan.kind)return this.state('season',plan.reason);
  this.backup('季节托管花费前');
  if(!this.managedExecution('season',g))return this.state('season','季节托管已暂停');
  const fresh=M.seasonPlan(g,M.execution(g,this.c));
  if(fresh.kind!==plan.kind||fresh.upgrade!==plan.upgrade||fresh.next!==plan.next)return this.state('season',fresh.reason);
  if(plan.kind==='santa'){
   withSpecialMenu(g,'santa',()=>g.UpgradeSanta());
   if(g.santaLevel!==plan.next)throw Error('游戏未确认圣诞老人升级');
  }else{
   plan.upgrade.buy();
   if(plan.kind==='switch'?g.season!==plan.key:!C.has(g,plan.upgrade.name))throw Error('游戏未确认季节托管购买');
  }
  this.log('季节托管 · '+plan.reason+' · 花费 '+C.fmt(fresh.cost),1);
  return this.state('season',plan.reason);
 }
 loadRebuy(g=this.g){
  const round=roundKey(g);
  const stored=round?this.readRecord(REBUY+':'+round):null;
  this.rebuyRound=round;
  this.rebuyMarker=typeof stored?.buff==='string'?stored.buff:'';
  this.rebuyTargets=Array.isArray(stored?.items)?stored.items.filter(item=>Number.isSafeInteger(item?.id)&&item.id>=0&&
   Number.isSafeInteger(item.target)&&item.target>=0&&g.ObjectsById?.[item.id]):[];
  this.rebuy=this.rebuyTargets.filter(item=>g.ObjectsById[item.id].amount<item.target);
 }
 saveRebuy(g,items,buff=this.rebuyMarker){
  const round=roundKey(g);
  if(!round)throw Error('无法确认回购所属存档');
  const key=REBUY+':'+round;
  if(items.length||buff)this.storage.setItem(key,JSON.stringify({items,buff}));
  else this.storage.removeItem(key);
  this.rebuyRound=round;
  this.rebuyTargets=items;
  this.rebuy=items;
  this.rebuyMarker=buff;
 }
 godzamok(c=this.c){
  const g=this.g;
  if(this.readRecord(PAUSE)===true)return this.state('godzamok','全部自动化已暂停');
  this.loadRebuy(g);
  if(this.rebuyTargets.length)return this.restoreBuildings();
  const [key,active]=Object.entries(g.buffs||{}).find(([,buff])=>num(buff.multClick,1)>1)||[];
  if(!active){
   this.godzamokBuff=null;
   if(this.rebuyMarker)this.saveRebuy(g,[],'');
   return this.state('godzamok','等待点击爆发');
  }
  if(this.godzamokBuff===active||this.rebuyMarker===key)return this.state('godzamok','本次增益已执行');
  if(!g.hasGod?.('ruin'))return this.state('godzamok','Godzamok 尚未入槽');
  if(g.buyMode===-1)return this.state('godzamok','出售模式下暂停组合执行');
  const buildings=[...new Set(c.godzamokBuildings.map(Number))].map(id=>g.ObjectsById[id]).filter(Boolean);
  const list=buildings.map(o=>({o,n:Math.min(c.godzamokSell,Math.max(0,o.amount-c.godzamokKeep))})).filter(item=>item.n>0);
  if(!list.length)return this.state('godzamok','请选择可出售建筑及数量');
  const buyback=list.reduce((sum,{o,n})=>sum+o.getSumPrice(n),0);
  if(!Number.isFinite(buyback)||g.cookies-buyback<C.reserve(g,c))return this.state('godzamok','等待足额回购预算');
  this.backup('Godzamok 出售前',true);
  this.saveRebuy(g,list.map(({o})=>({id:o.id,target:o.amount})),key);
  this.godzamokBuff=active;
  for(const {o,n} of list)o.sell(n,1);
  this.log('Godzamok 出售已执行，开始回购',1);
  return this.restoreBuildings();
 }
 restoreBuildings(){
  const g=this.g;
  if(g.buyMode===-1)return this.state('godzamok','等待退出出售模式后回购');
  if(!this.rebuyTargets.length||this.rebuyRound!==roundKey(g))return false;
  const next=this.rebuyTargets.find(item=>g.ObjectsById[item.id].amount<item.target);
  if(next){
   const object=g.ObjectsById[next.id],quantity=next.target-object.amount;
   const name=object.dname||object.name,cost=object.getSumPrice(quantity);
   if(!Number.isFinite(cost)||g.cookies-cost<C.reserve(g,this.c)){
    return this.state('godzamok','回购还差 '+quantity+' 个'+name+'，等待预算');
   }
   const before=object.amount;
   object.buy(quantity);
   if(object.amount<next.target)return this.state('godzamok','回购还差 '+(next.target-object.amount)+' 个'+name);
   this.log('回购 '+name+' ×'+(object.amount-before),1);
  }
  this.rebuy=this.rebuyTargets.filter(item=>g.ObjectsById[item.id].amount<item.target);
  if(this.rebuy.length)return this.state('godzamok','仍有 '+this.rebuy.length+' 项待回购');
  g.WriteSave();
  this.saveRebuy(g,[]);
  if(this.states.system?.startsWith('建筑回购未继续'))delete this.states.system;
  return this.state('godzamok','回购完成');
 }
 dispose(){this.disposed=true;}
}
const num=C.num;
return{Engine,SETTINGS,BACKUPS,HISTORY,PAUSE};
});

;
window.CookiePilotStyles2=":host {\n  all: initial;\n  color-scheme: dark;\n  --bg: #19231d;\n  --surface: #212f27;\n  --soft: #2a3930;\n  --fg: #eef2e8;\n  --muted: #afc0b1;\n  --line: #3c5044;\n  --accent: #b4ddb9;\n  --accent-bg: #30483a;\n  --on-accent: #15291e;\n  --warm: #f2cf97;\n  --warm-bg: #493a24;\n  --bad: #f5b7a6;\n  --pad: 16px;\n  --workbench-width: 600px;\n  --workbench-height: 480px;\n  --workbench-margin: 12px;\n  color: var(--fg);\n  font: 14px/1.5 \"Segoe UI\", \"Microsoft YaHei UI\", \"PingFang SC\", sans-serif;\n}\n:host([data-theme=light]) {\n  color-scheme: light;\n  --bg: #f7f7ef;\n  --surface: #fffef9;\n  --soft: #eeefe6;\n  --fg: #213128;\n  --muted: #536458;\n  --line: #dce3d6;\n  --accent: #245943;\n  --on-accent: #fffefa;\n  --accent-bg: #e3eee0;\n  --warm: #76501c;\n  --warm-bg: #f6ecd7;\n  --bad: #a24434;\n}\n* { box-sizing: border-box; }\n[hidden] { display: none !important; }\nh1, h2, h3, p, dl, dd { margin: 0; }\nh2 { font-size: 24px; line-height: 1.2; font-weight: 650; letter-spacing: -.025em; }\nh3 { font-size: 14px; line-height: 1.35; font-weight: 650; }\nsmall, .muted { color: var(--muted); }\nsmall { font-size: 11px; }\na { color: var(--accent); text-underline-offset: 2px; }\nbutton, input, select, textarea { font: inherit; }\nbutton, a, input, select { touch-action: manipulation; }\nbutton {\n  cursor: pointer;\n  color: var(--fg);\n  background: var(--soft);\n  border: 1px solid var(--line);\n  border-radius: 7px;\n  min-height: 30px;\n  padding: 5px 9px;\n  font-size: 12px;\n  text-align: start;\n}\nbutton:hover:not(:disabled) { background: var(--accent-bg); }\nbutton:disabled { cursor: default; opacity: .5; }\n:is(button,input,select,textarea,a,summary):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\nbutton svg { width: 15px; height: 15px; flex: 0 0 15px; }\nbutton.primary { background: var(--accent); color: var(--on-accent); border-color: var(--accent); font-weight: 650; }\nbutton.primary:hover:not(:disabled) { filter: brightness(.92); background: var(--accent); }\nbutton.ghost { color: var(--accent); background: transparent; border-color: transparent; }\nbutton.danger { color: var(--bad); }\n\n.backdrop {\n  position: fixed;\n  inset: 0;\n  display: grid;\n  place-items: center;\n  padding: var(--workbench-margin);\n  overflow: hidden;\n  background: #09140f69;\n  pointer-events: auto;\n}\n.window {\n  inline-size: min(var(--workbench-width), calc(100dvw - var(--workbench-margin) * 2));\n  block-size: min(var(--workbench-height), calc(100dvh - var(--workbench-margin) * 2));\n  display: grid;\n  grid-template-rows: auto auto auto minmax(0,1fr);\n  overflow: hidden;\n  background: var(--bg);\n  border: 1px solid var(--line);\n  border-radius: 13px;\n  box-shadow: 0 18px 65px #09140f73;\n}\n.head, .workbench-nav { background: var(--surface); border-bottom: 1px solid var(--line); }\n.head { min-height: 50px; padding: 7px var(--pad); display: flex; align-items: center; gap: 8px; }\n.head-brand { display: flex; align-items: center; gap: 8px; }\n.head-brand small { display: block; line-height: 1.15; }\n.head .grow { flex: 1; }\n.wordmark { font-size: 14px; line-height: 1.25; font-weight: 700; white-space: nowrap; }\n.brand-icon {\n  inline-size: 30px;\n  block-size: 30px;\n  flex: none;\n  display: grid;\n  place-items: center;\n  border-radius: 7px;\n  background: var(--accent-bg);\n  color: var(--accent);\n}\n.brand-icon svg { width: 17px; height: 17px; }\n.head-action { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }\n#close { padding-inline: 7px; }\n.runtime { display: inline-flex; align-items: center; gap: 5px; color: var(--muted); font-size: 11px; white-space: nowrap; }\n.runtime::before { content: \"\"; inline-size: 6px; block-size: 6px; background: currentColor; border-radius: 50%; }\n.runtime[data-tone=good] { color: var(--accent); }\n.runtime[data-tone=warn] { color: var(--warm); }\n.workbench-nav {\n  display: grid;\n  grid-template-columns: repeat(6,minmax(0,1fr));\n  gap: 2px;\n  padding-inline: var(--pad);\n}\n.nav, .category-tabs button {\n  border: 0;\n  border-radius: 0;\n  border-bottom: 2px solid transparent;\n  background: transparent;\n  color: var(--muted);\n  padding: 5px 7px 6px;\n  min-height: 34px;\n  white-space: nowrap;\n}\n.nav { display: flex; justify-content: center; align-items: center; gap: 5px; min-height: 38px; }\n.nav:hover:not(:disabled), .category-tabs button:hover:not(:disabled) { background: var(--soft); }\n.nav svg { width: 13px; height: 13px; flex-basis: 13px; }\n.nav[aria-current=page], .category-tabs button[aria-pressed=true] {\n  color: var(--accent);\n  border-color: var(--accent);\n  font-weight: 650;\n}\n.view-controls {\n  grid-row: 3;\n  min-width: 0;\n  background: var(--bg);\n  padding: 6px var(--pad);\n  border-bottom: 1px solid var(--line);\n}\n.view-controls .category-tabs, .view-controls .rule-tabs {\n  flex-wrap: nowrap;\n  margin: 0;\n  overflow-x: auto;\n  scrollbar-width: thin;\n}\n.view-controls .category-tabs { border: 0; }\n.view-controls .category-tabs button { margin: 0; flex: none; }\n.view-controls .rule-tabs { padding-top: 5px; }\n.view-controls .rule-tabs button { min-height: 26px; flex: none; }\n.view-controls button:focus-visible { outline-offset: -2px; }\n.main {\n  grid-row: 4;\n  min-width: 0;\n  min-height: 0;\n  padding: 12px var(--pad) 16px;\n  overflow: auto;\n  overscroll-behavior: contain;\n  scrollbar-gutter: stable;\n  scrollbar-width: thin;\n  scrollbar-color: var(--line) transparent;\n}\n.main:focus { outline: none; }\n.rule-heading, .heading, .card-title, .block-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 5px 9px;\n  flex-wrap: wrap;\n}\n.rule-heading, .heading { margin-bottom: 11px; }\n.heading p { margin-top: 5px; font-size: 12px; color: var(--muted); }\n.rule-heading button { min-height: 27px; }\n.category-tabs, .rule-tabs { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }\n.category-tabs { border-bottom: 1px solid var(--line); margin-bottom: 10px; }\n.category-tabs button { margin-bottom: -1px; padding-inline: 5px; }\n.rule-tabs { margin: 0 0 10px; }\n.rule-tabs button[aria-pressed=true] { background: var(--accent-bg); border-color: var(--accent); color: var(--accent); font-weight: 650; }\n.rule-layout { display: grid; grid-template-columns: minmax(0,1.3fr) minmax(0,1fr); gap: 10px; align-items: start; }\n.rule-card {\n  min-width: 0;\n  background: var(--surface);\n  border: 1px solid var(--line);\n  border-radius: 10px;\n  padding: 11px 12px;\n}\n.rule-card .check { min-height: 31px; }\n.rule-copy, .rule-reason { font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }\n.rule-reason { margin-top: 5px; }\n.rule-copy { margin: 7px 0 5px; }\n.facts { margin-top: 7px; }\n.facts > div { display: flex; justify-content: space-between; align-items: baseline; gap: 9px; border-top: 1px solid var(--line); padding: 8px 0; font-size: 12px; }\n.facts dt { color: var(--muted); flex: 0 1 auto; }\n.facts dd { font-weight: 600; text-align: end; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; min-width: 0; }\n.tag { display: inline-flex; border-radius: 5px; padding: 2px 6px; font-size: 11px; background: var(--soft); color: var(--muted); white-space: nowrap; }\n.tag.good { background: var(--accent-bg); color: var(--accent); }\n.tag.warn { background: var(--warm-bg); color: var(--warm); }\n.overview { display: grid; gap: 11px; }\n.overview .card-title .ghost { padding: 2px 4px; min-height: 27px; }\n.overview-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }\n.overview-stats {\n  display: grid;\n  grid-template-columns: repeat(3,minmax(0,1fr));\n  border: 1px solid var(--line);\n  border-radius: 8px;\n  background: var(--surface);\n}\n.overview-stats > div { padding: 8px 10px; min-width: 0; }\n.overview-stats > div + div { border-inline-start: 1px solid var(--line); }\n.overview-stats dt { color: var(--muted); font-size: 11px; }\n.overview-stats dd { font-size: 18px; font-weight: 650; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }\n.overview-next { min-height: 70px; }\n.next-job {\n  display: grid;\n  grid-template-columns: minmax(0,1fr) auto auto;\n  align-items: center;\n  gap: 6px;\n  width: 100%;\n  min-height: 33px;\n  border: 0;\n  background: transparent;\n  border-radius: 0;\n  padding: 5px 3px;\n  color: var(--fg);\n}\n.next-job + .next-job { border-top: 1px solid var(--line); }\n.next-job :is(strong,small) { display: block; overflow-wrap: anywhere; }\n.next-job .eta { color: var(--accent); font-size: 11px; font-variant-numeric: tabular-nums; }\n.next-job svg { color: var(--accent); }\n.guard-summary {\n  width: 100%;\n  display: grid;\n  grid-template-columns: auto minmax(0,1fr) auto;\n  align-items: center;\n  gap: 7px;\n  background: var(--warm-bg);\n  color: var(--warm);\n  border-color: transparent;\n}\n.guard-summary:hover:not(:disabled) { background: var(--warm-bg); filter: brightness(.94); }\n.guard-summary small { color: inherit; white-space: nowrap; }\n.group-shortcuts { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 6px; }\n.group-shortcuts button { display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: 5px; align-items: center; min-height: 34px; padding: 4px 7px; background: var(--surface); }\n.group-shortcuts button.enabled svg { color: var(--accent); }\n.group-shortcuts button:hover:not(:disabled) { background: var(--accent-bg); }\n.group-shortcuts small { font-variant-numeric: tabular-nums; white-space: nowrap; }\n.queue-card + .queue-card { margin-top: 10px; }\n.queue-card h3 { margin-bottom: 5px; }\n\n.plan-layout { margin-top: 11px; }\n.lump-advice { border: 1px solid var(--line); border-radius: 8px; background: var(--surface); padding-inline: 9px; }\n.lump-advice .row { border-bottom: 0; }\n.lump-advice .row > svg { color: var(--accent); }\n.route-next { margin-block: 8px; padding: 8px; background: var(--soft); border-radius: 6px; font-size: 12px; }\n.route-next p { color: var(--muted); margin-top: 2px; }\n.management-layout { display: grid; grid-template-columns: minmax(115px,.65fr) minmax(0,1.65fr); align-items: start; gap: 10px; }\n.management-list { display: grid; gap: 3px; }\n.manage-choice { display: flex; justify-content: space-between; align-items: center; gap: 5px; min-height: 26px; padding-block: 3px; }\n.manage-choice[aria-pressed=true] { background: var(--accent-bg); border-color: var(--accent); color: var(--accent); }\n.managed-dot { width: 6px; height: 6px; flex: 0 0 6px; border-radius: 50%; background: var(--accent); }\n.management-detail > .field { margin-top: 8px; }\n.pantheon-advice { display: grid; gap: 6px; margin-top: 6px; }\n.pantheon-advice h4 { margin: 0; font-size: 13px; }\n.pantheon-advice .note { margin-top: 0; }\n.spirit-list { margin: 0; padding: 0; list-style: none; }\n.spirit-list li { padding-block: 5px; border-block-start: 1px solid var(--line); font-size: 12px; }\n.spirit-list small { display: block; }\n.lump-routes { margin-top: 8px; }\n.lump-routes button.selected { background: var(--accent-bg); border-color: var(--accent); color: var(--accent); }\n.target-cost { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 3px 8px; margin: 10px 0 7px; font-size: 12px; font-variant-numeric: tabular-nums; }\n.target-cost span { color: var(--muted); }\n.settings-layout { margin-top: 10px; }\n.settings-actions, .update-links { margin-top: 8px; }\n.update-card .field { max-width: 220px; }\n.candidates { margin-top: 6px; max-height: 220px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--line) transparent; }\n.candidate {\n  width: 100%;\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 5px;\n  border: 0;\n  border-top: 1px solid var(--line);\n  background: transparent;\n  border-radius: 0;\n}\n.candidate :is(strong,small) { display: block; overflow-wrap: anywhere; }\n.candidate[aria-pressed=true] { background: var(--accent-bg); box-shadow: inset 2px 0 var(--accent); }\n.rule-card > .field { margin-top: 6px; }\n.actions { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }\n.block { margin-top: 16px; }\n.block-head { margin-bottom: 7px; }\n.block-head > span { font-size: 11px; color: var(--muted); }\n.row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--line); }\n.row > svg { width: 15px; height: 15px; color: var(--muted); flex: 0 0 15px; }\n.row-info { flex: 1 1 auto; min-width: 0; }\n.row strong { font-size: 13px; }\n.row p, .note { margin-top: 3px; font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }\n.note { margin-top: 8px; }\n.summary { display: flex; gap: 16px; flex-wrap: wrap; margin: 10px 0; }\n.summary .value { font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }\n.summary label { color: var(--muted); font-size: 11px; }\n.cols, .fields { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }\n.fields { margin: 7px 0; }\n.field { display: grid; align-content: start; gap: 3px; min-width: 0; }\n.field > span { color: var(--muted); font-size: 11px; }\ninput[type=text], input[type=number], input[type=url], select, textarea {\n  min-width: 0;\n  width: 100%;\n  color: var(--fg);\n  background: var(--bg);\n  border: 1px solid var(--line);\n  border-radius: 6px;\n  padding: 5px 7px;\n  font-size: 12px;\n}\nselect option { background: var(--surface); color: var(--fg); }\n.check { display: flex; align-items: center; gap: 7px; min-height: 29px; font-size: 12px; cursor: pointer; }\n.check input { accent-color: var(--accent); width: 15px; height: 15px; flex: 0 0 15px; margin: 0; }\n.warning { font-size: 12px; color: var(--warm); background: var(--warm-bg); border-radius: 6px; padding: 8px; margin: 8px 0; }\n.empty { color: var(--muted); font-size: 12px; padding: 10px 0; }\n.empty svg { width: 22px; height: 22px; margin-bottom: 5px; color: var(--accent); }\n.table-wrap { overflow-x: auto; }\n.table { width: 100%; border-collapse: collapse; font-size: 12px; }\n.table th, .table td { padding: 7px 5px; border-bottom: 1px solid var(--line); vertical-align: middle; }\n.table th { color: var(--muted); font-weight: 400; text-align: start; white-space: nowrap; }\n.table td.num { text-align: end; white-space: nowrap; font-variant-numeric: tabular-nums; }\n.table td small { display: block; }\n.chips { display: flex; gap: 5px; flex-wrap: wrap; margin: 6px 0; }\n.chip { font-size: 11px; padding: 3px 6px; background: var(--soft); border-radius: 5px; }\n.garden { display: grid; grid-template-columns: repeat(6,minmax(0,1fr)); gap: 4px; max-width: 336px; margin-bottom: 7px; }\n.tile { aspect-ratio: 1; min-width: 0; min-height: 29px; padding: 0; position: relative; display: grid; place-content: center; justify-items: center; }\n.tile .symbol { font-size: 17px; line-height: 1.15; color: var(--accent); }\n.tile .plant-label { font-size: 9px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }\n.tile.mature { background: var(--accent-bg); }\n.tile.selected { border-color: var(--accent); }\n.tile.protected::after { content: \"·\"; position: absolute; color: var(--warm); font-size: 22px; line-height: 1; top: 0; right: 3px; }\n.tile-info { min-height: 38px; margin-bottom: 5px; }\n.log { display: flex; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--line); font-size: 12px; overflow-wrap: anywhere; }\n.log time { color: var(--muted); flex: none; font-variant-numeric: tabular-nums; }\n.advanced { border-top: 1px solid var(--line); margin-top: 10px; padding-top: 7px; }\n.advanced summary { cursor: pointer; font-size: 13px; font-weight: 600; }\n.forecast, .collection { display: flex; gap: 5px; flex-wrap: wrap; margin: 7px 0; }\n.forecast > div, .collection span { padding: 4px 6px; border-radius: 5px; background: var(--soft); font-size: 11px; }\n.forecast span, .forecast small { display: block; }\n.forecast .good, .collection .owned { color: var(--accent); }\n.forecast .bad { color: var(--bad); }\n.numeric-list { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 3px 7px; }\n.toast {\n  position: fixed;\n  bottom: 18px;\n  left: 50%;\n  transform: translateX(-50%);\n  max-width: min(580px,calc(100vw - 22px));\n  background: var(--surface);\n  color: var(--fg);\n  border: 1px solid var(--line);\n  border-radius: 9px;\n  box-shadow: 0 8px 24px #0005;\n  padding: 8px 12px;\n  pointer-events: auto;\n}\n.confirm {\n  background: var(--surface);\n  color: var(--fg);\n  border: 1px solid var(--line);\n  border-radius: 12px;\n  max-width: min(430px,calc(100vw - 24px));\n  padding: 16px;\n  pointer-events: auto;\n}\n.confirm::backdrop { background: #0b1712ac; }\n.confirm { inline-size: 370px; max-block-size: calc(100dvh - 24px); overflow-y: auto; }\n#confirm-text { margin: 9px 0 13px; }\n.confirm p { margin-top: 7px; white-space: pre-line; color: var(--muted); }\n.confirm .actions { justify-content: flex-end; }\n.entry {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  min-height: 25px;\n  color: var(--accent);\n  background: var(--surface);\n  border-color: var(--line);\n  padding: 3px 7px;\n  font-size: 12px;\n  font-weight: 650;\n}\n.entry svg { width: 13px; height: 13px; flex-basis: 13px; }\n:host([data-density=compact]) .row { padding-block: 5px; }\n:host([data-density=compact]) .main { padding-block: 10px; }\n@media (max-width: 560px) {\n  .cols { grid-template-columns: minmax(0,1fr); }\n  .category-tabs button { padding-inline: 4px; }\n}\n@media (max-width: 500px) {\n  :host { --pad: 10px; --workbench-margin: 7px; }\n  .rule-layout { grid-template-columns: minmax(0,1fr); }\n  .management-layout { grid-template-columns: minmax(0,1fr); }\n  .management-list { grid-template-columns: repeat(3,minmax(0,1fr)); gap: 4px; }\n  .manage-choice { min-width: 0; min-height: 28px; padding-inline: 6px; }\n  .head small { display: none; }\n  .nav { padding-inline: 2px; flex-direction: column; gap: 2px; font-size: 11px; }\n  .group-shortcuts { grid-template-columns: repeat(2,minmax(0,1fr)); }\n  .field :is(input,select) { font-size: 16px; }\n}\n@media (max-width: 360px) {\n  .fields { grid-template-columns: minmax(0,1fr); }\n  .head { gap: 4px; }\n}\n@media (pointer: coarse) {\n  :is(.head-action,.nav,.category-tabs button,.rule-tabs button,.check,.next-job,.group-shortcuts button,.guard-summary) {\n    min-height: 44px;\n  }\n}\n";
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
 garden:{title:'花园',link:'harvest',modes:[['seeds','培育新种子']],
  scope:'从当前种子和地块选择亲本、留空突变格、收获新的成熟种子。保护格与已有作物保留。'},
 magic:{title:'魔法书',link:'cast',modes:[['combo','优先叠爆发'],['yield','收益与爆发']],
  scope:'预判召唤饼干和命运之手，收取本次法术召唤的金饼干。'},
 pantheon:{title:'万神殿',link:'pantheon',modes:[['lineup','补齐并维持阵容']],
  scope:'保留已在槽的神灵，按当前挂机方式推荐空槽。第一次配置后维持这套阵容，遵守调换次数预留。'},
 market:{title:'股市',link:'trade',modes:[['portfolio','分位交易']],
  scope:'积累报价后按分位买卖。多笔订单共用仓位预算，优先退出达到净利目标的已知成本仓位。'},
 dragon:{title:'养龙',link:'dragon',modes:[['hatch','孵化与抚摸'],['develop','训练与主光环']],
  scope:'按预算购买龙蛋并训练。龙达到 8 级并解锁抚摸后，尝试集齐龙掉落。'},
 season:{title:'季节收藏',link:'season',modes:[['collection','轮换并收集季节物品']],
  scope:'圣诞收驯鹿并培养圣诞老人。复活节和万圣节收集随机掉落。情人节按预算逐件购买饼干。独立启用皱纹虫托管时优先按它的方案收取。'},
 wrinklers:{title:'皱纹虫',link:'wrinkler',modes:[['yield','攒收益'],['drops','刷掉落']],
  scope:'按用途等待储量和数量，再回收普通皱纹虫。始终保留闪光个体。'},
 events:{title:'点击与事件',link:'click',modes:[['idle','日常挂机'],['burst','爆发连点']],
  scope:'收取金饼干、驯鹿和幸运新闻。按设定速度连点，并遵守面纱和挑战保护。'},
 purchase:{title:'采购',link:'purchase',modes:[['efficient','按回本采购']],
  scope:'根据实际库存和收益比较建筑与升级，遵守保留线、黑名单和数量上限。'},
 lumps:{title:'糖块',link:'lumpManaged',scope:'成熟收取，按授权路线解锁小游戏和提升建筑等级。'},
 research:{title:'研究与老太婆末日',modes:[['safe','研究到冥界烤箱'],['one-mind','推进到一心'],['full','推进到长者契约'],['pledge','长者契约后自动安抚']],
  scope:'依次购买已解锁的研究升级，遵守饼干保留线、黑名单和保险库。开启老太婆末日会改变自然金饼干和皱纹虫。'},
 ascension:{title:'转生',modes:[['notice','声望达标提醒'],['cycle','自动转生与重开']],
  scope:'监测新增声望，达到目标后提醒。'}
};
const defaultManagement={events:'idle',purchase:'efficient',garden:'seeds',magic:'combo',pantheon:'lineup',market:'portfolio',dragon:'hatch',wrinklers:'yield'};
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
 const wrinklers=(g.wrinklers||[]).filter(w=>w.phase===2&&w.hp>0);
 const seasons=Object.entries(g.seasons||{}).map(([key,season])=>{
  const upgrades=Object.values(g.Upgrades||{}).filter(u=>u.season===key&&u.pool!=='toggle');
  return '<details class="advanced" data-state="season-'+esc(key)+'"><summary>'+esc(season.name)+' · '+upgrades.filter(u=>u.bought).length+' / '+upgrades.length+
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
  const cast=M.modes(g,c).magic?M.spellPlan(g,c,engine.lastCast):C.castPlan(g,c,engine.lastCast);
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
 if(ascent&&(g.OnAscend||g.AscendTimer||g.ReincarnateTimer)){
  add('ascension','完成转生 · '+ascent.name,0,engine.states.ascension||'按顺序完成天堂升级与重开');
  return jobs;
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
  if(cast.holding)add('cast','等待生产狂热',cast.seconds,'保留当前命运之手序列和魔力 · 显示最长等待');
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
  const order=M.marketOrder(g,c,engine.hist,engine.ledger).orders?.[0];
  if(order)add('trade',(order.side==='sell'?'卖出 ':'买入 ')+order.row.q.name+' ×'+order.units,0,'股市托管');
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
 if(managed.ascension==='cycle'){
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
   const plan=M.marketOrder(g,run,engine.hist,engine.ledger),order=plan.orders?.[0];
   return order?(order.side==='sell'?'卖出 ':'买入 ')+order.row.q.name+' ×'+order.units:plan.reason;
  }
  case 'dragon':{
   const plan=M.dragonPlan(g,run,choice);
   if(plan.kind)return plan.reason;
   const aura=choice==='develop'&&M.growthAura(g,run);
   if(aura)return '配置 '+(aura.aura.dname||aura.aura.name)+' · 牺牲 1 座 '+(aura.highest.dname||aura.highest.name);
   const missing=M.dragonDrops(g);
   if(g.dragonLevel>=8&&C.has(g,'Pet the dragon')){
    if(missing.length)return '抚摸龙 · 还缺 '+missing.length+' 件掉落';
    return '龙掉落已收齐 · '+plan.reason;
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
  '训练至设定的 '+c.dragonMax+' 级，可能牺牲建筑。达标后可为尚未设置的主光环消耗一座最高阶建筑。':'训练最多至 5 级，先孵化并培养龙。');
 if(id==='season')return module.scope+' 每轮转生最多 '+c.managed.seasonLimit+' 次季节切换。';
 if(id==='magic')return module.scope+(choice==='combo'?'预测到点击狂热时等待生产狂热，超时后恢复日常施法。Haggler’s Charm 可推进序列，反噬时升级价格暂涨 2%。':
  '平时召唤饼干。不合适的序列可用 Haggler’s Charm 推进，反噬时升级价格暂涨 2%。');
 if(id==='research'&&choice==='pledge')return module.scope+' 长者契约后持续安抚。闪光皱纹虫或万圣节待收集时延后。';
 if(id==='ascension'&&choice==='cycle')return '筹码和最低新增声望达标后，补齐低成本成就并结算普通皱纹虫。备份后自动转生，按路线购买天堂升级，为永久栏选择小猫并重开。刷新后可接续。';
 return module.scope;
}
function managementFields(id,c){
 let options='';
 if(id==='garden')options=field('gardenSpend','种植预算（可用饼干 %）','number',{min:0,max:100});
 if(id==='magic')options=field('magicReserve','保留魔力','number',{min:0})+
  field('castCooldown','施法冷却（秒）','number',{min:1,step:1})+
  field('comboWait','等待生产狂热上限（秒）','number',{min:30,max:1800,step:1});
 if(id==='ascension')options=field('ascendTarget','最低新增声望','number',{min:0});
 if(id==='pantheon')options=field('swapReserve','保留调换次数','number',{min:0,max:3,step:1});
 if(id==='market')options=field('marketBudget','总仓位预算（可用饼干 %）','number',{min:0,max:100})+
  field('marketMinSamples','最低报价样本数','number',{min:5,max:2000,step:1})+
  field('marketProfit','最低净利 %','number',{min:0})+
  field('marketCap','单项仓位上限','number',{min:1,max:10000,step:1})+
  field('marketBuy','买入分位 ≤ %','number',{min:0,max:49})+
  field('marketSell','卖出分位 ≥ %','number',{min:51,max:100});
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
   ${managementFields(managementTab,c)}
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
 const route=job?facts([['正在执行',job.name],['当前阶段',({prepare:'转生前准备',ascending:'进入天堂',buying:'购买天堂升级',restarting:'开始下一轮'})[job.phase]]]):
  facts([['下一套目标',plan.name||'等待规划'],['状态',plan.reason],
   ...(plan.cost!=null?[['整套成本',F(plan.cost,0)+' 筹码'],['本轮应增加',F(plan.target,0)+' 声望']]:[]),
   ...(plan.deficit>0&&Number.isFinite(plan.seconds)?[['按无增益产量估算',T(plan.seconds)]]:[]),
   ...(plan.rows?.length?[['采购顺序',plan.rows.map(({upgrade})=>upgrade.dname||upgrade.name).join('、')]]:[])]);
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
 const bundleModes=growth?{...defaultManagement,season:'collection',research:'safe',ascension:'cycle'}:defaultManagement;
 const chosen=bundle?Object.fromEntries(Object.entries(bundleModes).filter(([key])=>!active[key]||growth&&key==='ascension'&&active[key]!=='cycle')):
  {[id]:managementDraft.get(id)||active[id]||catalog.modes[0][0]};
 const sugar=growth&&!C.managesLumps(g,current)&&!(current.lumpLevel&&current.lumpGoal?.saveId===saveId);
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
  ['养龙范围','孵化，训练最多至 5 级'],
  ...(growth?[
   ['跨轮经营','自动备份、转生、购买天堂升级、分配永久栏并重开'],
   ['额外授权',[
    '开启后台运行与刷新恢复',chosen.season?'按上限切换季节':'',chosen.research?'研究到冥界烤箱':'',
    sugar?'使用糖块解锁四个小游戏':''
   ].filter(Boolean).join('、')]
  ]:[])
 ]:[['托管目标',catalog.modes.find(([key])=>key===mode)[1]],['预计下一步',managementNext(g,next,id,mode)],
  ...(automatic?[['同意持续运行','开启刷新自动恢复'+(Object.keys(startup).length?'，补上'+Object.keys(startup).map(key=>managementModules[key].title).join('、'):'')]]:[])];
 const message=bundle?'魔法书会为预判到的点击狂热保留魔力。Haggler’s Charm 可推进序列，反噬时升级价格暂涨 2%。'+
  (growth?'已有的玩法配置继续生效，提醒模式会切换为自动转生。':''):
  managedScope(id,mode,current);
 ask(title,{rows,message:message+(engine.paused?'\n点击「继续」后执行。':''),button:'确认托管'},()=>{
  if(!C.compatible(engine.g)||engine.g.fullDate!==saveId)throw Error('存档已变化，请重新确认');
  engine.syncSharedSettings();
  const previous=engine.c.managed,valid=previous.saveId===saveId;
  const selections=valid?{...previous.modes}:{};
  for(const [key,value] of Object.entries(chosen)){
   if(!bundle||!selections[key]||growth&&key==='ascension')selections[key]=value;
  }
  for(const [key,value] of Object.entries(startup))if(!selections[key])selections[key]=value;
  const sugarStillFree=sugar&&!C.managesLumps(g,engine.c)&&!(engine.c.lumpLevel&&engine.c.lumpGoal?.saveId===saveId);
  engine.set({...(automatic?{remember:true}:{}),
   ...(growth?{background:true}:{}),
   ...(sugarStillFree?{lumpManaged:true,lumpManagedSave:saveId,lumpManagedMode:'unlocks'}:{}),
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
  if(key==='dragonMax'&&M.modes(engine.g,engine.c).dragon==='develop'&&Number(value)>engine.c.dragonMax){
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
