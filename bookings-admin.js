const $ = s => document.querySelector(s);
let bookings = [];
let activeRange = 'all';

const token  = () => localStorage.getItem('bahadur-admin-token') || '';
const auth   = () => ({ Authorization: `Bearer ${token()}` });

const statusClass = v => {
  const s = String(v || '').toLowerCase();
  if (s.includes('confirm')) return 'confirmed';
  if (s.includes('cancel'))  return 'cancelled';
  if (s.includes('complet')) return 'completed';
  return 'pending';
};

async function safeJson(res) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error('Server error (' + res.status + '): ' + text.slice(0, 120).replace(/<[^>]+>/g, ''));
  }
  return res.json();
}

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(v) {
  if (!v) return '—';
  try { return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)); }
  catch { return v; }
}

function matchRange(bk) {
  if (activeRange === 'all') return true;
  const d = new Date(bk.created_at || bk.travel_date || '');
  if (isNaN(d)) return true;
  const now = new Date();
  if (activeRange === 'today')  return d.toDateString() === now.toDateString();
  if (activeRange === 'week')   { const s = new Date(now); s.setDate(now.getDate()-now.getDay()); s.setHours(0,0,0,0); return d >= s; }
  if (activeRange === 'month')  return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
  return true;
}

function renderBookings(rows) {
  const countEl = $('#booking-count');
  if (countEl) countEl.textContent = `Showing ${rows.length} of ${bookings.length} bookings`;
  const body = $('#booking-rows');
  if (!body) return;
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="8"><div class="bk-empty"><i class="hgi-stroke hgi-package"></i>No bookings found for the selected filters.</div></td></tr>`;
    return;
  }
  body.innerHTML = rows.map(x => {
    const ref  = x.booking_ref || x.booking_id || '—';
    const name = x.name || '—';
    const sc   = statusClass(x.status);
    const noteRow = x.note
      ? `<tr class="bk-note-row"><td colspan="8"><i class="hgi-stroke hgi-note-01"></i>${esc(x.note)}</td></tr>`
      : '';
    return `
    <tr class="bk-main-row" data-id="${esc(x.id)}" title="Click to view details">
      <td><span class="cell-ref">#${esc(ref)}</span><span class="cell-sub">${esc(x.source||'website')}</span></td>
      <td><span class="cell-main">${esc(name)}</span><span class="cell-sub">${esc(x.phone||'')}</span><span class="cell-sub">${esc(x.email||'')}</span></td>
      <td><span class="cell-main">${esc(x.trip||'—')}</span></td>
      <td>${esc(fmtDate(x.travel_date))}</td>
      <td>${esc(x.guests||'—')}</td>
      <td>${esc(x.city||'—')}</td>
      <td><span class="bk-badge ${sc}">${esc(x.status||'New request')}</span></td>
      <td class="bk-actions" onclick="event.stopPropagation()">
        <button type="button" class="bk-action-btn" title="WhatsApp" data-action="wa"
          data-ref="${esc(ref)}" data-name="${esc(name)}" data-phone="${esc(x.phone||'')}"
          data-trip="${esc(x.trip||'')}" data-date="${esc(x.travel_date||'')}" data-guests="${esc(x.guests||'')}" data-city="${esc(x.city||'')}">
          <i class="hgi-stroke hgi-whatsapp"></i></button>
        <a href="billing.html?booking_ref=${encodeURIComponent(ref)}" class="bk-action-btn" title="Create invoice"><i class="hgi-stroke hgi-receipt-02"></i></a>
        <select class="bk-status-sel" data-id="${esc(x.id)}" title="Change status">
          ${['pending','confirmed','completed','cancelled'].map(s=>`<option value="${s}"${String(x.status||'').toLowerCase()===s?' selected':''}>${s}</option>`).join('')}
        </select>
        <button type="button" class="bk-action-btn danger" title="Delete" data-action="delete" data-id="${esc(x.id)}" data-ref="${esc(ref)}"><i class="hgi-stroke hgi-delete-02"></i></button>
      </td>
    </tr>${noteRow}`;
  }).join('');

  body.querySelectorAll('.bk-status-sel').forEach(sel => {
    sel.onchange = async e => {
      e.stopPropagation();
      const id = sel.dataset.id; const status = sel.value;
      const orig = bookings.find(b=>b.id===id)?.status;
      try {
        const r = await fetch(`/api/bookings?id=${encodeURIComponent(id)}`,{method:'PUT',headers:{...auth(),'Content-Type':'application/json'},body:JSON.stringify({status})});
        const d = await safeJson(r);
        if (!r.ok) throw new Error(d.error||'Update failed');
        const b = bookings.find(b=>b.id===id); if(b) b.status=status;
        const badge = sel.closest('tr')?.querySelector('.bk-badge');
        if(badge){badge.textContent=status;badge.className='bk-badge '+statusClass(status);}
      } catch(err){alert('Status update failed: '+err.message);sel.value=orig||sel.value;}
    };
  });

  body.querySelectorAll('[data-action="wa"]').forEach(btn=>{
    btn.onclick=e=>{
      e.stopPropagation();
      const{ref,name,phone,trip,date,guests,city}=btn.dataset;
      const msg=['\uD83D\uDE4F Hello Bahadur Tours!','',`*Booking Ref:* ${ref}`,`*Name:* ${name}`,`*Trip:* ${trip}`,`*Date:* ${date||'TBD'}`,`*Guests:* ${guests||'—'}`,`*City:* ${city||'—'}`,`*Phone:* ${phone}`].join('\n');
      window.open('https://wa.me/919187440916?text='+encodeURIComponent(msg),'_blank');
    };
  });

  body.querySelectorAll('[data-action="delete"]').forEach(btn=>{
    btn.onclick=async e=>{
      e.stopPropagation();
      const{id,ref}=btn.dataset;
      if(!confirm(`Delete booking #${ref}? This cannot be undone.`))return;
      try{
        const r=await fetch(`/api/bookings?id=${encodeURIComponent(id)}`,{method:'DELETE',headers:auth()});
        const d=await safeJson(r); if(!r.ok)throw new Error(d.error||'Delete failed');
        bookings=bookings.filter(b=>b.id!==id); updateMetrics(); applyFilter();
      }catch(err){alert('Delete failed: '+err.message);}
    };
  });

  body.querySelectorAll('.bk-main-row').forEach(row=>{
    row.onclick=()=>{ const bk=bookings.find(b=>b.id===row.dataset.id); if(bk)openModal(bk); };
  });
}

