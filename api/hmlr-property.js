const HMLR_SOURCE='HM Land Registry Price Paid Data';
const HMLR_UPRN_SOURCE='HM Land Registry Transaction unique identifier and UPRN Look Up Table dataset';
const HMLR_URL='https://www.gov.uk/government/statistical-data-sets/transaction-unique-identifier-and-uprn-look-up-table-dataset';

function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));}
function clean(value){return String(value||'').trim();}
function validUuid(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)}
function validUprn(value){return /^\d{1,12}$/.test(value)}
function headers(key){return {apikey:key,Authorization:`Bearer ${key}`,Accept:'application/json','Content-Type':'application/json'}}
async function readJson(response){const text=await response.text();try{return JSON.parse(text)}catch{return {}}}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  const supabaseUrl=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!supabaseUrl||!serviceKey)return json(res,503,{error:'Supabase server connection is not configured',code:'SUPABASE_NOT_CONFIGURED'});
  const propertyId=clean(req.query?.property_id||req.query?.propertyId||req.query?.id);
  const requestedUprn=clean(req.query?.uprn);
  if(requestedUprn&&!validUprn(requestedUprn))return json(res,400,{error:'UPRN must contain up to 12 digits'});
  if(!propertyId&&!requestedUprn)return json(res,400,{error:'property_id or UPRN is required'});
  try{
    const base=headers(serviceKey);
    let property=null;
    if(propertyId){
      if(!validUuid(propertyId))return json(res,400,{error:'property_id must be a valid UUID'});
      const response=await fetch(`${supabaseUrl}/rest/v1/properties?select=id,uprn,postcode&id=eq.${encodeURIComponent(propertyId)}&limit=1`,{headers:base});
      if(!response.ok)return json(res,502,{error:'Unable to load property'});
      const rows=await readJson(response);property=Array.isArray(rows)?rows[0]:null;
      if(!property)return json(res,404,{error:'Property not found'});
    }
    const rawUprn=requestedUprn||clean(property?.uprn);
    if(!rawUprn)return json(res,200,{matched:false,confidence:0,property_id:property?.id||null,uprn:null,transactions:[],message:'No UPRN is stored for this property. HMLR matching is deliberately not inferred from postcode, address or price.'});
    if(!validUprn(rawUprn))return json(res,400,{error:'Property UPRN must contain up to 12 digits'});
    const uprn=rawUprn.padStart(12,'0');
    const lookupResponse=await fetch(`${supabaseUrl}/rest/v1/hmlr_uprn_lookup?select=transaction_id,uprn&uprn=eq.${encodeURIComponent(uprn)}&limit=100`,{headers:base});
    if(!lookupResponse.ok)return json(res,502,{error:'Unable to query HMLR UPRN lookup'});
    const lookupRows=await readJson(lookupResponse);
    const ids=[...new Set((Array.isArray(lookupRows)?lookupRows:[]).map(row=>clean(row.transaction_id)).filter(validUuid))];
    if(!ids.length)return json(res,200,{matched:false,confidence:0,property_id:property?.id||null,uprn,transactions:[],source:HMLR_UPRN_SOURCE,sourceUrl:HMLR_URL,attribution:'Contains HM Land Registry data © Crown copyright and database right. This data is licensed under the Open Government Licence v3.0. UPRNs contain OS data © Crown copyright and database rights. This data is licensed under the Open Government Licence v3.0.',message:'No HMLR transaction is linked to this UPRN in the imported lookup dataset.'});
    const inList=ids.map(id=>`"${id}"`).join(',');
    const txResponse=await fetch(`${supabaseUrl}/rest/v1/hmlr_price_paid_transactions?select=*&transaction_id=in.(${inList})&order=transaction_date.desc&limit=100`,{headers:base});
    if(!txResponse.ok)return json(res,502,{error:'Unable to load HMLR Price Paid transactions'});
    const transactions=await readJson(txResponse);
    return json(res,200,{matched:true,confidence:100,property_id:property?.id||null,uprn,transactionIds:ids,transactions:Array.isArray(transactions)?transactions:[],matchMethod:'exact_uprn',source:HMLR_SOURCE,sourceUrl:HMLR_URL,lookupSource:HMLR_UPRN_SOURCE,lookupSourceUrl:HMLR_URL,attribution:'Contains HM Land Registry data © Crown copyright and database right. This data is licensed under the Open Government Licence v3.0. UPRNs contain OS data © Crown copyright and database rights. This data is licensed under the Open Government Licence v3.0.'});
  }catch(error){console.error('hmlr property match error',error);return json(res,502,{error:'Unable to complete HMLR property matching'});}
};