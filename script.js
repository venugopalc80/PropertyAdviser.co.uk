const properties = [
  {id:1,price:475000,title:'3 bedroom semi-detached house',location:'Bristol, BS7',beds:3,baths:2,area:'1,245 sq ft',epc:'B',tenure:'Freehold',council:'Band D',parking:'Driveway',garden:'Rear garden',score:94,tag:'Featured',status:'Verified',image:'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=90'},
  {id:2,price:625000,title:'2 bedroom apartment',location:'London, SE1',beds:2,baths:2,area:'885 sq ft',epc:'C',tenure:'Leasehold',council:'Band F',parking:'Permit',garden:'Shared',score:91,tag:'City living',status:'New',image:'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=90'},
  {id:3,price:385000,title:'4 bedroom detached house',location:'Leeds, LS16',beds:4,baths:2,area:'1,890 sq ft',epc:'C',tenure:'Freehold',council:'Band E',parking:'Garage + drive',garden:'Large rear garden',score:96,tag:'Family home',status:'Verified',image:'https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1600&q=90'},
  {id:4,price:510000,title:'3 bedroom townhouse',location:'Manchester, M20',beds:3,baths:2,area:'1,430 sq ft',epc:'B',tenure:'Freehold',council:'Band D',parking:'Allocated',garden:'Private garden',score:95,tag:'Garden',status:'Verified',image:'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1600&q=90'},
  {id:5,price:795000,title:'4 bedroom period home',location:'Bath, BA1',beds:4,baths:3,area:'2,240 sq ft',epc:'D',tenure:'Freehold',council:'Band G',parking:'On-street',garden:'Courtyard',score:88,tag:'Period',status:'New',image:'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=90'},
  {id:6,price:295000,title:'2 bedroom cottage',location:'York, YO31',beds:2,baths:1,area:'925 sq ft',epc:'C',tenure:'Freehold',council:'Band C',parking:'Driveway',garden:'Rear garden',score:93,tag:'Character',status:'Verified',image:'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1600&q=90'}
];

const propertyGrid=document.getElementById('propertyGrid');
const locationInput=document.getElementById('locationInput');
const minPrice=document.getElementById('minPrice');
const maxPrice=document.getElementById('maxPrice');
const beds=document.getElementById('beds');
const modal=document.getElementById('modal');
const modalTitle=document.getElementById('modalTitle');
const modalEyebrow=document.getElementById('modalEyebrow');
const modalText=document.getElementById('modalText');
const aiBrief=document.getElementById('aiBrief');
const modalAction=document.getElementById('modalAction');
const modalResult=document.getElementById('modalResult');
const pound=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
let currentList=properties;
let compareIds=JSON.parse(localStorage.getItem('havenlyCompare')||'[]');
let savedIds=JSON.parse(localStorage.getItem('havenlySaved')||'[]');

const style=document.createElement('style');
style.textContent=`
.compare-tray{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:80;background:#0b1320;color:#fff;border-radius:18px;padding:12px 14px;display:flex;align-items:center;gap:14px;box-shadow:0 18px 50px rgba(0,0,0,.25);max-width:calc(100% - 28px)}
.compare-items{display:flex;gap:8px;align-items:center}.compare-pill{background:rgba(255,255,255,.1);padding:8px 10px;border-radius:10px;font-size:12px;white-space:nowrap}.compare-tray button{border:0;cursor:pointer}.compare-go{background:#fff;color:#0b1320;padding:10px 14px;border-radius:10px;font-weight:700}.compare-clear{background:transparent;color:#cbd5e1}.property-card{cursor:pointer}.property-card .save{z-index:3}.detail-wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:24px}.detail-image{width:100%;height:360px;object-fit:cover;border-radius:18px}.detail-price{font-family:Georgia,serif;font-size:38px;margin:4px 0}.detail-meta{color:#64748b;margin-bottom:18px}.detail-facts{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:18px 0}.detail-fact{padding:13px;background:#f5f7fa;border-radius:12px}.detail-fact b{display:block}.detail-fact small{color:#64748b}.detail-score{padding:16px;border:1px solid #e2e8f0;border-radius:14px;margin-top:18px}.detail-score strong{font-size:26px}.detail-checks{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;font-size:13px}.compare-table{width:100%;border-collapse:collapse;margin-top:18px}.compare-table th,.compare-table td{padding:11px;border-bottom:1px solid #e5e7eb;text-align:left}.compare-table th{font-size:13px}.compare-table td{font-size:14px}.search-summary{margin:18px 0;padding:12px 14px;background:#f5f7fa;border-radius:12px;display:flex;justify-content:space-between;gap:10px;align-items:center}.clear-search{border:0;background:transparent;text-decoration:underline;cursor:pointer}
@media(max-width:760px){.compare-tray{width:calc(100% - 24px);bottom:12px}.compare-pill:nth-child(n+3){display:none}.detail-wrap{grid-template-columns:1fr}.detail-image{height:240px}.detail-price{font-size:32px}.detail-checks{grid-template-columns:1fr}}
`;
document.head.appendChild(style);

