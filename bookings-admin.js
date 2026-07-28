const $=s=>document.querySelector(s);
let bookings=[];
const token=()=>localStorage.getItem('bahadur-admin-token')||'';
const auth=()=>({Authorization:`Bearer ${token()}`});
const statusClass=v=>{const s=String(v||'').toLowerCase();return s.includes('confirm')||s.includes('complet')||s==='paid'?'status':s.includes('cancel')?'status danger':'status pending'};

async function safeJson(res){
  const ct=res.headers.get('content-type')||'';
  if(!ct.includes('application/json')){
    const text=await res.text();
    throw new Error('Server error ('+res.status+'): '+text.slice(0,120).replace(/<[^>]+>/g,''));
  }
  return res.json();
}

function renderBookings(rows){
  const countEl=$('#booking-count');
  if(countEl)countEl.textContent=`Showing ${rows.length} of ${bookings.length} bookings`;
  $('#booking-rows').innerHTML=rows.length
    ?rows.map(x=>`<tr>
      <td><strong>#${x.booking_ref||x.booking_id||'\u2014'}</strong><small>${x.source||'website'}</small></td>
      <td><strong>${x.name||'\u2014'}</strong><small>${x.phone||''}</small><small>${x.email||''}</small></td>
      <td>${x.trip||'\u2014'}</td>
      <td>${x.travel_date||'\u2014'}</td>
      <td>${x.guests||'\u2014'}</td>
      <td>${x.city||'\u2014'}</td>
      <td><span class="${statusClass(x.status)}">${x.status||'New request'}</span></td>
      <td class="booking-actions">
        <button class="mini-action-btn" data-action="wa" data-id="${x.id}" data-ref="${x.booking_ref||x.booking_id||\'\'}" data-name="${(x.name||'').replace(/"/g,'&quot;')}" data-phone="${x.phone||''}" data-trip="${(x.trip||'').replace(/"/g,'&quot;')}" data-date="${x.travel_date||''}" data-guests="${x.guests||''}" data-city="${x.city||''}" title="Open WhatsApp"><i class="hgi-stroke hgi-whatsapp"></i></button>
        <select class="status-select mini-select" data-id="${x.id}" title="Update status">
          ${['pending','confirmed','completed','cancelled'].map(s=>`<option${x.status===s?' selected':''}>${s}</option>`).join('')}
        </select>
        <a href="billing.html?booking_ref=${x.booking_ref||x.booking_id||\'\'}" class="mini-action-btn" title="Create/view invoice"><i class="hgi-stroke hgi-receipt-02"></i></a>
      </td>
    </tr>
    ${x.note?`<tr class="booking-note-row"><td colspan="8"><small><i class="hgi-stroke hgi-note-01"></i> ${x.note}</small></td></tr>`:''}`).join('')
    :'<tr><td colspan="8" class="empty-cell">No bookings recorded yet.</td></tr>';

  document.querySelectorAll('.status-select').forEach(sel=>{
    sel.onchange=async()=>{
      const id=sel.dataset.id;const status=sel.value;
      try{
        const r=await fetch(`/api/bookings?id=${encodeURIComponent(id)}`,{method:'PUT',headers:{...auth(),'Content-Type':'application/json'},body:JSON.stringify({status})});
        const d=await safeJson(r);
        if(!r.ok)throw new Error(d.error||'Update failed');
        const b=bookings.find(x=>x.id===id);if(b)b.status=status;
        const row=sel.closest('tr');const badge=row?.querySelector('[class^="status"]');
        if(badge){badge.textContent=status;badge.className=statusClass(status);}
      }catch(e){alert('Status update failed: '+e.message);sel.value=bookings.find(x=>x.id===id)?.status||sel.value;}
    };
  });

  document.querySelectorAll('[data-action="wa"]').forEach(btn=>{
    btn.onclick=()=>{
      const {name,phone,trip,date,guests,city,ref}=btn.dataset;
      const msg=`Hello Bahadur Tours! \ud83d\udc4b\n\n*Booking Reference:* ${ref}\n*Name:* ${name}\n*Trip:* ${trip}\n*Travel Date:* ${date||'TBD'}\n*Guests:* ${guests||'\u2014'}\n*Starting City:* ${city||'\u2014'}\n*Phone:* ${phone}`;
      window.open(`https://wa.me/919187440916?text=${encodeURIComponent(msg)}`,'_blank');
    };
  });
}

