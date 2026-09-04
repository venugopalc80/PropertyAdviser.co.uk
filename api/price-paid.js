const ENDPOINT='https://landregistry.data.gov.uk/landregistry/query';

function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, max-age=300, stale-while-revalidate=900');res.end(JSON.stringify(body));}
function cleanPostcode(value){return String(value||'').trim().toUpperCase().replace(/\s+/g,' ')}
function sparqlLiteral(value){return value.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}
function lastPart(value){return String(value||'').split('/').filter(Boolean).pop()||null}
function friendlyType(value){const key=lastPart(value);return ({detached:'Detached',semi_detached:'Semi-detached',terraced:'Terraced',flat_maisonette:'Flat / maisonette',other:'Other'}[key])||key||null}
function friendlyTenure(value){const key=lastPart(value);return ({freehold:'Freehold',leasehold:'Leasehold'}[key])||key||null}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  const postcode=cleanPostcode(req.query?.postcode);
  if(!/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(postcode))return json(res,400,{error:'A valid UK postcode is required'});
  const limit=Math.min(Math.max(Number(req.query?.limit)||12,1),25);
  const query=`PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?transaction ?paon ?saon ?street ?town ?postcode ?amount ?date ?category ?estateType ?propertyType
WHERE {
  ?addr lrcommon:postcode "${sparqlLiteral(postcode)}"^^xsd:string .
  ?transaction lrppi:propertyAddress ?addr ;
               lrppi:pricePaid ?amount ;
               lrppi:transactionDate ?date ;
               lrppi:transactionCategory/skos:prefLabel ?category .
  OPTIONAL {?addr lrcommon:paon ?paon}
  OPTIONAL {?addr lrcommon:saon ?saon}
  OPTIONAL {?addr lrcommon:street ?street}
  OPTIONAL {?addr lrcommon:town ?town}
  OPTIONAL {?transaction lrppi:estateType ?estateType}
  OPTIONAL {?transaction lrppi:propertyType ?propertyType}
}
ORDER BY DESC(?date)
LIMIT ${limit}`;
  try{
    const upstream=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/sparql-results+json'},body:new URLSearchParams({query,format:'json'})});
    if(!upstream.ok)return json(res,502,{error:'HM Land Registry data service unavailable',status:upstream.status});
    const raw=await upstream.json();
    const rows=(raw?.results?.bindings||[]).map(b=>({
      paon:b.paon?.value||null,saon:b.saon?.value||null,street:b.street?.value||null,
      town:b.town?.value||null,postcode:b.postcode?.value||postcode,
      price:Number(b.amount?.value||0),date:b.date?.value||null,
      category:b.category?.value||null,estateType:friendlyTenure(b.estateType?.value),propertyType:friendlyType(b.propertyType?.value)
    }));
    return json(res,200,{source:'HM Land Registry Price Paid Data',sourceUrl:'https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads',postcode,rows,attribution:'Contains HM Land Registry data © Crown copyright and database right 2026. This data is licensed under the Open Government Licence v3.0.'});
  }catch(error){console.error('price-paid proxy error',error);return json(res,502,{error:'Unable to reach HM Land Registry data service'});}
};
