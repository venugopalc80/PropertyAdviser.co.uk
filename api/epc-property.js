const EPC_ENDPOINT='https://api.get-energy-performance-data.communities.gov.uk/api/domestic/search';
const EPC_SOURCE='Get Energy Performance of Buildings data, England and Wales';
const EPC_SOURCE_URL='https://get-energy-performance-data.communities.gov.uk/';
const EPC_REGISTER_URL='https://www.gov.uk/find-energy-certificate';

function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));}
function clean(value){return String(value||'').trim().replace(/\s+/g,' ')}
function validPostcode(value){return /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(value)}
function validUprn(value){return /^\d{1,12}$/.test(value)}
function supabaseHeaders(key,token){return {apikey:key,Authorization:`Bearer ${token||key}`,Accept:'application/json','Content-Type':'application/json'}}
async function readJson(response){const text=await response.text();try{return JSON.parse(text)}catch{return {}}}
async function sha256(value){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}

module.exports=async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  const supabaseUrl=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const epcToken=process.env.EPC_API_TOKEN||process.env.EPC_API_KEY;
  if(!supabaseUrl||!serviceKey)return json(res,503,{error:'Supabase server connection is not configured',code:'SUPABASE_NOT_CONFIGURED'});
  if(!epcToken)return json(res,503,{error:'EPC data connection is not configured on this deployment',code:'EPC_NOT_CONFIGURED'});

  const auth=clean(req.headers.authorization);
  const accessToken=auth.replace(/^Bearer\s+/i,'');
  if(!accessToken||accessToken===auth)return json(res,401,{error:'Authentication required'});

  try{
    const userResponse=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:supabaseHeaders(serviceKey,accessToken)});
    if(!userResponse.ok)return json(res,401,{error:'Invalid authentication token'});
    const user=await readJson(userResponse);
    if(!user?.id)return json(res,401,{error:'Invalid authentication token'});

    const propertyId=clean(req.body?.property_id||req.body?.propertyId);
    if(!propertyId)return json(res,400,{error:'property_id is required'});

    const baseHeaders=supabaseHeaders(serviceKey);
    const propertyResponse=await fetch(`${supabaseUrl}/rest/v1/properties?select=id,agent_id,uprn,postcode&status=eq.draft&id=eq.${encodeURIComponent(propertyId)}&limit=1`,{headers:baseHeaders});
    if(!propertyResponse.ok)return json(res,502,{error:'Unable to load property'});
    const properties=await readJson(propertyResponse);
    const property=Array.isArray(properties)?properties[0]:null;
    if(!property)return json(res,404,{error:'Draft property not found'});

    let isAdmin=false;
    const profileResponse=await fetch(`${supabaseUrl}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.id)}&limit=1`,{headers:baseHeaders});
    if(profileResponse.ok){const profiles=await readJson(profileResponse);isAdmin=profiles?.[0]?.role==='admin'}
    if(!isAdmin&&property.agent_id!==user.id)return json(res,403,{error:'You do not have access to this property'});

    const rawUprn=clean(property.uprn);
    const uprn=rawUprn?rawUprn.padStart(12,'0'):'';
    const postcode=clean(property.postcode).toUpperCase();
    if(!uprn&&!postcode)return json(res,400,{error:'Property needs a UPRN or valid postcode before EPC lookup'});
    if(rawUprn&&!validUprn(rawUprn))return json(res,400,{error:'Property UPRN must contain up to 12 digits'});
    if(!uprn&&!validPostcode(postcode))return json(res,400,{error:'Property postcode is not valid'});

    const params=new URLSearchParams();
    if(uprn)params.set('uprn',uprn);else params.set('postcode',postcode);
    params.set('page_size','100');
    const epcResponse=await fetch(`${EPC_ENDPOINT}?${params.toString()}`,{headers:{Accept:'application/json',Authorization:`Bearer ${epcToken}`}});
    const epcBody=await readJson(epcResponse);
    if(epcResponse.status===404)return json(res,200,{matched:false,rows:[],message:'No domestic EPC certificate matched the supplied property identifier.'});
    if(!epcResponse.ok)return json(res,502,{error:'EPC data service unavailable',status:epcResponse.status});
    const rows=Array.isArray(epcBody?.data)?epcBody.data:(Array.isArray(epcBody?.data?.data)?epcBody.data.data:[]);
    if(!rows.length)return json(res,200,{matched:false,rows:[],message:'No domestic EPC certificate matched the supplied property identifier.'});

    const selected=rows.find(r=>uprn&&String(r.uprn||'').padStart(12,'0')===uprn)||rows[0];
    const rating=clean(selected.currentEnergyEfficiencyBand).toUpperCase();
    const certificate=clean(selected.certificateNumber);
    if(!rating)return json(res,200,{matched:false,rows,warning:'EPC record found but no current energy efficiency band was returned.'});

    const capturedAt=new Date().toISOString();
    const extractedValue=JSON.stringify({rating,certificateNumber:certificate||null,uprn:selected.uprn?String(selected.uprn):null,postcode:selected.postcode||postcode,registrationDate:selected.registrationDate||null,lodgementDate:selected.lodgementDate||null});
    const evidenceHash=await sha256(`${property.id}|epc_rating|${certificate}|${rating}|${selected.lodgementDate||selected.registrationDate||''}`);
    const evidencePayload={property_id:property.id,field_key:'epc_rating',source_type:'government_api',source_name:EPC_SOURCE,source_url:certificate?EPC_REGISTER_URL:EPC_SOURCE_URL,match_method:uprn?'exact_uprn':'postcode_lookup',extracted_value:extractedValue,evidence_status:'verified',evidence_hash:evidenceHash,captured_at:capturedAt,reviewed_at:capturedAt,notes:'Matched against the current domestic EPC developer API. EPC data covers England and Wales.' ,source_record_id:certificate||null,source_dataset:'Domestic EPC',source_published_at:selected.lodgementDate||selected.registrationDate||null};

    const evidenceResponse=await fetch(`${supabaseUrl}/rest/v1/property_evidence`,{method:'POST',headers:{...baseHeaders,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(evidencePayload)});
    if(!evidenceResponse.ok){const body=await readJson(evidenceResponse);return json(res,502,{error:'Unable to store EPC evidence',details:body});}

    const passportResponse=await fetch(`${supabaseUrl}/rest/v1/property_data_passport?property_id=eq.${encodeURIComponent(property.id)}&field_key=eq.epc_rating`,{method:'PATCH',headers:{...baseHeaders,Prefer:'return=minimal'},body:JSON.stringify({value_text:`Band ${rating}`,status:'confirmed',source_name:EPC_SOURCE,source_url:certificate?EPC_REGISTER_URL:EPC_SOURCE_URL,reviewed_at:capturedAt,notes:certificate?`Certificate ${certificate}`:'Matched from the government EPC developer API.'})});
    if(!passportResponse.ok){const body=await readJson(passportResponse);return json(res,502,{error:'EPC evidence stored but Passport update failed',details:body});}

    return json(res,200,{matched:true,property_id:property.id,source:EPC_SOURCE,certificateNumber:certificate||null,rating,matchMethod:uprn?'exact_uprn':'postcode_lookup',uprn:selected.uprn?String(selected.uprn):null,postcode:selected.postcode||postcode,evidenceHash});
  }catch(error){console.error('epc property sync error',error);return json(res,502,{error:'Unable to complete EPC property sync'});}
};
