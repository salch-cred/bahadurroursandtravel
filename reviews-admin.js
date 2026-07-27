const $=s=>document.querySelector(s);
const token=()=>sessionStorage.getItem('bahadur-admin-token')||'';
const auth=()=>({Authorization:`Bearer ${token()}`});

let allReviews=[];
let activeFilter='all';

function login(){
  if(!token()){$('#reviews-login').showModal();}
}

$('#reviews-login-form').onsubmit=e=>{
  e.preventDefault();
  sessionStorage.setItem('bahadur-admin-token',$('#reviews-token').value.trim());
  $('#reviews-login').close();
  load();
};

const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function stars(n){
  return Array.from({length:5},(_, i)=>`<i class="hgi-stroke ${i<n?'hgi-star-01':'hgi-star'}" style="color:${i<n?'#d99e24':'#ccc'}"></i>`).join('');
}

function statusBadge(s){
  const map={approved:'badge-approved',pending:'badge-pending',rejected:'badge-rejected'};
  return `<span class="${map[s]||'badge-pending'}">${s||'pending'}</span>`;
}

function renderList(){
  const list=$('#reviews-list');
  const shown=activeFilter==='all'?allReviews:allReviews.filter(r=>(r.status||'pending')===activeFilter);

  if(!shown.length){
    list.innerHTML=`<div class="empty-reviews"><i class="hgi-stroke hgi-star-01"></i>No ${activeFilter==='all'?'':activeFilter+' '}reviews yet.</div>`;
    return;
  }

  list.innerHTML=shown.map(r=>`
    <article class="review-admin-card" id="rc-${r.id}">
      <div>
        <div class="rac-meta">
          ${statusBadge(r.status)}
          <span class="stars" style="font-size:14px">${stars(Number(r.rating)||5)}</span>
          <span style="font-size:12px;color:#74807c">${r.trip?`<i class="hgi-stroke hgi-route-03"></i> ${esc(r.trip)}`:''}</span>
          ${r.booking_ref?`<span style="font-size:11px;background:#f0f7f5;padding:3px 8px;border-radius:6px;color:var(--green);font-weight:700">Ref: ${esc(r.booking_ref)}</span>`:''}
        </div>
        <blockquote>"${esc(r.text)}"</blockquote>
        <div class="rac-footer">
          <strong>${esc(r.name)}</strong>
          ${r.created_at?` · ${new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`:''}</div>
        ${r.media_url?`<img class="review-media-thumb" src="${esc(r.media_url)}" alt="Guest media" style="margin-top:10px">`:''}
      </div>
      <div class="rac-actions">
        ${(r.status||'pending')!=='approved'?`<button class="approve-btn" data-approve="${r.id}"><i class="hgi-stroke hgi-tick-02"></i> Approve</button>`:''}
        ${(r.status||'pending')!=='rejected'&&(r.status||'pending')!=='approved'?`<button class="danger-button" data-reject="${r.id}" style="background:#fff3e0;color:#d4821a"><i class="hgi-stroke hgi-cancel-01"></i> Reject</button>`:''}
        <button class="danger-button" data-delete="${r.id}"><i class="hgi-stroke hgi-delete-02"></i> Delete</button>
      </div>
    </article>
  `).join('');

  // Wire up buttons
  list.querySelectorAll('[data-approve]').forEach(btn=>{
    btn.onclick=()=>updateStatus(btn.dataset.approve,'approved');
  });
  list.querySelectorAll('[data-reject]').forEach(btn=>{
    btn.onclick=()=>updateStatus(btn.dataset.reject,'rejected');
  });
  list.querySelectorAll('[data-delete]').forEach(btn=>{
    btn.onclick=()=>deleteReview(btn.dataset.delete);
  });
}

function updateStats(){
  const total=allReviews.length;
  const approved=allReviews.filter(r=>r.status==='approved').length;
  const pending=allReviews.filter(r=>(r.status||'pending')==='pending').length;
  $('#s-total').textContent=total;
  $('#s-approved').textContent=approved;
  $('#s-pending').textContent=pending;
}

async function safeJson(res){
  const ct=res.headers.get('content-type')||'';
  if(!ct.includes('application/json')){
    const text=await res.text();
    throw new Error('Server error ('+res.status+'): '+text.slice(0,200).replace(/<[^>]+>/g,'').trim());
  }
  return res.json();
}

async function load(){
  if(!token()){login();return;}
  $('#reviews-state').textContent='Loading…';
  try{
    const r=await fetch('/api/reviews?admin=1&limit=200',{headers:auth()});
    if(r.status===401){sessionStorage.removeItem('bahadur-admin-token');login();return;}
    const d=await safeJson(r);
    if(!r.ok)throw new Error(d.error);
    allReviews=d.reviews||[];
    updateStats();
    renderList();
    $('#reviews-state').textContent=`${allReviews.length} review(s) total`;
  }catch(e){
    $('#reviews-state').textContent='Error: '+e.message;
    $('#reviews-list').innerHTML=`<div class="empty-reviews" style="color:#c0392b"><i class="hgi-stroke hgi-alert-diamond"></i>${e.message}</div>`;
  }
}

async function updateStatus(id,status){
  try{
    const r=await fetch(`/api/reviews?id=${id}`,{method:'PATCH',headers:{'Content-Type':'application/json',...auth()},body:JSON.stringify({status})});
    const d=await safeJson(r);
    if(!r.ok)throw new Error(d.error);
    const idx=allReviews.findIndex(x=>String(x.id)===String(id));
    if(idx>-1)allReviews[idx].status=status;
    updateStats();
    renderList();
  }catch(e){alert('Failed: '+e.message);}
}

async function deleteReview(id){
  const review=allReviews.find(x=>String(x.id)===String(id));
  if(!confirm(`Delete review by "${review?.name||id}"? This cannot be undone.`))return;
  try{
    const r=await fetch(`/api/reviews?id=${id}`,{method:'DELETE',headers:auth()});
    const d=await safeJson(r);
    if(!r.ok)throw new Error(d.error);
    allReviews=allReviews.filter(x=>String(x.id)!==String(id));
    updateStats();
    renderList();
    $('#reviews-state').textContent=`${allReviews.length} review(s) total — 1 deleted`;
  }catch(e){alert('Delete failed: '+e.message);}
}

// Filter buttons
document.querySelectorAll('[data-filter]').forEach(btn=>{
  btn.onclick=()=>{
    activeFilter=btn.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderList();
  };
});

$('#reviews-refresh').onclick=load;
load();
