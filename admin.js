const $=s=>document.querySelector(s);let bookings=[];
const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0));
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
  $('#booking-rows').innerHTML=rows.length
    ?rows.map(x=>`<tr>
      <td><strong>#${x.booking_ref||x.booking_id||'—'}</strong><small>${x.source||'website'}</small></td>
      <td><strong>${x.name||'—'}</strong><small>${x.phone||''}</small><small>${x.email||''}</small></td>
      <td>${x.trip||'—'}</td>
      <td>${x.travel_date||'—'}</td>
      <td>${x.guests||'—'}</td>
      <td>${x.city||'—'}</td>
      <td><span class="${statusClass(x.status)}">${x.status||'New request'}</span></td>
      <td class="booking-actions">
        <button class="mini-action-btn" data-action="wa" data-id="${x.id}" data-ref="${x.booking_ref||x.booking_id||''}" data-name="${(x.name||'').replace(/"/g,'&quot;')}" data-phone="${x.phone||''}" data-trip="${(x.trip||'').replace(/"/g,'&quot;')}" data-date="${x.travel_date||''}" data-guests="${x.guests||''}" data-city="${x.city||''}" title="Open WhatsApp"><i class="hgi-stroke hgi-whatsapp"></i></button>
        <select class="status-select mini-select" data-id="${x.id}" title="Update status">
          ${['pending','confirmed','completed','cancelled'].map(s=>`<option${x.status===s?' selected':''}>${s}</option>`).join('')}
        </select>
        <a href="billing.html?booking_ref=${x.booking_ref||x.booking_id||''}" class="mini-action-btn" title="Create/view invoice"><i class="hgi-stroke hgi-receipt-02"></i></a>
      </td>
    </tr>
    ${x.note?`<tr class="booking-note-row"><td colspan="8"><small><i class="hgi-stroke hgi-note-01"></i> ${x.note}</small></td></tr>`:''}`).join('')
    :'<tr><td colspan="8" class="empty-cell">No bookings recorded yet.</td></tr>';

  // Bind status selects
  document.querySelectorAll('.status-select').forEach(sel=>{
    sel.onchange=async()=>{
      const id=sel.dataset.id;
      const status=sel.value;
      try{
        const r=await fetch(`/api/bookings?id=${encodeURIComponent(id)}`,{method:'PUT',headers:{...auth(),'Content-Type':'application/json'},body:JSON.stringify({status})});
        const d=await safeJson(r);
        if(!r.ok)throw new Error(d.error||'Update failed');
        // Update in local array
        const b=bookings.find(x=>x.id===id);
        if(b)b.status=status;
        // Update status badge in same row
        const row=sel.closest('tr');
        const badge=row?.querySelector('.status,.status.danger,.status.pending');
        if(badge){badge.textContent=status;badge.className=statusClass(status);}
      }catch(e){alert('Status update failed: '+e.message);sel.value=bookings.find(x=>x.id===id)?.status||sel.value;}
    };
  });

  // Bind WA buttons
  document.querySelectorAll('[data-action="wa"]').forEach(btn=>{
    btn.onclick=()=>{
      const {name,phone,trip,date,guests,city,ref}=btn.dataset;
      const msg=`Hello Bahadur Tours! 👋\n\n*Booking Reference:* ${ref}\n*Name:* ${name}\n*Trip:* ${trip}\n*Travel Date:* ${date||'TBD'}\n*Guests:* ${guests||'—'}\n*Starting City:* ${city||'—'}\n*Phone:* ${phone}`;
      window.open(`https://wa.me/919187440916?text=${encodeURIComponent(msg)}`,'_blank');
    };
  });
}

