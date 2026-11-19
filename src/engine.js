(function(root,factory){const C=typeof module==='object'&&module.exports?require('./core.js'):root.CookiePilotCore2;const api=factory(C);if(typeof module==='object'&&module.exports)module.exports=api;else root.CookiePilotEngine2=api;})(globalThis,function(C){
'use strict';
const SETTINGS='cookie-pilot:settings:v2',BACKUPS='cookie-pilot:backups:v2',HISTORY='cookie-pilot:market:v2',PAUSE='cookie-pilot:paused';
const lumpKeys=['lumpGoal','lumpReserveMode','lumpReserve','lumpLevel'];
class Engine{
 constructor(getGame,storage,hooks={}){this.getGame=getGame;this.storage=storage;this.hooks=hooks;this.paused=false;this.locked=false;this.states={};this.logs=[];this.next={};this.clicks=0;this.picked=0;this.disposed=false;this.hist={};this.ledger={};this.marketTick=null;this.lastBackup=Date.now();this.lastCast=0;this.godzamokBuff=null;this.rebuy=[];this.protectedSnapshot=null;
  this.actions=0;
  this.runningMs=0;
  this.lastPulse=0;
  this.throttled=false;
  this.clickSample={at:Date.now(),total:0,rate:0};
  this.bridgedTarget='';
  this.startupHold=false;
  let saved;try{saved=JSON.parse(storage.getItem(SETTINGS)||'null');if(saved?.schema>2)throw Error('设置来自更新版本');this.c=saved?C.config(saved):C.migrate(JSON.parse(storage.getItem('cookie-pilot:settings:v1')||'{}'));const h=JSON.parse(storage.getItem(HISTORY)||'{}');if(h&&typeof h==='object'){this.hist=h.hist||{};this.ledger=h.ledger||{};this.historyContext=h.context;}
   this.paused=storage.getItem(PAUSE)==='true';
   this.startupHold=!this.paused&&!this.c.remember&&C.AUTO.some(key=>this.c[key]);
   if(this.startupHold)this.paused=true;
  }
  catch(e){this.c=C.config();this.paused=true;this.log('设置恢复失败：'+e.message);}
  this.savedVersion=saved?.version||'1';
 }
 get g(){return this.getGame();}
 env(){return{paused:this.paused,hidden:this.hooks.hidden?.()||false,follower:C.AUTO.some(k=>this.c[k])&&!this.locked};}
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
 savedLumpSettings(){
  try{
   const saved=JSON.parse(this.storage.getItem(SETTINGS));
   if(saved?.schema!==2)return null;
   const settings=C.config(saved);
   return Object.fromEntries(lumpKeys.map(key=>[key,settings[key]]));
  }catch{return null;}
 }
 syncLumpSettings(){
  const saved=this.savedLumpSettings();
  if(!saved)return false;
  Object.assign(this.c,saved);
  return true;
 }
 persist(update={}){
  try{
   const saved=this.savedLumpSettings();
   if(saved)for(const key of lumpKeys)if(!Object.hasOwn(update,key))this.c[key]=saved[key];
   if(!this.c.lumpGoal)this.c.lumpLevel=false;
   this.storage.setItem(SETTINGS,JSON.stringify({...this.c,version:C.VERSION}));
  }catch(e){this.paused=true;this.log('设置保存失败，自动化已暂停：'+e.message);}
 }
 log(text,actions=0){this.actions+=actions;this.logs.unshift({at:Date.now(),text});this.logs.length=Math.min(this.logs.length,120);this.hooks.log?.(text);}
 state(k,text){this.states[k]=text;return false;}
 backups(){try{const rows=JSON.parse(this.storage.getItem(BACKUPS)||'[]');return Array.isArray(rows)?rows.filter(x=>x&&typeof x.save==='string'&&Number.isFinite(x.at)).slice(0,15):[];}catch{return[];}}
 backup(label='手动备份',pin=false){const g=this.g;if(!C.ready(g)||g.OnAscend||g.AscendTimer>0)throw Error('游戏未就绪或正在转生');const save=g.WriteSave(1);if(typeof save!=='string'||!save.length||save.length>2000000)throw Error('未取得有效存档');this.backupSerial=(this.backupSerial||0)+1;const entry={id:Date.now()+'-'+this.backupSerial,at:Date.now(),label,save,settings:structuredClone(this.c),pin,version:String(g.version)};const old=this.backups();const pinned=old.filter(x=>x.pin).slice(0,pin?4:5),normal=old.filter(x=>!x.pin).slice(0,9);this.storage.setItem(BACKUPS,JSON.stringify([entry,...pinned,...normal]));this.lastBackup=Date.now();return entry;}
 manualGate(){const reason=C.gate(this.g,this.c);if(reason)throw Error(reason);}
 attempt(k,fn){if(!this.c[k])return this.state(k,'已关闭');const reason=C.gate(this.g,this.c,this.env());if(reason)return this.state(k,reason);if(['noClick','both'].includes(this.c.challenge)&&k==='click')return this.state(k,'无点击挑战保护');if(['noUpgrade','both'].includes(this.c.challenge)&&['season','dragon','lumpLevel'].includes(k))return this.state(k,'无升级挑战保护');try{return fn.call(this);}catch(e){this.c[k]=false;this.persist({[k]:false});this.state(k,'发生错误，已关闭');this.log((k==='lumpLevel'?'糖块升级':k)+' 已停止：'+e.message);return false;}}
 click(now=performance.now()){this.attempt('click',()=>{if(C.veil(this.g,this.c))return this.state('click','面纱保护中');if(this.c.clickMode==='buff'&&!C.clickBuff(this.g))return this.state('click','等待点击增益');if(now<(this.next.click||0))return;this.next.click=now+1000/this.c.rate;const before=this.g.cookieClicks;this.g.ClickCookie();this.clicks+=Math.max(0,this.g.cookieClicks-before);this.state('click','运行中 · '+this.c.rate+' 次/秒目标');});}
 persistMarket(){try{this.storage.setItem(HISTORY,JSON.stringify({hist:this.hist,ledger:this.ledger,context:this.historyContext}));}catch{}}
 sampleMarket(){const g=this.g,m=C.mini(g,'Bank');if(!m)return;const context=[g.startDate,g.Objects.Bank.level,g.dragonAura,g.dragonAura2].join(':');if(context!==this.historyContext){this.hist={};this.ledger={};this.marketTick=null;this.historyContext=context;}
  const marker=m.tickT!==undefined?String(m.tickT):Math.floor(Date.now()/60000);if(this.marketTick!==null&&num(m.tickT)<num(this.marketTick)||this.marketTick===null||m.tickT===undefined&&marker!==this.marketTick){for(const q of m.goodsById){const rows=Array.isArray(this.hist[q.id])?this.hist[q.id]:[];rows.push(m.getGoodPrice(q));this.hist[q.id]=rows.filter(Number.isFinite).slice(-2000);}if(this.locked||!C.AUTO.some(key=>this.c[key]))this.persistMarket();}this.marketTick=marker;
 }
 pulse(now=Date.now()){
  if(this.disposed)return;
  if(C.ready(this.g)&&this.savedVersion!==C.VERSION&&!this.g.OnAscend&&!this.g.AscendTimer){try{this.backup('升级前设置与存档',true);this.savedVersion=C.VERSION;this.persist();this.log('已迁移至 '+C.VERSION);}catch(e){this.paused=true;this.state('system','迁移备份失败');}}
  this.sampleMarket();
  const active=C.AUTO.some(key=>this.c[key])&&!C.gate(this.g,this.c,this.env());
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
   });
  }
  this.attempt('fortune',()=>{
   const g=this.g,effect=g.TickerEffect;
   if(effect?.type==='fortune'&&g.tickerL?.click){
    g.tickerL.click();
    if(g.TickerEffect!==effect){this.picked++;this.log('收取幸运新闻',1);}
   }
   return this.state('fortune','等待幸运新闻');
  });
  if(now>=(this.next.slow||0)){this.next.slow=now+1000;
   for(const[k,fn]of [['godzamok',this.godzamok],['cast',this.cast],['purchase',this.purchase],['harvest',this.harvest],['plant',this.plant],['trade',this.trade],['lump',this.lump],['lumpLevel',this.lumpLevel],['wrinkler',this.wrinkler],['pet',this.pet],['dragon',this.dragon],['pantheon',this.pantheon],['aura',this.aura],['season',this.season]])this.attempt(k,fn);
  }
  if(C.ready(this.g)&&!this.g.OnAscend&&!this.g.AscendTimer&&!this.g.promptOn&&now-this.lastBackup>=this.c.backupMinutes*60000){try{this.backup('自动快照');}catch(e){this.lastBackup=now;this.log('自动备份失败：'+e.message);}}
 }
 purchase(){
  const g=this.g,c=this.c;
  if(g.buyMode===-1)return this.state('purchase','商店处于出售模式');
  if(this.rebuy.length)return this.restoreBuildings();
  if(c.holdCombo&&C.clickBuff(g))return this.state('purchase','爆发期间保留资源');
  if(c.purchaseMode==='plan'&&c.target.startsWith('u:')&&g.UpgradesById?.[Number(c.target.slice(2))]?.bought){
   this.set({purchaseMode:'efficient',target:''});
   return this.state('purchase','规划升级已完成，等待下一笔采购');
  }
  const plan=C.purchasePlan(g,c,{bridgedTarget:this.bridgedTarget});
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
 plant(){
  const g=this.g,c=this.c,info=C.garden(g);
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
 trade(){
  const g=this.g,c=this.c,data=C.market(g,this.hist);
  if(!data)return this.state('trade','银行升至 1 级解锁股市');
  if(c.holdCombo&&C.clickBuff(g))return this.state('trade','爆发期间暂停交易');
  const budget=Math.max(0,g.cookies-C.reserve(g,c))*c.marketBudget/100;
  for(const row of data.goods){
   const q=row.q,t=c.marketThresholds[q.id],custom=t&&t.buy<t.sell;
   const sampled=row.samples>=c.marketMinSamples;
   const low=custom?row.price<=t.buy:sampled&&row.percentile<=c.marketBuy;
   const high=custom?row.price>=t.sell:sampled&&row.percentile>=c.marketSell;
   const lot=this.ledger[q.id];
   if(lot&&lot.stock!==q.stock){delete this.ledger[q.id];this.persistMarket();}
   const basis=this.ledger[q.id]?.cost;
   const units=q.stock;
   if(high&&units>0&&Number.isFinite(basis)&&row.price>=basis*(1+c.marketProfit/100)&&q.last!==1&&data.m.sellGood(q.id,units)){
    delete this.ledger[q.id];
    this.persistMarket();
    this.log('股市卖出 '+q.name+' ×'+units+' · 扣除买入手续费净额 $'+C.fmt((row.price-basis)*units),1);
    return this.state('trade','已卖出 '+q.name);
   }
   const n=Math.min(c.marketCap-units,row.capacity-units,Math.floor(budget/(row.buyCost||Infinity)));
   if(low&&units===0&&q.last!==2&&n>0&&data.m.buyGood(q.id,n)){
    this.ledger[q.id]={stock:q.stock,cost:row.price*data.overhead};
    this.persistMarket();
    this.log('股市买入 '+q.name+' ×'+q.stock+' · 含费单价 $'+C.fmt(row.price*data.overhead),1);
    return this.state('trade','已买入 '+q.name);
   }
  }
  return this.state('trade','等待报价与样本');
 }
 cast(){
  const {m,spell,seconds,reason}=C.castPlan(this.g,this.c,this.lastCast);
  if(reason)return this.state('cast',reason+(Number.isFinite(seconds)?' · 约 '+C.time(seconds):''));
  this.backup('施法前');
  this.lastCast=Date.now();
  if(!m.castSpell(spell))return this.state('cast','游戏拒绝施法');
  this.log('施放 '+spell.name+' · 剩 '+C.fmt(m.magic)+' 魔力',1);
  return this.state('cast','已施法');
 }
 lump(){
  const g=this.g,window=C.lumpWindow(g);
  if(!window)return this.state('lump','糖块尚未解锁');
  if(window.remaining)return this.state('lump','等待安全成熟 · '+C.time(window.remaining));
  if(window.overripe)return this.state('lump','等待游戏自动掉落');
  const previous=g.lumpT,balance=g.lumps;
  this.backup('糖块收取前');
  const fresh=C.lumpWindow(g);
  if(!fresh||fresh.remaining||fresh.overripe||g.lumpT!==previous)return this.state('lump','糖块周期已变化，重新检查');
  g.clickLump();
  if(g.lumpT===previous)return this.state('lump','游戏暂未确认收取');
  const gained=g.lumps-balance;
  this.log(gained>0?'安全收取 '+gained+' 颗糖块':'游戏已结算成熟糖块 · 本次获得 0 颗',1);
  return this.state('lump','等待下一颗糖块');
 }
 lumpLevel(){
  const key='lumpLevel',g=this.g;
  if(!this.syncLumpSettings()||!this.c.lumpLevel)return this.state(key,'等待确认等级目标');
  const goal=this.c.lumpGoal,plan=C.lumpPlan(g,this.c);
  const finish=()=>{
   this.set({lumpLevel:false});
   this.log('糖块目标达成 · '+plan.name+' '+plan.target+' 级');
   return this.state(key,'已达到目标等级');
  };
  if(plan.status==='done')return finish();
  if(plan.status!=='ready')return this.state(key,plan.reason);
  this.backup('挂机糖块升级前',true);

  if(!this.syncLumpSettings()||!this.c.lumpLevel||
     goal.buildingId!==this.c.lumpGoal.buildingId||goal.level!==this.c.lumpGoal.level||
     goal.saveId!==this.c.lumpGoal.saveId||goal.fromLevel!==this.c.lumpGoal.fromLevel){
   return this.state(key,'等级目标已变化，重新检查');
  }
  const gate=C.gate(this.g,this.c,this.env());
  if(gate||this.storage.getItem(PAUSE)==='true')return this.state(key,gate||'全部自动化已暂停');
  if(this.g!==g)return this.state(key,'当前存档已变化，重新检查');
  if(['noUpgrade','both'].includes(this.c.challenge))return this.state(key,'无升级挑战保护');
  const fresh=C.lumpPlan(g,this.c);
  if(fresh.status!=='ready')return this.state(key,fresh.reason);
  if(fresh.object!==plan.object||fresh.current!==plan.current)return this.state(key,'建筑等级已变化，重新检查');

  const {object,current,nextCost}=fresh;
  const balance=g.lumps,prefs=g.prefs,askLumps=prefs?.askLumps;
  // The player already confirmed this exact goal. Keep the game preference for all other spending.
  try{
   if(askLumps)prefs.askLumps=0;
   object.levelUp();
  }finally{
   if(askLumps)prefs.askLumps=askLumps;
  }
  if(object.level!==current+1||g.lumps!==balance-nextCost)throw Error('游戏未确认升级与糖块扣款，请检查建筑后重新启用');
  this.log('糖块升级 · '+fresh.name+' '+current+' → '+object.level+' 级 · 花费 '+nextCost+' 颗 · 剩 '+g.lumps+' 颗',1);
  if(object.level>=fresh.target)return finish();
  return this.state(key,'已升至 '+object.level+' 级');
 }
 wrinkler(){
  const g=this.g,c=this.c,list=(g.wrinklers||[]).filter(w=>w.phase===2&&w.hp>0);
  if(list.length<=c.wrinklerKeep)return this.state('wrinkler','保留 '+c.wrinklerKeep+' 只');
  const target=list.filter(w=>!c.protectShiny||w.type!==1).sort((a,b)=>b.sucked-a.sucked)[0];
  if(!target)return this.state('wrinkler','闪光保护中');
  target.hp=0;
  this.log('收取'+(target.type===1?'闪光':'普通')+'皱纹虫 · 估算 '+C.fmt(C.wrinklerValue(g,target))+' 饼干',1);
  return this.state('wrinkler','等待游戏结算');
 }
 pet(){
  const g=this.g;
  if(!C.has(g,'Pet the dragon')||g.dragonLevel<4)return this.state('pet','等待解锁抚摸龙');
  if(g.specialTab!=='dragon')return this.state('pet','打开原游戏的龙面板后运行');
  const missing=['Dragon scale','Dragon claw','Dragon fang','Dragon teddy bear'].filter(name=>!C.has(g,name)&&!g.HasUnlocked?.(name));
  if(!missing.length)return this.state('pet','本轮龙掉落已收集');
  g.ClickSpecialPic();
  const found=missing.filter(name=>C.has(g,name)||g.HasUnlocked?.(name));
  if(found.length)this.log('龙掉落：'+found.map(name=>g.Upgrades[name]?.dname||name).join('、'),found.length);
  return this.state('pet','抚摸龙 · 每秒一次');
 }
 dragon(){
  const g=this.g,before=g.dragonLevel;
  if(!C.has(g,'A crumbly egg'))return this.state('dragon','尚未获得龙蛋');
  if(before>=Math.min(this.c.dragonMax,g.dragonLevels.length-1))return this.state('dragon','达到目标等级');
  const step=g.dragonLevels[before];
  if(!step?.cost?.())return this.state('dragon','等待材料 · '+C.plain(step?.costStr?.()));
  if(before<5&&g.cookies-1000000*2**before<C.reserve(g,this.c))return this.state('dragon','龙升级受到库存保留线限制');
  this.backup('龙升级前');
  g.UpgradeDragon();
  if(g.dragonLevel<=before)return this.state('dragon','等待游戏确认训练');
  this.log('龙升至 '+g.dragonLevel+' 级',1);
  return this.state('dragon','升级完成');
 }
 pantheon(){
  const m=C.mini(this.g,'Temple'),c=this.c;
  if(!m)return this.state('pantheon','神庙升至 1 级解锁');
  for(let slot=0;slot<3;slot++){
   const id=c.gods[slot];
   if(id<0||m.slot[slot]===id)continue;
   const god=m.godsById[id];
   if(!god)return this.state('pantheon','无效神灵');
   if(c.gods.filter(target=>target===id).length>1)return this.state('pantheon','同一神灵不能配置两次');
   if(m.swaps-1<c.swapReserve)return this.state('pantheon','等待调换次数，保留 '+c.swapReserve+' 次');
   this.backup('神灵调换前');
   if(m.dragGod&&m.hoverSlot&&m.dropGod){m.dragGod(god);m.hoverSlot(slot);m.dropGod();}
   else{m.useSwap(1);m.slotGod(god,slot);}
   if(m.slot[slot]!==id)return this.state('pantheon','等待游戏确认神灵调换');
   this.log('设置神灵 '+god.name+' · 剩余 '+m.swaps+' 次调换',1);
   return this.state('pantheon','已配置槽位 '+(slot+1));
  }
  return this.state('pantheon','神灵方案已匹配');
 }
 aura(){const g=this.g;for(let slot=0;slot<2;slot++){const target=this.c['aura'+slot],current=slot?g.dragonAura2:g.dragonAura;if(target<0||target===current)continue;if(!g.dragonAuras?.[target]||g.dragonLevel<target+4||slot===1&&g.dragonLevel<g.dragonLevels.length-1)return this.state('aura','目标光环或第二槽位未解锁');if(target!==0&&target===(slot?g.dragonAura:g.dragonAura2))return this.state('aura','两个槽位不能配置同一光环');this.backup('光环切换前');const highest=[...g.ObjectsById].reverse().find(o=>o.amount>0);if(highest)highest.sacrifice(1);if(slot)g.dragonAura2=target;else g.dragonAura=target;g.recalculateGains=1;this.log('光环切换 '+(g.dragonAuras[target].dname||g.dragonAuras[target].name));return this.state('aura','已切换光环');}this.state('aura','光环方案已匹配');}
 season(){
  const g=this.g,key=this.c.seasonTarget;
  if(!key||g.season===key)return this.state('season',key?'已处于目标季节':'请选择目标季节');
  const season=g.seasons?.[key],upgrade=g.Upgrades?.[season?.trigger];
  if(!upgrade?.unlocked)return this.state('season','季节切换尚未解锁');
  if(g.cookies-upgrade.getPrice()<C.reserve(g,this.c))return this.state('season','切换成本超过预算');
  this.backup('季节切换前');
  upgrade.buy();
  if(g.season!==key)return this.state('season','等待游戏确认季节切换');
  this.log('切换季节 '+season.name,1);
  return this.state('season','已切换季节');
 }
 godzamok(){const g=this.g,c=this.c;if(this.rebuy.length)return this.restoreBuildings();const active=Object.values(g.buffs||{}).find(b=>num(b.multClick,1)>1);if(!active){this.godzamokBuff=null;return this.state('godzamok','等待点击爆发');}if(this.godzamokBuff===active)return this.state('godzamok','本次增益已执行');if(!g.hasGod?.('ruin'))return this.state('godzamok','Godzamok 尚未入槽');if(g.buyMode===-1)return this.state('godzamok','出售模式下暂停组合执行');const list=c.godzamokBuildings.map(id=>g.ObjectsById[Number(id)]).filter(Boolean).map(o=>({o,n:Math.min(c.godzamokSell,Math.max(0,o.amount-c.godzamokKeep))})).filter(x=>x.n>0);if(!list.length)return this.state('godzamok','请选择可出售建筑及数量');const buyback=list.reduce((s,{o,n})=>s+o.getSumPrice(n),0);if(g.cookies-buyback<C.reserve(g,c))return this.state('godzamok','等待足额回购预算');this.backup('Godzamok 出售前',true);this.godzamokBuff=active;this.rebuy=list.map(({o})=>({id:o.id,target:o.amount}));for(const {o,n}of list)o.sell(n,1);this.log('Godzamok 出售已执行，开始回购');this.restoreBuildings();}
 restoreBuildings(){const g=this.g;if(g.buyMode===-1)return this.state('godzamok','等待退出出售模式后回购');const next=this.rebuy[0];if(!next)return;const o=g.ObjectsById[next.id],n=Math.max(0,next.target-o.amount);if(!n){this.rebuy.shift();return;}const cost=o.getSumPrice(n);if(g.cookies-cost<C.reserve(g,this.c))return this.state('godzamok','回购预算不足，采购等待');o.buy(n);if(o.amount>=next.target)this.rebuy.shift();this.state('godzamok',this.rebuy.length?'继续回购':'回购完成');}
 dispose(){this.disposed=true;}
}
const num=C.num;
return{Engine,SETTINGS,BACKUPS,HISTORY,PAUSE};
});
