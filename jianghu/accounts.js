(()=>{
'use strict';
const S=PocketStore;let flow=null,nativeStarted=false,error='',submitting=false;
const A=()=>window.PocketAPI;
function base(){return /^(localhost|127\.0\.0\.1)$/.test(location.hostname)?'http://127.0.0.1:8787/api/v1':window.JIANGHU_CLOUD_API;}
async function request(path,body,auth=S.active()){
 if(!base())throw Error('联网存档服务尚未连接');
 const r=await fetch(base()+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(auth?.token?{Authorization:'Bearer '+auth.token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error||'联网存档失败'),{status:r.status});return data;
}
function render(parent){
 const api=A(),selected=S.active();
 if(selected?.pending){parent.append(api.el('div','p-seal','侠'),api.el('h1','','正在恢复角色'),api.el('p','p-hint',error||'载入 '+selected.username+' 的游戏与存档…'));if(error)parent.append(api.button('返回账号登录',()=>{sessionStorage.removeItem('xkx-account');location.reload();}));return;}
 const wrap=api.el('section','p-auth');wrap.id='p-account-form';wrap.append(api.el('div','p-seal','侠'),api.el('h1','','江湖账号'));
 wrap.append(api.el('p','p-hint','创建自己的角色，用用户名和密码登录；云端保存进度。'));
 const tabs=api.el('div','p-map-tabs');let mode='login';const login=api.button('登录角色',()=>setMode('login')),register=api.button('创建角色',()=>setMode('register'));tabs.append(login,register);wrap.append(tabs);
 const form=api.el('form','p-auth-form');form.autocomplete='on';
 const make=(label,name,type,autocomplete)=>{const l=api.el('label');l.append(api.el('span','',label));const input=api.el('input');input.name=name;input.type=type;input.autocomplete=autocomplete;input.required=true;input.autocapitalize='none';input.spellcheck=false;l.append(input);form.append(l);return input;};
 const username=make('用户名','username','text','username');username.pattern='[A-Za-z][A-Za-z0-9_]{2,23}';username.placeholder='3–24 位英文字母、数字或下划线';username.value=localStorage.getItem('xkx-last-username')||'';
 const password=make('密码','password','password','current-password');password.minLength=10;password.maxLength=128;password.placeholder='至少 10 位';
 const extra=api.el('div','p-auth-extra');form.append(extra);
 const label=api.el('label');label.append(api.el('span','','角色姓名'));const nickname=api.el('input');nickname.name='name';nickname.autocomplete='off';nickname.placeholder='2–5 个汉字';nickname.pattern='[\u3400-\u9fff]{2,5}';label.append(nickname);extra.append(label);
 const choice=(label,name,values)=>{const l=api.el('label');l.append(api.el('span','',label));const select=api.el('select');select.name=name;for(const [value,text]of values){const option=api.el('option','',text);option.value=value;select.append(option);}l.append(select);extra.append(l);return select;};
 const gender=choice('性别','gender',[['m','男性'],['f','女性']]);const home=choice('出生地区','home',[['3','江南'],['1','北方'],['2','西北'],['4','西南'],['5','东南']]);
 const status=api.el('p','p-auth-status',error);status.setAttribute('role','status');form.append(status);
 const submit=api.el('button','p-primary','登录并继续');submit.type='submit';form.append(submit);
 function setMode(next){mode=next;extra.hidden=mode!=='register';nickname.required=mode==='register';password.autocomplete=mode==='register'?'new-password':'current-password';submit.textContent=mode==='register'?'创建角色并进入江湖':'登录并继续';login.classList.toggle('active',mode==='login');register.classList.toggle('active',mode==='register');status.textContent='';}
 setMode('login');
 form.onsubmit=async e=>{e.preventDefault();if(submitting)return;submitting=true;submit.disabled=true;status.textContent='正在连接存档服务…';
  try{const data=await request(mode==='register'?'/register':'/login',{username:username.value.trim(),password:password.value,name:nickname.value.trim(),gender:gender.value,home:home.value},null);password.value='';localStorage.setItem('xkx-last-username',data.username);
   const selected={id:data.id,username:data.username,profile:data.profile,token:data.token,revision:data.revision,pending:true};
   // Local unuploaded progress is kept separately; never silently replace it with an older cloud copy.
   const cloud=await request('/saves/head',null,selected),local=await S.read('a:'+selected.id+':head');
   if(local?.pendingUpload){S.select(selected);await PocketSaves.resolveConflict(local,cloud,selected);return;}
   selected.revision=cloud.revision;await S.retain(selected,cloud.save?{...cloud.save,savedAt:cloud.savedAt||cloud.save.savedAt,pendingUpload:false,cloudId:cloud.id}:null);S.select(selected);location.reload();
  }catch(err){status.textContent=err.name==='TimeoutError'?'连接超时，本机进度未删除，请重试':err.message;}finally{submitting=false;submit.disabled=false;}
 };
 wrap.append(form);const oldId=localStorage.getItem('xkx-guest-id');if(oldId)wrap.append(api.button('继续本机旧游客（仅本机）',()=>legacy(oldId),'p-legacy-link'));
 wrap.append(api.el('p','p-hint','网页仍由 GitHub 托管。账号密码只发送给存档服务；密码不会保存到浏览器。'));parent.append(wrap);
}
async function legacy(id){
 const files=await S.read('world');if(!files?.some(([p])=>p.includes('/user/'+id[0]+'/'+id+'.o'))){error='没有找到这个旧角色的本机存档';A().note(error);return;}
 const selected={id:'legacy-'+id,username:'本机旧游客',legacy:true,profile:{name:'行舟',gender:'m',home:'3',native:{id,password:'Guest-'+id}},pending:true,revision:0};
 const save={schema:4,native:selected.profile.native,files:files.filter(([p])=>p.includes('/'+id[0]+'/'+id+'.o')).map(([p,b])=>[p,S.encode(new Uint8Array(b))])};
 await S.write('a:'+selected.id+':head',save);S.select(selected);location.reload();
}
function text(chunk){if(!flow)return;flow.buffer+=chunk.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'');const f=flow;
 if(flow.expectExisting&&(/将会创造|重新创造这个人物/.test(f.buffer))){error='原版角色文件未能恢复，已停止创建，原存档仍保留。请返回登录并选择云端历史恢复。';flow=null;return;}
 const answers=[['使用 '+f.native.id+' 这个名字将会创造','y'],['您的中文名字：',f.name],['请设定您的密码：',f.native.password],['请再输入一次您的密码',f.native.password],['请输入数字（1~5）',f.home],['请输入您的膂力点数','20'],['请输入您的悟性点数','20'],['请输入您的根骨点数','20'],['您同意这一组天赋吗','y'],['请选择你的人物性格属性','0'],['您的电子邮件地址：','player@example.invalid'],['您要扮演男性(m)',f.gender],['请输入密码：',f.native.password]];
 for(const [prompt,answer]of answers)if(f.buffer.includes(prompt)){f.buffer='';setTimeout(()=>{if(flow===f)sendGameCommand(answer);},100);break;}
 if(f.buffer.includes('密码错误')||f.buffer.includes('密码不符')){error='角色登录记录不一致，请返回账号登录恢复云端版本';flow=null;}
}
async function update(state){
 const selected=S.active();if(!selected?.pending)return;
 if(state?.ready){let recoveredPotential=false;flow=null;const head=await S.read('a:'+selected.id+':head');
  if(head?.growth){const g=head.growth;const skillMatch=Object.keys(g.skills||{}).length===state.skills.length&&Object.entries(g.skills||{}).every(([id,lv])=>state.skills.some(k=>k.id===id&&k.level===lv));
   if(g.exp===state.player.exp&&skillMatch&&g.potential>100000&&state.player.potential===100000){const r=JSON.parse(await driver.fluffos.callLPC('pocket_recover_potential',String(g.exp),String(g.potential),...Object.entries(g.skills).map(([id,lv])=>id+'='+lv)));if(r.ok){recoveredPotential=true;const restored=JSON.parse(await driver.fluffos.callLPC('pocket_state'));state.player.potential=restored.player.potential;state.player.potential_total=restored.player.potential_total;A().note(r.message);}}
   const mismatch=g.exp!==state.player.exp||g.potential!==state.player.potential||!skillMatch;if(mismatch){window.PocketEnginePaused=true;const b=A().show('存档恢复核验未通过');b.append(A().el('p','p-hint','成长值与保存记录不一致。游戏已暂停，保留原存档，请从云端历史选择完整记录。'),A().button('查看存档历史',()=>PocketSaves.manager()));return;}}
  if(head?.room?.key&&head.inventory){const r=JSON.parse(await driver.fluffos.callLPC('pocket_restore',state.player.id,head.room.key,head.inventory,head.session||''));if(!r.ok)A().note(r.message);}
  selected.pending=false;S.select(selected);await PocketSaves.loadCloudSlots();PocketSaves.onLogin();if(recoveredPotential)setTimeout(()=>PocketSaves.capture('auto').catch(e=>A().note(e.message)),500);await A().refresh();return;
 }
 if(!nativeStarted&&driver&&connectSession&&!activeGame.disconnected){nativeStarted=true;const head=await S.read('a:'+selected.id+':head');flow={...selected.profile,buffer:'',expectExisting:!!head?.files?.length};sendGameCommand(selected.profile.native.id);setTimeout(()=>{if(flow){flow=null;error='创建或登录未完成，请返回账号登录后重试';A().showView('scene');}},30000);}
}
async function logout(){await PocketSaves.capture('manual');try{await PocketSaves.flush();}catch(e){A().note('本机进度已保留，云端未同步，暂不退出');return;}const account=S.active();await window.PocketOnline?.depart();if(!account.legacy)await request('/logout',{});sessionStorage.removeItem('xkx-account');location.reload();}
window.PocketAccounts={render,text,update,request,base,logout};
})();
