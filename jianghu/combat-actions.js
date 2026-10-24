(function(scope){
function actions(state,world){const result=[];for(const sk of state.skills||[])for(const move of world.performs?.[sk.id]||[]){const kind=move.kind||'perform',reasons=[];let base='';
 if(kind==='exert'){if(!sk.bases?.includes('force')&&!(sk.id==='force'&&state.skills.some(k=>k.bases?.includes('force'))))reasons.push('先激发此内功');}
 else{const bases=sk.bases||[],weapon=state.inventory?.find(i=>i.equipped==='wielded');base=(weapon&&bases.includes(weapon.weapon_type)?weapon.weapon_type:bases.find(b=>!['parry','force','dodge'].includes(b)))||(bases.includes('dodge')?'dodge':move.action==='xingyi'&&bases.includes('parry')?'parry':'');if(!base)reasons.push('先激发攻击武学');else if(['cuff','strike','hand','claw','finger','unarmed','leg'].includes(base)){if(!sk.prepared)reasons.push('先备招用于空手攻击');if(state.inventory?.some(i=>i.equipped==='wielded'))reasons.push('先放下手中兵器');}else if(!['dodge','parry'].includes(base)&&!state.inventory?.some(i=>i.equipped==='wielded'&&i.weapon_type===base))reasons.push('先装备对应兵器');}
 for(const r of move.requirements||[]){const n=r.kind==='skill'?(state.skills.find(k=>k.id===r.id)?.level||0):state.player[r.id];if(n<r.min)reasons.push((r.kind==='skill'?(world.skillNames[r.id]||r.id):({neili:'当前内力',max_neili:'永久内力',qi:'气血',jing:'精神'})[r.id]||r.id)+'至少'+r.min);}
 for(const group of move.alternatives||[])if(!group.some(r=>(r.kind==='skill'?(state.skills.find(k=>k.id===r.id)?.level||0):state.player[r.id])>=r.min))reasons.push('任选一项：'+group.map(r=>(world.skillNames[r.id]||r.id)+'至少'+r.min).join(' / '));
 if(move.authorization&&!sk.authorized?.[move.action]&&!state.player.perform_permissions?.[move.action])reasons.push('尚未领悟：到武学页点“绝招学习与解锁”');
 result.push({...move,skill:sk.id,label:move.name+' · '+(world.skillNames[sk.id]||sk.name),command:kind==='exert'?'exert '+move.action:'perform '+base+'.'+move.action,reasons:[...new Set(reasons)]});
 }return result;}
scope.PocketCombatActions={actions};if(typeof module!=='undefined')module.exports=scope.PocketCombatActions;
})(globalThis);
