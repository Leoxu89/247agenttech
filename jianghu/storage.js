// Shared storage primitives; no web-account password is ever persisted here.
window.POCKET_V4=true;
window.PocketStore=(()=>{
 let promise;
 const db=()=>promise||=new Promise((resolve,reject)=>{const r=indexedDB.open('xkx100-pocket-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const read=async key=>{const d=await db();return new Promise((ok,no)=>{const r=d.transaction('saves').objectStore('saves').get(key);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});};
 const write=async(key,value)=>{const d=await db();return new Promise((ok,no)=>{const tx=d.transaction('saves','readwrite');tx.objectStore('saves').put(value,key);tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});};
 // Keep exactly three distinct versions; other keys are aliases, never extra snapshots.
 let pendingRetention=Promise.resolve();
 function retain(account,save,extras=[],updateOnly=false){const work=pendingRetention.then(()=>retainNow(account,save,extras,updateOnly));pendingRetention=work.catch(()=>{});return work;}
 async function retainNow(account,save,extras=[],updateOnly=false){
  const prefix='a:'+account.id+':';let history=await read(prefix+'history')||[];if(updateOnly){const uploaded=save;save=await read(prefix+'head');if(save?.savedAt===uploaded.savedAt)save=uploaded;history=history.map(x=>x.savedAt===uploaded.savedAt?uploaded:x);}
  const records=[save,...extras,...history].filter(Boolean).filter((x,i,all)=>all.findIndex(y=>y.savedAt===x.savedAt||x.cloudId&&y.cloudId===x.cloudId)===i).slice(0,3);
  // The incoming record owns its timestamp (including pending-upload metadata).
  if(save){const i=records.findIndex(x=>x.savedAt===save.savedAt);if(i>=0)records[i]=save;}
  const d=await db();await new Promise((ok,no)=>{const tx=d.transaction('saves','readwrite'),store=tx.objectStore('saves');
   const cursor=store.openCursor();
   // Queue writes after the cursor reaches the end, so cleanup cannot delete them.
   cursor.onsuccess=()=>{const c=cursor.result;if(c){if(typeof c.key==='string'&&c.key.startsWith(prefix))c.delete();c.continue();return;}
    store.put(records,prefix+'history');if(save)store.put(save,prefix+'head');for(const kind of ['manual','checkpoint']){const record=records.find(x=>x.kind===kind);if(record)store.put(record,prefix+kind);}
   };tx.oncomplete=ok;tx.onerror=()=>no(tx.error);
  });return records;
 }
 const active=()=>{try{return JSON.parse(sessionStorage.getItem('xkx-account')||'null');}catch{return null;}};
 const select=value=>sessionStorage.setItem('xkx-account',JSON.stringify(value));
 const encode=bytes=>{let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s);};
 const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 async function bootFiles(){const a=active();if(!a)return await read('world')||[];const save=await read('a:'+a.id+':head');return save?.files?.map(([p,b])=>[p,decode(b)])||[];}
 return{db,read,write,retain,active,select,encode,decode,bootFiles};
})();