function renderProperties(list=properties){
  currentList=list;
  propertyGrid.innerHTML=list.length?list.map(p=>`
    <article class="property-card" data-id="${p.id}" tabindex="0" aria-label="Open ${p.title}">
      <div class="property-image"><img src="${p.image}" alt="${p.title} in ${p.location}" loading="lazy"><button class="save" type="button" aria-label="${savedIds.includes(p.id)?'Remove from saved':'Save'} ${p.title}" data-save="${p.id}">${savedIds.includes(p.id)?'♥':'♡'}</button><span class="tag">${p.tag}</span></div>
      <div class="property-info"><div class="price-row"><span class="price">${pound(p.price)}</span><span class="status">${p.status}</span></div><div class="property-title">${p.title}</div><div class="property-meta">${p.location}</div><div class="property-facts"><span>🛏 ${p.beds}</span><span>◫ ${p.baths}</span><span>↗ ${p.area}</span><span>⚡ ${p.epc}</span></div></div>
    </article>`).join(''):`<div class="empty-state"><h3>No matching properties</h3><p>Try widening your location, price range or bedroom requirement.</p><button class="outline-btn" id="resetSearch" type="button">Reset search</button></div>`;
  updateCompareTray();
}
renderProperties();

function openModal(type='ai'){
  modal.hidden=false;document.body.style.overflow='hidden';modalResult.hidden=true;delete modalAction.dataset.action;delete modalAction.dataset.detailId;
  if(type==='ai'){modalEyebrow.textContent='AI PROPERTY SEARCH';modalTitle.textContent='Describe the home you want.';modalText.textContent='Write naturally and the demo will turn your brief into a structured property search.';aiBrief.value='3 bedroom home under £500k near Bristol, garden, parking and EPC B+';modalAction.textContent='Create search →';}
  if(type==='sign'){modalEyebrow.textContent='YOUR HAVENLY';modalTitle.textContent='Save the homes that matter.';modalText.textContent='This interactive demo stores your shortlist locally in the browser. A production build would connect this to secure authentication.';aiBrief.value='';modalAction.textContent='Continue →';}
}
function closeModal(){modal.hidden=true;document.body.style.overflow='';}
function showResult(html){modalResult.hidden=false;modalResult.innerHTML=html;}
function propertyDetail(p){
  modalEyebrow.textContent='PROPERTY INTELLIGENCE';modalTitle.textContent=p.title;modalText.innerHTML=`<div class="detail-wrap"><div><img class="detail-image" src="${p.image}" alt="${p.title}"><div class="detail-price">${pound(p.price)}</div><div class="detail-meta">${p.location} · ${p.beds} bedrooms · ${p.baths} bathrooms · ${p.area}</div><div class="detail-facts"><div class="detail-fact"><b>Tenure</b><small>${p.tenure}</small></div><div class="detail-fact"><b>EPC</b><small>Band ${p.epc}</small></div><div class="detail-fact"><b>Council tax</b><small>${p.council}</small></div><div class="detail-fact"><b>Parking</b><small>${p.parking}</small></div></div></div><div><div class="detail-score"><small>PROPERTY CONFIDENCE</small><div><strong>${p.score}/100</strong></div><div class="meter"><span style="width:${p.score}%"></span></div><div class="detail-checks"><span>✓ Price shown</span><span>✓ Tenure shown</span><span>✓ EPC shown</span><span>✓ Floorplan available</span><span>✓ Council tax shown</span><span>✓ Local context</span></div></div><p style="margin-top:16px">Material information should be presented clearly and early. This demo uses illustrative listing data; a production platform would verify each field against authoritative sources.</p></div></div>`;aiBrief.value='';modalAction.textContent='Add to comparison →';modalAction.dataset.detailId=p.id;modalAction.dataset.action='compare';modalResult.hidden=true;
}
function openProperty(id){const p=properties.find(x=>x.id===Number(id));if(!p)return;modal.hidden=false;document.body.style.overflow='hidden';propertyDetail(p);}

