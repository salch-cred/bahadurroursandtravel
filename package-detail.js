import { destinations } from './destinations.js';
const $=s=>document.querySelector(s); const slug=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const asArray=v=>{if(Array.isArray(v))return v;if(!v)return[];if(typeof v==='string'){try{const j=JSON.parse(v);if(Array.isArray(j))return j}catch{}return v.split('\n').map(x=>x.trim()).filter(Boolean)}return[]};
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const curated={
 lakshadweep:{name:'Lakshadweep',slug:'lakshadweep',region:'Agatti Island, Lakshadweep',duration:'4 days · 3 nights',image_url:'https://images.unsplash.com/photo-1596484552993-80b6fb89b022?q=80&w=1200&auto=format&fit=crop',summary:'An Agatti island escape with permit guidance, stay, meals, transfers and water activities.',description:'Experience Lakshadweep without planning stress. This four-day Agatti itinerary balances lagoon time, island sightseeing and optional adventures, with local support from landing to departure.',highlights:['Entry-permit assistance','Comfortable stay and stated meals','Airport pickup and drop','Island sightseeing','Snorkelling, kayaking and glass-bottom boat coordination'],itinerary:['Arrival, welcome drink, lunch, island sightseeing and dinner','Dolphin watch, lunch, snorkelling and island time','Optional scuba, kayaking and glass-bottom boat experience','Breakfast and airport transfer'],included:['Permit assistance','Accommodation','Meals listed in itinerary','Airport transfers','Island sightseeing','Local support'],excluded:['Flight tickets','Optional scuba diving','Banana boat ride','Night fishing','Personal expenses'],gallery:['https://images.unsplash.com/photo-1596484552993-80b6fb89b022?q=80&w=1200&auto=format&fit=crop','https://images.unsplash.com/photo-1583244243553-6b3a32f941d6?q=80&w=1200&auto=format&fit=crop','https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?q=80&w=1200&auto=format&fit=crop']},
 kashmir:{name:'Kashmir',slug:'kashmir',region:'Srinagar · Gulmarg · Sonmarg · Pahalgam',duration:'5 days · 4 nights',image_url:'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?q=80&w=1200&auto=format&fit=crop',summary:'A scenic Kashmir circuit with Srinagar, Gulmarg, Sonmarg and Pahalgam.',description:'See Kashmir through lake views, Mughal gardens, alpine roads and mountain valleys, with a comfortable route and dependable ground support.',highlights:['3 nights Srinagar and 1 night Pahalgam','One-hour Shikara ride','Gulmarg and Sonmarg excursions','Breakfast and dinner','Ground transport and support'],itinerary:['Srinagar arrival, gardens, temple and Shikara ride','Gulmarg excursion and optional seasonal activities','Sonmarg excursion and Srinagar stay','Transfer to Pahalgam via scenic stops','Breakfast and Srinagar Airport transfer'],included:['Airport transfers','Hotels as listed','Tempo Traveller','Daily breakfast and dinner','Shikara ride','Ground support'],excluded:['Union cabs','Gondola tickets','Lunch','Entry fees','Personal expenses'],gallery:['https://images.unsplash.com/photo-1595815771614-ade9d652a65d?q=80&w=1200&auto=format&fit=crop','https://images.unsplash.com/photo-1627894483216-2138af692e32?q=80&w=1200&auto=format&fit=crop']},
 umrah:{name:'Umrah Package',slug:'umrah',region:'Makkah & Madinah',duration:'15 days',featured:true,image_url:'assets/images/umrah/kaaba-sunset.jpg',summary:'A highlighted 15-day spiritual journey with accommodation, coordinated travel and guided support.',description:'Travel for Umrah with thoughtful guidance at every stage. This highlighted package supports a calm pilgrimage with accommodation options near key worship areas, coordinated transfers, assistance during the sacred rites and a team available throughout. Exact hotels, flights, meals and visa services are confirmed in the final quotation.',highlights:['15-day guided journey','Stay options near the Haram area','Makkah and Madinah coordination','Pre-departure document checklist','On-ground and WhatsApp support'],itinerary:['Arrival and transfer to Makkah','Guided preparation and performance of Umrah','Worship days and optional Makkah ziyarat','Transfer to Madinah','Worship and coordinated Madinah visits','Checkout and airport departure'],included:['Journey planning','Accommodation options','Makkah and Madinah transfers','Guided support','Selected ziyarat coordination','Document checklist'],excluded:['Airfare unless quoted','Visa and insurance unless stated','Meals not listed','Personal expenses','Services not in the final quote'],gallery:['https://images.unsplash.com/photo-1565552643952-b4b159b3bb6a?q=80&w=1200&auto=format&fit=crop','https://images.unsplash.com/photo-1591557303867-b52e379b1836?q=80&w=1200&auto=format&fit=crop','https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1200&auto=format&fit=crop']},
 manali:{name:'Manali',slug:'manali',region:'Himachal Pradesh, India',duration:'5 days · 4 nights',image_url:'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=1200&auto=format&fit=crop',summary:'Snow valleys, seasonal adventure sports and Himalayan scenery.',description:'A flexible mountain break built around Manali scenery, snow points, local sightseeing and seasonal adventure activities.',highlights:['Four nights and five days','Snow valleys','Seasonal activities','Hotel and transport choices','Local support'],itinerary:['Arrival and check-in','Local Manali sightseeing','Solang Valley','Flexible mountain excursion','Checkout and return'],included:['Hotel option','Breakfast option','Sightseeing','Selected transfers','Trip support'],excluded:['Travel to Manali unless quoted','Adventure activity fees','Entry fees','Unlisted meals','Personal expenses'],gallery:['https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=1200&auto=format&fit=crop','https://images.unsplash.com/photo-1610438186175-9c9dc7d1dffb?q=80&w=1200&auto=format&fit=crop']}
};
async function getPackage(){const wanted=new URLSearchParams(location.search).get('slug');if(!wanted)throw new Error('Package not found.');try{const r=await fetch('/api/packages?slug='+encodeURIComponent(wanted));if(r.ok){const data=await r.json();if(data.package)return data.package}}catch{}if(curated[wanted])return curated[wanted];const found=destinations.find(x=>slug(x.name)===wanted);if(found)return{name:found.name,slug:wanted,region:found.region,duration:found.days,image_url:found.fallback,summary:found.blurb,description:found.blurb,highlights:['Tailored itinerary','Stay and transfer options','WhatsApp support'],itinerary:['Arrival and transfer','Signature sightseeing','Local experience','Departure assistance'],included:['Trip planning','Selected transfers','Accommodation options','Local support'],excluded:['Personal expenses','Anything not confirmed in writing'],gallery:[found.fallback]};throw new Error('Package not found.');}
function render(p){const highlights=asArray(p.highlights),itinerary=asArray(p.itinerary),included=asArray(p.included),excluded=asArray(p.excluded||p.exclusions),gallery=asArray(p.gallery||p.gallery_images);const flight=typeof p.flight_details==='string'?JSON.parse(p.flight_details||'{}'):(p.flight_details||{}),room=typeof p.room_details==='string'?JSON.parse(p.room_details||'{}'):(p.room_details||{});const isService=String(p.slug||'').startsWith('force-urbania')||String(p.category||'').toLowerCase().includes('vehicle');const stepWord=isService?'Step':'Day';document.title=`${p.name} — Bahadur Tours`;
// Update meta description dynamically
let metaDesc = document.querySelector('meta[name="description"]');
if(!metaDesc){ metaDesc = document.createElement('meta'); metaDesc.name='description'; document.head.appendChild(metaDesc); }
metaDesc.content = `${p.name} — ${p.summary||p.description||'Travel package by Bahadur Tours & Travels'}`.slice(0,160);
// OG tags
const setOG = (prop, val) => { let el=document.querySelector(`meta[property="${prop}"]`); if(!el){el=document.createElement('meta');el.setAttribute('property',prop);document.head.appendChild(el);} el.setAttribute('content',val); };
setOG('og:title', `${p.name} — Bahadur Tours`);
setOG('og:description', (p.summary||p.description||'').slice(0,200));
setOG('og:image', p.image_url||'https://bahadurtours.com/assets/bahadur-logo.png');$('#package-detail').innerHTML=`
<section class="detail-hero"><img src="${safe(p.image_url||'assets/images/island-beach.jpg')}" alt="${safe(p.name)}"><div class="detail-shade"></div><div class="detail-hero-copy"><a href="booking.html"><i class="hgi-stroke hgi-arrow-left-01"></i> All journeys</a><span>${safe(p.region||'Curated journey')} · ${safe(p.duration||'Flexible')}</span><h1>${safe(p.name)}</h1><p>${safe(p.summary||p.description)}</p><button class="btn btn-light" data-detail-book>Request this trip</button></div></section>
<section class="detail-facts section"><div><small>Duration</small><strong>${safe(p.duration||'Flexible')}</strong></div><div><small>Region</small><strong>${safe(p.region||'Custom route')}</strong></div><div><small>Starting price</small><strong>${safe(p.price||'Custom quote')}</strong></div><div><small>Support</small><strong>WhatsApp + local team</strong></div></section>
<section class="detail-story section"><div><span class="kicker">Complete package guide</span><h2>Know the journey<br><em>before you go.</em></h2><p>${safe(p.description||p.summary)}</p><ul>${highlights.map(x=>`<li><i class="hgi-stroke hgi-checkmark-02"></i> ${safe(x)}</li>`).join('')}</ul></div><img src="${safe((gallery[1]||p.image_url||'assets/images/island-beach.jpg'))}" alt="Explore ${safe(p.name)}" loading="lazy"></section>
<section class="detail-itinerary section" id="detail-itinerary"><div class="section-head"><div><span class="kicker">${isService?'How it works':'Day by day'}</span><h2>${isService?'Your journey.':'Your itinerary.'}</h2></div><p>${isService?'Confirmed with your exact pickup point, date and schedule.':'The final schedule is confirmed for your dates and services.'}</p></div><div class="itinerary-list">${itinerary.map((x,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><div><small>${stepWord} ${i+1}</small><h3>${safe(x)}</h3></div></article>`).join('')}</div></section>
<section class="detail-included section ${p.featured?'featured-package-section':''}"><div><span class="kicker">Package coverage</span><h2>Clear inclusions.<br><em>No surprises.</em></h2></div><div class="coverage-columns"><div><h3>Included</h3>${included.map(x=>`<span><i class="hgi-stroke hgi-checkmark-02"></i> ${safe(x)}</span>`).join('')}</div><div class="exclusion-list"><h3>Not included</h3>${excluded.map(x=>`<span>— ${safe(x)}</span>`).join('')}</div></div></section>
${(flight.included||room.included)?`<section class="detail-arrangements section"><div><span class="kicker">Admin-confirmed options</span><h2>Travel arrangements.</h2></div><div class="arrangement-grid">${flight.included?`<article><small>Flight</small><h3>${safe(flight.airline||'Scheduled flight')} · ${safe(flight.cabin||'Economy')}</h3><p>${safe([flight.from,flight.to].filter(Boolean).join(' → '))}</p><span>${safe(flight.baggage||'As per airline policy')}</span></article>`:''}${room.included?`<article><small>Accommodation</small><h3>${safe(room.name||room.category||'Selected hotel')}</h3><p>${safe(room.room_type||'Room confirmed with booking')}</p><span>${safe(room.meals||room.city||'')}</span></article>`:''}</div></section>`:''}
<section class="detail-gallery section"><div class="section-head"><div><span class="kicker">Package gallery</span><h2>More images.</h2></div><p>Images added by the team are fetched automatically from the package manager.</p></div><div class="detail-photo-scroll">${(gallery.length?gallery:[p.image_url]).map((src,i)=>`<img src="${safe(src)}" alt="${safe(p.name)} image ${i+1}" loading="lazy" onclick="openLightbox('${safe(src)}')">`).join('')}</div></section>
${p.terms?`<section class="section package-terms"><span class="kicker">Package terms</span><h2>Before you book.</h2><p>${safe(p.terms)}</p></section>`:''}
<div id="lightbox" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.9); align-items:center; justify-content:center; flex-direction:column; padding: 20px; box-sizing: border-box;" onclick="closeLightbox()">
  <span style="position:absolute; top:20px; right:30px; color:#fff; font-size:40px; cursor:pointer; font-weight:bold;">&times;</span>
  <img id="lightbox-img" style="max-width:90%; max-height:80vh; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.5);" src="">