let allInvoices=[];
function renderInvoices(rows){
  $('#invoice-rows').innerHTML=rows.length
    ?rows.map(x=>{
      const isPaid=x.status==='Paid'||x.status==='Part paid';
      return `<tr>
        <td><strong>${x.invoice_number||'—'}</strong></td>
        <td>${x.customer_name||'—'}<small>${x.phone||''}</small></td>
        <td>${x.booking_ref||'—'}</td>
        <td>${x.invoice_date||'—'}</td>
        <td>
          ${isPaid?'<i class="hgi-stroke hgi-checkmark-circle-02" style="color:#22753a;font-size:16px;vertical-align:-2px" title="Paid"></i> ':''}
          <span class="${statusClass(x.status)}">${x.status||'Draft'}</span>
        </td>
        <td>${money(x.total)}</td>
        <td class="invoice-actions">
          <a href="billing.html?id=${x.id}" class="mini-action-btn" title="Edit invoice"><i class="hgi-stroke hgi-edit-01"></i></a>
          ${isPaid
            ?`<a href="paid-bill.html?id=${x.id}" class="mini-action-btn paid" title="Download paid receipt" target="_blank"><i class="hgi-stroke hgi-receipt-02"></i></a>`
            :`<button class="mini-action-btn" title="Mark as Paid" data-mark-paid="${x.id}"><i class="hgi-stroke hgi-money-receive-02"></i></button>`
          }
        </td>
      </tr>`;
    }).join('')
    :'<tr><td colspan="7" class="empty-cell">No invoices saved yet.</td></tr>';
  // Bind Mark as Paid buttons
  document.querySelectorAll('[data-mark-paid]').forEach(btn=>{
    btn.onclick=async()=>{
      const id=btn.dataset.markPaid;
      if(!confirm('Mark this invoice as Paid?'))return;
      btn.disabled=true;
      try{
        const r=await fetch('/api/admin',{method:'PATCH',headers:{'Content-Type':'application/json',...auth()},body:JSON.stringify({type:'invoice_status',id,status:'Paid'})});
        if(!r.ok)throw new Error('Update failed');
        // Update local data and re-render
        const inv=allInvoices.find(i=>i.id===id);
        if(inv){inv.status='Paid';}
        renderInvoices(allInvoices);
      }catch(e){alert('Could not update: '+e.message);btn.disabled=false;}
    };
  });
}

function renderActivity(rows){
  $('#activity-list').innerHTML=rows.length
    ?rows.map(x=>`<li><span></span><div><strong>${x.title}</strong><small>${x.detail||''} · ${new Date(x.created_at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</small></div></li>`).join('')
    :'<li><span></span><div><strong>No activity yet</strong><small>New bookings, invoices and reviews appear here.</small></div></li>';
}

function bars(target,rows,valueKey,label,format=x=>x){
  const max=Math.max(1,...rows.map(x=>Number(x[valueKey]||0)));
  $(target).innerHTML=rows.map(x=>`<div class="bar-column" title="${label(x)} · ${format(x[valueKey])}"><span style="height:${Math.max(4,Number(x[valueKey]||0)/max*100)}%"></span><small>${label(x)}</small></div>`).join('');
}

function login(message=''){
  const d=$('#admin-login');
  $('#login-error').textContent=message;
  if(!d.open)d.showModal();
  setTimeout(()=>$('#admin-token')?.focus(),50);
}

function setSyncState(state,text){
  const pill=$('#admin-state');
  if(!pill)return;
  pill.classList.remove('is-live','is-busy','is-error');
  if(state)pill.classList.add(state);
  const t=pill.querySelector('.sync-text');
  if(t)t.textContent=text; else pill.textContent=text;
}

function showSkeletons(){
  ['#turnover-24h','#turnover-14d','#turnover-30d','#turnover-year','#metric-bookings','#metric-pending','#metric-rating','#visitors-daily','#visitors-monthly'].forEach(sel=>{
    const el=$(sel);
    if(el&&!el.dataset.loaded)el.innerHTML='<span class="skel-value"></span>';
  });
}

function clearSkeletons(){
  ['#turnover-24h','#turnover-14d','#turnover-30d','#turnover-year','#metric-bookings','#metric-pending','#metric-rating','#visitors-daily','#visitors-monthly'].forEach(sel=>{
    const el=$(sel);
    if(el&&!el.dataset.loaded)el.textContent='—';
  });
}

