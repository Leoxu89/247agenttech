export function validateSession(body) {
  if (!body || !Array.isArray(body.transcript) || body.transcript.length > 300) throw new Error('Supply up to 300 transcript segments.');
  for (const row of body.transcript) if (!row || !['Agent','Client','Unassigned'].includes(row.speaker) || typeof row.id !== 'string' || row.id.length > 100 || typeof row.text !== 'string' || row.text.length > 4000) throw new Error('Invalid transcript segment.');
  if (typeof body.playbook !== 'string' || body.playbook.length > 16000) throw new Error('Invalid playbook.');
  return body;
}
export function localCoach({transcript}) {
  const client = transcript.filter(r => r.speaker !== 'Agent');
  const last = client.at(-1)?.text || '';
  const categories = [
    ['Budget', /\$[\d,.]+(?:\s*(?:million|thousand|m|k))?|\bbudget\b|\bprice\b|expensive|afford/i],
    ['Location', /\b(suburb|location|near|area|Doncaster|Balwyn|Hampton|Richmond|school|commute)\b/i],
    ['Property needs', /\b(bedrooms?|bathrooms?|garden|garage|apartment|house|townhouse|accessibility|stairs)\b/i],
    ['Timing', /\b(months?|weeks?|settlement|move|moving|timeline|before|ready)\b/i],
    ['Finance', /\b(pre.?approval|finance|mortgage|lender|loan|approved)\b/i],
    ['Concerns', /\b(worry|worried|concern|expensive|unsure|not sure|too much|traffic|noise)\b/i],
    ['Inspection', /\b(inspect|inspection|visit|view|Saturday|Sunday)\b/i]
  ];
  const facts = categories.flatMap(([label, re]) => {
    const row = client.findLast(r=>re.test(r.text));
    return row ? [{label, evidence:row.text, segmentId:row.id}] : [];
  });
  let title='Understand their next move', say='What would the right property need to have for you to feel confident taking the next step?', why='Start with the buyer’s priorities, then confirm their budget and timing.';
  if (/price|expensive|budget|afford|\$/i.test(last)) {title='Clarify the comfortable range';say='Does your budget include buying costs, or is that the purchase price alone?';why='Separate a price concern from a hard budget limit before recommending properties.';}
  else if (/school|zone|catchment/i.test(last)) {title='Check the school requirement';say='Which school is essential for you? I’ll check the current catchment with the official source before confirming a property.';why='School proximity alone does not establish eligibility.';}
  else if (/think|sure|worry|concern|hesitat/i.test(last)) {title='Find the concern behind the pause';say='Of course. What is the main thing you would want to feel more certain about?';why='Give the buyer room to name the concern without pressure.';}
  else if (/inspect|visit|saturday|view/i.test(last)) {title='Make the next step concrete';say='What day and time would suit an inspection, and who else would you like to bring?';why='Confirm availability with the listing agent before promising a time.';}
  const missing=categories.slice(0,5).filter(([label])=>!facts.some(f=>f.label===label)).map(([label])=>label);
  const alternatives={Budget:'What purchase range feels comfortable for you?',Location:'Which suburbs would you like to focus on?','Property needs':'What are the must-haves for your next home?',Timing:'When would you ideally like to move?',Finance:'Have you had a chance to discuss pre-approval with your lender?'};
  const alternative=alternatives[missing[0]] || 'What would you like to check before taking the next step?';
  return {engine:'Local playbook',title,say,options:[say,alternative],why,facts,missing,nextSteps:missing.length?[`Confirm ${missing.slice(0,2).join(' and ').toLowerCase()}.`,'Check listing status and source dates before quoting property details.']:['Confirm a suitable inspection time and the buyer’s preferred follow-up channel.'],sources:[]};
}
