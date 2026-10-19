// A route consists of real directed exits. No teleporting or guard bypasses.
(function(scope){
function path(rooms,start,goal,limit=12000){
 if(start===goal)return [];
 const queue=[start],previous=new Map([[start,null]]);
 for(let i=0;i<queue.length&&i<limit;i++){
  const from=queue[i];
  for(const [direction,to] of Object.entries(rooms[from]?.exits||{})){
   if(previous.has(to)||!rooms[to])continue;
   previous.set(to,{from,direction,to});
   if(to===goal){const steps=[];for(let p=goal;p!==start;){const edge=previous.get(p);steps.unshift(edge);p=edge.from;}return steps;}
   queue.push(to);
  }
 }
 return null;
}
class Walker{
 constructor(send){this.send=send;this.status='idle';this.steps=[];this.index=0;this.pending=null;this.reason='';}
 start(steps,name){this.steps=steps;this.index=0;this.name=name;this.pending=null;this.reason='';this.status=steps.length?'walking':'arrived';}
 pause(reason='已暂停，可继续'){if(this.status!=='walking')return;this.status='paused';this.pending=null;this.reason=reason;}
 cancel(){this.status='idle';this.pending=null;this.steps=[];}
 tick(state,now){
  if(this.status!=='walking')return;
  if(!state?.ready){this.pause('角色已离线');return;}
  if(state.player.fighting||state.player.ghost){this.pause('交战或昏迷中，已暂停');return;}
  const step=this.steps[this.index];
  if(!step){this.status='arrived';return;}
  const here=state.room.key;
  if(this.pending){
   if(here===step.to){this.index++;this.pending=null;this.nextAt=now+650;if(this.index===this.steps.length)this.status='arrived';return;}
   if(here!==step.from){this.pause('位置已改变，请重新规划路线');return;}
   if(now-this.pending.at>4000){this.pause(this.pending.open?'门未打开，请查看江湖记录':'道路受阻，已暂停，请查看动作提示');}
   else if(this.pending.open&&!state.room.exits.find(e=>e.direction===step.direction)?.closed){this.pending=null;this.nextAt=now+300;}
   return;
  }
  if(now<(this.nextAt||0))return;
  if(here!==step.from){this.pause('当前位置与路线不同，请重新规划');return;}
  if(state.player.busy){this.pause('角色正在忙碌，请结束后继续');return;}
  const exit=state.room.exits.find(e=>e.direction===step.direction);
  if(!exit||exit.to!==step.to){this.pause('出口已变化或需要特殊通行，请查看场景');return;}
  this.pending={at:now,open:!!exit.closed};
  this.send(exit.closed?'open '+step.direction:step.direction);
 }
}
scope.PocketNavigation={path,Walker};
if(typeof module!=='undefined')module.exports=scope.PocketNavigation;
})(globalThis);