</div>
`;window.currentPackage=p;

// --- Inject booking request modal ---
if(!document.getElementById('trip-request-modal')){
  const dlg=document.createElement('div');
  dlg.id='trip-request-modal';
  dlg.style.cssText='position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;background:rgba(4,20,16,.72);backdrop-filter:blur(6px);padding:16px;overflow-y:auto';
  dlg.innerHTML=`
<div style="background:#fff;border-radius:22px;padding:28px 24px 32px;width:min(500px,100%);position:relative;max-height:90vh;overflow-y:auto">
  <button onclick="document.getElementById('trip-request-modal').style.display='none';document.body.style.overflow=''" style="position:absolute;top:14px;right:18px;background:none;border:none;font-size:22px;cursor:pointer;color:#6e7b76;line-height:1"><i class="hgi-stroke hgi-cancel-01"></i></button>
  <span style="font-size:11px;font-weight:800;letter-spacing:.06em;color:var(--green,#0b6655);text-transform:uppercase">Your trip, your way</span>
  <h2 id="trip-modal-title" style="margin:4px 0 20px;font-size:22px;font-family:Manrope,sans-serif;font-weight:800;color:#10231f"></h2>
  <form id="trip-request-form" autocomplete="on">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <label style="display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700">Full name<input name="name" placeholder="Your name" required style="border:1px solid #cfdad6;border-radius:9px;padding:11px 12px;font-size:14px;outline:none"></label>
      <label style="display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700">WhatsApp number<input name="phone" placeholder="+91" required style="border:1px solid #cfdad6;border-radius:9px;padding:11px 12px;font-size:14px;outline:none"></label>
      <label style="display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700">Email<input name="email" type="email" placeholder="you@example.com" style="border:1px solid #cfdad6;border-radius:9px;padding:11px 12px;font-size:14px;outline:none"></label>
      <label style="display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700">Travel date<input name="date" type="date" style="border:1px solid #cfdad6;border-radius:9px;padding:11px 12px;font-size:14px;outline:none"></label>
      <label style="display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700">Guests<select name="guests" style="border:1px solid #cfdad6;border-radius:9px;padding:11px 12px;font-size:14px;outline:none;background:#fff"><option>1 guest</option><option selected>2 guests</option><option>3 guests</option><option>4 guests</option><option>5+ guests</option></select></label>
      <label style="display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700">Starting city<input name="city" placeholder="Kochi" style="border:1px solid #cfdad6;border-radius:9px;padding:11px 12px;font-size:14px;outline:none"></label>
    </div>
    <label style="display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700;margin-top:12px">Anything we should know?<textarea name="note" rows="3" placeholder="Special requests, dietary needs, budget range…" style="border:1px solid #cfdad6;border-radius:9px;padding:11px 12px;font-size:14px;outline:none;resize:vertical"></textarea></label>
    <button type="submit" id="trip-submit-btn" style="margin-top:16px;width:100%;background:#10231f;color:#fff;border:none;border-radius:12px;padding:15px;font-size:15px;font-weight:700;cursor:pointer;transition:opacity .2s;display:flex;align-items:center;justify-content:center;gap:8px">
      Send on WhatsApp <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.43 1.27 4.87L2 22l5.3-1.25A9.95 9.95 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm4.93 14.01c-.2.57-1.18 1.1-1.63 1.17-.41.06-.93.08-1.5-.09-.35-.11-.79-.25-1.36-.5-2.38-1.03-3.94-3.44-4.06-3.6-.12-.16-.98-1.3-.98-2.48 0-1.18.62-1.76.84-2 .22-.24.48-.3.64-.3h.46c.15 0 .35-.01.54.41.2.44.68 1.66.74 1.78.06.12.1.26.02.42l-.27.5-.13.15c.12.2.63.98 1.35 1.58.92.78 1.7 1.02 1.94 1.14.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.57-.14 1.14z"/></svg>
    </button>
    <p id="trip-submit-note" style="margin:8px 0 0;font-size:12px;color:#8a9a94;text-align:center">Your details are saved securely. We'll confirm via WhatsApp within 2 hours.</p>
  </form>
