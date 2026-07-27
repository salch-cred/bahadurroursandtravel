const $=s=>document.querySelector(s);let bookings=[];
const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0));
const token=()=>sessionStorage.getItem('bahadur-admin-token')||'';
const auth=()=>({Authorization:`Bearer ${token()}`});
const statusClass=v=>String(v||'').toLowerCase().includes('confirm')||v==='paid'?'status':String(v||'').toLowerCase().includes('cancel')?'status danger':'status pending';

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
    ?rows.map(x=>`<tr><td><strong>#${x.booking_id||'—'}</strong></td><td>${x.name||'—'}<small>${x.phone||''}</small></td><td>${x.trip||'—'}</td><td>${x.travel_date||'—'}</td><td>${x.guests||'—'}</td><td><span class="${statusClass(x.status)}">${x.status||'New request'}</span></td><td>${x.amount?money(x.amount):'—'}</td></tr>`).join('')
    :'<tr><td colspan="7" class="empty-cell">No bookings recorded yet.</td></tr>';
}

let allInvoices=[];
function renderInvoices(rows){
  $('#invoice-rows').innerHTML=rows.length
    ?rows.map(x=>`<tr>
      <td><strong>${x.invoice_number||'—'}</strong></td>
      <td>${x.customer_name||'—'}<small>${x.phone||''}</small></td>
      <td>${x.booking_ref||'—'}</td>
      <td>${x.invoice_date||'—'}</td>
      <td><span class="${statusClass(x.status)}">${x.status||'Draft'}</span></td>
      <td>${money(x.total)}</td>
      <td class="invoice-actions">
        <a href="billing.html?id=${x.id}" class="mini-action-btn" title="Edit invoice"><i class="hgi-stroke hgi-edit-01"></i></a>
        ${(x.status==='Paid'||x.status==='Part paid')?`<a href="paid-bill.html?id=${x.id}" class="mini-action-btn paid" title="View paid bill" target="_blank"><i class="hgi-stroke hgi-receipt-02"></i></a>`:''}
      </td>
    </tr>`).join('')
    :'<tr><td colspan="7" class="empty-cell">No invoices saved yet.</td></tr>';
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
    if(res.status===401){sessionStorage.removeItem('bahadur-admin-token');setSyncState('is-error','Sign-in required');login('Incorrect or expired token.');return;}
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
    $('#booking-rows').innerHTML='<tr><td colspan="7" class="empty-cell">'+e.message+'<br><small>Check that DATABASE_URL is set in Vercel environment variables.</small></td></tr>';
  }finally{
    refreshBtn?.classList.remove('is-loading');
    refreshBtn?.removeAttribute('disabled');
  }
}

$('#admin-login-form').onsubmit=e=>{
  e.preventDefault();
  sessionStorage.setItem('bahadur-admin-token',$('#admin-token').value.trim());
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
  sessionStorage.removeItem('bahadur-admin-token');
  setSyncState(null,'Locked');
  login('Dashboard locked. Enter your token to continue.');
});
$('#invoice-search')?.addEventListener('input',e=>{
  const q=e.target.value.toLowerCase();
  renderInvoices(allInvoices.filter(x=>`${x.invoice_number} ${x.customer_name} ${x.booking_ref}`.toLowerCase().includes(q)));
});
$('#booking-search').oninput=e=>{
  const q=e.target.value.toLowerCase();
  renderBookings(bookings.filter(x=>`${x.booking_id} ${x.name} ${x.trip} ${x.phone}`.toLowerCase().includes(q)));
};
$('#admin-date').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
load();