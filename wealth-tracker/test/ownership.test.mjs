import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const shared=readFileSync(new URL('shared/ownership.js',root),'utf8');
const html=readFileSync(new URL('app/index.html',root),'utf8').replace('/* OWNERSHIP_HELPERS */',shared);
class Node {
  constructor(){this.children=[];this.handlers={};this.dataset={};this.style={};this.value='';this.textContent='';}
  append(...nodes){this.children.push(...nodes);}
  prepend(...nodes){this.children.unshift(...nodes);}
  addEventListener(key,handler){this.handlers[key]=handler;}
  querySelector(){return null;}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(key,value){this[key]=value;}
  querySelectorAll(){return [];}
}
function browser(){
  const nodes=new Map();
  const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);},createElement:()=>new Node(),createElementNS:()=>new Node()};
  const context=vm.createContext({document,Intl,Date,Map,Set,JSON,Number,Error,console,Option:class extends Node{}});
  let script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  script=script.slice(0,script.indexOf("$('status').textContent='Loading cloud history"));
  vm.runInContext(script,context);
  return {context,nodes,run:code=>vm.runInContext(code,context)};
}
const info={companyId:'EXAMPLE ordinary',shares:100,sharesAsOf:'2026-11-03',sharesOutstanding:100000000,outstandingAsOf:'2026-11-01',outstandingSource:'Issuer filing'};
const row=(name='Example',meta=info)=>[name,'Listed shares','Tech',5000,meta];
const serial=value=>JSON.parse(JSON.stringify(value));
function server(){
  const worker=readFileSync(new URL('server/worker.js',root),'utf8').replace('export default {','const worker = {');
  const context=vm.createContext({TextEncoder,Response,console});vm.runInContext(shared+'\n'+worker,context);return context;
}
test('legacy backups and enhanced rows validate identically in browser and Worker',()=>{
  const records=[{date:'2026-11-03',complete:false,rows:[['Cash','Cash','',10],row()]}];
  const b=browser();b.context.input=records;const w=server();w.input=records;
  assert.deepEqual(serial(b.run('validate(input)')[0].rows),serial(vm.runInContext('normalize(input)[0].rows',w)));
  assert.deepEqual(serial(b.run('validate(input)')[0].rows[0]),records[0].rows[0]);
});
test('invalid quantities and unsourced denominators fail in browser and Worker',()=>{
  const invalid=[{shares:-1},{shares:Infinity},{sharesOutstanding:0},{sharesOutstanding:100},{...info,outstandingAsOf:'2026-02-30'},{...info,shares:100000001},{unexpected:1}];
  for(const metadata of invalid){
    const input=[{date:'2026-11-03',complete:false,rows:[row('Example',metadata)]}];
    const b=browser();b.context.input=input;assert.throws(()=>b.run('validate(input)'));
    const w=server();w.input=input;assert.throws(()=>vm.runInContext('normalize(input)',w));
  }
});
test('company counts aggregate across accounts without adding denominators',()=>{
  const b=browser();b.context.rows=[row('Account A'),row('Account B',{...info,shares:50})];
  const result=serial(b.run('companyOwnership(rows)'));
  assert.equal(result.length,1);assert.equal(result[0].shares,150);assert.equal(result[0].outstanding,100000000);assert.equal(result[0].ratio,0.0000015);
});
test('missing quantities and conflicting denominators do not imply ownership',()=>{
  const b=browser();b.context.rows=[row(),row('Account B',{companyId:info.companyId})];assert.equal(b.run('companyOwnership(rows)[0].ratio'),null);
  b.context.rows=[row(),row('Account B',{...info,sharesOutstanding:200000000})];assert.equal(b.run('companyOwnership(rows)[0].ratio'),null);
  b.context.rows=[row(),row('Account B',{...info,outstandingAsOf:'2026-10-01'})];assert.equal(b.run('companyOwnership(rows)[0].ratio'),null);
});
test('fractions remain visible, explicit zero stays zero, crypto/funds excluded',()=>{
  const b=browser();assert.equal(b.run('sharePercentage(0.000001)'),'0.0001%');assert.equal(b.run('sharePercentage(0.000000000001)'),'<0.00000001%');assert.equal(b.run('sharePercentage(null)'),'—');
  b.context.rows=[row('Example',{...info,shares:0}),['Fund','Funds','',1],['Bitcoin','Crypto','',1]];
  assert.equal(b.run('companyOwnership(rows).length'),1);assert.equal(b.run('companyOwnership(rows)[0].ratio'),0);
});
test('partial updates preserve counts, while explicit null clears them',()=>{
  const b=browser();b.context.input=[{date:'2026-11-03',complete:false,rows:[row()]}];b.run('records=validate(input)');
  b.context.patch=JSON.stringify({date:'2026-11-03',rows:[['Example','Listed shares','Tech',6000]]});
  assert.deepEqual(serial(b.run('preparePatch(patch).rows[0][4]')),info);
  b.context.patch=JSON.stringify({date:'2026-11-03',rows:[['Example','Listed shares','Tech',6000,null]]});
  assert.equal(b.run('preparePatch(patch).rows[0].length'),4);
  b.context.patch=JSON.stringify({date:'2026-11-04',rows:[['New cash','Cash','',20]]});
  assert.deepEqual(serial(b.run('preparePatch(patch).rows[0][4]')),info);
});
test('share view renders missing values and detailed ownership without changing exposure',()=>{
  const b=browser();b.context.rows=[row()];b.run("group='shares';drawExposure({portfolio:rows})");
  assert.equal(b.nodes.get('holdings').children.length,2);
  assert.equal(b.nodes.get('holdings').children[0].children[3].textContent,'0.0001%');
  b.context.rows=[['Example','Listed shares','Tech',5000]];b.run('drawExposure({portfolio:rows})');
  assert.equal(b.nodes.get('holdings').children[0].children[3].textContent,'—');
  b.run("group='name';drawExposure({portfolio:rows})");assert.equal(b.nodes.get('holdings').children[0].children.length,5);
});
test('asset mix expands into source subtotals and account rows for the selected snapshot',()=>{
  const b=browser();
  b.context.rows=[['NAB Savings','Cash','',10.12],['NAB Everyday','Cash','',20],
    ['Physical cash','Cash','',40],['Example shares','Listed shares','',50,{...info,assetSource:'Broker'}],
    ['Example card','Liability','',15]];
  b.run('drawMix(summary({rows}))');
  const cash=b.nodes.get('mix').children[1].children;
  assert.equal(cash[0].children[1].textContent,'Cash');
  assert.equal(cash[0].children[2].textContent,'$70.12');
  const source=cash[1].children.find(block=>block.children[0].children[0].textContent==='NAB');
  assert.equal(source.children[0].children[1].textContent,'$30.12');
  assert.deepEqual(source.children.slice(1).map(line=>line.children[0].textContent),['NAB Everyday','NAB Savings']);
  assert.equal(b.nodes.get('mix').children[2].children[1].children[0].children[0].children[0].textContent,'Broker');
  b.context.rows=[['Older cash','Cash','',10]];
  b.run('drawMix(summary({rows}))');
  assert.equal(b.nodes.get('mix').children[1].children[1].children[0].children[0].children[0].textContent,'Source not recorded');
});
test('source metadata survives saves and source-only patches preserve share details',()=>{
  const b=browser(), w=server();
  const input=[{date:'2026-11-03',complete:false,rows:[['Savings','Cash','',100,{assetSource:' Bank '}],row()]}];
  b.context.input=w.input=input;
  b.run('records=validate(input)');
  assert.deepEqual(serial(b.run('records[0].rows')),serial(vm.runInContext('normalize(input)[0].rows',w)));
  b.context.patch=JSON.stringify({date:'2026-11-03',rows:[row('Example',{assetSource:'Broker'})]});
  assert.deepEqual(serial(b.run('preparePatch(patch).rows[1][4]')),{...info,assetSource:'Broker'});
  b.context.patch=JSON.stringify({date:'2026-11-03',rows:[['Savings','Cash','',110]]});
  assert.deepEqual(serial(b.run('preparePatch(patch).rows[0][4]')),{assetSource:'Bank'});
});
test('historical notes and net estimates survive validation independently of row values',()=>{
  const b=browser(), w=server();
  const historical={note:'Approximate historical estimate',net:90};
  const rows=[['Savings','Cash','',100],['Tax','Liability','',15]];
  const input=[{date:'2025-12-24',complete:false,rows,historical}];
  b.context.input=w.input=input;
  assert.deepEqual(serial(b.run('validate(input)[0].historical')),historical);
  assert.deepEqual(serial(vm.runInContext('normalize(input)[0].historical',w)),historical);
  assert.equal(b.run('summary(validate(input)[0]).net'),85);
  b.context.input[0].historical.net='90';
  assert.throws(()=>b.run('validate(input)'));
  assert.throws(()=>vm.runInContext('normalize(input)',w));
});
test('company and shares views aggregate estimates and toggle the account breakdown',()=>{
  const b=browser();
  const {shares,...basis}=info;
  b.context.rows=[row('Broker A',{...info,assetSource:'Broker A'}),row('Broker B',{...basis,estimatedShares:50,assetSource:'Broker B'})];
  b.run("group='name';drawExposure({portfolio:rows})");
  const [total,detail]=b.nodes.get('holdings').children;
  assert.equal(total.children[1].textContent,'$10,000.00');
  assert.equal(total.children[2].textContent,'≈150');
  assert.equal(detail.hidden,true);
  const button=total.children[0].children[0];
  button.onclick();
  assert.equal(button['aria-expanded'],'true');
  assert.equal(detail.hidden,false);
  assert.equal(detail.children[0].children[0].children[1].children[1].children[0].textContent,'≈50 shares');
  b.run("group='shares';drawExposure({portfolio:rows})");
  assert.equal(b.nodes.get('holdings').children[0].children[3].textContent,'≈0.00015%');
  assert.throws(()=>b.run("normalizeOwnership({shares:1,estimatedShares:1},'Listed shares')"));
});
test('chart point activates the dated snapshot via pointer and keyboard',()=>{
  const b=browser();
  b.context.input=[{date:'2025-12-24',complete:false,rows:[['Old cash','Cash','',100]],historical:{net:90,note:'Old estimate'}},
    {date:'2026-11-20',complete:false,rows:[['New cash','Cash','',200]]}];
  b.run("records=validate(input);active=records.at(-1).date;$('series').value='total';render()");
  const marker=()=>b.nodes.get('chart').children[0].children.filter(node=>node.role==='button');
  marker()[0].handlers.click();
  assert.equal(b.run('active'),'2025-12-24');
  assert.equal(b.nodes.get('main-amount').textContent,'A$90');
  assert.equal(b.nodes.get('mix').children[1].children[0].children[2].textContent,'$100.00');
  assert.equal(marker()[0]['aria-pressed'],'true');
  marker()[1].handlers.keydown({key:'Enter',preventDefault(){}});
  assert.equal(b.run('active'),'2026-11-20');
  assert.equal(b.nodes.get('main-amount').textContent,'A$200');
});
test('country view preserves unknowns and uses separate portfolio and net denominators',()=>{
  const b=browser();
  b.context.portfolio=[['Local','Listed shares','',50,{country:'Australia'}],['Bitcoin','Crypto','',50]];
  b.run("group='country';drawExposure({portfolio,net:200})");
  const children=b.nodes.get('holdings').children;
  assert.equal(children[0].children[0].children[0].children[0].textContent,'Australia');
  assert.equal(children[0].children[2].textContent,'50%');
  assert.equal(children[0].children[3].textContent,'25%');
  assert.equal(children[2].children[0].children[0].children[0].textContent,'Crypto · no country');
});
test('zoom narrows dense snapshots and pan and reset expose the rest',()=>{
  const b=browser();
  b.context.input=Array.from({length:8},(_,i)=>({date:'2026-11-0'+(i+1),complete:false,rows:[['Cash','Cash','',i+1]]}));
  b.run("records=validate(input);active=records.at(-1).date;$('series').value='total';drawHistory()");
  const points=()=>b.nodes.get('chart').children[0].children.filter(node=>node.role==='button');
  b.nodes.get('zoom-in').onclick();
  assert.equal(points().length,4);
  assert.equal(points()[0]['data-snapshot-date'],'2026-11-05');
  b.nodes.get('pan-back').onclick();
  assert.equal(points()[0]['data-snapshot-date'],'2026-11-03');
  b.nodes.get('zoom-reset').onclick();
  assert.equal(points().length,8);
});
test('a dated benchmark is independent of the current ownership denominator',()=>{
  const b=browser(), w=server();
  const benchmark={holders:100,shares:5000000,date:'2025-12-31',basis:'registered holders',source:'https://example.org/filing'};
  b.context.input=w.input=[{date:'2026-11-03',complete:false,rows:[row('Example',{...info,benchmark})]}];
  b.run("group='shares';drawExposure({portfolio:validate(input)[0].rows})");
  assert.equal(b.nodes.get('holdings').children[0].children[4].textContent,'50,000');
  assert.deepEqual(serial(vm.runInContext('normalize(input)[0].rows[0][4].benchmark',w)),benchmark);
});
