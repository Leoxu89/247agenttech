// Shared by the browser and Worker; no dependencies or financial data.
const companyTypes = new Set(['Listed shares', 'Unreconciled equity']);
function ownershipDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
function normalizeOwnership(value, type) {
  if (value === undefined || value === null) return null;
  if (!companyTypes.has(type) || typeof value !== 'object' || Array.isArray(value)) throw Error('Share details apply only to direct company equity.');
  const allowed = new Set(['companyId','shares','estimatedShares','sharesAsOf','sharesOutstanding','outstandingAsOf','outstandingSource']);
  if (Object.keys(value).some(key=>!allowed.has(key))) throw Error('Unknown share detail field.');
  const result = {};
  for (const key of ['companyId','outstandingSource']) {
    if (value[key] === undefined || value[key] === '') continue;
    if (typeof value[key] !== 'string' || value[key].length > (key==='companyId'?200:500)) throw Error('Invalid company identifier or share source.');
    if(value[key].trim()) result[key] = value[key].trim();
  }
  for (const key of ['shares','estimatedShares','sharesOutstanding']) {
    if (value[key] === undefined || value[key] === null) continue;
    if (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > Number.MAX_SAFE_INTEGER || (key==='sharesOutstanding' && value[key]===0)) throw Error('Shares must be non-negative and shares outstanding must be positive.');
    result[key] = value[key];
  }
  for (const key of ['sharesAsOf','outstandingAsOf']) {
    if (value[key] === undefined || value[key] === '') continue;
    if (!ownershipDate(value[key])) throw Error('Share dates must be valid YYYY-MM-DD dates.');
    result[key] = value[key];
  }
  if (result.sharesOutstanding !== undefined && (!result.outstandingAsOf || !result.outstandingSource)) throw Error('Include the date and source for shares outstanding.');
  if (result.shares !== undefined && result.estimatedShares !== undefined) throw Error('Enter either an exact or an estimated share count.');
  if (result.sharesOutstanding !== undefined && (result.shares ?? result.estimatedShares ?? 0) > result.sharesOutstanding) throw Error('Shares held cannot exceed the stated shares outstanding.');
  return Object.keys(result).length ? result : null;
}
function companyOwnership(rows, includeOtherAssets = false) {
  const companies = new Map();
  for (const row of rows) {
    const isCompany = companyTypes.has(row[1]);
    if (!isCompany && !includeOtherAssets) continue;
    const info = row[4] || {};
    // A supplied identifier must represent the same issuer/share basis across accounts.
    const key = (isCompany ? 'company:' : row[1]+':') + (info.companyId || row[0]).trim().toLowerCase();
    if (!companies.has(key)) companies.set(key, {key, name:info.companyId || row[0], rows:[]});
    companies.get(key).rows.push(row);
  }
  return [...companies.values()].map(company=>{
    const details = company.rows.map(row=>row[4] || {});
    const known = details.every(info=>Number.isFinite(info.shares ?? info.estimatedShares));
    const shares = known ? details.reduce((sum,info)=>sum+(info.shares ?? info.estimatedShares),0) : null;
    const approximate = known && details.some(info=>info.estimatedShares !== undefined);
    const denominators = details.filter(info=>Number.isFinite(info.sharesOutstanding));
    const basis = denominators[0] || null;
    const conflict = denominators.some(info=>info.sharesOutstanding!==basis.sharesOutstanding || info.outstandingAsOf!==basis.outstandingAsOf);
    const outstanding = basis && !conflict ? basis.sharesOutstanding : null;
    const invalidTotal = shares!==null && outstanding!==null && shares>outstanding;
    return {...company, shares, approximate, outstanding, ratio:shares!==null && outstanding!==null && !invalidTotal ? shares/outstanding : null,
      date:basis&&!conflict?basis.outstandingAsOf:null, source:basis&&!conflict?basis.outstandingSource:null,
      quantityDates:[...new Set(details.map(info=>info.sharesAsOf || 'Unknown'))],
      status:conflict?'Conflicting share totals':invalidTotal?'Check share basis':!known?'Share count needed':!basis?'Shares outstanding needed':'Available'};
  }).sort((a,b)=>a.name.localeCompare(b.name));
}

// The optional row object also carries an account or institution label.
function normalizeRowDetails(value, type) {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid asset details.');
  const {assetSource, country, benchmark, ...shareDetails} = value;
  if (assetSource !== undefined && (typeof assetSource !== 'string' || assetSource.length > 120)) {
    throw Error('Asset source must be text up to 120 characters.');
  }
  if (country !== undefined && (typeof country !== 'string' || country.length>80)) throw Error('Invalid exposure country.');
  const result = {...(Object.keys(shareDetails).length ? normalizeOwnership(shareDetails, type) : null)};
  if (assetSource?.trim()) result.assetSource=assetSource.trim();
  if (country?.trim()) result.country=country.trim();
  if (benchmark != null) {
    const {holders,shares,date,basis,source}=benchmark;
    if (!companyTypes.has(type) || !Number.isSafeInteger(holders) || holders<1 ||
        !Number.isSafeInteger(shares) || shares<holders || !ownershipDate(date) ||
        typeof basis!=='string' || !basis.trim() || basis.length>150 ||
        typeof source!=='string' || source.length>500 || !/^https?:\/\//i.test(source)) {
      throw Error('Invalid dated shareholder benchmark.');
    }
    result.benchmark={holders,shares,date,basis:basis.trim(),source};
  }
  return Object.keys(result).length ? result : null;
}

function normalizeHistorical(value) {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value) ||
      typeof value.note !== 'string' || !value.note.trim() || value.note.length>2000 ||
      (value.net !== undefined && (!Number.isFinite(value.net) || Math.abs(value.net)>1e12))) {
    throw Error('Invalid historical estimate or reconciliation note.');
  }
  return value.net === undefined ? {note:value.note.trim()} : {note:value.note.trim(),net:value.net};
}