function openModal(bk){
  const ref=bk.booking_ref||bk.booking_id||'—';
  $('#bk-modal-title').textContent=`Booking #${ref}`;
  const fields=[['Booking Ref',ref],['Name',bk.name||'—'],['Phone',bk.phone||'—'],['Email',bk.email||'—'],['Trip',bk.trip||'—'],['Travel Date',fmtDate(bk.travel_date)],['Guests',bk.guests||'—'],['City',bk.city||'—'],['Status',bk.status||'—'],['Source',bk.source||'website'],['Created',fmtDate(bk.created_at)],['Note',bk.note||'—']];
  $('#bk-modal-body').innerHTML=fields.map(([l,v])=>`<div class="bk-detail-item"><span class="dl">${esc(l)}</span><span class="dv">${esc(v)}</span></div>`).join('');
  const waMsg=['\uD83D\uDE4F Hello Bahadur Tours!','',`*Booking Ref:* ${ref}`,`*Name:* ${bk.name}`,`*Trip:* ${bk.trip}`,`*Date:* ${bk.travel_date||'TBD'}`,`*Guests:* ${bk.guests||'—'}`,`*City:* ${bk.city||'—'}`,`*Phone:* ${bk.phone}`].join('\n');
  $('#bk-modal-actions').innerHTML=`
    <button class="primary" onclick="window.open('https://wa.me/919187440916?text=${encodeURIComponent(waMsg)}','_blank')"><i class="hgi-stroke hgi-whatsapp"></i> WhatsApp</button>
    <a href="billing.html?booking_ref=${encodeURIComponent(ref)}" class="primary"><i class="hgi-stroke hgi-receipt-02"></i> Create Invoice</a>
    <button onclick="deleteBookingFromModal('${esc(bk.id)}','${esc(ref)}')" class="danger"><i class="hgi-stroke hgi-delete-02"></i> Delete</button>
  `;
  $('#bk-modal-overlay').classList.add('open');
}

window.deleteBookingFromModal=async(id,ref)=>{
  if(!confirm(`Delete booking #${ref}? This cannot be undone.`))return;
  try{
    const r=await fetch(`/api/bookings?id=${encodeURIComponent(id)}`,{method:'DELETE',headers:auth()});
    const d=await safeJson(r); if(!r.ok)throw new Error(d.error||'Delete failed');
    bookings=bookings.filter(b=>b.id!==id); closeModal(); updateMetrics(); applyFilter();
  }catch(err){alert('Delete failed: '+err.message);}
};

