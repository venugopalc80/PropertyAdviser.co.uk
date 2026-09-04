function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, max-age=300, stale-while-revalidate=900');res.end(JSON.stringify(body));}
function clean(value){return String(value||'').trim();}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  const uprn=clean(req.query?.uprn);
  if(!/^\d{1,12}$/.test(uprn))return json(res,400,{error:'A valid UPRN is required'});
  const base=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key)return json(res,503,{error:'HMLR identity service is not configured',code:'SUPABASE_SERVER_NOT_CONFIGURED'});
  try{
    const url=`${base}/rest/v1/hmlr_uprn_lookup?select=transaction_id,uprn,published_month&uprn=eq.${encodeURIComponent(uprn)}&order=published_month.desc&limit=50`;
    const upstream=await fetch(url,{headers:{Accept:'application/json',apikey:key,Authorization:`Bearer ${key}`}});
    const text=await upstream.text();
    if(!upstream.ok){console.error('hmlr-uprn lookup error',upstream.status,text.slice(0,500));return json(res,502,{error:'HMLR identity lookup unavailable'});}
    let rows=[];try{rows=JSON.parse(text)}catch{}
    return json(res,200,{source:'HM Land Registry Transaction unique identifier and UPRN Look Up Table',uprn,rows:Array.isArray(rows)?rows:[],count:Array.isArray(rows)?rows.length:0,attribution:'Contains HM Land Registry data © Crown copyright and database right 2026. UPRNs contain OS data © Crown copyright and database rights 2026. Both are licensed under the Open Government Licence v3.0.'});
  }catch(error){console.error('hmlr-uprn proxy error',error);return json(res,502,{error:'Unable to query HMLR identity data'});}
};
