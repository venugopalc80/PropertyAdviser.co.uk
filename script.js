const properties = [
  {id:1,price:475000,title:'3 bedroom semi-detached house',location:'Bristol, BS7',beds:3,baths:2,area:'1,245 sq ft',epc:'B',status:'Verified',score:94,tag:'Featured',image:'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=88'},
  {id:2,price:625000,title:'2 bedroom apartment',location:'London, SE1',beds:2,baths:2,area:'885 sq ft',epc:'C',status:'New',score:91,tag:'City living',image:'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=88'},
  {id:3,price:385000,title:'4 bedroom detached house',location:'Leeds, LS16',beds:4,baths:2,area:'1,890 sq ft',epc:'C',status:'Verified',score:96,tag:'Family home',image:'https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1200&q=88'},
  {id:4,price:510000,title:'3 bedroom townhouse',location:'Manchester, M20',beds:3,baths:2,area:'1,430 sq ft',epc:'B',status:'Verified',score:95,tag:'Garden',image:'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1200&q=88'},
  {id:5,price:795000,title:'4 bedroom period home',location:'Bath, BA1',beds:4,baths:3,area:'2,240 sq ft',epc:'D',status:'New',score:88,tag:'Period',image:'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=88'},
  {id:6,price:295000,title:'2 bedroom cottage',location:'York, YO31',beds:2,baths:1,area:'925 sq ft',epc:'C',status:'Verified',score:93,tag:'Character',image:'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=88'}
];

const propertyGrid = document.getElementById('propertyGrid');
const locationInput = document.getElementById('locationInput');
const minPrice = document.getElementById('minPrice');
const maxPrice = document.getElementById('maxPrice');
const beds = document.getElementById('beds');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalEyebrow = document.getElementById('modalEyebrow');
const modalText = document.getElementById('modalText');
const aiBrief = document.getElementById('aiBrief');
const modalAction = document.getElementById('modalAction');
const modalResult = document.getElementById('modalResult');

const pound = n => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);

function renderProperties(list=properties){
  propertyGrid.innerHTML = list.length ? list.map(p => `
    <article class="property-card" data-id="${p.id}">
      <div class="property-image">
        <img src="${p.image}" alt="${p.title} in ${p.location}" loading="lazy">
        <button class="save" type="button" aria-label="Save ${p.title}" data-save="${p.id}">♡</button>
        <span class="tag">${p.tag}</span>
      </div>
      <div class="property-info">
        <div class="price-row"><span class="price">${pound(p.price)}</span><span class="status">${p.status}</span></div>
        <div class="property-title">${p.title}</div>
        <div class="property-meta">${p.location}</div>
        <div class="property-facts"><span>🛏 ${p.beds}</span><span>◫ ${p.baths}</span><span>↗ ${p.area}</span><span>⚡ ${p.epc}</span></div>
      </div>
    </article>`).join('') : `<div class="empty-state"><h3>No matching properties</h3><p>Try widening your location or price range.</p></div>`;
}
renderProperties();

function openModal(type='ai'){
  modal.hidden=false;
  document.body.style.overflow='hidden';
  modalResult.hidden=true;
  if(type==='ai'){
    modalEyebrow.textContent='AI PROPERTY SEARCH';
    modalTitle.textContent='Describe the home you want.';
    modalText.textContent='Write naturally. Havenly will turn your brief into a clear search without making you learn a new filter system.';
    aiBrief.value='3 bedroom home under £500k near Bristol, garden, parking and EPC B+';
    modalAction.textContent='Create search →';
  }else if(type==='sign'){modalEyebrow.textContent='YOUR HAVENLY';modalTitle.textContent='Save the homes that matter.';modalText.textContent='Sign-in is part of this interactive demo. Create alerts, save homes and keep your shortlist in one place.';aiBrief.value='';modalAction.textContent='Continue →';}
}
function closeModal(){modal.hidden=true;document.body.style.overflow='';}

document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',closeModal));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeModal()});

