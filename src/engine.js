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
 'managed','ascendTarget','ascendCombo','comboWait','challenge','protectShiny','background','remember'];
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
   if(this.considerAscension(g,now))return;
    for(const[k,fn]of [['godzamok',this.godzamok],['cast',this.cast],['research',this.research],['season',this.season],['purchase',this.purchase],['harvest',this.harvest],['plant',this.plant],['trade',this.trade],['lump',this.lump],['lumpManaged',this.lumpManaged],['lumpLevel',this.lumpLevel],['wrinkler',this.wrinkler],['pet',this.pet],['dragon',this.dragon],['pantheon',this.pantheon],['aura',this.aura]]){
    if(k==='lump'&&C.managesLumps(g,this.c))continue;
    if(k==='harvest'&&M.modes(g,this.c).garden)continue;
    const run=M.execution(g,this.c);
     const config=k==='research'?{...run,research:!!M.modes(g,this.c).research}:run;
     this.attempt(k,()=>fn.call(this,run,now),config);
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
 considerAscension(g,now=Date.now()){
  if(M.modes(g,this.c).ascension!=='cycle'||this.ascentJob(g)||C.gate(g,this.c,this.env())||this.readRecord(PAUSE)===true)return false;
  if(this.c.challenge!=='none')return this.state('ascension','挑战保护：暂停自动转生');
  if(this.hooks.exclusive?.()===false)return this.state('ascension','自动转生需要浏览器独占锁');
  const plan=M.ascensionPlan(g,this.c);
  if(!plan.ready)return this.state('ascension',plan.reason);
  try{
   const run=M.execution(g,this.c);
   const prep=g.buyMode===-1?[]:M.ascensionPrep(g,run).rows.map(row=>({
    id:row.object.id,goal:row.goal,maxCost:row.cost,achievement:row.achievement.dname||row.achievement.name
   }));
   const combo=M.ascensionCombo(g,run,this.lastCast,now);
   this.backup('自动转生前 · '+plan.name,true);
   const job={saveId:g.fullDate,round:roundKey(g),resets:C.num(g.resets),names:plan.names,
    name:plan.name,target:plan.target,prep,phase:'prepare'};
   if(combo&&combo.seconds<=run.comboWait)job.combo={index:combo.index,until:now+run.comboWait*1000};
   this.saveAscent(g,job);
   return this.advanceAscent(g,job,now);
  }catch(error){return this.stopForRecovery('自动转生未继续：'+error.message);}
 }
 advancePending(now=Date.now()){
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
  try{return this.advanceAscent(g,job,now);}
  catch(error){return this.stopForRecovery('自动转生未继续：'+error.message);}
 }
 stopForRecovery(message){
  this.setPaused(true);
  this.state('system',message);
  this.writeFailure(message);
  return true;
 }
 advanceAscent(g,job,now=Date.now()){
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
  if(job.combo){
   const run=M.execution(g,this.c),book=C.mini(g,'Wizard tower');
   if(now<job.combo.until&&run.ascendCombo&&M.modes(g,this.c).magic&&run.click&&run.golden&&
      !C.veil(g,run)&&book?.spellsCastTotal===job.combo.index){
    const plan=this.spellPlan(g,run,now);
    return this.state('ascension',plan.reason||'转生前可叠加点击狂热');
   }
   const reason=now>=job.combo.until?'等待爆发超时':'爆发等待结束';
   this.log('转生前 · '+reason);
   job={...job,combo:null};
   this.saveAscent(g,job);
  }
  if(job.prep.length){
   const [item,...rest]=job.prep;
   const object=g.ObjectsById?.[item.id],quantity=item.goal-object?.amount;
   const cost=quantity>0&&M.ascensionPrepCost(object,quantity);
   const keep=C.reserve(g,this.c);
   const maxCost=Number.isFinite(item.maxCost)?item.maxCost:Math.max(0,g.cookies-keep)*.01;
   if(g.buyMode!==-1&&object&&!object.locked&&!this.c.blocked.includes('b:'+object.id)&&
      item.goal<=this.c.maxBuilding&&quantity>0&&quantity<=25&&Number.isFinite(cost)&&cost>=0&&
      cost<=maxCost&&cost<=g.cookies-keep){
    const previous=object.amount;
    object.buy(quantity);
    if(object.amount>previous){
     g.WriteSave();
     const achievement=item.achievement&&object.amount>=item.goal?' · '+item.achievement:'';
     this.log('转生前补齐 '+(object.dname||object.name)+' ×'+(object.amount-previous)+achievement,1);
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
  const job=M.modes(g,c).ascension==='cycle'?this.ascentJob(g):null;
  if(job?.phase==='prepare'&&job.round===roundKey(g)&&job.combo){
   const seconds=Math.max(0,(job.combo.until-now)/1000);
   const combo=M.ascensionCombo(g,c,this.lastCast,now);
   if(seconds>0&&combo?.index===job.combo.index&&C.cpsBuff(g)>=7&&!C.clickBuff(g)&&combo.seconds<=seconds)return combo;
   return {holding:true,seconds,reason:seconds>0?'转生前保留魔力，等待生产狂热':'转生前爆发等待已到上限'};
  }
  const key=[roundKey(g),book?.spellsCastTotal,c.managed.modes.magic].join('/');
  const since=this.magicHold?.key===key?this.magicHold.at:now;
  const plan=M.spellPlan(g,c,this.lastCast,now,since);
  if(track&&plan.holding&&this.magicHold?.key!==key)this.magicHold={key,at:now};
  return plan;
 }
 cast(c=this.c,now=Date.now()){
  const g=this.g,managed=M.modes(g,c).magic;
  const {m,spell,seconds,reason,key,detail}=managed?this.spellPlan(g,c,now,true):C.castPlan(g,c,this.lastCast,now);
  if(reason)return this.state('cast',reason+(Number.isFinite(seconds)?' · 约 '+C.time(seconds):''));
  this.backup('施法前');
  if(managed){
   if(!this.managedExecution('magic',g))return this.state('cast','魔法书托管已暂停');
   const fresh=this.spellPlan(g,M.execution(g,this.c),now);
   if(fresh.reason||fresh.key!==key||fresh.m!==m)return this.state('cast',fresh.reason||'施法条件已变化');
  }
  const before=key==='hand of fate'?new Set(g.shimmers):null;
  this.lastCast=now;
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
