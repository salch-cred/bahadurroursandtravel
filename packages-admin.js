/* ── Package Admin ────────────────────────────────────────── */
const $=s=>document.querySelector(s);
let items=[];
let galleryImages=[]; // array of base64 data URLs for gallery
let primaryImageBase64=''; // base64 for primary image

const token=()=>localStorage.getItem('bahadur-admin-token')||'';
const auth=()=>({Authorization:`Bearer ${token()}`});
const lines=v=>String(v||'').split('\n').map(x=>x.trim()).filter(Boolean);
const money=v=>v||'Custom quote';

let items=[];
let galleryImages=[]; // [{src: dataURL or https URL, label: 'primary'|'gallery'}]

const token=()=>localStorage.getItem('bahadur-admin-token')||'';
const auth=()=>({Authorization:`Bearer ${token()}`});

/* ── Activity log ─────────────────────────────────────────── */
const actLog=[];
function log(msg){
  actLog.unshift({msg,t:new Date().toLocaleTimeString()});
  if(actLog.length>30)actLog.pop();
  const feed=$('#activity-feed');
  if(feed)feed.innerHTML=actLog.map(a=>`<li><span></span><div><strong>${esc(a.msg)}</strong><small>${a.t}</small></div></li>`).join('');
}

/* ── Image compress ───────────────────────────────────────── */
function compress(file,maxW=1400,q=0.82){
  return new Promise((ok,fail)=>{
    const r=new FileReader();
    r.onerror=fail;
    r.onload=e=>{
      const img=new Image();
      img.onerror=fail;
      img.onload=()=>{
        let w=img.width,h=img.height;
        if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
        const c=document.createElement('canvas');
        c.width=w;c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        ok(c.toDataURL('image/jpeg',q));
      };
      img.src=e.target.result;
    };
    r.readAsDataURL(file);
  });
}

/* ── Gallery manager ──────────────────────────────────────── */
function renderGallery(){
  const grid=$('#gallery-grid');
  const state=$('#pkg-state');
  if(!grid)return;

  if(!galleryImages.length){
    grid.innerHTML=`<div class="gal-empty"><i class="hgi-stroke hgi-image-01"></i><span>No images yet. Upload or paste URLs below.</span></div>`;
  } else {
    grid.innerHTML=galleryImages.map((img,i)=>`
      <div class="gal-thumb ${img.primary?'gal-primary':''}" data-idx="${i}">
        <img src="${esc(img.src)}" alt="Package image ${i+1}" loading="lazy"
          onerror="this.src='assets/images/island-beach.jpg'">
        <div class="gal-thumb-actions">
          ${!img.primary?`<button type="button" class="gal-btn gal-set-primary" data-idx="${i}" title="Set as cover photo">
            <i class="hgi-stroke hgi-star-01"></i>
          </button>`:`<span class="gal-primary-badge"><i class="hgi-stroke hgi-star-01"></i> Cover</span>`}
          ${i>0?`<button type="button" class="gal-btn gal-move" data-idx="${i}" data-dir="-1" title="Move left">
            <i class="hgi-stroke hgi-arrow-left-01"></i>
          </button>`:''}
          ${i<galleryImages.length-1?`<button type="button" class="gal-btn gal-move" data-idx="${i}" data-dir="1" title="Move right">
            <i class="hgi-stroke hgi-arrow-right-01"></i>
          </button>`:''}
          <button type="button" class="gal-btn gal-delete" data-idx="${i}" title="Remove image">
            <i class="hgi-stroke hgi-delete-02"></i>
          </button>
        </div>
        <span class="gal-num">${i+1}</span>
      </div>`).join('');
  }

  // Wire buttons
  grid.querySelectorAll('.gal-set-primary').forEach(b=>b.onclick=()=>{
    const i=Number(b.dataset.idx);
    galleryImages.forEach((img,j)=>img.primary=(i===j));
    syncPrimaryToForm();
    renderGallery();
    updateLivePreview();
    log('Set image '+(i+1)+' as cover photo');
  });
  grid.querySelectorAll('.gal-move').forEach(b=>b.onclick=()=>{
    const i=Number(b.dataset.idx),dir=Number(b.dataset.dir);
    const j=i+dir;
    if(j<0||j>=galleryImages.length)return;
    [galleryImages[i],galleryImages[j]]=[galleryImages[j],galleryImages[i]];
    renderGallery();
    updateLivePreview();
  });
  grid.querySelectorAll('.gal-delete').forEach(b=>b.onclick=()=>{
    const i=Number(b.dataset.idx);
    const wasPrimary=galleryImages[i].primary;
    galleryImages.splice(i,1);
    if(wasPrimary&&galleryImages.length)galleryImages[0].primary=true;
    syncPrimaryToForm();
    renderGallery();
    updateLivePreview();
    log('Removed image '+(i+1));
  });

  // Update count badge
  const badge=$('#gallery-count');
  if(badge)badge.textContent=galleryImages.length?`${galleryImages.length} image${galleryImages.length>1?'s':''}`:''

  updateLivePreview();
}