</div>`;
  document.body.appendChild(dlg);
  dlg.addEventListener('click',e=>{ if(e.target===dlg){dlg.style.display='none';document.body.style.overflow='';}});
}

function openTripModal(name,dur,region){
  const dlg=document.getElementById('trip-request-modal');
  const title=document.getElementById('trip-modal-title');
  if(title) title.textContent='Request: '+name;
  const form=document.getElementById('trip-request-form');
  if(form){
    form.dataset.tripName=name;
    form.dataset.tripDur=dur||'';
    form.dataset.tripRegion=region||'';
  }
  dlg.style.display='flex';
  document.body.style.overflow='hidden';
  setTimeout(()=>form?.querySelector('input[name="name"]')?.focus(),120);
}

// Bind form submit — deferred until render() has created the modal in the DOM
function bindTripForm(){
  const tripForm=document.getElementById('trip-request-form');
  if(!tripForm||tripForm.dataset.bound) return;
  tripForm.dataset.bound='1';
  tripForm.addEventListener('submit',async(e)=>{
    e.preventDefault();
    const btn=document.getElementById('trip-submit-btn');
    const note=document.getElementById('trip-submit-note');
    const fd=new FormData(tripForm);
    const d=Object.fromEntries(fd);
    const trip=tripForm.dataset.tripName||d.trip||'';
    const dur=tripForm.dataset.tripDur||'';
    const region=tripForm.dataset.tripRegion||'';
    const ref='BT'+Date.now().toString().slice(-8);
    const waMsg=`Hello Bahadur Tours! 🙏

