import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const base=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read=async name=>(await fs.readFile(path.join(base,name),'utf8')).replace(/\r\n/g,'\n');
const write=async(name,text)=>{await fs.mkdir(path.dirname(path.join(base,name)),{recursive:true});await fs.writeFile(path.join(base,name),text);};
const pkg=JSON.parse(await read('package.json')),version=pkg.version;
const [core,engine,app,style]=await Promise.all(['src/core.js','src/engine.js','src/app.js','src/styles.css'].map(read));
if(!core.includes(`VERSION='${version}'`))throw Error('Source and package version differ');
const escaped=JSON.stringify(style).replace(/</g,'\\u003c');
const code=`/* Cookie Pilot ${version} · MIT · bundled locally; no remote executable code. */\n${core}\n;\n${engine}\n;\nwindow.CookiePilotStyles2=${escaped};\n${app}`;
const root='https://raw.githubusercontent.com/xqy272/CookiePilot/main/dist';
const channel=version.includes('-')?'beta':'stable';
const header=`// ==UserScript==
// @name         Cookie Pilot · 饼干领航员
// @namespace    https://github.com/xqy272/CookiePilot
// @version      ${version}
// @description  全流程 Cookie Clicker 中文助手：现代工作台、采购、花园、法术、股市、成长、存档与在线更新。
// @author       Cookie Pilot contributors
// @match        https://orteil.dashnet.org/cookieclicker/
// @match        http://orteil.dashnet.org/cookieclicker/
// @match        https://orteil.dashnet.org/cookieclicker/index.html
// @match        http://orteil.dashnet.org/cookieclicker/index.html
// @grant        none
// @sandbox      raw
// @run-at       document-idle
// @noframes
// @license      MIT
// @homepageURL  https://github.com/xqy272/CookiePilot
// @supportURL   https://github.com/xqy272/CookiePilot/issues
// @updateURL    ${root}/${channel}.meta.js
// @downloadURL  ${root}/${channel}.user.js
// ==/UserScript==
`;
const userscript=header+'\n'+code;
await write(`dist/${channel}.user.js`,userscript);await write(`dist/${channel}.meta.js`,header);await write('CookiePilot.user.js',userscript);await write('extension/pilot.bundle.js',code);
await write(`dist/${channel}.json`,JSON.stringify({schema:1,version,channel,gameVersions:['2.058'],notes:'加入万神殿阵容推荐与预算，以及糖块成熟收取和按路线连续分配的托管。',userscript:`${root}/${channel}.user.js`,zip:`https://github.com/xqy272/CookiePilot/releases/download/v${version}/CookiePilot-v${version}.zip`,sha256:crypto.createHash('sha256').update(userscript).digest('hex')},null,2));
if(channel==='stable'){
  let mirror=false;try{const prior=JSON.parse(await read('dist/beta.json'));mirror=prior.version===version;}catch{mirror=true;}
  if(mirror){
    const betaHeader=header.replaceAll('/stable.','/beta.');
    await write('dist/beta.user.js',betaHeader+'\n'+code);await write('dist/beta.meta.js',betaHeader);
    const meta=JSON.parse(await read('dist/stable.json'));meta.channel='beta';meta.notes='测试频道当前与稳定版一致。'+meta.notes;meta.userscript=root+'/beta.user.js';meta.sha256=crypto.createHash('sha256').update(betaHeader+'\n'+code).digest('hex');await write('dist/beta.json',JSON.stringify(meta,null,2));
  }
}
const manifest={manifest_version:3,name:'Cookie Pilot · 饼干领航员',version:version.split('-')[0],description:'Cookie Clicker 全流程中文助手：现代工作台、花园、魔法、股市、自动采购与备份。',minimum_chrome_version:'111',permissions:['declarativeNetRequest'],icons:{16:'icon16.png',48:'icon48.png',128:'icon128.png'},action:{default_title:'Cookie Pilot · 广告请求拦截',default_popup:'popup.html',default_icon:'icon48.png'},content_scripts:[{matches:['*://orteil.dashnet.org/cookieclicker/','*://orteil.dashnet.org/cookieclicker/index.html'],js:['pilot.bundle.js'],run_at:'document_idle',world:'MAIN'}],declarative_net_request:{rule_resources:[{id:'cookie_pilot_ads',enabled:true,path:'ad-rules.json'}]}};
await write('extension/manifest.json',JSON.stringify(manifest,null,2));
let installer=await read('tools/install-template.html');installer=installer.replace('__VERSION__',version).replace('__SCRIPT__',()=>JSON.stringify(userscript).replace(/</g,'\\u003c'));await write('开始使用.html',installer);
console.log(`Built Cookie Pilot ${version}: extension, userscript, update metadata, installer.`);