document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',closeModal));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeModal();if((e.key==='Enter'||e.key===' ')&&e.target.matches('.property-card')){e.preventDefault();openProperty(e.target.dataset.id)}});
document.getElementById('aiSearchBtn').addEventListener('click',()=>openModal('ai'));
const savedButton=document.getElementById('savedBtn');
if(savedButton)savedButton.addEventListener('click',()=>{location.href='account.html';});

document.querySelectorAll('.search-tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.search-tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');document.getElementById('searchBtn').textContent=`Search ${tab.dataset.mode.toLowerCase()} →`; }));
document.querySelectorAll('[data-quick]').forEach(btn=>btn.addEventListener('click',()=>{locationInput.value=btn.dataset.quick;runSearch();}));

function runSearch(){
  const loc=(locationInput.value||'').trim().toLowerCase();const min=Number(minPrice.value||0),max=Number(maxPrice.value||9999999),minBeds=Number(beds.value||0);const tokens=loc.split(/[ ,]+/).filter(Boolean);
  const filtered=properties.filter(p=>{const hay=`${p.location} ${p.title}`.toLowerCase();const locationMatch=!tokens.length||tokens.some(t=>hay.includes(t));return locationMatch&&p.price>=min&&p.price<=max&&p.beds>=minBeds;});
  renderProperties(filtered);document.getElementById('buy').scrollIntoView({behavior:'smooth',block:'start'});
  const head=document.querySelector('#buy .section-head');let summary=document.getElementById('searchSummary');if(!summary){summary=document.createElement('div');summary.id='searchSummary';summary.className='search-summary';head.parentNode.insertBefore(summary,propertyGrid);}summary.innerHTML=`<span><strong>${filtered.length}</strong> demo ${filtered.length===1?'property':'properties'} match your search${loc?` for <strong>${locationInput.value}</strong>`:''}.</span><button class="clear-search" type="button" id="clearSearch">Clear</button>`;
  document.getElementById('clearSearch').onclick=()=>{locationInput.value='';minPrice.value='0';maxPrice.value='9999999';beds.value='0';document.getElementById('searchSummary')?.remove();renderProperties(properties);};
}
document.getElementById('searchBtn').addEventListener('click',runSearch);

document.addEventListener('click',e=>{
  const card=e.target.closest('.property-card');if(card&&!e.target.closest('[data-save]'))openProperty(card.dataset.id);
  const save=e.target.closest('[data-save]');if(save){const id=Number(save.dataset.save);savedIds=savedIds.includes(id)?savedIds.filter(x=>x!==id):[...savedIds,id];localStorage.setItem('havenlySaved',JSON.stringify(savedIds));renderProperties(currentList);}
  if(e.target.id==='resetSearch')renderProperties(properties);
});