function closeModal(){ $('#bk-modal-overlay').classList.remove('open'); }

function applyFilter(){
  const q=($('#booking-search')?.value||'').toLowerCase();
  const sf=($('#booking-status-filter')?.value||'').toLowerCase();
  renderBookings(bookings.filter(x=>{
    const text=`${x.booking_ref||x.booking_id||''} ${x.name||''} ${x.trip||''} ${x.phone||''} ${x.email||''} ${x.city||}`.toLowerCase();
    return(!q||text.includes(q))&&(!sf||String(x.status||'').toLowerCase().includes(sf))&&matchRange(x);
  }));
}

function updateMetrics(){
  const set=(id,v)=>{const el=$(id);if(el)el.textContent=v;};
  set('#metric-bookings',bookings.length);
  set('#metric-pending',bookings.filter(x=>statusClass(x.status)==='pending').length);
  set('#metric-confirmed',bookings.filter(x=>statusClass(x.status)==='confirmed').length);
  set('#metric-cancelled',bookings.filter(x=>statusClass(x.status)==='cancelled').length);
}

function exportCSV(){
  const cols=['booking_ref','name','phone','email','trip','travel_date','guests','city','status','source','created_at','note'];
  const rows=bookings.map(bk=>cols.map(c=>`"${String(bk[c]??'').replace(/"/g,'""')}"`).join(','));
  const blob=new Blob([cols.join(',')+"\n"+rows.join("\n")],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`bookings-${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

function setSyncState(state,text){
  const pill=$('#admin-state'); if(!pill)return;
  pill.classList.remove('is-live','is-busy','is-error'); if(state)pill.classList.add(state);
  const t=pill.querySelector('.sync-text'); if(t)t.textContent=text; else pill.textContent=text;
}

function login(message){
  const d=$('#admin-login'),err=$('#login-error');
  if(err)err.textContent=message||'';
  if(d&&!d.open)d.showModal();
  setTimeout(()=>{const i=$('#admin-token');if(i)i.focus();},50);
}

async function load(){
  if(!token()){setSyncState('is-error','Sign-in required');login();return;}
  const btn=$('#admin-refresh');
  if(btn){btn.classList.add('is-loading');btn.setAttribute('disabled','');}
  setSyncState('is-busy','Loading bookings\u2026');
  try{
    const res=await fetch('/api/admin',{headers:auth()});
    const d=await safeJson(res);
    if(res.status===401){localStorage.removeItem('bahadur-admin-token');setSyncState('is-error','Sign-in required');login('Incorrect or expired token.');return;}
    if(!res.ok)throw new Error(d.error||'Unknown error');
    bookings=d.bookings||[]; updateMetrics(); applyFilter();
    setSyncState('is-live','Synced '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}));
  }catch(e){
    setSyncState('is-error','Error: '+e.message);
    const body=$('#booking-rows');
    if(body)body.innerHTML=`<tr><td colspan="8" style="padding:2rem;text-align:center;color:var(--muted)">${esc(e.message)}<br><small>Check DATABASE_URL and ADMIN_API_TOKEN are set in Vercel.</small></td></tr>`;
  }finally{
    if(btn){btn.classList.remove('is-loading');btn.removeAttribute('disabled');}
  }
}

function init(){
  $('#admin-login-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const val=($('#admin-token')?.value||'').trim();
    if(!val){login('Enter the admin token.');return;}
    localStorage.setItem('bahadur-admin-token',val);
    $('#admin-login')?.close(); load();
  });
  $('#admin-token-toggle')?.addEventListener('click',()=>{
    const i=$('#admin-token'); if(!i)return;
    i.type=i.type==='text'?'password':'text'; i.focus();
  });
  $('#admin-refresh')?.addEventListener('click',load);
  $('#admin-lock')?.addEventListener('click',()=>{localStorage.removeItem('bahadur-admin-token');window.location.href='admin.html';});
  $('#booking-search')?.addEventListener('input',applyFilter);
  $('#booking-status-filter')?.addEventListener('change',applyFilter);
  document.querySelectorAll('.qf-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.qf-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); activeRange=btn.dataset.range; applyFilter();
    });
  });
  $('#export-csv')?.addEventListener('click',exportCSV);
  $('#bk-modal-close')?.addEventListener('click',closeModal);
  $('#bk-modal-overlay')?.addEventListener('click',e=>{if(e.target===$('#bk-modal-overlay'))closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  const dateEl=$('#admin-date');
  if(dateEl)dateEl.textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
  load();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
