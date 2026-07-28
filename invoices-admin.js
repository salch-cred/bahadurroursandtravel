const $=s=>document.querySelector(s);
let allInvoices=[];
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

function renderInvoices(rows){
  const countEl=$('#invoice-count');
  if(countEl)countEl.textContent=`Showing ${rows.length} of ${allInvoices.length} invoices`;
  $('#invoice-rows').innerHTML=rows.length
    ?rows.map(x=>{
      const isPaid=x.status==='Paid'||x.status==='Part paid';
      return `<tr data-inv-id="${x.id}">
        <td style="min-width:175px"><strong>${x.invoice_number||'\u2014'}</strong></td>
        <td style="min-width:160px">${x.customer_name||'\u2014'}<br><small style="color:var(--muted)">${x.phone||''}</small></td>
        <td style="min-width:150px">${x.booking_ref||'\u2014'}</td>
        <td style="min-width:110px">${x.invoice_date||'\u2014'}</td>
        <td style="min-width:110px">
          <span class="${statusClass(x.status)}">${x.status||'Draft'}</span>
        </td>
        <td style="min-width:100px;font-weight:700">${money(x.total)}</td>
        <td style="min-width:130px">
          <div class="invoice-actions">
            <a href="billing.html?id=${x.id}" class="mini-action-btn" title="Edit invoice"><i class="hgi-stroke hgi-edit-01"></i></a>
            ${isPaid
              ?`<a href="paid-bill.html?id=${x.id}" class="mini-action-btn paid" title="Download receipt" target="_blank"><i class="hgi-stroke hgi-receipt-02"></i></a>`
              :`<button class="mini-action-btn" title="Mark as Paid" data-mark-paid="${x.id}"><i class="hgi-stroke hgi-money-receive-02"></i></button>`
            }
            <button class="mini-action-btn" style="color:#b91c1c;border-color:#fcc;background:#fff5f5" title="Delete invoice" data-del-inv="${x.id}" data-inv-num="${x.invoice_number||'this invoice'}"><i class="hgi-stroke hgi-delete-02"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('')
    :'<tr><td colspan="7" class="empty-cell">No invoices found.</td></tr>';

  // Bind Mark as Paid
  document.querySelectorAll('[data-mark-paid]').forEach(btn=>{
    btn.onclick=async()=>{
      const id=btn.dataset.markPaid;
      if(!confirm('Mark this invoice as Paid?'))return;
      btn.disabled=true;
      try{
        const r=await fetch('/api/admin',{method:'PATCH',headers:{'Content-Type':'application/json',...auth()},body:JSON.stringify({type:'invoice_status',id,status:'Paid'})});
        if(!r.ok)throw new Error('Update failed');
        const inv=allInvoices.find(i=>i.id===id);if(inv){inv.status='Paid';}
        renderInvoices(allInvoices);updateMetrics();
      }catch(e){alert('Could not update: '+e.message);btn.disabled=false;}
    };
  });

  // Bind Delete
  document.querySelectorAll('[data-del-inv]').forEach(btn=>{
    btn.onclick=async()=>{
      const id=btn.dataset.delInv;
      const num=btn.dataset.invNum;
      if(!confirm(`Delete invoice ${num}?\n\nThis cannot be undone.`))return;
      btn.disabled=true;
      const row=btn.closest('tr');
      if(row){row.style.opacity='.4';row.style.pointerEvents='none';}
      try{
        const r=await fetch(`/api/admin?id=${encodeURIComponent(id)}`,{method:'DELETE',headers:{...auth()}});
        if(!r.ok){const err=await r.json().catch(()=>({}));throw new Error(err.error||'Delete failed ('+r.status+')');}
        allInvoices=allInvoices.filter(i=>i.id!==id);
        renderInvoices(allInvoices);
        updateMetrics();
      }catch(e){
        alert('Delete failed: '+e.message);
        btn.disabled=false;
        if(row){row.style.opacity='1';row.style.pointerEvents='';}
      }
    };
  });
}

function updateMetrics(){
  const total=allInvoices.reduce((a,x)=>a+Number(x.total||0),0);
  const paidTotal=allInvoices.filter(x=>x.status==='Paid').reduce((a,x)=>a+Number(x.total||0),0);
  const partTotal=allInvoices.filter(x=>x.status==='Part paid').reduce((a,x)=>a+Number(x.total||0),0);
  const unpaidTotal=allInvoices.filter(x=>x.status!=='Paid'&&x.status!=='Part paid').reduce((a,x)=>a+Number(x.total||0),0);
  const set=(id,val)=>{const el=$(id);if(el){el.textContent=val;el.dataset.loaded='1';}};
  set('#metric-total',money(total));
  set('#metric-paid',money(paidTotal));
  set('#metric-unpaid',money(unpaidTotal));
  set('#metric-partpaid',money(partTotal));
}

function applyFilter(){
  const q=$('#invoice-search').value.toLowerCase();
  const sf=$('#invoice-status-filter').value.toLowerCase();
  renderInvoices(allInvoices.filter(x=>{
    const matchText=`${x.invoice_number} ${x.customer_name} ${x.booking_ref} ${x.phone||''}`.toLowerCase().includes(q);
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
  setSyncState('is-busy','Loading invoices\u2026');
  try{
    const res=await fetch('/api/admin',{headers:auth()});
    const d=await safeJson(res);
    if(res.status===401){localStorage.removeItem('bahadur-admin-token');setSyncState('is-error','Sign-in required');login('Incorrect or expired token.');return;}
    if(!res.ok)throw new Error(d.error||'Unknown error');
    allInvoices=d.invoices||[];
    updateMetrics();
    applyFilter();
    setSyncState('is-live',`Synced ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`);
  }catch(e){
    setSyncState('is-error','Error: '+e.message);
    $('#invoice-rows').innerHTML='<tr><td colspan="7" class="empty-cell">'+e.message+'<br><small>Check that DATABASE_URL is set in Vercel environment variables.</small></td></tr>';
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
$('#invoice-search')?.addEventListener('input',applyFilter);
$('#invoice-status-filter')?.addEventListener('change',applyFilter);
$('#admin-date').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
load();