function syncPrimaryToForm(){
  const primary=galleryImages.find(g=>g.primary)||galleryImages[0];
  const urlInput=$('[name="image_url"]');
  if(urlInput&&primary)urlInput.value=primary.src;
}

/* ── Add image from URL ───────────────────────────────────── */
function addImageFromUrl(url){
  url=url.trim();
  if(!url)return;
  // basic check
  if(!url.startsWith('http')&&!url.startsWith('data:')){url='https://'+url;}
  const existing=galleryImages.find(g=>g.src===url);
  if(existing){$('#pkg-state').textContent='Image already in gallery.';return;}
  galleryImages.push({src:url,primary:galleryImages.length===0});
  syncPrimaryToForm();
  renderGallery();
  const urlInput=$('#gallery-url-input');
  if(urlInput)urlInput.value='';
  log('Added image from URL');
}

/* ── Upload file handler ──────────────────────────────────── */
async function handleFileUpload(files){
  const state=$('#pkg-state');
  const arr=[...files];
  state.textContent=`Compressing ${arr.length} image(s)…`;
  let added=0;
  for(const f of arr){
    if(!f.type.startsWith('image/')){state.textContent='Only image files accepted.';continue;}
    try{
      const src=await compress(f,1400,0.82);
      galleryImages.push({src,primary:galleryImages.length===0});
      added++;
    }catch(err){state.textContent='Image error: '+err.message;}
  }
  syncPrimaryToForm();
  renderGallery();
  state.textContent=`${added} image(s) added. Gallery has ${galleryImages.length} image(s).`;
  log(`Uploaded ${added} image(s)`);
}