function markLoaded(sel,html){
  const el=$(sel);
  if(!el)return;
  el.dataset.loaded='1';
  el.textContent=html;
}

async function load(){
  if(!token()){login();return;}
  const refreshBtn=$('#admin-refresh');
  refreshBtn?.classList.add('is-loading');
  refreshBtn?.setAttribute('disabled','');
  setSyncState('is-busy','Refreshing business data…');
  showSkeletons();
  try{
    const res=await fetch('/api/admin',{headers:auth()});
    const d=await safeJson(res);
    if(res.status===401){localStorage.removeItem('bahadur-admin-token');setSyncState('is-error','Sign-in required');login('Incorrect or expired token.');return;}
    if(!res.ok)throw new Error(d.error||'Unknown error');
    bookings=d.bookings||[];
    const m=d.metrics;
    markLoaded('#turnover-24h',money(m.turnover.h24));
    markLoaded('#turnover-14d',money(m.turnover.d14));
    markLoaded('#turnover-30d',money(m.turnover.d30));
    markLoaded('#turnover-year',money(m.turnover.yearly));
    markLoaded('#metric-bookings',m.bookings);
    markLoaded('#metric-pending',m.pending);
    markLoaded('#metric-rating',m.rating?Number(m.rating).toFixed(1):'—');
    $('#metric-rating-note').textContent=`${m.reviewCount} approved reviews`;
    markLoaded('#visitors-daily',m.visitors.daily);
    markLoaded('#visitors-monthly',m.visitors.monthly);
    $('#views-daily').textContent=`${m.visitors.viewsDaily} page views`;
    $('#views-monthly').textContent=`${m.visitors.viewsMonthly} page views`;
    bars('#traffic-chart',d.traffic||[],'visitors',x=>new Date(x.d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}));
    bars('#revenue-chart',d.monthlyRevenue||[],'revenue',x=>new Date(x.m).toLocaleDateString('en-IN',{month:'short'}),money);
    renderBookings(bookings);
    allInvoices=d.invoices||[];renderInvoices(allInvoices);
    renderActivity(d.activity||[]);
    setSyncState('is-live',`Synced ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`);
  }catch(e){
    setSyncState('is-error','Error: '+e.message);
    clearSkeletons();
    $('#booking-rows').innerHTML='<tr><td colspan="8" class="empty-cell">'+e.message+'<br><small>Check that DATABASE_URL is set in Vercel environment variables.</small></td></tr>';
  }finally{
    refreshBtn?.classList.remove('is-loading');
    refreshBtn?.removeAttribute('disabled');
  }
}

$('#admin-login-form').onsubmit=e=>{
  e.preventDefault();
  localStorage.setItem('bahadur-admin-token',$('#admin-token').value.trim());
  $('#admin-login').close();
  load();
};
$('#admin-token-toggle')?.addEventListener('click',()=>{
  const input=$('#admin-token');
  input.type=input.type==='text'?'password':'text';
  input.focus();
});
$('#admin-refresh')?.addEventListener('click',load);
$('#admin-lock')?.addEventListener('click',()=>{
  localStorage.removeItem('bahadur-admin-token');
  window.location.href='admin.html';
});
$('#invoice-search')?.addEventListener('input',e=>{
  const q=e.target.value.toLowerCase();
  renderInvoices(allInvoices.filter(x=>`${x.invoice_number} ${x.customer_name} ${x.booking_ref}`.toLowerCase().includes(q)));
});
$('#booking-search').oninput=e=>{
  const q=e.target.value.toLowerCase();
  renderBookings(bookings.filter(x=>`${x.booking_ref||x.booking_id||''} ${x.name} ${x.trip} ${x.phone} ${x.email||''} ${x.city||''}`.toLowerCase().includes(q)));
};
$('#admin-date').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
load();
