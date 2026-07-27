const $=s=>document.querySelector(s);
let items=[];
const token=()=>sessionStorage.getItem('bahadur-admin-token')||'';
const auth=()=>({Authorization:`Bearer ${token()}`});
const lines=v=>String(v||'').split('\n').map(x=>x.trim()).filter(Boolean);

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
  toggleType();
  scrollTo({top:0,behavior:'smooth'});
}

function render(){
  const h=$('#admin-package-list');
  h.innerHTML=items.length
    ?items.map(p=>`<article class="admin-pkg-card">
      <img src="${p.image_url||'assets/images/island-beach.jpg'}" alt="${p.name}" onerror="this.src='assets/images/island-beach.jpg'">
      <div class="admin-pkg-info">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <span class="${p.active?'status':'status pending'}">${p.active?'Live':'Hidden'}</span>
          <small class="kicker">${p.package_type==='international'?'✈ International':'🏔 Domestic'}</small>
        </div>
        <h3>${p.name}</h3>
        <p>${[p.region,p.duration,p.price].filter(Boolean).join(' · ')}</p>
        <p style="font-size:12px;color:#64716d;margin-top:4px">${(p.summary||'').slice(0,100)}${p.summary&&p.summary.length>100?'…':''}</p>
      </div>
      <div class="admin-pkg-actions">
        <a href="itinerary-print.html?pkg=${p.id}" target="_blank" class="btn btn-small" style="background:var(--ink);color:#fff;text-decoration:none;">📄 PDF</a>
        <button data-edit="${p.id}" class="btn btn-small btn-outline">✏ Edit</button>
        <button class="btn btn-small danger-button" data-delete="${p.id}">🗑 Delete</button>
      </div>
    </article>`).join('')
    :'<div class="community-empty">No packages published yet. Add your first package using the form above.</div>';
  h.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>fill(items.find(x=>x.id===b.dataset.edit)));
  h.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Delete this package permanently?'))return;
    try{
      const r=await fetch('/api/packages?id='+b.dataset.delete,{method:'DELETE',headers:auth()});
      const d=await safeJson(r);
      if(!r.ok)throw new Error(d.error);
      load();
    }catch(e){alert('Delete failed: '+e.message);}
  });
}

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
    $('#package-state').textContent=items.length>0?`${items.length} packages loaded.`:'';
  }catch(e){
    $('#admin-package-list').innerHTML=`<div class="community-empty" style="color:#c0392b">
      <strong>Cannot load packages</strong><br>${e.message}<br>
      <small>Make sure DATABASE_URL is set in Vercel → Settings → Environment Variables.</small>
    </div>`;
  }
}

$('#package-form').onsubmit=async e=>{
  e.preventDefault();
  const f=e.target,d=Object.fromEntries(new FormData(f)),id=d.id;
  const btn=f.querySelector('button[type="submit"]');
  if(btn)btn.disabled=true;
  d.active=f.elements.active.checked;
  for(const k of ['highlights','itinerary','included','excluded','gallery'])d[k]=lines(d[k]);
  d.flight_details={included:f.elements.flight_included.checked,airline:d.flight_airline,cabin:d.flight_cabin,from:d.flight_from,to:d.flight_to,baggage:d.flight_baggage};
  d.room_details={included:f.elements.hotel_included.checked,name:d.hotel_name,city:d.hotel_city,category:d.hotel_category,room_type:d.hotel_room_type,rooms:Number(d.hotel_rooms)||1,meals:d.hotel_meals};
  for(const k of ['id','flight_included','flight_airline','flight_cabin','flight_from','flight_to','flight_baggage','hotel_included','hotel_name','hotel_city','hotel_category','hotel_room_type','hotel_rooms','hotel_meals'])delete d[k];
  try{
    const r=await fetch('/api/packages'+(id?'?id='+id:''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json',...auth()},body:JSON.stringify(d)});
    const out=await safeJson(r);
    if(!r.ok)throw new Error(out.error||'Save failed');
    $('#package-state').textContent=id?'Package updated successfully.':'Package published successfully.';
    f.reset();f.elements.id.value='';f.elements.active.checked=true;toggleType();load();
  }catch(err){
    $('#package-state').textContent='Error: '+err.message;
  }finally{
    if(btn)btn.disabled=false;
  }
};

$('#package-reset').onclick=()=>{$('#package-form').reset();$('#package-form').elements.id.value='';$('#package-state').textContent='';toggleType();};
$('#package-refresh').onclick=load;
$('#package-type').onchange=toggleType;
toggleType();
load();