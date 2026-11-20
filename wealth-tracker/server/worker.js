const cookieName = '__Host-wealth_session';
const encoder = new TextEncoder();
const maxPayload = 5_000_000;
const assetTypes = new Set(['Cash','Listed shares','Funds','Unreconciled equity','Crypto','Property','Super','Business equity','Other assets','Liability']);
const bad = (status, message) => json({ error: message }, status);
const common = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};
function json(data, status = 200) {
  return Response.json(data, { status, headers: common });
}
function page(body, status = 200) {
  return new Response(body, { status, headers: { ...common, 'Content-Type': 'text/html; charset=utf-8' } });
}
function redirect(cookie) {
  return new Response(null, { status: 303, headers: { ...common, Location: '/', 'Set-Cookie': cookie } });
}
function loginPage(error = '', status = 200) {
  return page(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unlock Net Worth Tracker</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#f6f3ee;color:#292724;font:16px system-ui}main{width:min(420px,calc(100% - 28px));background:white;border:1px solid #e4ddd3;border-radius:18px;padding:28px}h1{letter-spacing:-.04em;font-size:27px;margin:0 0 12px}p{margin:8px 0 20px;color:#60594f}label{display:block;font-weight:650}input,button{width:100%;padding:11px;border:1px solid #ded5c9;border-radius:8px;font:inherit;margin-top:8px}button{background:#3e352b;color:white;border-color:#3e352b;cursor:pointer;font-weight:650}input:focus-visible,button:focus-visible{outline:2px solid #6e5944;outline-offset:2px}.error{color:#8c2a27}</style>
<main><h1>Unlock Net Worth Tracker</h1><p>Enter your PIN to access your snapshots.</p>${error ? '<p class="error" role="alert">'+error+'</p>' : ''}<form action="/unlock" method="post"><label for="pin">PIN</label><input id="pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required autocomplete="current-password"><button>Unlock tracker</button></form></main></html>`, status);
}
function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function sameValue(left,right) {
  let difference = left.length ^ right.length;
  for(let i=0;i<Math.max(left.length,right.length);i++) difference |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  return difference === 0;
}
async function sign(value,secret) {
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return base64url(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));
}
async function authenticated(request, owner, env) {
  const token = (request.headers.get('cookie') ?? '').split(';').map(part=>part.trim()).find(part=>part.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if (!token || !/^\d{10}\.[\w-]{43}$/.test(token)) return false;
  const [expire,signature] = token.split('.');
  return Number(expire) > Date.now()/1000 && sameValue(signature, await sign(JSON.stringify([owner,expire,env.WEALTH_PIN]),env.WEALTH_SESSION_KEY));
}
async function unlock(request, owner, env) {
  if (!/^application\/x-www-form-urlencoded\b/i.test(request.headers.get('content-type') ?? '')) return loginPage('Use the PIN form to unlock the tracker.', 400);
  const body = await request.text();
  if (body.length > 64) return loginPage('Enter the four-digit PIN.', 400);
  const pin = new URLSearchParams(body).get('pin') ?? '';
  if (!/^\d{4}$/.test(pin)) return loginPage('Enter the four-digit PIN.', 400);
  const now = Math.floor(Date.now()/1000);
  const attempt = await env.DB.prepare(`
    INSERT INTO wealth_pin_attempts(owner, window_start, attempts) VALUES (?1,?2,1)
    ON CONFLICT(owner) DO UPDATE SET
      attempts=CASE WHEN window_start <= ?2-900 THEN 1 ELSE MIN(attempts+1,6) END,
      window_start=CASE WHEN window_start <= ?2-900 THEN ?2 ELSE window_start END
    RETURNING attempts`).bind(owner, now).first();
  if (attempt.attempts > 5) return loginPage('Too many PIN attempts. Try again in about 15 minutes.', 429);
  if (!sameValue(pin,env.WEALTH_PIN)) return loginPage('That PIN did not match.', 401);
  await env.DB.prepare('DELETE FROM wealth_pin_attempts WHERE owner=?').bind(owner).run();
  await initialise(env.DB,owner);
  const age=8*60*60, expires=String(now+age);
  const value=await sign(JSON.stringify([owner,expires,env.WEALTH_PIN]),env.WEALTH_SESSION_KEY);
  return redirect(cookieName+'='+expires+'.'+value+'; Path=/; Max-Age='+age+'; Secure; HttpOnly; SameSite=Lax');
}
async function initialise(db, owner) {
  await db.prepare('INSERT OR IGNORE INTO wealth_revision(owner) VALUES (?)').bind(owner).run();
}
async function readHistory(db, owner) {
  const [state, rows] = await db.batch([
    db.prepare('SELECT version FROM wealth_revision WHERE owner=?').bind(owner),
    db.prepare('SELECT body FROM wealth_history WHERE owner=? ORDER BY snapshot_date').bind(owner),
  ]);
  if (!state.results.length) throw Error('History has not been initialized');
  return json({ revision:state.results[0].version, records:rows.results.map(row=>JSON.parse(row.body)) });
}
function normalize(records) {
  if (!Array.isArray(records) || !records.length) throw Error('Provide at least one snapshot.');
  const dates=new Set();
  return records.map(record=>{
    if (!record || typeof record.date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
        !Number.isFinite(Date.parse(record.date)) || new Date(record.date).toISOString().slice(0,10)!==record.date ||
        dates.has(record.date) || typeof record.complete!=='boolean' || !Array.isArray(record.rows) || !record.rows.length ||
        record.rows.length>500) throw Error('Snapshot dates must be unique and each snapshot must have 1–500 entries.');
    dates.add(record.date);
    const rows=record.rows.map(row=>{
      if (!Array.isArray(row) || ![4,5].includes(row.length)) throw Error('Invalid snapshot entry.');
      const [label,type,sector,value]=row;
      if (typeof label!=='string'||!label.trim()||label.length>200||!assetTypes.has(type)||typeof sector!=='string'||sector.length>200||
          !Number.isFinite(value)||value<0||value>1e12) throw Error('Provide a valid name, type and AUD value for every entry.');
      const info=normalizeRowDetails(row[4],type);
      return [label.trim(),type,sector.trim(),value,...(info?[info]:[])];
    });
    const historical=normalizeHistorical(record.historical);
    return {date:record.date,complete:record.complete,source:false,rows,...(historical?{historical}:{})};
  });
}
async function saveHistory(request,db,owner) {
  if (!/^application\/json\b/i.test(request.headers.get('content-type') ?? '')) return bad(415,'Use the snapshot editor to save history.');
  const body=await request.text();
  if (encoder.encode(body).length>maxPayload) return bad(413,'This update is too large.');
  let records,revision;
  try{
    const input=JSON.parse(body);
    revision=input.revision;
    if (!Number.isSafeInteger(revision)||revision<0) throw Error('Reload the page before editing.');
    records=normalize(input.records);
  }catch(error){return bad(400,error.message);}
  const payload=JSON.stringify(records);
  if (encoder.encode(payload).length>1_900_000) return bad(413,'This update exceeds the maximum save size.');
  const gate='EXISTS (SELECT 1 FROM wealth_revision WHERE owner=?1 AND version=?2)';
  const result=await db.batch([
    db.prepare('DELETE FROM wealth_history WHERE owner=?1 AND '+gate+" AND snapshot_date NOT IN (SELECT json_extract(value,'$.date') FROM json_each(?3))").bind(owner,revision,payload),
    db.prepare("INSERT INTO wealth_history(owner,snapshot_date,body) SELECT ?1,json_extract(value,'$.date'),value FROM json_each(?3) WHERE "+gate+' ON CONFLICT(owner,snapshot_date) DO UPDATE SET body=excluded.body WHERE wealth_history.body<>excluded.body').bind(owner,revision,payload),
    db.prepare('UPDATE wealth_revision SET version=version+1 WHERE owner=?1 AND version=?2').bind(owner,revision),
  ]);
  return result[2].meta.changes ? json({revision:revision+1}) : bad(409,'Another device saved changes first. Reload and try again.');
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if (!['/','/unlock','/lock','/api/snapshots'].includes(url.pathname)) return bad(404,'Page not found.');
    const owner=await accessOwner(request,env);
    if(!owner) return page('<!doctype html><html lang="en"><meta charset="utf-8"><title>Owner access required</title><h1>Owner access required</h1><p>Open the tracker through your Cloudflare Access sign-in.</p></html>',401);
    if (!/^\d{4}$/.test(env.WEALTH_PIN ?? '') || !env.WEALTH_SESSION_KEY || !env.DB) return bad(503,'The tracker is being configured.');
    if (!['GET','POST','PUT'].includes(request.method)) return bad(405,'Method not allowed.');
    if (request.method!=='GET' && !sameOrigin(request,url)) return url.pathname==='/unlock'?loginPage('Open the tracker directly, then enter your PIN again.',403):bad(403,'Open the tracker directly to make changes.');
    try {
      if (request.method==='POST' && url.pathname==='/unlock') return await unlock(request,owner,env);
      if (request.method==='POST' && url.pathname==='/lock') return redirect(cookieName+'=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax');
      const signedIn=await authenticated(request,owner,env);
      if (request.method==='GET' && url.pathname==='/') return signedIn?page(dashboard):loginPage();
      if(url.pathname==='/api/snapshots'){
        if(!signedIn) return bad(401,'Unlock the tracker to access your history.');
        if(request.method==='GET') return await readHistory(env.DB,owner);
        if(request.method==='PUT') return await saveHistory(request,env.DB,owner);
      }
      return bad(405,'Method not allowed.');
    } catch {
      return bad(503,'The tracker could not reach your history. Please try again.');
    }
  },
};

