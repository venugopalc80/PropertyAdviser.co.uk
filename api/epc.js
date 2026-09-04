const EPC_ENDPOINT='https://epc.opendatacommunities.org/api/v1/domestic/search';

function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, max-age=300, stale-while-revalidate=900');res.end(JSON.stringify(body));}
function clean(value){return String(value||'').trim().replace(/\s+/g,' ')}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  const postcode=clean(req.query?.postcode).toUpperCase();
  if(!/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(postcode))return json(res,400,{error:'A valid UK postcode is required'});

  const username=process.env.EPC_API_USERNAME;
  const apiKey=process.env.EPC_API_KEY;
  if(!username||!apiKey)return json(res,503,{error:'EPC data connection is not configured on this deployment',code:'EPC_NOT_CONFIGURED'});

  const auth=Buffer.from(`${username}:${apiKey}`).toString('base64');
  const url=`${EPC_ENDPOINT}?postcode=${encodeURIComponent(postcode)}&size=20`;
  try{
    const upstream=await fetch(url,{headers:{Accept:'application/json',Authorization:`Basic ${auth}`}});
    const text=await upstream.text();
    if(!upstream.ok){console.error('epc upstream error',upstream.status,text.slice(0,500));return json(res,502,{error:'EPC data service unavailable',status:upstream.status});}
    let raw;try{raw=JSON.parse(text)}catch{raw={};}
    const rows=Array.isArray(raw?.rows)?raw.rows:(Array.isArray(raw)?raw:[]);
    const mapped=rows.map(r=>({
      lmkKey:r['lmk-key']||r.lmk_key||r.lmkKey||null,
      address1:r.address1||null,address2:r.address2||null,address3:r.address3||null,
      postcode:r.postcode||postcode,
      currentRating:r['current-energy-rating']||null,potentialRating:r['potential-energy-rating']||null,
      currentEfficiency:r['current-energy-efficiency']?Number(r['current-energy-efficiency']):null,
      potentialEfficiency:r['potential-energy-efficiency']?Number(r['potential-energy-efficiency']):null,
      propertyType:r['property-type']||null,builtForm:r['built-form']||null,
      inspectionDate:r['inspection-date']||null,lodgementDate:r['lodgement-date']||null,
      transactionType:r['transaction-type']||null,totalFloorArea:r['total-floor-area']?Number(r['total-floor-area']):null,
      tenure:r.tenure||null,localAuthority:r['local-authority-label']||r['local-authority']||null
    }));
    return json(res,200,{source:'Energy Performance of Buildings data, England and Wales',postcode,rows:mapped,attribution:'Contains public sector information licensed under the Open Government Licence v3.0.'});
  }catch(error){console.error('epc proxy error',error);return json(res,502,{error:'Unable to reach the EPC data service'});}
};
