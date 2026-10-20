// Shared storage primitives; no web-account password is ever persisted here.
window.POCKET_V4=true;
window.PocketStore=(()=>{
 let promise;
 const db=()=>promise||=new Promise((resolve,reject)=>{const r=indexedDB.open('xkx100-pocket-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const read=async key=>{const d=await db();return new Promise((ok,no)=>{const r=d.transaction('saves').objectStore('saves').get(key);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});};
 const write=async(key,value)=>{const d=await db();return new Promise((ok,no)=>{const tx=d.transaction('saves','readwrite');tx.objectStore('saves').put(value,key);tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});};
 const active=()=>{try{return JSON.parse(sessionStorage.getItem('xkx-account')||'null');}catch{return null;}};
 const select=value=>sessionStorage.setItem('xkx-account',JSON.stringify(value));
 const encode=bytes=>{let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s);};
 const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 async function bootFiles(){const a=active();if(!a)return await read('world')||[];const save=await read('a:'+a.id+':head');return save?.files?.map(([p,b])=>[p,decode(b)])||[];}
 return{db,read,write,active,select,encode,decode,bootFiles};
})();
