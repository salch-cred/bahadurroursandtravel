const $=s=>document.querySelector(s);let bookings=[];
const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0));
const token=()=>localStorage.getItem('bahadur-admin-token')||'';
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

function renderInvoices(rows){
  $('#invoice-rows').innerHTML=rows.length
    ?rows.map(x=>`<tr><td><strong>${x.invoice_number||'—'}</strong></td><td>${x.customer_name||'—'}</td><td>${x.booking_ref||'—'}</td><td>${x.invoice_date||'—'}</td><td><span class="${statusClass(x.status)}">${x.status||'Draft'}</span></td><td>${money(x.total)}</td></tr>`).join('')
    :'<tr><td colspan="6" class="empty-cell">No invoices saved yet.</td></tr>';
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
}

async function load(){
  if(!token()){login();return;}
  $('#admin-state').textContent='Refreshing business data…';
  try{
    const res=await fetch('/api/admin',{headers:auth()});
    const d=await safeJson(res);
    if(res.status===401){localStorage.removeItem('bahadur-admin-token');login('Incorrect or expired token.');return;}
    if(!res.ok)throw new Error(d.error||'Unknown error');
    bookings=d.bookings||[];
    const m=d.metrics;
    $('#turnover-24h').textContent=money(m.turnover.h24);
    $('#turnover-14d').textContent=money(m.turnover.d14);
    $('#turnover-30d').textContent=money(m.turnover.d30);
    $('#turnover-year').textContent=money(m.turnover.yearly);
    $('#metric-bookings').textContent=m.bookings;
    $('#metric-pending').textContent=m.pending;
    $('#metric-rating').textContent=m.rating?Number(m.rating).toFixed(1):'—';
    $('#metric-rating-note').textContent=`${m.reviewCount} approved reviews`;
    $('#visitors-daily').textContent=m.visitors.daily;
    $('#visitors-monthly').textContent=m.visitors.monthly;
    $('#views-daily').textContent=`${m.visitors.viewsDaily} page views`;
    $('#views-monthly').textContent=`${m.visitors.viewsMonthly} page views`;
    bars('#traffic-chart',d.traffic||[],'visitors',x=>new Date(x.d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}));
    bars('#revenue-chart',d.monthlyRevenue||[],'revenue',x=>new Date(x.m).toLocaleDateString('en-IN',{month:'short'}),money);
    renderBookings(bookings);
    renderInvoices(d.invoices||[]);
    renderActivity(d.activity||[]);
    $('#admin-state').textContent=`Synced ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`;
  }catch(e){
    $('#admin-state').textContent='Error: '+e.message;
    $('#booking-rows').innerHTML='<tr><td colspan="7" class="empty-cell">'+e.message+'<br><small>Check that DATABASE_URL is set in Vercel environment variables.</small></td></tr>';
  }
}

$('#admin-login-form').onsubmit=e=>{
  e.preventDefault();
  localStorage.setItem('bahadur-admin-token',$('#admin-token').value.trim());
  $('#admin-login').close();
  load();
};
$('#admin-refresh').onclick=load;
$('#booking-search').oninput=e=>{
  const q=e.target.value.toLowerCase();
  renderBookings(bookings.filter(x=>`${x.booking_id} ${x.name} ${x.trip} ${x.phone}`.toLowerCase().includes(q)));
};
$('#admin-date').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
load();