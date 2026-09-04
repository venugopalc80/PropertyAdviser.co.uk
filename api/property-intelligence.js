const ENDPOINT='https://landregistry.data.gov.uk/landregistry/query';
function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, max-age=300, stale-while-revalidate=900');res.end(JSON.stringify(body));}
function clean(v){return String(v||'').trim().toUpperCase().replace(/\s+/g,' ')}
function esc(v){return String(v||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"')}
function tail(v){return String(v||'').split('/').filter(Boolean).pop()||null}
function type(v){return ({detached:'Detached',semi_detached:'Semi-detached',terraced:'Terraced',flat_maisonette:'Flat / maisonette',other:'Other'}[tail(v)])||tail(v)||null}
function tenure(v){return ({freehold:'Freehold',leasehold:'Leasehold'}[tail(v)])||tail(v)||null}
function median(a){if(!a.length)return null;const x=[...a].sort((m,n)=>m-n),i=Math.floor(x.length/2);return x.length%2?x[i]:Math.round((x[i-1]+x[i])/2)}
module.exports=async function handler(req,res){
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
 const postcode=clean(req.query?.postcode), asking=Number(req.query?.price||0), requestedType=String(req.query?.type||'').toLowerCase();
 if(!/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(postcode))return json(res,400,{error:'A valid UK postcode is required'});
 const query=`PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\nPREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>\nPREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>\nPREFIX skos: <http://www.w3.org/2004/02/skos/core#>\nSELECT ?paon ?saon ?street ?town ?postcode ?amount ?date ?estateType ?propertyType WHERE { ?addr lrcommon:postcode "${esc(postcode)}"^^xsd:string . ?transaction lrppi:propertyAddress ?addr ; lrppi:pricePaid ?amount ; lrppi:transactionDate ?date . OPTIONAL {?addr lrcommon:paon ?paon} OPTIONAL {?addr lrcommon:saon ?saon} OPTIONAL {?addr lrcommon:street ?street} OPTIONAL {?addr lrcommon:town ?town} OPTIONAL {?transaction lrppi:estateType ?estateType} OPTIONAL {?transaction lrppi:propertyType ?propertyType} } ORDER BY DESC(?date) LIMIT 50`;
 try{
  const upstream=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/sparql-results+json'},body:new URLSearchParams({query,format:'json'})});
  if(!upstream.ok)return json(res,502,{error:'HM Land Registry data service unavailable',status:upstream.status});
  const raw=await upstream.json();
  const rows=(raw?.results?.bindings||[]).map(b=>({address:[b.paon?.value,b.saon?.value,b.street?.value].filter(Boolean).join(' '),town:b.town?.value||null,postcode:b.postcode?.value||postcode,price:Number(b.amount?.value||0),date:b.date?.value||null,tenure:tenure(b.estateType?.value),propertyType:type(b.propertyType?.value)})).filter(r=>r.price>0);
  const sameType=requestedType?rows.filter(r=>String(r.propertyType||'').toLowerCase().replace(/[^a-z]/g,'')===requestedType.replace(/[^a-z]/g,'')):rows;
  const pool=sameType.length>=3?sameType:rows;
  const prices=pool.map(r=>r.price);
  const med=median(prices), avg=prices.length?Math.round(prices.reduce((a,b)=>a+b,0)/prices.length):null;
  const latest=rows[0]||null;
  const ratio=asking&&med?Math.round((asking/med)*100):null;
  return json(res,200,{source:'HM Land Registry Price Paid Data',sourceUrl:'https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads',postcode,askingPrice:asking||null,summary:{transactions:rows.length,comparableTransactions:pool.length,medianSoldPrice:med,averageSoldPrice:avg,latestSale:latest,askingVsMedianPercent:ratio},comparables:pool.slice(0,12),attribution:'Contains HM Land Registry data © Crown copyright and database right 2026. This data is licensed under the Open Government Licence v3.0.'});
 }catch(error){console.error('property intelligence error',error);return json(res,502,{error:'Unable to reach HM Land Registry data service'});}
};
