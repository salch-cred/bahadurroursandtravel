const $=s=>document.querySelector(s);
let items=[];
let galleryImages=[]; // array of base64 data URLs for gallery
let primaryImageBase64=''; // base64 for primary image

const token=()=>sessionStorage.getItem('bahadur-admin-token')||'';
const auth=()=>({Authorization:`Bearer ${token()}`});
const lines=v=>String(v||'').split('\n').map(x=>x.trim()).filter(Boolean);

// ─── Activity feed ───────────────────────────────────────────────
const activityLog=[];
function logActivity(msg){
  const time=new Date().toLocaleTimeString();
  activityLog.unshift({msg,time});
  if(activityLog.length>20)activityLog.pop();
  renderActivity();
}
function renderActivity(){
  const feed=$('#activity-feed');
  if(!feed)return;
  feed.innerHTML=activityLog.length
    ?activityLog.map(a=>`<li><span></span><div><strong>${a.msg}</strong><small>${a.time}</small></div></li>`).join('')
    :'<li style="color:#96a09c;padding:10px 0">No activity yet.</li>';
}

// ─── Image compression helper ─────────────────────────────────────
function compressImage(file,maxW=1200,quality=0.80){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=reject;
    reader.onload=e=>{
      const img=new Image();
      img.onerror=reject;
      img.onload=()=>{
        let w=img.width,h=img.height;
        if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
        const canvas=document.createElement('canvas');
        canvas.width=w; canvas.height=h;
        const ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL('image/jpeg',quality));
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Gallery preview renderer ─────────────────────────────────────
function renderGalleryPreview(){
  const container=$('#gallery-preview-container');
  if(!container)return;
  container.innerHTML='';
  galleryImages.forEach((src,idx)=>{
    const wrap=document.createElement('div');
    wrap.style.cssText='position:relative;width:110px;height:80px;border-radius:10px;overflow:hidden;border:1px solid var(--line);flex-shrink:0';
    const img=document.createElement('img');
    img.src=src;
    img.style.cssText='width:100%;height:100%;object-fit:cover';
    const del=document.createElement('button');
    del.type='button';
    del.innerHTML='<i class="hgi-stroke hgi-delete-02"></i>';
    del.title='Remove image';
    del.style.cssText='position:absolute;top:3px;right:3px;border:0;background:#e53e3ecc;color:#fff;border-radius:6px;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px';
    del.onclick=()=>{
      galleryImages.splice(idx,1);
      renderGalleryPreview();
      logActivity(`Removed gallery image #${idx+1}`);
    };
    wrap.appendChild(img);
    wrap.appendChild(del);
    container.appendChild(wrap);
  });
  // Update hidden input
  const hidden=$('#gallery_json');
  if(hidden)hidden.value=JSON.stringify(galleryImages);
}

// ─── Wire up image upload inputs ──────────────────────────────────
function initImageUploads(){
  // Primary image upload
  const primaryInput=$('#primary-upload-input');
  if(primaryInput){
    primaryInput.onchange=async()=>{
      const file=primaryInput.files[0];
      if(!file)return;
      const state=$('#package-state');
      if(state)state.textContent='Compressing primary image…';
      try{
        primaryImageBase64=await compressImage(file,1400,0.82);
        const urlInput=document.querySelector('[name="image_url"]');
        if(urlInput)urlInput.value=primaryImageBase64;
        // show tiny preview next to input
        let preview=$('#primary-img-preview');
        if(!preview){
          preview=document.createElement('img');
          preview.id='primary-img-preview';
          preview.style.cssText='width:60px;height:42px;object-fit:cover;border-radius:7px;border:1px solid var(--line);margin-top:6px';
          const urlLabel=document.querySelector('[name="image_url"]').closest('label');
          if(urlLabel)urlLabel.appendChild(preview);
        }
        preview.src=primaryImageBase64;
        if(state)state.textContent='Primary image ready.';
        logActivity(`Primary image uploaded (${(primaryImageBase64.length/1024).toFixed(0)} KB)`);
      }catch(err){if(state)state.textContent='Image error: '+err.message;}
    };
  }

  // Gallery multi-upload
  const galleryInput=$('#gallery-upload-input');
  if(galleryInput){
    galleryInput.onchange=async()=>{
      const files=Array.from(galleryInput.files);
      if(!files.length)return;
      const state=$('#package-state');
      if(state)state.textContent=`Compressing ${files.length} image(s)…`;
      try{
        const compressed=await Promise.all(files.map(f=>compressImage(f,1200,0.80)));
        galleryImages.push(...compressed);
        renderGalleryPreview();
        if(state)state.textContent=`${galleryImages.length} gallery image(s) ready.`;
        logActivity(`Added ${compressed.length} gallery image(s) — total: ${galleryImages.length}`);
      }catch(err){if(state)state.textContent='Gallery error: '+err.message;}
      galleryInput.value=''; // allow re-selecting same files
    };
  }
}

// ─── Login ────────────────────────────────────────────────────────
async function safeJson(res){
  const ct=res.headers.get('content-type')||'';
  if(!ct.includes('application/json')){
    const text=await res.text();
    throw new Error('Server error ('+res.status+'): '+text.slice(0,200).replace(/<[^>]+>/g,'').trim());
  }
  return res.json();
}

function toggleType(){$('#package-flight-fields').classList.toggle('show',$('#package-type').value==='international')}

function login(){if(!token())$('#package-login').showModal();}

$('#package-login-form').onsubmit=e=>{
  e.preventDefault();
  sessionStorage.setItem('bahadur-admin-token',$('#package-token').value.trim());
  $('#package-login').close();
  load();
};

// ─── Fill form with package data (for editing) ────────────────────
function fill(p={}){
  const f=$('#package-form');
  for(const [k,v] of Object.entries(p)){
    const el=f.elements[k];
    if(!el)continue;
    if(el.type==='checkbox')el.checked=Boolean(v);
    else el.value=Array.isArray(v)?v.join('\n'):v??'';
  }
  const flight=p.flight_details||{},hotel=p.room_details||{};
  for(const [k,v] of Object.entries({
    flight_included:flight.included,flight_airline:flight.airline,flight_cabin:flight.cabin,
    flight_from:flight.from,flight_to:flight.to,flight_baggage:flight.baggage,
    hotel_included:hotel.included,hotel_name:hotel.name,hotel_city:hotel.city,
    hotel_category:hotel.category,hotel_room_type:hotel.room_type,hotel_rooms:hotel.rooms,hotel_meals:hotel.meals
  })){
    const el=f.elements[k];
    if(!el)continue;
    if(el.type==='checkbox')el.checked=Boolean(v);
    else el.value=v??'';
  }
  // Load existing gallery images
  galleryImages=Array.isArray(p.gallery)?p.gallery:[];
  renderGalleryPreview();
  // Load existing primary image preview
  if(p.image_url){
    let preview=$('#primary-img-preview');
    if(!preview){
      preview=document.createElement('img');
      preview.id='primary-img-preview';
      preview.style.cssText='width:60px;height:42px;object-fit:cover;border-radius:7px;border:1px solid var(--line);margin-top:6px';
      const urlLabel=document.querySelector('[name="image_url"]')?.closest('label');
      if(urlLabel)urlLabel.appendChild(preview);
    }
    preview.src=p.image_url;
  }
  toggleType();
  logActivity(`Editing package: ${p.name}`);
  scrollTo({top:0,behavior:'smooth'});
}

// ─── Render package list ──────────────────────────────────────────
function render(){
  const h=$('#admin-package-list');
  h.innerHTML=items.length
    ?items.map(p=>`<article class="admin-pkg-card">
      <img src="${p.image_url||'assets/images/island-beach.jpg'}" alt="${p.name}" onerror="this.src='assets/images/island-beach.jpg'">
      <div class="admin-pkg-info">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <span class="${p.active?'status':'status pending'}">${p.active?'Live':'Hidden'}</span>
          <small class="kicker">${p.package_type==='international'?'✈ International':'🏔 Domestic'}</small>
          ${Array.isArray(p.gallery)&&p.gallery.length?`<small class="kicker" style="color:var(--green)"><i class="hgi-stroke hgi-image-01"></i> ${p.gallery.length} photos</small>`:''}
        </div>
        <h3>${p.name}</h3>
        <p>${[p.region,p.duration,p.price].filter(Boolean).join(' · ')}</p>
        <p style="font-size:12px;color:#64716d;margin-top:4px">${(p.summary||'').slice(0,100)}${p.summary&&p.summary.length>100?'…':''}</p>
      </div>
      <div class="admin-pkg-actions">
        <a href="itinerary-print.html?pkg=${p.id}" target="_blank" class="btn btn-small" style="background:var(--ink);color:#fff;text-decoration:none;"><i class="hgi-stroke hgi-document-attachment"></i> PDF</a>
        <button data-edit="${p.id}" class="btn btn-small btn-outline"><i class="hgi-stroke hgi-edit-01"></i> Edit</button>
        <button class="btn btn-small danger-button" data-delete="${p.id}"><i class="hgi-stroke hgi-delete-02"></i> Delete</button>
      </div>
    </article>`).join('')
    :'<div class="community-empty">No packages published yet. Add your first package using the form above.</div>';
  h.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>fill(items.find(x=>x.id===b.dataset.edit)));
  h.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Delete this package permanently?'))return;
    const pkgName=items.find(x=>x.id===b.dataset.delete)?.name||b.dataset.delete;
    try{
      const r=await fetch('/api/packages?id='+b.dataset.delete,{method:'DELETE',headers:auth()});
      const d=await safeJson(r);
      if(!r.ok)throw new Error(d.error);
      logActivity(`Deleted package: ${pkgName}`);
      load();
    }catch(e){alert('Delete failed: '+e.message);}
  });
}

