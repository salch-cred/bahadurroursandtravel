const $=s=>document.querySelector(s);
let allInvoices=[];
const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0));
const token=()=>localStorage.getItem('bahadur-admin-token')||'';
const auth=()=>({Authorization:`Bearer ${token()}`});

function invBadge(status){
  const s=String(status||'').toLowerCase();
  if(s==='paid')      return 'paid';
  if(s==='part paid') return 'partpaid';
  if(s==='sent')      return 'sent';
  if(s==='overdue')   return 'overdue';
  return 'draft';
}

async function safeJson(res){
  const ct=res.headers.get('content-type')||'';
  if(!ct.includes('application/json')){const text=await res.text();throw new Error('Server error ('+res.status+'): '+text.slice(0,120).replace(/<[^>]+>/g,''));}
  return res.json();
}

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmtDate(v){if(!v)return '\u2014';try{return new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'}).format(new Date(v));}catch{return v;}}

function renderInvoices(rows){
  const countEl=$('#invoice-count');
  if(countEl)countEl.textContent=`Showing ${rows.length} of ${allInvoices.length} invoices`;
  const body=$('#invoice-rows');if(!body)return;
  if(!rows.length){
    body.innerHTML=`<tr><td colspan="8"><div class="inv-empty"><i class="hgi-stroke hgi-receipt-02"></i>No invoices found.</div></td></tr>`;
    return;
  }
  const isPaidStatus=s=>s==='Paid'||s==='Part paid';
  body.innerHTML=rows.map(x=>`
    <tr>
      <td><span class="cell-main">${esc(x.invoice_number||'\u2014')}</span><span class="cell-sub">${esc(x.booking_ref||'')}</span></td>
      <td><span style="font-weight:600">${esc(x.customer_name||'\u2014')}</span><span class="cell-sub">${esc(x.phone||'')}</span><span class="cell-sub">${esc(x.email||'')}</span></td>
      <td>${esc(x.booking_ref||'\u2014')}</td>
      <td>${esc(fmtDate(x.invoice_date))}</td>
      <td>${esc(fmtDate(x.due_date))}</td>
      <td><span class="inv-badge ${invBadge(x.status)}">${esc(x.status||'Draft')}</span></td>
      <td><span class="cell-amount">${money(x.total||0)}</span></td>
      <td><div class="inv-actions">
        <a href="billing.html?id=${esc(x.id)}" class="inv-action-btn" title="Edit"><i class="hgi-stroke hgi-edit-01"></i></a>
        ${isPaidStatus(x.status)
          ?`<a href="paid-bill.html?id=${esc(x.id)}" class="inv-action-btn paid-btn" title="Receipt" target="_blank"><i class="hgi-stroke hgi-receipt-02"></i></a>`
          :`<button class="inv-action-btn" title="Mark Paid" data-mark-paid="${esc(x.id)}"><i class="hgi-stroke hgi-money-receive-02"></i></button>`
        }
        <button class="inv-action-btn danger" title="Delete" data-del-inv="${esc(x.id)}" data-inv-num="${esc(x.invoice_number||'this invoice')}"><i class="hgi-stroke hgi-delete-02"></i></button>
      </div></td>
    </tr>`).join('');

  body.querySelectorAll('[data-mark-paid]').forEach(btn=>{
    btn.onclick=async()=>{
      const id=btn.dataset.markPaid;if(!confirm('Mark as Paid?'))return;btn.disabled=true;
      try{
        const r=await fetch('/api/admin',{method:'PATCH',headers:{'Content-Type':'application/json',...auth()},body:JSON.stringify({type:'invoice_status',id,status:'Paid'})});
        if(!r.ok)throw new Error('Update failed');
        const inv=allInvoices.find(i=>i.id===id);if(inv)inv.status='Paid';
        renderInvoices(allInvoices);updateMetrics();
      }catch(e){alert('Could not update: '+e.message);btn.disabled=false;}
    };
  });

  body.querySelectorAll('[data-del-inv]').forEach(btn=>{
    btn.onclick=async()=>{
      const id=btn.dataset.delInv,num=btn.dataset.invNum;
      if(!confirm(`Delete invoice ${num}?\n\nThis cannot be undone.`))return;
      btn.disabled=true;
      const row=btn.closest('tr');if(row){row.style.opacity='.4';row.style.pointerEvents='none';}
      try{
        const r=await fetch(`/api/admin?id=${encodeURIComponent(id)}`,{method:'DELETE',headers:auth()});
        if(!r.ok){const err=await r.json().catch(()=>({}));throw new Error(err.error||'Delete failed ('+r.status+')');}
        allInvoices=allInvoices.filter(i=>i.id!==id);renderInvoices(allInvoices);updateMetrics();
      }catch(e){
        alert('Delete failed: '+e.message);btn.disabled=false;
        if(row){row.style.opacity='1';row.style.pointerEvents='';}
      }
    };
  });
}

function updateMetrics(){
  const total=allInvoices.reduce((a,x)=>a+Number(x.total||0),0);
  const paid=allInvoices.filter(x=>x.status==='Paid').reduce((a,x)=>a+Number(x.total||0),0);
  const part=allInvoices.filter(x=>x.status==='Part paid').reduce((a,x)=>a+Number(x.total||0),0);
  const unpaid=allInvoices.filter(x=>x.status!=='Paid'&&x.status!=='Part paid').reduce((a,x)=>a+Number(x.total||0),0);
  const set=(id,v)=>{const el=$(id);if(el)el.textContent=v;};
  set('#metric-total',money(total));set('#metric-paid',money(paid));set('#metric-unpaid',money(unpaid));set('#metric-partpaid',money(part));
}

function applyFilter(){
  const q=($('#invoice-search')?.value||'').toLowerCase();
  const sf=($('#invoice-status-filter')?.value||'').toLowerCase();
  renderInvoices(allInvoices.filter(x=>{
    const text=`${x.invoice_number||''} ${x.customer_name||''} ${x.booking_ref||''} ${x.phone||''} ${x.email||''}`.toLowerCase();
    return(!q||text.includes(q))&&(!sf||String(x.status||'').toLowerCase().includes(sf));
  }));
}

function exportCSV(){
  const cols=['invoice_number','customer_name','phone','email','booking_ref','invoice_date','due_date','status','subtotal','discount','tax','total','notes'];
  const rows=allInvoices.map(x=>cols.map(c=>`"${String(x[c]??'').replace(/"/g,'""')}"`).join(','));
  const blob=new Blob([cols.join(',')+"\n"+rows.join("\n")],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`invoices-${new Date().toISOString().slice(0,10)}.csv`;a.click();
}

function login(message=''){
  const d=$('#admin-login'),err=$('#login-error');
  if(err)err.textContent=message;
  if(d&&!d.open)d.showModal();
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
  if(!token()){setSyncState('is-error','Sign-in required');login();return;}
  const btn=$('#admin-refresh');
  if(btn){btn.classList.add('is-loading');btn.setAttribute('disabled','');}
  setSyncState('is-busy','Loading invoices\u2026');
  try{
    const res=await fetch('/api/admin',{headers:auth()});
    const d=await safeJson(res);
    if(res.status===401){localStorage.removeItem('bahadur-admin-token');setSyncState('is-error','Sign-in required');login('Incorrect or expired token.');return;}
    if(!res.ok)throw new Error(d.error||'Unknown error');
    allInvoices=d.invoices||[];
    updateMetrics();applyFilter();
    setSyncState('is-live','Synced '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}));
  }catch(e){
    setSyncState('is-error','Error: '+e.message);
    const body=$('#invoice-rows');
    if(body)body.innerHTML=`<tr><td colspan="8" style="padding:2rem;text-align:center;color:var(--muted)">${esc(e.message)}<br><small>Check DATABASE_URL and ADMIN_API_TOKEN in Vercel.</small></td></tr>`;
  }finally{
    if(btn){btn.classList.remove('is-loading');btn.removeAttribute('disabled');}
  }
}

$('#admin-login-form')?.addEventListener('submit',e=>{
  e.preventDefault();
  const val=($('#admin-token')?.value||'').trim();
  if(!val){login('Enter the admin token.');return;}
  localStorage.setItem('bahadur-admin-token',val);
  $('#admin-login')?.close();load();
});
$('#admin-token-toggle')?.addEventListener('click',()=>{
  const i=$('#admin-token');if(!i)return;
  i.type=i.type==='text'?'password':'text';i.focus();
});
$('#admin-refresh')?.addEventListener('click',load);
$('#admin-lock')?.addEventListener('click',()=>{localStorage.removeItem('bahadur-admin-token');window.location.href='admin.html';});
$('#invoice-search')?.addEventListener('input',applyFilter);
$('#invoice-status-filter')?.addEventListener('change',applyFilter);
$('#export-inv-csv')?.addEventListener('click',exportCSV);

const dateEl=$('#admin-date');
if(dateEl)dateEl.textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
load();