document.getElementById('aiSearchBtn').addEventListener('click',()=>openModal('ai'));
document.getElementById('signInBtn').addEventListener('click',()=>openModal('sign'));
document.getElementById('savedBtn').addEventListener('click',()=>openModal('sign'));

document.querySelectorAll('.search-tab').forEach(tab=>tab.addEventListener('click',()=>{
  document.querySelectorAll('.search-tab').forEach(t=>t.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById('searchBtn').textContent = `Search ${tab.dataset.mode.toLowerCase()} →`;
}));

document.querySelectorAll('[data-quick]').forEach(btn=>btn.addEventListener('click',()=>{
  locationInput.value=btn.dataset.quick;
  document.getElementById('searchBtn').click();
}));

document.getElementById('searchBtn').addEventListener('click',()=>{
  const loc=(locationInput.value||'').trim().toLowerCase();
  const min=Number(minPrice.value||0), max=Number(maxPrice.value||9999999), minBeds=Number(beds.value||0);
  const filtered=properties.filter(p=>{
    const locationMatch=!loc||p.location.toLowerCase().includes(loc)||p.title.toLowerCase().includes(loc);
    return locationMatch&&p.price>=min&&p.price<=max&&p.beds>=minBeds;
  });
  renderProperties(filtered);
  document.getElementById('buy').scrollIntoView({behavior:'smooth',block:'start'});
});

modalAction.addEventListener('click',()=>{
  const brief=aiBrief.value.trim();
  if(!brief){modalResult.hidden=false;modalResult.textContent='Add a few details, such as area, budget, bedrooms or must-have features.';return;}
  modalResult.hidden=false;
  modalResult.innerHTML='<strong>Search created.</strong> Matching homes will prioritise your budget, location and the features in your brief. This is a front-end product demo.';
});

document.getElementById('exploreInsights').addEventListener('click',()=>{
  openModal('ai');
  modalEyebrow.textContent='MARKET INSIGHTS';
  modalTitle.textContent='See the signals behind a property.';
  modalText.textContent='This demo uses illustrative figures to show how a UK property intelligence layer could explain price, energy, tenure and local context.';
  aiBrief.value='What should I check before viewing a 3-bedroom home in Bristol?';
  modalAction.textContent='Show insights →';
});

document.getElementById('mapBtn').addEventListener('click',()=>{
  openModal('ai');
  modalEyebrow.textContent='MAP EXPERIENCE';
  modalTitle.textContent='Explore the neighbourhood.';
  modalText.textContent='The production version would connect this layer to live geospatial data for transport, amenities, schools and other location signals.';
  aiBrief.value='Show homes within 20 minutes of central Manchester with a garden.';
  modalAction.textContent='Explore map →';
});

document.getElementById('demoPropertyBtn').addEventListener('click',()=>{
  const p=properties[0];
  openModal('ai');
  modalEyebrow.textContent='PROPERTY DEMO';
  modalTitle.textContent=`${pound(p.price)} · ${p.location}`;
  modalText.textContent=`${p.title}. Confidence ${p.score}/100 · EPC ${p.epc} · Freehold · Council Tax D. The full production flow would include documents, map layers, price history and enquiry actions.`;
  aiBrief.value='I want to compare this property with similar homes nearby.';
  modalAction.textContent='Start comparison →';
});

document.getElementById('agentCta').addEventListener('click',()=>{
  openModal('sign');
  modalEyebrow.textContent='AGENT EXPERIENCE';
  modalTitle.textContent='A richer listing starts with better data.';
  modalText.textContent='The agent dashboard would let teams publish, verify, manage enquiries, schedule viewings and understand listing performance.';
  modalAction.textContent='Open agent demo →';
});

document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-save]');
  if(btn){
    const active=btn.dataset.saved==='true';
    btn.dataset.saved=String(!active);
    btn.textContent=active?'♡':'♥';
    btn.setAttribute('aria-label',active?'Save property':'Remove property from saved');
  }
});