/* ── Live preview ─────────────────────────────────────────── */
function updateLivePreview(){
  const preview=$('#live-preview');
  if(!preview)return;
  const f=$('#package-form');
  const name=f.elements.name?.value||'Package name';
  const region=f.elements.region?.value||'';
  const duration=f.elements.duration?.value||'';
  const price=f.elements.price?.value||'Custom quote';
  const summary=f.elements.summary?.value||'';
  const primary=galleryImages.find(g=>g.primary)||galleryImages[0];
  const img=primary?.src||$('[name="image_url"]')?.value||'assets/images/island-beach.jpg';
  const active=f.elements.active?.checked;
  const type=f.elements.package_type?.value||'domestic';
  const galCount=galleryImages.length;

$('#package-login-form').onsubmit=e=>{
  e.preventDefault();
  localStorage.setItem('bahadur-admin-token',$('#package-token').value.trim());
  $('#package-login').close();
  load();
};

/* ── Fill form for editing ────────────────────────────────── */
function fill(p={}){
  const f=$('#package-form');
  const skip=new Set(['id','flight_details','room_details','gallery','highlights','itinerary','included','excluded']);
  for(const [k,v] of Object.entries(p)){
    if(skip.has(k))continue;
    const el=f.elements[k];
    if(!el)continue;
    if(el.type==='checkbox')el.checked=Boolean(v);
    else el.value=Array.isArray(v)?v.join('\n'):(v??'');
  }
  // Sub-objects
  const fl=p.flight_details||{},rm=p.room_details||{};
  const sub={flight_included:fl.included,flight_airline:fl.airline,flight_cabin:fl.cabin,
    flight_from:fl.from,flight_to:fl.to,flight_baggage:fl.baggage,
    hotel_included:rm.included,hotel_name:rm.name,hotel_city:rm.city,
    hotel_category:rm.category,hotel_room_type:rm.room_type,hotel_rooms:rm.rooms,hotel_meals:rm.meals};
  for(const [k,v] of Object.entries(sub)){
    const el=f.elements[k];if(!el)continue;
    if(el.type==='checkbox')el.checked=Boolean(v);else el.value=v??'';
  }
  // Load gallery
  const raw=p.gallery;
  if(Array.isArray(raw)&&raw.length){
    galleryImages=raw.map((src,i)=>({src:String(src),primary:i===0}));
    // If image_url differs from first gallery, treat image_url as cover
    if(p.image_url&&p.image_url!==raw[0]){
      const exists=galleryImages.find(g=>g.src===p.image_url);
      if(!exists)galleryImages.unshift({src:p.image_url,primary:true});
      else{galleryImages.forEach(g=>g.primary=false);exists.primary=true;}
    }
  } else if(p.image_url){
    galleryImages=[{src:p.image_url,primary:true}];
  } else {
    galleryImages=[];
  }
  renderGallery();
  toggleType();
  updateLivePreview();
  log(`Editing: ${p.name}`);
  scrollTo({top:0,behavior:'smooth'});
  $('[name="name"]')?.focus();
}

/* ── Render package list ──────────────────────────────────── */
function render(){
  const h=$('#admin-package-list');
  if(!h)return;
  h.innerHTML=items.length
    ?items.map(p=>{
      const imgs=Array.isArray(p.gallery)?p.gallery:[];
      const cover=p.image_url||imgs[0]||'assets/images/island-beach.jpg';
      return `<article class="admin-pkg-card">
        <div class="admin-pkg-img-wrap">
          <img src="${esc(cover)}" alt="${esc(p.name)}"
            onerror="this.src='assets/images/island-beach.jpg'" loading="lazy">
          ${imgs.length>1?`<span class="admin-pkg-img-count"><i class="hgi-stroke hgi-image-01"></i> ${imgs.length}</span>`:''}
        </div>
        <div class="admin-pkg-info">
          <div class="admin-pkg-badges">
            <span class="${p.active?'status':'status pending'}">${p.active?'Live':'Hidden'}</span>
            <small class="kicker">${p.package_type==='international'?'International':'Domestic'}</small>
            ${p.category?`<small class="kicker" style="color:#64716d">${esc(p.category)}</small>`:''}
          </div>
          <h3>${esc(p.name)}</h3>
          <p>${[p.region,p.duration,p.price].filter(Boolean).join(' · ')}</p>
          ${p.summary?`<p class="admin-pkg-summary">${esc(p.summary.slice(0,100))}${p.summary.length>100?'…':''}</p>`:''}
          <!-- Thumbnail strip for gallery -->
          ${imgs.length>1?`<div class="admin-pkg-strip">
            ${imgs.slice(0,6).map(src=>`<img src="${esc(src)}" alt="" loading="lazy"
              onerror="this.style.display='none'">`).join('')}
            ${imgs.length>6?`<span class="admin-pkg-strip-more">+${imgs.length-6}</span>`:''}
          </div>`:''}
        </div>
        <div class="admin-pkg-actions">
          <button data-edit="${p.id}" class="btn btn-small" title="Edit this package">
            <i class="hgi-stroke hgi-edit-01"></i> Edit
          </button>
          <button data-preview="${p.slug}" class="btn btn-small btn-outline" title="Preview on website">
            <i class="hgi-stroke hgi-eye"></i> Preview
          </button>
          <button data-toggle="${p.id}" data-active="${p.active}" class="btn btn-small btn-outline" title="${p.active?'Hide':'Publish'}">
            <i class="hgi-stroke hgi-${p.active?'eye-off':'eye'}"></i> ${p.active?'Hide':'Publish'}
          </button>
          <button data-dup="${p.id}" class="btn btn-small btn-outline" title="Duplicate package">
            <i class="hgi-stroke hgi-copy-01"></i> Duplicate
          </button>
          <button data-delete="${p.id}" class="btn btn-small" style="background:#fff3f1;color:#a5433a;border-color:#f9c4c0" title="Delete package">
            <i class="hgi-stroke hgi-delete-02"></i> Delete
          </button>
        </div>
      </article>`;
    }).join('')
    :'<div class="community-empty"><i class="hgi-stroke hgi-package" style="font-size:40px;opacity:.3;display:block;margin-bottom:12px"></i>No packages yet. Use the form to publish your first one.</div>';

  // Wire buttons
  h.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{
    const p=items.find(x=>x.id===b.dataset.edit);
    if(p)fill(p);
  });
  h.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{
    window.open(`package.html?slug=${b.dataset.preview}`,'_blank');
  });
  h.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.toggle,nowActive=b.dataset.active==='true';
    const p=items.find(x=>x.id===id);if(!p)return;
    b.disabled=true;
    try{
      const r=await fetch('/api/packages?id='+id,{method:'PUT',
        headers:{'Content-Type':'application/json',...auth()},
        body:JSON.stringify({...p,active:!nowActive,
          highlights:Array.isArray(p.highlights)?p.highlights:[],
          itinerary:Array.isArray(p.itinerary)?p.itinerary:[],
          included:Array.isArray(p.included)?p.included:[],
          excluded:Array.isArray(p.excluded)?p.excluded:[],
          gallery:Array.isArray(p.gallery)?p.gallery:[]})});
      if(!r.ok)throw new Error((await r.json()).error);
      p.active=!nowActive;
      log(`${p.active?'Published':'Hidden'}: ${p.name}`);
      render();
    }catch(err){alert('Toggle failed: '+err.message);}
    finally{b.disabled=false;}
  });
  h.querySelectorAll('[data-dup]').forEach(b=>b.onclick=()=>{
    const p=items.find(x=>x.id===b.dataset.dup);
    if(!p)return;
    const copy={...p,id:'',name:p.name+' (copy)',slug:p.slug+'-copy',active:false};
    fill(copy);
    log('Duplicating: '+p.name);
  });
  h.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{
    const p=items.find(x=>x.id===b.dataset.delete);
    if(!confirm(`Delete "${p?.name||'this package'}" permanently?`))return;
    b.disabled=true;
    try{
      const r=await fetch('/api/packages?id='+b.dataset.delete,{method:'DELETE',headers:auth()});
      if(!r.ok)throw new Error((await r.json()).error);
      log('Deleted: '+(p?.name||b.dataset.delete));
      load();
    }catch(err){alert('Delete failed: '+err.message);b.disabled=false;}
  });

  // Package search
  const search=$('#pkg-search');
  if(search)search.oninput=e=>{
    const q=e.target.value.toLowerCase();
    h.querySelectorAll('.admin-pkg-card').forEach(card=>{
      const name=card.querySelector('h3')?.textContent.toLowerCase()||'';
      card.style.display=(q&&!name.includes(q))?'none':'';
    });
  };
}

