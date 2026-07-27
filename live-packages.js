const slug=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
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
    grid.innerHTML=d.packages.map(p=>`<article class="package-card" data-category="${p.package_type||'domestic'}" data-name="${p.name} ${p.region}" data-slug="${p.slug}"><div class="package-image"><img src="${p.image_url||'assets/images/island-beach.jpg'}" alt="${p.name}" loading="lazy"><span>${p.category||'New'}</span></div><div class="package-body"><small>${(p.region||'').toUpperCase()||'CUSTOM'} · ${(p.duration||'FLEXIBLE').toUpperCase()}</small><h3>${p.name}</h3><p>${p.summary||''}</p><div class="package-footer"><a class="pkg-details-btn" href="package.html?slug=${p.slug}"><i class="hgi-stroke hgi-information-circle"></i> <span>Details</span></a><button class="pkg-book-btn" data-book data-trip="${p.name}"><i class="hgi-stroke hgi-checkmark-circle-02"></i> Book Now</button></div></div></article>`).join('');
    
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