function applyFilter(){
  const q=$('#booking-search').value.toLowerCase();
  const sf=$('#booking-status-filter').value.toLowerCase();
  renderBookings(bookings.filter(x=>{
    const matchText=`${x.booking_ref||x.booking_id||''} ${x.name} ${x.trip} ${x.phone} ${x.email||''} ${x.city||''}`.toLowerCase().includes(q);
    const matchStatus=!sf||String(x.status||'').toLowerCase().includes(sf);
    return matchText&&matchStatus;
  }));
}

function login(message=''){
  const d=$('#admin-login');
  $('#login-error').textContent=message;
  if(!d.open)d.showModal();
  setTimeout(()=>$('#admin-token')?.focus(),50);
}

function setSyncState(state,text){
  const pill=$('#admin-state');if(!pill)return;
  pill.classList.remove('is-live','is-busy','is-error');
  if(state)pill.classList.add(state);
  const t=pill.querySelector('.sync-text');
  if(t)t.textContent=text;else pill.textContent=text;
}

async function load(){
  if(!token()){login();return;}
  const refreshBtn=$('#admin-refresh');
  refreshBtn?.classList.add('is-loading');refreshBtn?.setAttribute('disabled','');
  setSyncState('is-busy','Loading bookings\u2026');
  try{
    const res=await fetch('/api/admin',{headers:auth()});
    const d=await safeJson(res);
    if(res.status===401){localStorage.removeItem('bahadur-admin-token');setSyncState('is-error','Sign-in required');login('Incorrect or expired token.');return;}
    if(!res.ok)throw new Error(d.error||'Unknown error');
    bookings=d.bookings||[];
    const pending=bookings.filter(x=>String(x.status||'').toLowerCase().includes('pending')).length;
    const confirmed=bookings.filter(x=>String(x.status||'').toLowerCase().includes('confirm')).length;
    const cancelled=bookings.filter(x=>String(x.status||'').toLowerCase().includes('cancel')).length;
    const set=(id,val)=>{const el=$(id);if(el){el.textContent=val;el.dataset.loaded='1';}};
    set('#metric-bookings',bookings.length);
    set('#metric-pending',pending);
    set('#metric-confirmed',confirmed);
    set('#metric-cancelled',cancelled);
    applyFilter();
    setSyncState('is-live',`Synced ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`);
  }catch(e){
    setSyncState('is-error','Error: '+e.message);
    $('#booking-rows').innerHTML='<tr><td colspan="8" class="empty-cell">'+e.message+'<br><small>Check that DATABASE_URL is set in Vercel environment variables.</small></td></tr>';
  }finally{
    refreshBtn?.classList.remove('is-loading');refreshBtn?.removeAttribute('disabled');
  }
}

$('#admin-login-form').onsubmit=e=>{
  e.preventDefault();
  localStorage.setItem('bahadur-admin-token',$('#admin-token').value.trim());
  $('#admin-login').close();load();
};
$('#admin-token-toggle')?.addEventListener('click',()=>{
  const input=$('#admin-token');input.type=input.type==='text'?'password':'text';input.focus();
});
$('#admin-refresh')?.addEventListener('click',load);
$('#admin-lock')?.addEventListener('click',()=>{localStorage.removeItem('bahadur-admin-token');window.location.href='admin.html';});
$('#booking-search')?.addEventListener('input',applyFilter);
$('#booking-status-filter')?.addEventListener('change',applyFilter);
$('#admin-date').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
load();
