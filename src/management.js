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
 trade:'market',dragon:'dragon',pet:'dragon',aura:'dragon',season:'season',wrinkler:'wrinklers'
};
const moduleForRule=rule=>ruleOwners[rule]||'';
const configured=c=>Object.keys(c.managed.modes).length>0;
const modes=(g,c)=>g?.fullDate===c.managed.saveId?c.managed.modes:{};
const pending=c=>configured(c)||C.AUTO.some(rule=>c[rule]);
function active(g,c){
 const run=execution(g,c);
 return C.AUTO.some(rule=>run[rule])||!!modes(g,c).ascension;
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
   if(plan.target)return{...plan,unlock:item.feature};
  }
 }
 return C.purchasePlan(g,c,options);
}

function spellPlan(g,c,lastCast,now=Date.now()){
 const m=C.mini(g,'Wizard tower');
 if(!m)return{reason:'巫师塔升至 1 级解锁魔法书'};
 if(C.veil(g,c))return{reason:'面纱保护中'};
 const roll=C.rng(String(g.seed)+'/'+m.spellsCastTotal)();
 const known=(key)=>m.spells[key];
 const success=(key)=>known(key)&&roll<1-m.getFailChance(known(key));
 const hand='hand of fate',conjure='conjure baked goods',charm="haggler's charm";
 const burst=C.cpsBuff(g)>=7||C.clickBuff(g);
 const forecast=burst&&success(hand)?C.forecast(g,1)[0]:null;
 let key,reason;
 if(forecast?.good&&!forecast.fail&&m.getSpellCost(known(hand))+c.magicReserve<=m.magicM){
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

return{configured,modes,pending,active,owner,moduleForRule,execution,pantheonLineup,purchasePlan,spellPlan,gardenPlan,marketOrder,wrinklerMode,wrinklerPlan,dragonPlan,dragonDrops,growthAura,seasonPlan};
});
