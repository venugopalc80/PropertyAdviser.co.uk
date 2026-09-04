const ENDPOINT='https://landregistry.data.gov.uk/landregistry/query';

function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, max-age=300, stale-while-revalidate=900');res.end(JSON.stringify(body));}
function cleanPostcode(value){return String(value||'').trim().toUpperCase().replace(/\s+/g,' ')}
function cleanTransactionId(value){return String(value||'').trim().toUpperCase()}
function sparqlLiteral(value){return value.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}
function lastPart(value){return String(value||'').split('/').filter(Boolean).pop()||null}
function friendlyType(value){const key=lastPart(value);return ({detached:'Detached',semi_detached:'Semi-detached',terraced:'Terraced',flat_maisonette:'Flat / maisonette',other:'Other'}[key])||key||null}
function friendlyTenure(value){const key=lastPart(value);return ({freehold:'Freehold',leasehold:'Leasehold'}[key])||key||null}
function mapRow(b,postcodeFallback=null){return {
  transactionId:lastPart(b.transaction?.value)||b.transactionId?.value||null,
  paon:b.paon?.value||null,saon:b.saon?.value||null,street:b.street?.value||null,
  locality:b.locality?.value||null,town:b.town?.value||null,district:b.district?.value||null,county:b.county?.value||null,
  postcode:b.postcode?.value||postcodeFallback,price:Number(b.amount?.value||0),date:b.date?.value||null,
  category:b.category?.value||null,estateType:friendlyTenure(b.estateType?.value),propertyType:friendlyType(b.propertyType?.value),
  newBuild:b.newBuild?.value===undefined?null:b.newBuild.value==='true',recordStatus:b.recordStatus?.value||null,
  transactionUrl:b.transaction?.value||null
}}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  const transactionId=cleanTransactionId(req.query?.transaction_id||req.query?.transactionId);
  const postcode=cleanPostcode(req.query?.postcode);
  if(transactionId && !/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(transactionId))return json(res,400,{error:'A valid HM Land Registry transaction ID is required'});
  if(!transactionId && !/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(postcode))return json(res,400,{error:'A valid UK postcode or transaction ID is required'});
  const limit=Math.min(Math.max(Number(req.query?.limit)||12,1),25);
  const where=transactionId
    ? `?transaction lrppi:transactionId "${sparqlLiteral(transactionId)}"^^xsd:string .`
    : `?addr lrcommon:postcode "${sparqlLiteral(postcode)}"^^xsd:string .\n  ?transaction lrppi:propertyAddress ?addr ;`;
  const addressJoin=transactionId ? `?transaction lrppi:propertyAddress ?addr .` : '';
  const query=`PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?transaction ?paon ?saon ?street ?locality ?town ?district ?county ?postcode ?amount ?date ?category ?estateType ?propertyType ?newBuild ?recordStatus
WHERE {
  ${where}
  ${addressJoin}
  ${transactionId ? '?transaction lrppi:pricePaid ?amount ;\n               lrppi:transactionDate ?date ;\n               lrppi:transactionCategory/skos:prefLabel ?category .' : ''}
  OPTIONAL {?addr lrcommon:paon ?paon}
  OPTIONAL {?addr lrcommon:saon ?saon}
  OPTIONAL {?addr lrcommon:street ?street}
  OPTIONAL {?addr lrcommon:locality ?locality}
  OPTIONAL {?addr lrcommon:town ?town}
  OPTIONAL {?addr lrcommon:district ?district}
  OPTIONAL {?addr lrcommon:county ?county}
  OPTIONAL {?addr lrcommon:postcode ?postcode}
  OPTIONAL {?transaction lrppi:pricePaid ?amount}
  OPTIONAL {?transaction lrppi:transactionDate ?date}
  OPTIONAL {?transaction lrppi:transactionCategory/skos:prefLabel ?category}
  OPTIONAL {?transaction lrppi:estateType ?estateType}
  OPTIONAL {?transaction lrppi:propertyType ?propertyType}
  OPTIONAL {?transaction lrppi:newBuild ?newBuild}
  OPTIONAL {?transaction lrppi:recordStatus/skos:prefLabel ?recordStatus}
}
ORDER BY DESC(?date)
LIMIT ${limit}`;
  try{
    const upstream=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/sparql-results+json'},body:new URLSearchParams({query,format:'json'})});
    if(!upstream.ok)return json(res,502,{error:'HM Land Registry data service unavailable',status:upstream.status});
    const raw=await upstream.json();
    const rows=(raw?.results?.bindings||[]).map(b=>mapRow(b,postcode||null));
    return json(res,200,{source:'HM Land Registry Price Paid Data',sourceUrl:'https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads',postcode:postcode||null,transactionId:transactionId||null,rows,count:rows.length,attribution:'Contains HM Land Registry data © Crown copyright and database right 2026. This data is licensed under the Open Government Licence v3.0.'});
  }catch(error){console.error('price-paid proxy error',error);return json(res,502,{error:'Unable to reach HM Land Registry data service'});}
};