/* ── Load packages ────────────────────────────────────────── */
async function safeJson(r){
  const ct=r.headers.get('content-type')||'';
  if(!ct.includes('application/json')){
    throw new Error('Server error ('+r.status+'): '+(await r.text()).slice(0,200));
  }
  return r.json();
}

async function load(){
  if(!token()){$('#package-login')?.showModal();return;}
  $('#admin-package-list').innerHTML='<div class="community-empty">Loading…</div>';
  try{
    const r=await fetch('/api/packages?admin=1',{headers:auth()});
    const d=await safeJson(r);
    if(r.status===401){localStorage.removeItem('bahadur-admin-token');login('Token expired.');return;}
    if(!r.ok)throw new Error(d.error);
    items=d.packages||[];
    render();
    const total=items.length;
    const live=items.filter(x=>x.active).length;
    $('#pkg-state').textContent=`${total} packages · ${live} live`;
    log(`Loaded ${total} packages (${live} live)`);
  }catch(err){
    $('#admin-package-list').innerHTML=`<div class="community-empty" style="color:#c0392b">
      <i class="hgi-stroke hgi-alert-02" style="font-size:36px;display:block;margin-bottom:10px"></i>
      <strong>Cannot load packages</strong><br>${esc(err.message)}</div>`;
  }
}

/* ── Form submit ──────────────────────────────────────────── */
$('#package-form').onsubmit=async e=>{
  e.preventDefault();
  const f=e.target,fd=new FormData(f),d=Object.fromEntries(fd);
  const id=d.id;
  const btn=f.querySelector('[type="submit"]');
  if(btn){btn.disabled=true;btn.innerHTML='<i class="hgi-stroke hgi-loading-03"></i> Saving…';}
  const state=$('#pkg-state');state.textContent='';

  d.active=f.elements.active.checked;
  for(const k of ['highlights','itinerary','included','excluded'])d[k]=lines(d[k]);

  // Build gallery array from managed state
  d.gallery=galleryImages.map(g=>g.src);
  // Primary image = first primary image
  const primary=galleryImages.find(g=>g.primary)||galleryImages[0];
  if(primary)d.image_url=primary.src;

  // Build sub-objects
  d.flight_details={included:f.elements.flight_included?.checked,airline:d.flight_airline,cabin:d.flight_cabin,
    from:d.flight_from,to:d.flight_to,baggage:d.flight_baggage};
  d.room_details={included:f.elements.hotel_included?.checked,name:d.hotel_name,city:d.hotel_city,
    category:d.hotel_category,room_type:d.hotel_room_type,rooms:Number(d.hotel_rooms)||1,meals:d.hotel_meals};

  // Remove flat sub-fields
  for(const k of ['id','gallery_json','flight_included','flight_airline','flight_cabin','flight_from',
    'flight_to','flight_baggage','hotel_included','hotel_name','hotel_city','hotel_category',
    'hotel_room_type','hotel_rooms','hotel_meals'])delete d[k];

  try{
    const r=await fetch('/api/packages'+(id?'?id='+id:''),{
      method:id?'PUT':'POST',
      headers:{'Content-Type':'application/json',...auth()},
      body:JSON.stringify(d)});
    const out=await safeJson(r);
    if(!r.ok)throw new Error(out.error||'Save failed');

    state.textContent=id?'✅ Package updated.':'✅ Package published.';
    log((id?'Updated':'Published')+': '+d.name+' · '+d.gallery.length+' images');

    // Reset
    f.reset();f.elements.id.value='';f.elements.active.checked=true;
    galleryImages=[];renderGallery();
    updateLivePreview();
    toggleType();
    load();
  }catch(err){
    state.textContent='⚠️ '+err.message;
    log('Save error: '+err.message);
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML='<i class="hgi-stroke hgi-checkmark-02"></i> Save package';}
  }
};

