const EPC_ENDPOINT='https://api.get-energy-performance-data.communities.gov.uk/api/domestic/search';

function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, max-age=300, stale-while-revalidate=900');res.end(JSON.stringify(body));}
function clean(value){return String(value||'').trim().replace(/\s+/g,' ')}
function validPostcode(value){return /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(value)}
function validUprn(value){return /^\d{1,12}$/.test(value)}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  const postcode=clean(req.query?.postcode).toUpperCase();
  const rawUprn=clean(req.query?.uprn);
  const uprn=rawUprn?rawUprn.padStart(12,'0'):'';
  if(!postcode&&!uprn)return json(res,400,{error:'A valid UK postcode or UPRN is required'});
  if(postcode&&!validPostcode(postcode))return json(res,400,{error:'A valid UK postcode is required'});
  if(rawUprn&&!validUprn(rawUprn))return json(res,400,{error:'A valid UPRN of up to 12 digits is required'});

  const token=process.env.EPC_API_TOKEN||process.env.EPC_API_KEY;
  if(!token)return json(res,503,{error:'EPC data connection is not configured on this deployment',code:'EPC_NOT_CONFIGURED'});

  const params=new URLSearchParams();
  if(postcode)params.set('postcode',postcode);
  if(uprn)params.set('uprn',uprn);
  params.set('page_size','100');
  const url=`${EPC_ENDPOINT}?${params.toString()}`;
  try{
    const upstream=await fetch(url,{headers:{Accept:'application/json',Authorization:`Bearer ${token}`}});
    const text=await upstream.text();
    if(upstream.status===404)return json(res,200,{source:'Get Energy Performance of Buildings data, England and Wales',postcode:postcode||null,uprn:uprn||null,rows:[],attribution:'Contains public sector information licensed under the Open Government Licence v3.0.',message:'No domestic EPC certificate matched the supplied property identifier.'});
    if(!upstream.ok){console.error('epc upstream error',upstream.status,text.slice(0,500));return json(res,502,{error:'EPC data service unavailable',status:upstream.status});}
    let raw;try{raw=JSON.parse(text)}catch{raw={};}
    const rows=Array.isArray(raw?.data)?raw.data:(Array.isArray(raw?.data?.data)?raw.data.data:[]);
    const mapped=rows.map(r=>({
      certificateNumber:r.certificateNumber||null,
      address1:r.addressLine1||null,address2:r.addressLine2||null,address3:r.addressLine3||null,address4:r.addressLine4||null,
      postcode:r.postcode||postcode||null,postTown:r.postTown||null,council:r.council||null,
      currentRating:r.currentEnergyEfficiencyBand||null,
      currentEfficiency:r.currentEnergyEfficiency!=null?Number(r.currentEnergyEfficiency):null,
      potentialRating:r.potentialEnergyEfficiencyBand||null,
      potentialEfficiency:r.potentialEnergyEfficiency!=null?Number(r.potentialEnergyEfficiency):null,
      propertyType:r.propertyType||null,builtForm:r.builtForm||null,
      inspectionDate:r.inspectionDate||null,lodgementDate:r.lodgementDate||null,
      transactionType:r.transactionType||null,totalFloorArea:r.totalFloorArea!=null?Number(r.totalFloorArea):null,
      tenure:r.tenure||null,uprn:r.uprn!=null?String(r.uprn):null,schemaType:r.schemaType||null
    }));
    return json(res,200,{source:'Get Energy Performance of Buildings data, England and Wales',postcode:postcode||null,uprn:uprn||null,rows:mapped,pagination:raw.pagination||null,attribution:'Contains public sector information licensed under the Open Government Licence v3.0.'});
  }catch(error){console.error('epc proxy error',error);return json(res,502,{error:'Unable to reach the EPC data service'});}
};
