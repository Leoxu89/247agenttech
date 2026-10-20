// Run after official `wrangler login`; creates only this game's new service.
import {fileURLToPath} from 'node:url';import {spawnSync,spawn} from 'node:child_process';import {readFileSync,writeFileSync} from 'node:fs';import {randomBytes} from 'node:crypto';
const cli=fileURLToPath(new URL('./node_modules/wrangler/bin/wrangler.js',import.meta.url));
function run(args,capture=false){const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',stdio:capture?['ignore','pipe','pipe']:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false',CI:'true'}});if(r.status!==0)throw Error('Wrangler failed: '+args[0]);return r.stdout;}
const configPath=new URL('./wrangler.jsonc',import.meta.url);const config=JSON.parse(readFileSync(configPath,'utf8'));
if(config.d1_databases[0].database_id==='REPLACE_AFTER_CREATE'){
 const output=run(['d1','create',config.d1_databases[0].database_name,'--location','oc','--update-config=false'],true);const id=output.match(/database_id[\"']?\s*[:=]\s*[\"']([a-f0-9-]{36})/i)?.[1];if(!id)throw Error('D1 creation returned no database ID; preserve output and inspect before retrying');config.d1_databases[0].database_id=id;writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
}
run(['d1','migrations','apply','DB','--remote']);
run(['deploy']);
const secrets=JSON.parse(run(['secret','list','--format','json'],true));
if(!secrets.some(x=>x.name==='AUTH_SECRET')){
// Persist the secret only in Cloudflare, send through stdin, never log or commit it.
await new Promise((resolve,reject)=>{const p=spawn(process.execPath,[cli,'secret','put','AUTH_SECRET'],{stdio:['pipe','inherit','inherit'],env:{...process.env,WRANGLER_SEND_METRICS:'false',CI:'true'}});p.stdin.end(randomBytes(48).toString('base64'));p.on('exit',code=>code===0?resolve():reject(Error('Secret provisioning failed')));});
}