/* ── Reset button ─────────────────────────────────────────── */
$('#package-reset')?.addEventListener('click',()=>{
  $('#package-form').reset();
  $('#package-form').elements.id.value='';
  galleryImages=[];renderGallery();updateLivePreview();
  toggleType();$('#pkg-state').textContent='';
  log('Form cleared');
});

/* ── Slug auto-gen from name ──────────────────────────────── */
$('[name="name"]')?.addEventListener('input',e=>{
  const slugEl=$('[name="slug"]');
  if(!slugEl||slugEl.dataset.manualEdit)return;
  slugEl.value=e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  updateLivePreview();
});
$('[name="slug"]')?.addEventListener('input',()=>{$('[name="slug"]').dataset.manualEdit='1';});

/* ── Type toggle ──────────────────────────────────────────── */
function toggleType(){
  const t=$('#package-type')?.value;
  $('#package-flight-fields')?.classList.toggle('show',t==='international');
}
$('#package-type')?.addEventListener('change',()=>{toggleType();updateLivePreview();});

/* ── Gallery URL input ────────────────────────────────────── */
$('#gallery-url-add')?.addEventListener('click',()=>{
  const v=$('#gallery-url-input')?.value||'';
  if(v)addImageFromUrl(v);
});
$('#gallery-url-input')?.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();addImageFromUrl(e.target.value);}
});

/* ── File upload input ────────────────────────────────────── */
$('#gallery-upload-input')?.addEventListener('change',async e=>{
  await handleFileUpload(e.target.files);
  e.target.value='';
});

/* ── Drop zone for gallery ────────────────────────────────── */
$('#gallery-drop-zone')?.addEventListener('dragover',e=>{
  e.preventDefault();
  e.currentTarget.classList.add('dz-over');
});
$('#gallery-drop-zone')?.addEventListener('dragleave',e=>{
  e.currentTarget.classList.remove('dz-over');
});
$('#gallery-drop-zone')?.addEventListener('drop',async e=>{
  e.preventDefault();
  e.currentTarget.classList.remove('dz-over');
  await handleFileUpload(e.dataTransfer.files);
});

/* ── Live preview updates on form change ─────────────────── */
document.querySelectorAll('#package-form input, #package-form textarea, #package-form select').forEach(el=>{
  el.addEventListener('input',updateLivePreview);
  el.addEventListener('change',updateLivePreview);
});

/* ── Keyboard shortcut Ctrl+S ─────────────────────────────── */
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){
    e.preventDefault();
    $('[type="submit"]')?.click();
  }
});

/* ── Login ────────────────────────────────────────────────── */
$('#package-login-form')?.addEventListener('submit',e=>{
  e.preventDefault();
  localStorage.setItem('bahadur-admin-token',$('#package-token').value.trim());
  $('#package-login').close();
  load();
});
$('#package-refresh')?.addEventListener('click',load);

/* ── Search ───────────────────────────────────────────────── */
// wired inside render()

/* ── Init ─────────────────────────────────────────────────── */
toggleType();
initImageUploads();
load();

// Auto-fill slug
const nameInput = $('#package-form').elements.name;
const slugInput = $('#package-form').elements.slug;
nameInput.addEventListener('input', () => {
  if (!$('#package-form').elements.id.value) {
    slugInput.value = nameInput.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }
});