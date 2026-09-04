#!/usr/bin/env node

const GOV_PAGE='https://www.gov.uk/government/statistical-data-sets/transaction-unique-identifier-and-uprn-look-up-table-dataset';
const SUPABASE_URL=process.env.SUPABASE_URL;
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;

if(!SUPABASE_URL||!SERVICE_KEY){console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this importer.');process.exit(1);}

function parseCsvLine(line){
  const out=[];let value='',quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'&&line[i+1]==='"'&&quoted){value+='"';i++;continue;}
    if(ch==='"'){quoted=!quoted;continue;}
    if(ch===','&&!quoted){out.push(value);value='';continue;}
    value+=ch;
  }
  out.push(value);return out;
}

async function main(){
  const page=await fetch(GOV_PAGE).then(r=>{if(!r.ok)throw new Error(`GOV.UK page returned ${r.status}`);return r.text()});
  const match=page.match(/https:\/\/price-paid-data\.publicdata\.landregistry\.gov\.uk\/pp-uprn-lookup-[a-z]{3}-\d{4}\.csv/i);
  if(!match)throw new Error('Could not find the current UPRN lookup CSV on the HM Land Registry page.');
  const csvUrl=match[0];
  const filename=csvUrl.split('/').pop();
  const monthMatch=filename.match(/pp-uprn-lookup-([a-z]{3})-(\d{4})\.csv/i);
  const monthNames={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  const publishedMonth=`${monthMatch[2]}-${String(monthNames[monthMatch[1].toLowerCase()]).padStart(2,'0')}-01`;
  console.log(`Downloading ${filename}…`);
  const csv=await fetch(csvUrl).then(r=>{if(!r.ok)throw new Error(`CSV returned ${r.status}`);return r.text()});
  const lines=csv.split(/\r?\n/).filter(Boolean);
  const rows=[];
  for(const line of lines){
    const [transaction_id,uprn]=parseCsvLine(line).map(v=>v.trim());
    if(/^transaction unique identifier/i.test(transaction_id)||!transaction_id||!/^\d{1,12}$/.test(uprn))continue;
    rows.push({transaction_id,uprn,published_month:publishedMonth});
  }
  console.log(`Parsed ${rows.length.toLocaleString()} UPRN relationships.`);
  const endpoint=`${SUPABASE_URL}/rest/v1/hmlr_uprn_lookup`;
  const batchSize=500;
  for(let i=0;i<rows.length;i+=batchSize){
    const batch=rows.slice(i,i+batchSize);
    const response=await fetch(endpoint,{method:'POST',headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(batch)});
    if(!response.ok)throw new Error(`Supabase batch ${i}-${i+batch.length} failed: ${response.status} ${await response.text()}`);
    if((i/batchSize)%10===0)console.log(`Imported ${Math.min(i+batch.length,rows.length).toLocaleString()} / ${rows.length.toLocaleString()}`);
  }
  console.log(`Done. Source: ${csvUrl}`);
}

main().catch(error=>{console.error(error.message);process.exit(1)});
