/* Cookie Pilot 2 · MIT · pure analysis, never mutates the game. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CookiePilotCore2=api;})(globalThis,function(){
'use strict';
const VERSION='2.0.0', SUPPORTED='2.058';
const AUTO=['click','golden','wrath','deer','fortune','purchase','harvest','plant','trade','cast','lump','wrinkler','pet','dragon','season','pantheon','aura','godzamok'];
const defaults={schema:2,theme:'system',density:'comfortable',challenge:'none',open:false,background:false,remember:false,ads:true,protectVeil:true,alerts:true,sound:false,rate:20,clickMode:'always',reserveMode:'none',reserve:0,holdCombo:true,purchaseMode:'efficient',target:'',blocked:[],maxBuilding:10000,bulk:1,
gardenMode:'seeds',seedA:'bakerWheat',seedB:'thumbcorn',gardenSpend:10,protectedTiles:[],replantLayout:'rows',harvestBuff:1,
spell:'hand of fate',castCondition:'frenzy',maxFail:15,magicReserve:0,prediction:false,predictOnlyGood:true,castCooldown:60,
marketBuy:20,marketSell:80,marketBudget:5,marketCap:100,marketMinSamples:30,marketProfit:2,marketThresholds:{},
lumpReserve:100,wrinklerKeep:10,protectShiny:true,dragonMax:27,aura0:-1,aura1:-1,swapReserve:1,gods:[-1,-1,-1],
godzamokBuildings:[],godzamokKeep:1,godzamokSell:100,seasonTarget:'',ascendTarget:365,heavenlyTarget:'',
updateChannel:'stable',releaseBase:'https://raw.githubusercontent.com/xqy272/CookiePilot/main/dist',updateCheck:true,backupMinutes:10,
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
 const enums={theme:['system','dark','light'],density:['comfortable','compact'],challenge:['none','noClick','noUpgrade','both'],clickMode:['always','buff'],reserveMode:['none','lucky','frenzy','custom'],purchaseMode:['efficient','target'],gardenMode:['seeds','mature','buff'],replantLayout:['rows','checker','fill'],castCondition:['full','frenzy','click'],updateChannel:['stable','beta'],seasonTarget:['','christmas','easter','halloween','valentines','fools']};
 for(const[k,values]of Object.entries(enums))if(values.includes(input[k]))c[k]=input[k];
 for(const k of ['seedA','seedB','target','spell','heavenlyTarget'])if(typeof input[k]==='string')c[k]=input[k].slice(0,150);
 for(const k of ['blocked','protectedTiles','godzamokBuildings'])if(Array.isArray(input[k]))c[k]=[...new Set(input[k].filter(x=>typeof x==='string'||Number.isInteger(x)))].slice(0,1000);
 if(Array.isArray(input.gods))c.gods=[0,1,2].map(i=>Math.floor(clamp(input.gods[i],-1,30,-1)));
 if(input.marketThresholds&&typeof input.marketThresholds==='object')for(const[k,v]of Object.entries(input.marketThresholds).slice(0,30))if(/^\d+$/.test(k)&&v&&typeof v==='object')c.marketThresholds[k]={buy:clamp(v.buy,0,1e9),sell:clamp(v.sell,0,1e9)};
 if(typeof input.releaseBase==='string'){try{const u=new URL(input.releaseBase);if(u.protocol==='https:'&&!u.username&&!u.password)c.releaseBase=u.href.replace(/\/$/,'');}catch{}}
 if(startup&&!c.remember)for(const k of AUTO)c[k]=false;return c;
}
function migrate(old){return config({...old,click:old.autoClick,purchase:old.autoBuy,deer:old.reindeer,ads:old.adHide,remember:old.rememberAutomation},true);}
const ready=g=>!!(g?.ready&&typeof g.ClickCookie==='function'&&Number.isFinite(g.cookies));
const compatible=g=>String(g?.version)===SUPPORTED||g?.cookiePilotTest===true;
function gate(g,c,e={}){if(!ready(g))return'等待游戏加载';if(!compatible(g))return'游戏版本未验证，自动化已暂停';if(e.paused)return'全部自动化已暂停';if(g.OnAscend||g.AscendTimer>0)return'转生中';if(g.promptOn)return'等待游戏对话框关闭';if(e.hidden&&!c.background)return'后台暂停';if(e.follower)return'另一游戏标签页正在运行';return'';}
const veil=(g,c)=>c.protectVeil&&has(g,'Shimmering veil [off]');
const clickBuff=g=>Object.values(g.buffs||{}).some(b=>num(b.multClick,1)>1||b.name==='Cursed finger');
const cpsBuff=g=>Object.values(g.buffs||{}).reduce((a,b)=>a*num(b.multCpS,1),1);
function reserve(g,c){if(c.reserveMode==='custom')return c.reserve;if(c.reserveMode==='lucky')return num(g.cookiesPs)*6000;if(c.reserveMode==='frenzy')return Math.max(num(g.cookiesPs),num(g.unbuffedCps)*7)*6000;return 0;}
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
 if(!ready(g))return[];const bank=reserve(g,c),income=Math.max(0,num(g.cookiesPs)*(1-num(g.cpsSucked)))+(c.click?num(g.computedMouseCps)*c.rate:0);let rows=[];
 for(const o of g.ObjectsById||[]){if(o.locked||o.amount>=c.maxBuilding)continue;const qty=Math.min(c.bulk,c.maxBuilding-o.amount);let price=qty===1?o.getPrice():o.getSumPrice?.(qty);if(!Number.isFinite(price))continue;rows.push({id:'b:'+o.id,name:o.dname||o.name,kind:'建筑',object:o,qty,price,...estimate(g,{building:o,qty}),auto:true});}
 for(const u of g.UpgradesInStore||[]){const cls=upgradeClass(g,u);if(['不可购买','保险库保护'].includes(cls))continue;let price=u.getPrice?.();if(!Number.isFinite(price))continue;const auto=['收益估算','功能升级'].includes(cls);rows.push({id:'u:'+u.id,name:u.dname||u.name,kind:cls,object:u,qty:1,price,...(auto?estimate(g,{upgrade:u}):{delta:0,click:0}),auto});}
 for(const r of rows){r.blocked=c.blocked.includes(r.id);r.gain=r.delta+(c.click?r.click*c.rate:0);r.eta=Math.max(0,r.price+bank-g.cookies)/(income||1e-300);r.pp=r.gain>0?r.price/r.gain:Infinity;r.score=r.eta+r.pp;r.affordable=g.cookies>=r.price+bank;r.priority=c.target===r.id;}
 return rows.sort((a,b)=>(b.priority-a.priority)||((a.blocked?1:0)-(b.blocked?1:0))||a.score-b.score||a.price-b.price);
}
function manaSeconds(m,target,fps=30){if(!m||target>m.magicM)return Infinity;let a=Math.max(0,m.magic),frames=0;while(a<target&&frames<2000000){a+=Math.max(.002,Math.sqrt(a/Math.max(m.magicM,100)))*.002;frames++;}return frames>=2000000?Infinity:frames/fps;}
// Independent ARC4-based seeded generator matching the game's string-seed stream.
// No calls to Math.seedrandom / Math.random; forecasts cannot change game RNG.
function rng(seed){const key=[],s=Array.from({length:256},(_,i)=>i);let smear=0;for(let j=0;j<seed.length;j++){const k=j&255;smear^=(key[k]||0)*19;key[k]=(smear+seed.charCodeAt(j))&255;}let j=0;for(let i=0;i<256;i++){j=(j+s[i]+key[i%key.length])&255;[s[i],s[j]]=[s[j],s[i]];}let x=0,y=0;const next=n=>{let r=0;while(n--){x=(x+1)&255;y=(y+s[x])&255;[s[x],s[y]]=[s[y],s[x]];r=r*256+s[(s[x]+s[y])&255];}return r;};next(256);return()=>{let a=next(6),b=281474976710656,c=0;while(a<4503599627370496){a=(a+c)*256;b*=256;c=next(1);}while(a>=9007199254740992){a/=2;b/=2;c>>>=1;}return(a+c)/b;};}
const effectNames={'frenzy':'生产狂热','multiply cookies':'幸运奖励','click frenzy':'点击狂热','cookie storm':'饼干风暴','blab':'无收益闲话','building special':'建筑增益','cookie storm drop':'风暴碎片','free sugar lump':'糖块','clot':'凝块减产','ruin cookies':'损失饼干','cursed finger':'诅咒手指','blood frenzy':'长者狂热'};
function forecast(g,count=6){const m=mini(g,'Wizard tower'),spell=m?.spells?.['hand of fate'];if(!m||!spell||!compatible(g))return[];return Array.from({length:count},(_,i)=>{const random=rng(String(g.seed)+'/'+(m.spellsCastTotal+i)),fail=random()>=1-m.getFailChance(spell);if(['valentines','fools','easter','halloween'].includes(g.season))random();random();random();let choices;if(!fail){choices=['frenzy','multiply cookies'];if(!g.hasBuff?.('Dragonflight'))choices.push('click frenzy');if(random()<.1)choices.push('cookie storm','cookie storm','blab');if(g.BuildingsOwned>=10&&random()<.25)choices.push('building special');if(random()<.15)choices=['cookie storm drop'];if(random()<.0001)choices.push('free sugar lump');}else{choices=['clot','ruin cookies'];if(random()<.1)choices.push('cursed finger','blood frenzy');if(random()<.003)choices.push('free sugar lump');if(random()<.1)choices=['blab'];}const effect=choices[Math.floor(random()*choices.length)];return{index:m.spellsCastTotal+i,fail,effect,label:effectNames[effect],good:['frenzy','click frenzy','building special','blood frenzy','free sugar lump'].includes(effect)};});}
function garden(g){const m=mini(g,'Farm');if(!m)return null;const cells=[];for(let y=0;y<6;y++)for(let x=0;x<6;x++){const unlocked=m.isTileUnlocked(x,y),tile=m.plot[y][x],p=m.plantsById[tile[0]-1];const rate=p?(p.ageTick+p.ageTickR/2)*num(m.plotBoost?.[y]?.[x]?.[0],1)*(1+.05*aura(g,'Supreme Intellect')):0;cells.push({x,y,key:x+','+y,unlocked,p,age:tile[1],mature:p&&tile[1]>=p.mature,eta:p?Math.max(0,p.mature-tile[1])/(rate||1e-300)*m.stepT:Infinity,death:p&&!p.immortal?(100-tile[1])/(rate||1e-300)*m.stepT:Infinity});}return{m,cells,next:Math.max(0,m.nextStep-Date.now())/1000};}
function mutations(g,x,y){const m=mini(g,'Farm');if(!m)return[];const n={},nm={};for(const k in m.plants){n[k]=0;nm[k]=0;}for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++){if(xx===x&&yy===y)continue;const t=m.getTile(xx,yy),p=m.plantsById[t[0]-1];if(p){n[p.key]++;if(t[1]>=p.mature)nm[p.key]++;}}return m.getMuts(n,nm).map(([k,p])=>({key:k,name:m.plants[k].name,chance:p}));}
function layout(g,c){const info=garden(g);if(!info)return[];const unlocked=info.cells.filter(t=>t.unlocked),minX=Math.min(...unlocked.map(t=>t.x)),minY=Math.min(...unlocked.map(t=>t.y));return unlocked.map(t=>({...t,seed:c.replantLayout==='fill'?c.seedA:(t.y-minY)%2?null:((t.x-minX)%2?c.seedB:c.seedA)}));}
function market(g,hist={}){const m=mini(g,'Bank');if(!m)return null;const overhead=1+.2*.95**m.brokers,scale=num(g.cookiesPsRawHighest);return{m,overhead,scale,goods:m.goodsById.filter(q=>q.active!==false).map(q=>{const samples=Array.isArray(hist[q.id])?hist[q.id]:[],price=m.getGoodPrice(q);return{q,price,buyCost:price*overhead*scale,capacity:m.getGoodMaxStock(q),samples:samples.length,percentile:samples.length?samples.filter(v=>v<=price).length/samples.length*100:null};})};}
function wrinklerValue(g,w){let v=w.sucked*1.1*(w.type===1?3:1)*(1+.2*aura(g,'Dragon Guts'));if(has(g,'Sacrilegious corruption'))v*=1.05;if(has(g,'Wrinklerspawn'))v*=1.05;v*=({1:1.15,2:1.1,3:1.05}[g.hasGod?.('scorn')]||1);return v;}
function prestige(g){const before=num(g.HowMuchPrestige?.(g.cookiesReset)),after=num(g.HowMuchPrestige?.(num(g.cookiesReset)+num(g.cookiesEarned)));return Math.max(0,Math.floor(after)-Math.floor(before));}
function semver(s){if(!/^\d+\.\d+\.\d+(?:-(?:beta|rc)\.\d+)?$/.test(s))throw Error('无效版本号');return s.split(/[.\-]/).map(x=>/^\d+$/.test(x)?Number(x):x);}
function newer(a,b){const x=semver(a),y=semver(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i];if(x.length===3||y.length===3)return x.length===3&&y.length>3;return (x[3]===y[3]?x[4]>y[4]:x[3]==='rc');}
return{VERSION,SUPPORTED,AUTO,defaults,config,migrate,num,clamp,has,aura,mini,ready,compatible,gate,veil,clickBuff,cpsBuff,reserve,fmt,time,escape,plain,upgradeClass,estimate,purchases,manaSeconds,rng,forecast,garden,mutations,layout,market,wrinklerValue,prestige,semver,newer};
});
