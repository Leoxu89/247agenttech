(()=>{
'use strict';const S=PocketStore;let busy=false,queue=[],uploading=null,lastCapture=0,status='尚未保存',generation=0,conflicting=false;
const A=()=>window.PocketAPI;
const key=(a,slot)=>'a:'+a.id+':'+slot;
function notify(message){status=message;const node=document.getElementById('p-save-status');if(node)node.textContent=message;}
function nativeFiles(id){const files=[];for(const kind of ['user','login'])for(const suffix of ['.o','.o.gz']){const p='/mudlib/data/'+kind+'/'+id[0]+'/'+id+suffix;try{files.push([p,S.encode(driver.FS.readFile(p))]);}catch{}}return files;}
async function capture(kind='auto'){
 const a=S.active(),state=A()?.getState();if(conflicting||!a||a.pending||!state?.ready||state.player.ghost||state.player.qi<0||state.player.jing<0||state.unconscious||state.player.fighting||state.enemies?.length)return null;
 if(busy){if(kind==='manual'){while(busy)await new Promise(r=>setTimeout(r,30));return capture(kind);}return null;}
 busy=true;
 try{const r=JSON.parse(await driver.fluffos.callLPC('pocket_checkpoint'));if(!r.ok){if(kind==='manual')throw Error(r.message);return null;}
  const files=nativeFiles(r.id);if(files.length<2)throw Error('角色文件不完整，保留此前存档');
  const save={schema:4,native:a.profile.native,room:r.room,inventory:r.inventory,session:r.session,growth:r.growth,files,savedAt:new Date().toISOString(),kind,pendingUpload:!a.legacy};
  await S.retain(a,save);lastCapture=Date.now();
  if(a.legacy)notify('仅本机 · '+new Date().toLocaleTimeString('zh-CN'));else{notify('本机已保存 · 正在同步');const old=queue.findIndex(x=>x.kind===kind&&kind!=='manual');if(old>=0)queue.splice(old,1);queue.push({save,kind,generation});flush().catch(()=>{});}return save;
 }finally{busy=false;}
}
async function flush(){
 if(conflicting)throw Error('请先选择继续本机或云端存档');
 if(uploading)return uploading;
 const mine=generation;
 uploading=(async()=>{while(queue.length){const item=queue[0],a=S.active();if(!a||a.pending||a.legacy||mine!==generation)break;
  try{const data=await PocketAccounts.request('/saves',{save:{...item.save,pendingUpload:false},kind:item.kind,expectedRevision:a.revision});a.revision=data.revision;S.select(a);item.save.pendingUpload=false;item.save.cloudId=data.id;item.save.cloudAt=data.savedAt;queue.shift();
   await S.retain(a,item.save,[],true);
   notify('已同步云端 · '+new Date(data.savedAt).toLocaleTimeString('zh-CN'));
  }catch(e){notify(e.status===409?'存档冲突 · 请选择继续的进度':'云端未同步 · 本机进度已保留');if(e.status===409){conflicting=true;setTimeout(()=>resolveConflict().catch(e=>A().note(e.message)),0);}throw e;}
 }})();try{return await uploading;}finally{uploading=null;}
}
async function onLogin(){const a=S.active();const head=await S.read(key(a,'head'));if(head?.pendingUpload){queue.push({save:head,kind:head.kind||'auto',generation});flush().catch(()=>{});}else notify(a.legacy?'本机旧游客 · 尚未迁移':'已载入云端存档');if(!head?.room)setTimeout(()=>capture('manual').catch(e=>A().note(e.message)),500);}
async function latest(slot){const a=S.active();return a?await S.read(key(a,slot)):null;}
async function restore(save){if(!save?.room||!save?.inventory)throw Error('这个旧存档没有完整检查点，请选择其他存档');const a=S.active();generation++;queue=[];
 if(!a.legacy){if(uploading)try{await uploading;}catch{}let r;try{r=await PocketAccounts.request('/saves',{save,kind:'restore',expectedRevision:a.revision});}catch(e){if(e.status===409)await resolveConflict();throw e;}a.revision=r.revision;save={...save,savedAt:r.savedAt,kind:'restore',cloudId:r.id};}
 await S.retain(a,{...save,pendingUpload:false});a.pending=true;S.select(a);location.reload();}
async function loadCloudSlots(){const a=S.active();if(!a||a.legacy)return;try{const data=await PocketAccounts.request('/saves'),records=[];for(const meta of data.saves.slice(0,3)){const r=await PocketAccounts.request('/saves/'+meta.id);if(r.save)records.push({...r.save,savedAt:r.save.savedAt||meta.savedAt,kind:meta.kind,pendingUpload:false,cloudId:r.id});}const head=await S.read(key(a,'head'));await S.retain(a,head,records);}catch(e){A().note('历史存档暂不可用，可稍后在账号与存档中重试。');}}
async function cloudHistory(){const api=A(),b=api.show('云端存档历史');b.append(api.el('p','p-hint','正在读取这个账号的历史存档…'));try{const data=await PocketAccounts.request('/saves');b.replaceChildren();for(const meta of data.saves){b.append(api.button((meta.kind==='manual'?'手动':'自动 / 检查点')+' · '+meta.roomName+' · '+new Date(meta.savedAt).toLocaleString('zh-CN'),async()=>{const r=await PocketAccounts.request('/saves/'+meta.id);const c=api.show('恢复云端存档');c.append(api.el('p','p-hint','将从所选时间继续游戏。'),api.button('确认恢复',()=>restore(r.save).catch(e=>api.note(e.message))));},'p-row'));}if(!data.saves.length)b.append(api.el('p','p-hint','尚无云端存档'));}catch(e){b.append(api.el('p','p-hint',e.message));}}
async function manager(){const api=A(),a=S.active(),b=api.show('账号与存档');b.append(api.el('p','p-hint',(a?.username||'未登录')+' · '+status+'。本机和云端各保留最近3个版本，较早版本会自动清理。'));
 b.append(api.button('立即保存并同步',async()=>{try{await capture('manual');await flush();manager();}catch(e){api.note(e.message);}}));
 b.append(api.button('重试云端同步',async()=>{try{await flush();manager();}catch(e){api.note(e.message);}}));
 b.append(api.button('重试历史存档',async()=>{await loadCloudSlots();manager();}));
 const records=await S.read(key(a,'history'))||[];for(const record of records.slice(0,3)){const btn=api.button((record.kind==='manual'?'手动存档':record.kind==='checkpoint'?'路径检查点':'自动存档')+' · '+record.room?.name+' · '+new Date(record.savedAt).toLocaleTimeString('zh-CN'),()=>{const c=api.show('恢复这个存档');c.append(api.el('p','p-hint','恢复后重新载入游戏，仍只保留最近3个版本。'),api.button('确认恢复',()=>restore(record).catch(e=>api.note(e.message))));},'p-row');b.append(btn);}
 if(a&&!a.legacy)b.append(api.button('查看云端历史（其他设备可用）',cloudHistory),api.button('退出账号',()=>PocketAccounts.logout().catch(e=>api.note(e.message))));
}

async function resolveConflict(local,cloud,account){
 const a=account||S.active();if(!a)return;
 conflicting=true;window.PocketEnginePaused=true;window.PocketMap?.pause();window.PocketIdle?.stop('存档冲突，等待选择');
 let panel=document.getElementById('p-save-conflict');if(panel)panel.remove();panel=document.createElement('section');panel.id='p-save-conflict';panel.className='p-conflict';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','选择继续的存档');const b=document.createElement('div');panel.append(b);document.body.append(panel);
 const api=A();b.append(api.el('h2','','选择继续的存档'));const hint=api.el('p','p-hint','检测到本机与云端的进度不同。游戏已暂停，由你决定继续哪一份进度。版本记录最多保留3份。');b.append(hint);
 try{
 local=local||await S.read(key(a,'head'));cloud=cloud||await PocketAccounts.request('/saves/head',null,a);
 const remote=cloud.save?{...cloud.save,savedAt:cloud.savedAt||cloud.save.savedAt,cloudId:cloud.id,kind:cloud.kind||cloud.save.kind,pendingUpload:false}:null;
 for(const [label,record]of [['本机',local],['云端',remote]]){const card=api.el('article');card.append(api.el('strong','',label),api.el('p','',record?((record.room?.name||'角色创建')+' · '+new Date(record.savedAt).toLocaleString('zh-CN')+'\n经验 '+(record.growth?.exp??'—')+' · 潜能 '+(record.growth?.potential??'—')):'暂无存档'));b.append(card);}
 const choose=async useLocal=>{const buttons=b.querySelectorAll('button');buttons.forEach(x=>x.disabled=true);hint.textContent='正在载入所选进度…';
  try{let chosen=useLocal?local:remote;if(!chosen)throw Error('该位置没有可用存档');generation++;queue=[];
   if(useLocal){const result=await PocketAccounts.request('/saves',{save:{...chosen,pendingUpload:false},kind:'restore',expectedRevision:cloud.revision},a);a.revision=result.revision;chosen={...chosen,savedAt:result.savedAt,cloudId:result.id,kind:'restore',pendingUpload:false};}
   else a.revision=cloud.revision;
   await S.retain(a,chosen,[useLocal?remote:local]);a.pending=true;S.select(a);location.reload();
  }catch(e){if(e.status===409){await resolveConflict(local,null,a);return;}hint.textContent=e.message+'。原存档仍保留，请重试。';buttons.forEach(x=>x.disabled=false);}
 };
 if(local)b.append(api.button('继续本机进度',()=>choose(true)));if(remote)b.append(api.button('继续云端进度',()=>choose(false)));
 }catch(e){hint.textContent='读取云端失败：'+e.message+'。本机存档保留，连接后请重试。';b.append(api.button('重试读取存档',()=>resolveConflict(local,null,a)));}
}

window.PocketSaves={resolveConflict,capture,flush,onLogin,latest,restore,manager,loadCloudSlots,get status(){return status;},get busy(){return busy;}};
setInterval(()=>{if(Date.now()-lastCapture>20000)capture().catch(()=>{});},5000);
window.addEventListener('online',()=>flush().catch(()=>{}));document.addEventListener('visibilitychange',()=>{if(document.hidden)capture().catch(()=>{});});
})();
