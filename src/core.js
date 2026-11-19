/* Cookie Pilot 2 · MIT · pure analysis, never mutates the game. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CookiePilotCore2=api;})(globalThis,function(){
'use strict';
const VERSION='2.4.0', SUPPORTED='2.058';
const AUTO=['click','golden','wrath','deer','fortune','purchase','harvest','plant','trade','cast','lump','lumpLevel','lumpManaged','wrinkler','pet','dragon','season','pantheon','aura','godzamok'];
const MANAGED_MODES={
 events:['idle','burst'],purchase:['efficient'],garden:['seeds'],magic:['yield'],pantheon:['lineup'],
 market:['portfolio'],dragon:['hatch','develop'],season:['collection'],wrinklers:['yield','drops'],ascension:['notice']
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
spell:'hand of fate',castCondition:'frenzy',maxFail:15,magicReserve:0,prediction:false,predictOnlyGood:true,castCooldown:60,
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
function gate(g,c,e={}){if(!ready(g))return'等待游戏加载';if(!compatible(g))return'游戏版本未验证，自动化已暂停';if(e.paused)return'全部自动化已暂停';if(g.OnAscend||g.AscendTimer>0)return'转生中';if(g.promptOn)return'等待游戏对话框关闭';if(e.hidden&&!c.background)return'后台暂停';if(e.follower)return'另一游戏标签页正在运行';return'';}
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
const dangerous=new Set(['Chocolate egg','One mind','Communal brainsweep','Elder Pact','Bingo center/Research facility','Elder Pledge','Elder Covenant','Revoke Elder Covenant','Sugar frenzy','Sacrificial rolling pins']);
function upgradeClass(g,u){
 if(!u||u.bought||!u.unlocked)return'不可购买';if(u.isVaulted?.()||g.vault?.includes(u.id))return'保险库保护';
 if(u.priceLumps>0||u.pool==='prestige'||u.pool==='toggle'||u.pool==='tech'||u.pool==='debug'||u.clickFunction||u.choicesFunction||dangerous.has(u.name))return'特殊操作';
 if(useful.has(u.name))return'功能升级';
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
  r.gain=r.delta+(c.click?r.click*c.rate:0);
  r.keep=reserve(g,c,num(r.delta));
  r.shortfall=Math.max(0,r.price+r.keep-g.cookies);
  r.eta=waitTime(r.shortfall,income);
  r.pp=r.gain>0?r.price/r.gain:Infinity;
  r.score=r.eta+r.pp;
  r.affordable=r.shortfall===0;
  r.priority=c.target===r.id;
 }
 return rows.sort((a,b)=>(b.priority-a.priority)||((a.blocked?1:0)-(b.blocked?1:0))||a.score-b.score||a.price-b.price);
}
const passiveIncome=g=>Math.max(0,num(g.cookiesPs)*(1-num(g.cpsSucked)));
const waitTime=(shortfall,income)=>shortfall<=0?0:income>0?shortfall/income:Infinity;
function purchasePlan(g,c,{rows=purchases(g,c),bridgedTarget=''}={}){
 const noUpgrades=['noUpgrade','both'].includes(c.challenge);
 const eligible=row=>row.auto&&!row.blocked&&(!noUpgrades||row.id.startsWith('b:'));
 const target=c.purchaseMode==='efficient'
  ?rows.find(row=>eligible(row)&&(row.gain>0||row.priority))
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