I'd like to request a trip.

📦 Package: ${trip}${dur?'\n⏱ Duration: '+dur:''}${region?'\n📍 Region: '+region:''}
👤 Name: ${d.name||''}
📱 WhatsApp: ${d.phone||''}${d.email?'\n📧 Email: '+d.email:''}
📅 Travel date: ${d.date||'Flexible'}
👥 Guests: ${d.guests||'2 guests'}${d.city?'\n🏙 From: '+d.city:''}${d.note?'\n📝 Notes: '+d.note:''}

🔖 Ref: ${ref}
— Request via bahadurtours.com`;

    if(btn){btn.disabled=true;btn.style.opacity='.6';btn.textContent='Saving request…';}
    // Save to DB (admin panel)
    try{
      const res=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:d.name,phone:d.phone,email:d.email||'',trip,date:d.date||'',guests:d.guests||'2 guests',city:d.city||'',note:d.note||''})});
      const j=await res.json();
      if(j.bookingId) note&&(note.textContent='Saved! Ref: '+j.bookingId+'. Opening WhatsApp…');
    }catch(err){ /* non-blocking — still open WhatsApp */ }
    // Open WhatsApp immediately
    const waUrl='https://wa.me/919187440916?text='+encodeURIComponent(waMsg);
    setTimeout(()=>{ window.open(waUrl,'_blank'); },300);
    // Reset and close after brief delay
    setTimeout(()=>{
      tripForm.reset();
      const dlg=document.getElementById('trip-request-modal');
      if(dlg){dlg.style.display='none';document.body.style.overflow='';}
      if(btn){btn.disabled=false;btn.style.opacity='1';btn.textContent='Send on WhatsApp';}
    },800);
  });
}

bindTripForm();
document.querySelectorAll('[data-detail-book]').forEach(b=>{
  b.onclick=()=>openTripModal(p.name,p.duration,p.region);
});
}
window.openLightbox = function(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').style.display = 'flex';
};
window.closeLightbox = function() {
  document.getElementById('lightbox').style.display = 'none';
};
getPackage().then(render).catch(()=>{$('#package-detail').innerHTML=`
  <div style="text-align:center;padding:120px 24px">
    <i class="hgi-stroke hgi-alert-02" style="font-size:48px;display:block;margin-bottom:16px;color:#0b4a3f;opacity:.4"></i>
    <h2>Package not found</h2>
    <p>This package may have moved or been updated.</p>
    <a href="booking.html" class="btn btn-dark" style="margin-top:16px">Browse all packages <i class="hgi-stroke hgi-arrow-right-01"></i></a>
  </div>
`;});