function updateCompareTray(){
  document.getElementById('compareTray')?.remove();if(!compareIds.length)return;
  const tray=document.createElement('div');tray.id='compareTray';tray.className='compare-tray';tray.innerHTML=`<div><strong>Compare homes</strong><div class="compare-items">${compareIds.map(id=>{const p=properties.find(x=>x.id===id);return p?`<span class="compare-pill">${pound(p.price)} · ${p.location}</span>`:''}).join('')}</div></div><button class="compare-go" type="button" id="compareGo">Compare</button><button class="compare-clear" type="button" id="compareClear">Clear</button>`;document.body.appendChild(tray);
  document.getElementById('compareGo').onclick=showComparison;document.getElementById('compareClear').onclick=()=>{compareIds=[];localStorage.removeItem('havenlyCompare');updateCompareTray();};
}
function addCompare(id){if(compareIds.includes(id)){closeModal();showComparison();return;}if(compareIds.length>=3){showResult('<strong>Compare up to 3 homes.</strong> Remove one before adding another.');return;}compareIds.push(id);localStorage.setItem('havenlyCompare',JSON.stringify(compareIds));updateCompareTray();closeModal();}
function showComparison(){
  if(compareIds.length<2){openModal('ai');modalEyebrow.textContent='COMPARE HOMES';modalTitle.textContent='Pick at least two homes';modalText.textContent='Open a property and choose Add to comparison. You can compare up to three homes.';modalAction.textContent='Got it';return;}
  const ps=compareIds.map(id=>properties.find(p=>p.id===id)).filter(Boolean);modal.hidden=false;document.body.style.overflow='hidden';modalEyebrow.textContent='PROPERTY COMPARISON';modalTitle.textContent='See the differences clearly.';modalText.innerHTML=`<table class="compare-table"><thead><tr><th>Feature</th>${ps.map(p=>`<th>${p.location}<br>${pound(p.price)}</th>`).join('')}</tr></thead><tbody>${[['Bedrooms','beds'],['Bathrooms','baths'],['Floor area','area'],['EPC','epc'],['Tenure','tenure'],['Council tax','council'],['Parking','parking'],['Confidence','score']].map(([label,key])=>`<tr><th>${label}</th>${ps.map(p=>`<td>${key==='score'?`${p[key]}/100`:key==='epc'?`Band ${p[key]}`:p[key]}</td>`).join('')}</tr>`).join('')}</tbody></table>`;aiBrief.value='';modalAction.textContent='Close comparison';modalAction.dataset.action='close';modalResult.hidden=true;
}

modalAction.addEventListener('click',()=>{
  if(modalAction.dataset.action==='compare'){addCompare(Number(modalAction.dataset.detailId));return;}
  if(modalAction.dataset.action==='close'){closeModal();return;}
  const brief=aiBrief.value.trim();if(!brief){showResult('Add a few details such as area, budget, bedrooms or must-have features.');return;}
  const text=brief.toLowerCase();const budgetMatch=text.match(/£?([0-9]{2,3})(?:k|,000)/);const budget=budgetMatch?Number(budgetMatch[1])*1000:null;const bedMatch=text.match(/([2-5])\s*(?:bed|bedroom)/);const requestedBeds=bedMatch?Number(bedMatch[1]):0;const matches=properties.filter(p=>(!budget||p.price<=budget)&&(!requestedBeds||p.beds>=requestedBeds));showResult(`<strong>${matches.length||'No'} matching demo homes.</strong><p>${matches.length?matches.slice(0,3).map(p=>`${pound(p.price)} · ${p.title} · ${p.location} · ${p.score}/100 confidence`).join('<br>'):'Try increasing your budget or widening the area.'}</p>`);
});

document.getElementById('exploreInsights').addEventListener('click',()=>{openModal('ai');modalEyebrow.textContent='MARKET INSIGHTS';modalTitle.textContent='See the signals behind a property.';modalText.textContent='This demo uses illustrative figures to show how a UK property intelligence layer could explain price, energy, tenure and local context.';aiBrief.value='What should I check before viewing a 3-bedroom home in Bristol?';modalAction.textContent='Show insights →';});
document.getElementById('mapBtn').addEventListener('click',()=>{openModal('ai');modalEyebrow.textContent='MAP EXPERIENCE';modalTitle.textContent='Explore the neighbourhood.';modalText.textContent='The production version would connect this layer to live geospatial data for transport, amenities, schools and other location signals.';aiBrief.value='Show homes within 20 minutes of central Manchester with a garden.';modalAction.textContent='Explore map →';});
document.getElementById('agentCta').addEventListener('click',()=>{location.href='agent.html';});
document.getElementById('demoPropertyBtn').addEventListener('click',()=>openProperty(1));
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',e=>{const target=document.querySelector(a.getAttribute('href'));if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'});}}));
