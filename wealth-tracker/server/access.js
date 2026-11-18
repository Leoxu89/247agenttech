const accessKeys = new Map();

function decodeUrl(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw Error('Malformed token');
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char=>char.charCodeAt(0));
}

async function getAccessKey(issuer, kid) {
  let known=accessKeys.get(issuer);
  if (!known || known.until <= Date.now()) {
    const response=await fetch(issuer+'/cdn-cgi/access/certs');
    if (!response.ok) throw Error('Access certificates unavailable');
    const body=await response.json();
    known={until:Date.now()+5*60_000,keys:body.keys};
    accessKeys.set(issuer,known);
  }
  const jwk=known.keys.find(key=>key.kid===kid && key.kty==='RSA');
  if (!jwk) throw Error('Unknown Access signing key');
  return crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
}

async function accessOwner(request, env) {
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.CF_ACCESS_TEAM ?? '') ||
      !env.CF_ACCESS_AUD || !env.WEALTH_OWNER_EMAIL) return null;
  const token=request.headers.get('cf-access-jwt-assertion');
  if (!token || token.length>16_384) return null;
  try {
    const issuer='https://'+env.CF_ACCESS_TEAM, parts=token.split('.');
    if (parts.length!==3) return null;
    const [header,body,signature]=parts, decoder=new TextDecoder();
    const head=JSON.parse(decoder.decode(decodeUrl(header)));
    const claims=JSON.parse(decoder.decode(decodeUrl(body)));
    const now=Date.now()/1000;
    if (head.alg!=='RS256' || typeof head.kid!=='string' ||
        claims.iss!==issuer || !Array.isArray(claims.aud) || !claims.aud.includes(env.CF_ACCESS_AUD) ||
        !Number.isFinite(claims.exp) || claims.exp<=now ||
        (claims.nbf!==undefined && (!Number.isFinite(claims.nbf) || claims.nbf>now)) ||
        typeof claims.sub!=='string' || !claims.sub ||
        typeof claims.email!=='string' || claims.email.toLowerCase()!==env.WEALTH_OWNER_EMAIL.toLowerCase()) return null;
    const key=await getAccessKey(issuer,head.kid);
    const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decodeUrl(signature),new TextEncoder().encode(header+'.'+body));
    return valid ? 'owner' : null;
  } catch { return null; }
}

function sameOrigin(request,url) {
  const origin=request.headers.get('origin');
  const fetchSite=request.headers.get('sec-fetch-site');
  if (fetchSite==='cross-site') return false;
  if (origin && origin!=='null') return origin===url.origin;
  if (fetchSite==='same-origin') return true;
  try { return new URL(request.headers.get('referer')).origin===url.origin; }
  catch { return false; }
}