// ─── Load packages ────────────────────────────────────────────────
async function load(){
  if(!token()){login();return;}
  $('#admin-package-list').innerHTML='<div class="community-empty">Loading packages…</div>';
  try{
    const r=await fetch('/api/packages?admin=1',{headers:auth()});
    const d=await safeJson(r);
    if(r.status===401){sessionStorage.removeItem('bahadur-admin-token');login('Token expired.');return;}
    if(!r.ok)throw new Error(d.error);
    items=d.packages||[];
    render();
    const count=items.length;
    $('#package-state').textContent=count>0?`${count} packages loaded.`:'';
    logActivity(`Loaded ${count} package(s)`);
  }catch(e){
    $('#admin-package-list').innerHTML=`<div class="community-empty" style="color:#c0392b">
      <strong>Cannot load packages</strong><br>${e.message}<br>
      <small>Make sure DATABASE_URL is set in Vercel → Settings → Environment Variables.</small>
    </div>`;
  }
}

// ─── Form submit ──────────────────────────────────────────────────
$('#package-form').onsubmit=async e=>{
  e.preventDefault();
  const f=e.target,fd=new FormData(f),d=Object.fromEntries(fd);
  const id=d.id;
  const btn=f.querySelector('button[type="submit"]');
  if(btn){btn.disabled=true;btn.textContent='Saving…';}
  d.active=f.elements.active.checked;
  for(const k of ['highlights','itinerary','included','excluded'])d[k]=lines(d[k]);
  // Use gallery from our managed state
  d.gallery=galleryImages;
  d.flight_details={included:f.elements.flight_included.checked,airline:d.flight_airline,cabin:d.flight_cabin,from:d.flight_from,to:d.flight_to,baggage:d.flight_baggage};
  d.room_details={included:f.elements.hotel_included.checked,name:d.hotel_name,city:d.hotel_city,category:d.hotel_category,room_type:d.hotel_room_type,rooms:Number(d.hotel_rooms)||1,meals:d.hotel_meals};
  for(const k of ['id','gallery_json','flight_included','flight_airline','flight_cabin','flight_from','flight_to','flight_baggage','hotel_included','hotel_name','hotel_city','hotel_category','hotel_room_type','hotel_rooms','hotel_meals'])delete d[k];
  try{
    const r=await fetch('/api/packages'+(id?'?id='+id:''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json',...auth()},body:JSON.stringify(d)});
    const out=await safeJson(r);
    if(!r.ok)throw new Error(out.error||'Save failed');
    const msg=id?`Updated package: ${d.name}`:`Published new package: ${d.name}`;
    logActivity(msg);
    $('#package-state').textContent=id?'Package updated successfully.':'Package published successfully.';
    // Reset
    f.reset();f.elements.id.value='';f.elements.active.checked=true;
    galleryImages=[];renderGalleryPreview();primaryImageBase64='';
    const pp=$('#primary-img-preview');if(pp)pp.remove();
    toggleType();load();
  }catch(err){
    $('#package-state').textContent='Error: '+err.message;
    logActivity(`Error saving package: ${err.message}`);
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Save package';}
  }
};

$('#package-reset').onclick=()=>{
  $('#package-form').reset();
  $('#package-form').elements.id.value='';
  $('#package-state').textContent='';
  galleryImages=[];renderGalleryPreview();primaryImageBase64='';
  const pp=$('#primary-img-preview');if(pp)pp.remove();
  toggleType();
  logActivity('Form cleared');
};

$('#package-refresh').onclick=load;
$('#package-type').onchange=toggleType;

// Init
toggleType();
initImageUploads();
load();