// v1 comparable standing power, separate from native damage. Shared with the cloud.
(function(scope){
const VERSION=1;
const fields=['attack','dodge','parry','max_qi','max_jing','max_neili','str','dex','con','int','armor','weapon_damage','unarmed_damage'];
function normalize(value={}){return Object.fromEntries(fields.map(k=>[k,Math.max(0,Math.min(1e12,Number.isFinite(Number(value[k]))?Number(value[k]):0))]));}
function score(value){const p=normalize(value);return Math.floor(4*Math.sqrt(p.attack)+2*Math.sqrt(p.dodge)+2*Math.sqrt(p.parry)+.4*p.max_qi+.15*p.max_neili+.1*p.max_jing+5*(p.str+p.dex+p.con+p.int)+2*p.armor+Math.max(p.weapon_damage,p.unarmed_damage));}
const tiers=[[0,'未入品'],[500,'九品'],[800,'八品'],[1300,'七品'],[2100,'六品'],[3300,'五品'],[5000,'四品'],[7500,'三品'],[11000,'二品'],[16000,'一品 · 金刚境'],[22000,'一品 · 指玄境'],[30000,'一品 · 天象境'],[42000,'陆地神仙境']];
function realm(n){return [...tiers].reverse().find(t=>n>=t[0])?.[1]||'未入品';}
function ranking(entries){const unique=new Map();for(const e of entries)if(e?.key&&e.power&&(!e.race||e.race==='人类'))unique.set(e.key,{...e,score:score(e.power)});return [...unique.values()].sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key)).map((e,i)=>({...e,rank:i<500?i+1:null,realm:realm(e.score)}));}
const model={VERSION,normalize,score,realm,ranking,tiers};scope.PocketPowerModel=model;if(typeof module!=='undefined')module.exports=model;
})(globalThis);
