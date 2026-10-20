(()=>{
'use strict';const S=PocketStore;let busy=false,queue=[],uploading=null,lastCapture=0,status='尚未保存',generation=0;
const A=()=>window.PocketAPI;
const key=(a,slot)=>'a:'+a.id+':'+slot;
function notify(message){status=message;const node=document.getElementById('p-save-status');if(node)node.textContent=message;}
function nativeFiles(id){const files=[];for(const kind of ['user','login'])for(const suffix of ['.o','.o.gz']){const p='/mudlib/data/'+kind+'/'+id[0]+'/'+id+suffix;try{files.push([p,S.encode(driver.FS.readFile(p))]);}catch{}}return files;}
async function capture(kind='auto'){
 const a=S.active(),state=A()?.getState();if(!a||a.pending||!state?.ready||state.player.ghost||state.unconscious||state.player.fighting||state.enemies?.length)return null;
 if(busy){if(kind==='manual'){while(busy)await new Promise(r=>setTimeout(r,30));return capture(kind);}return null;}
 busy=true;
 try{const r=JSON.parse(await driver.fluffos.callLPC('pocket_checkpoint'));if(!r.ok){if(kind==='manual')throw Error(r.message);return null;}
  const files=nativeFiles(r.id);if(files.length<2)throw Error('角色文件不完整，保留此前存档');
  const save={schema:4,native:a.profile.native,room:r.room,inventory:r.inventory,files,savedAt:new Date().toISOString(),kind,pendingUpload:!a.legacy};
  await S.write(key(a,'head'),save);await S.write(key(a,kind),save);const history=await S.read(key(a,'history'))||[];history.unshift(save);await S.write(key(a,'history'),history.slice(0,20));lastCapture=Date.now();
  if(a.legacy)notify('仅本机 · '+new Date().toLocaleTimeString('zh-CN'));else{notify('本机已保存 · 正在同步');const old=queue.findIndex(x=>x.kind===kind&&kind!=='manual');if(old>=0)queue.splice(old,1);queue.push({save,kind,generation});flush().catch(()=>{});}return save;
 }finally{busy=false;}
}
async function flush(){
 if(uploading)return uploading;
 const mine=generation;
 uploading=(async()=>{while(queue.length){const item=queue[0],a=S.active();if(!a||a.legacy||mine!==generation)break;
  try{const data=await PocketAccounts.request('/saves',{save:{...item.save,pendingUpload:false},kind:item.kind,expectedRevision:a.revision});a.revision=data.revision;S.select(a);item.save.pendingUpload=false;item.save.cloudId=data.id;item.save.cloudAt=data.savedAt;queue.shift();
   for(const slot of ['head',item.kind]){const current=await S.read(key(a,slot));if(current?.savedAt===item.save.savedAt)await S.write(key(a,slot),item.save);}
   notify('已同步云端 · '+new Date(data.savedAt).toLocaleTimeString('zh-CN'));
  }catch(e){notify(e.status===409?'存档冲突 · 本机进度已保留':'云端未同步 · 本机进度已保留');throw e;}
 }})();try{return await uploading;}finally{uploading=null;}
}
async function onLogin(){const a=S.active();const head=await S.read(key(a,'head'));if(head?.pendingUpload){queue.push({save:head,kind:head.kind||'auto',generation});flush().catch(()=>{});}else notify(a.legacy?'本机旧游客 · 尚未迁移':'已载入云端存档');if(!head?.room)setTimeout(()=>capture('manual').catch(e=>A().note(e.message)),500);}
async function latest(slot){const a=S.active();return a?await S.read(key(a,slot)):null;}
async function restore(save){if(!save?.room||!save?.inventory)throw Error('这个旧存档没有完整检查点，请选择其他存档');const a=S.active();generation++;queue=[];
 if(!a.legacy){if(uploading)try{await uploading;}catch{}const current=await PocketAccounts.request('/session');a.revision=current.revision;const r=await PocketAccounts.request('/saves',{save,kind:'restore',expectedRevision:a.revision});a.revision=r.revision;}
 await S.write(key(a,'head'),{...save,pendingUpload:false});a.pending=true;S.select(a);location.reload();}
async function loadCloudSlots(){const a=S.active();if(!a||a.legacy)return;try{const data=await PocketAccounts.request('/saves');for(const kind of ['manual','checkpoint']){const meta=data.saves.find(x=>x.kind===kind);if(meta){const r=await PocketAccounts.request('/saves/'+meta.id);if(r.save)await S.write(key(a,kind),{...r.save,pendingUpload:false,cloudId:r.id});}}}catch(e){A().note('历史存档暂未载入：'+e.message);}}
async function cloudHistory(){const api=A(),b=api.show('云端存档历史');b.append(api.el('p','p-hint','正在读取这个账号的历史存档…'));try{const data=await PocketAccounts.request('/saves');b.replaceChildren();for(const meta of data.saves){b.append(api.button((meta.kind==='manual'?'手动':'自动 / 检查点')+' · '+meta.roomName+' · '+new Date(meta.savedAt).toLocaleString('zh-CN'),async()=>{const r=await PocketAccounts.request('/saves/'+meta.id);const c=api.show('恢复云端存档');c.append(api.el('p','p-hint','将从所选时间继续游戏。'),api.button('确认恢复',()=>restore(r.save).catch(e=>api.note(e.message))));},'p-row'));}if(!data.saves.length)b.append(api.el('p','p-hint','尚无云端存档'));}catch(e){b.append(api.el('p','p-hint',e.message));}}
async function manager(){const api=A(),a=S.active(),b=api.show('账号与存档');b.append(api.el('p','p-hint',(a?.username||'未登录')+' · '+status));
 b.append(api.button('立即保存并同步',async()=>{try{await capture('manual');await flush();manager();}catch(e){api.note(e.message);}}));
 b.append(api.button('重试云端同步',async()=>{try{await flush();manager();}catch(e){api.note(e.message);}}));
 const records=await S.read(key(a,'history'))||[];for(const record of records.slice(0,8)){const btn=api.button((record.kind==='manual'?'手动存档':record.kind==='checkpoint'?'路径检查点':'自动存档')+' · '+record.room?.name+' · '+new Date(record.savedAt).toLocaleTimeString('zh-CN'),()=>{const c=api.show('恢复这个存档');c.append(api.el('p','p-hint','当前进度将保留在历史记录中，恢复后重新载入游戏。'),api.button('确认恢复',()=>restore(record).catch(e=>api.note(e.message))));},'p-row');b.append(btn);}
 if(a&&!a.legacy)b.append(api.button('查看云端历史（其他设备可用）',cloudHistory),api.button('退出账号',()=>PocketAccounts.logout().catch(e=>api.note(e.message))));
}
window.PocketSaves={capture,flush,onLogin,latest,restore,manager,loadCloudSlots,get status(){return status;},get busy(){return busy;}};
setInterval(()=>{if(Date.now()-lastCapture>20000)capture().catch(()=>{});},5000);
window.addEventListener('online',()=>flush().catch(()=>{}));document.addEventListener('visibilitychange',()=>{if(document.hidden)capture().catch(()=>{});});
})();
