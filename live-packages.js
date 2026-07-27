const slug=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

function getTypeLabel(p) {
  const cat = String(p.category||'').toLowerCase();
  const type = String(p.package_type||'domestic').toLowerCase();
  if(p.slug?.startsWith('force-urbania') || cat.includes('vehicle')) return 'Vehicle Hire';
  if(type==='pilgrimage' || cat.includes('umrah')) return 'Pilgrimage';
  if(type==='international') return 'International';
  if(cat.includes('lakshadweep') || cat.includes('island')) return 'Island';
  return 'Domestic';
}

function getIncChips(p) {
  const isVehicle = p.slug?.startsWith('force-urbania') || String(p.category||'').toLowerCase().includes('vehicle');
  if(isVehicle) return ['🚐 AC Vehicle','👨‍✈️ Driver','🛣 All routes'];
  const isPilgrimage = p.package_type==='pilgrimage';
  if(isPilgrimage) return ['✈ Flights','🏨 Hotel','🗺 Guided'];
  const isIsland = String(p.category||'').toLowerCase().includes('lakshadweep') || String(p.category||'').toLowerCase().includes('island');
  if(isIsland) return ['📋 Permit','🏨 Stay','🍽 Meals'];
  const inc = Array.isArray(p.included) ? p.included.join(' ').toLowerCase() : (p.summary||'').toLowerCase();
  const chips = [];
  if(/hotel|resort|stay|houseboat|villa|accommodation/.test(inc)) chips.push('🏨 Hotel');
  if(/flight|flights/.test(inc)) chips.push('✈ Flights');
  if(/transfer|airport|pickup|vehicle|transport/.test(inc)) chips.push('🚗 Transfers');
  if(/meal|breakfast|dinner|lunch|food|board/.test(inc)) chips.push('🍽 Meals');
  if(/guide|coordinator|mutawwif|support/.test(inc)) chips.push('🗺 Guide');
  if(/permit/.test(inc)) chips.push('📋 Permit');
  if(!chips.length) { chips.push('🏨 Hotel'); chips.push('🚗 Transfers'); }
  return chips.slice(0,3);
}

function cardHTML(p) {
  const typeLabel = getTypeLabel(p);
  const chips = getIncChips(p);
  const inc = chips.map(c=>`<span class="inc-chip">${c}</span>`).join('');
  const dur = p.duration ? p.duration.split('/')[0].trim() : 'Flexible';
  const region = p.region ? p.region.split('·')[0].split(',')[0].trim() : '';
  const meta = [region, dur].filter(Boolean).join(' · ');
  const price = p.price && p.price!=='Custom quote' ? p.price : 'Custom quote';
  const img = p.image_url||'assets/images/island-beach.jpg';
  return `<article class="package-card" data-category="${p.package_type||'domestic'}" data-name="${p.name} ${p.region}" data-slug="${p.slug}">
    <div class="package-image">
      <img src="${img}" alt="${p.name}" loading="lazy">
      <span class="pkg-cat-badge">${typeLabel}</span>
      <span class="pkg-rating-badge">⭐ 4.9</span>
    </div>
    <div class="package-body">
      <div class="pkg-meta">${meta}</div>
      <h3>${p.name}</h3>
      <p style="font-size:13px;color:#6e7b76;margin:0 0 4px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${p.summary||''}</p>
      <div class="pkg-inclusions">${inc}</div>
      <div class="pkg-price-row">
        <div><div class="pkg-price-label">Starts at</div><div class="pkg-price-val">${price}</div></div>
      </div>
      <div class="package-footer">
        <a class="pkg-details-btn" href="package.html?slug=${p.slug}"><i class="hgi-stroke hgi-information-circle"></i> View Details</a>
        <button class="pkg-book-btn" data-book data-trip="${p.name}"><i class="hgi-stroke hgi-checkmark-circle-02"></i> Book Now</button>
      </div>
    </div>
  </article>`;
}

async function load(){
  const grid=document.querySelector('#managed-package-grid');
  if(!grid)return;
  try{
    const res=await fetch('/api/packages');
    if(!res.ok)throw 0;
    const d=await res.json();
    if(!d.packages.length){
      grid.closest('.managed-packages')?.remove();
      return;
    }
    grid.innerHTML=d.packages.map(cardHTML).join('');
    
    const select = document.querySelector('#trip-select');
    if(select) {
      const groups = {};
      d.packages.forEach(p => {
        const cat = p.category || 'Other';
        if(!groups[cat]) groups[cat] = [];
        groups[cat].push(p.name);
      });
      let html = '<option>Custom journey</option>';
      for(const [cat, names] of Object.entries(groups)) {
        html += `<optgroup label="${cat}">`;
        names.forEach(n => html += `<option>${n}</option>`);
        html += `</optgroup>`;
      }
      select.innerHTML = html;
    }

    window.dispatchEvent(new CustomEvent('bahadur:destinations-ready'));
  }catch{
    grid.closest('.managed-packages')?.remove();
  }
}
load();
