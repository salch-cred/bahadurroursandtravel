/* ── Visitor Review + Media Upload Widget ────────────────────── */
(function(){
'use strict';

const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const star=n=>'★'.repeat(Math.max(1,Math.min(5,Number(n||5))));

/* ── Build widget HTML ─────────────────────────────────────── */
const host=document.createElement('section');
host.className='visitor-review-widget section';
host.innerHTML=`
<div class="section-head">
  <div>
    <span class="kicker">Visitor voices</span>
    <h2>Real moments,<br><em>shared honestly.</em></h2>
  </div>
  <button class="btn btn-outline" id="vr-open-btn">Share your journey</button>
</div>
<div class="visitor-review-grid" id="vr-review-list">
  <div class="community-empty">Loading approved guest reviews…</div>
</div>`;

const main=document.querySelector('main');
(main||document.body).append(host);

/* ── Dialog / modal ────────────────────────────────────────── */
const dialog=document.createElement('dialog');
dialog.className='visitor-review-dialog';
dialog.innerHTML=`
<form id="vr-form" novalidate>
  <button type="button" class="modal-close" id="vr-close-btn" aria-label="Close">
    <i class="hgi-stroke hgi-cancel-01"></i>
  </button>
  <span class="kicker">Submit for verification</span>
  <h2>Share your journey.</h2>

  <div class="review-upload-grid">

    <label>Name
      <input name="name" required placeholder="Your name" autocomplete="name">
    </label>

    <label>Trip
      <input name="trip" required placeholder="e.g. Lakshadweep, Kashmir…">
    </label>

    <label>Rating
      <select name="rating">
        <option value="5">5 — Excellent</option>
        <option value="4">4 — Very good</option>
        <option value="3">3 — Good</option>
        <option value="2">2 — Fair</option>
        <option value="1">1 — Poor</option>
      </select>
    </label>

    <label>Booking reference <span class="vr-optional">(optional)</span>
      <input name="bookingRef" placeholder="e.g. BT12345678 · Helps verify your review">
    </label>

    <label class="span-2">Your review
      <textarea name="text" rows="4" required placeholder="Tell us about your experience (min 30 characters)…"></textarea>
    </label>

    <!-- ── Photo / Video Upload ─────────────────────────── -->
    <div class="span-2 vr-upload-section">
      <p class="vr-upload-label"><i class="hgi-stroke hgi-image-upload"></i> Add photos or videos <span class="vr-optional">(optional)</span></p>
      <label class="vr-drop-zone" id="vr-drop-zone">
        <input type="file" id="vr-file-input" multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime,video/mov">
        <div class="vr-drop-inner" id="vr-drop-inner">
          <i class="hgi-stroke hgi-image-upload" style="font-size:36px;color:#9ab5ac;display:block;margin-bottom:10px"></i>
          <strong>Tap to choose photos or videos</strong>
          <span>Or drag &amp; drop here · Max 5 MB per file</span>
        </div>
      </label>

      <!-- File thumbnails queue -->
      <div class="vr-file-queue" id="vr-file-queue"></div>
    </div>

    <!-- ── Consent + Submit ─────────────────────────────── -->
    <label class="consent span-2">
      <input type="checkbox" name="consent" required>
      I own this content and permit Bahadur Tours to display it after approval.
    </label>

    <button class="btn span-2" type="submit" id="vr-submit-btn">
      <i class="hgi-stroke hgi-send-02"></i> Send for approval
    </button>

    <small class="span-2" id="vr-state"></small>

  </div>
</form>`;
document.body.appendChild(dialog);

/* ── Open / close ──────────────────────────────────────────── */
host.querySelector('#vr-open-btn').onclick=()=>dialog.showModal();
dialog.querySelector('#vr-close-btn').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});

/* ── File management ───────────────────────────────────────── */
let userFiles=[];
const fileInput  = dialog.querySelector('#vr-file-input');
const dropZone   = dialog.querySelector('#vr-drop-zone');
const fileQueue  = dialog.querySelector('#vr-file-queue');
const stateEl    = dialog.querySelector('#vr-state');

function formatSize(bytes){
  if(bytes>1e6)return (bytes/1e6).toFixed(1)+' MB';
  return (bytes/1024).toFixed(0)+' KB';
}

function renderQueue(){
  if(!userFiles.length){fileQueue.innerHTML='';fileQueue.style.display='none';return;}
  fileQueue.style.display='flex';
  fileQueue.innerHTML=userFiles.map((f,i)=>{
    const isVid=f.type.startsWith('video/');
    const isLarge=f.size>5*1024*1024;
    return `<div class="vr-queue-item" data-idx="${i}">
      <span class="vr-queue-icon">
        <i class="hgi-stroke ${isVid?'hgi-video-replay':'hgi-image-01'}"></i>
      </span>
      <div class="vr-queue-info">
        <span class="vr-queue-name" title="${esc(f.name)}">${esc(f.name.length>28?f.name.slice(0,25)+'…':f.name)}</span>
        <span class="vr-queue-size ${isLarge?'vr-queue-large':''}" ${isLarge?'style="color:#d94838;font-weight:700"':''}>${formatSize(f.size)}${isLarge?' · File too large (Max 5MB)':''}</span>
      </div>
      <button type="button" class="vr-queue-remove" data-rm="${i}" aria-label="Remove file">
        <i class="hgi-stroke hgi-cancel-01"></i>
      </button>
    </div>`;
  }).join('');
  fileQueue.querySelectorAll('[data-rm]').forEach(btn=>btn.onclick=()=>{
    userFiles.splice(Number(btn.dataset.rm),1);
    renderQueue();
  });
}

function addFiles(files){
  [...files].forEach(f=>{
    if(!userFiles.find(x=>x.name===f.name&&x.size===f.size))userFiles.push(f);
  });
  renderQueue();
}

fileInput.onchange=()=>{addFiles(fileInput.files);fileInput.value='';};
dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.classList.add('vr-dz-over');});
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('vr-dz-over'));
dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('vr-dz-over');addFiles(e.dataTransfer.files);});

/* ── toBase64 helper ───────────────────────────────────────── */
function toBase64(file){
  return new Promise((ok,fail)=>{
    const r=new FileReader();
    r.onload=()=>ok(String(r.result).split(',')[1]);
    r.onerror=fail;
    r.readAsDataURL(file);
  });
}

/* ── Load approved reviews ─────────────────────────────────── */
async function loadReviews(){
  try{
    const res=await fetch('/api/reviews?limit=8');
    const d=await res.json();
    const list=dialog.parentElement?.querySelector('#vr-review-list')||host.querySelector('#vr-review-list');
    list.innerHTML=(d.reviews||[]).length
      ?d.reviews.map(x=>`<article class="visitor-review-card">
          ${x.media_url
            ?(x.media_type==='video'
              ?`<video src="${esc(x.media_url)}" controls preload="metadata" playsinline loading="lazy"></video>`
              :`<img src="${esc(x.media_url)}" alt="Guest photo" loading="lazy">`)
            :''}
          <div class="vr-card-body">
            <span class="vr-stars">${star(x.rating)}</span>
            <blockquote>"${esc(x.text)}"</blockquote>
            <strong>${esc(x.name)}</strong>
            <small>${esc(x.trip)}</small>
          </div>
        </article>`).join('')
      :'<div class="community-empty"><i class="hgi-stroke hgi-star-01" style="font-size:36px;opacity:.3;display:block;margin-bottom:12px"></i>Approved guest stories will appear here.</div>';
  }catch{
    const list=host.querySelector('#vr-review-list');
    if(list)list.innerHTML='<div class="community-empty">Guest stories load once the database is connected.</div>';
  }
}

/* ── Form submit ───────────────────────────────────────────── */
dialog.querySelector('#vr-form').onsubmit=async e=>{
  e.preventDefault();
  const form=e.target;
  const submitBtn=dialog.querySelector('#vr-submit-btn');

  // Validate review length
  const reviewText=(form.text?.value||'').trim();
  if(reviewText.length<30){
    stateEl.textContent='⚠️ Please write at least 30 characters in your review.';
    form.text?.focus();
    return;
  }
  if(!form.consent?.checked){
    stateEl.textContent='⚠️ Please agree to the content permission.';
    return;
  }

  submitBtn.disabled=true;
  submitBtn.innerHTML='<i class="hgi-stroke hgi-loading-03"></i> Sending…';
  stateEl.textContent='';

  const fd=new FormData(form);
  const payload={
    name:(fd.get('name')||'').trim(),
    trip:(fd.get('trip')||'').trim(),
    rating:fd.get('rating')||'5',
    bookingRef:(fd.get('bookingRef')||'').trim(),
    text:reviewText,
    consent:true,
    packageSlug:window.currentPackage?.slug||'',
    files:[],
  };

  // Encode files
  if(userFiles.length){
    const oversized = userFiles.find(f => f.size > 5*1024*1024);
    if(oversized) {
      stateEl.textContent='⚠️ Media must be smaller than 5 MB. Please remove large files.';
      submitBtn.disabled=false;
      submitBtn.innerHTML='<i class="hgi-stroke hgi-send-02"></i> Send for approval';
      return;
    }
    stateEl.textContent=`Preparing ${userFiles.length} file(s)…`;
    let upload;
    try {
      const blobClient = await import('https://esm.sh/@vercel/blob/client@0.27.0');
      upload = blobClient.upload;
    } catch (e) {
      console.error('Failed to load blob client', e);
    }

    for(let i=0;i<userFiles.length;i++){
      stateEl.textContent=`Uploading file ${i+1} of ${userFiles.length} (Max 5MB)…`;
      try{
        if (upload) {
          // Direct Vercel Blob Upload
          const newBlob = await upload(userFiles[i].name, userFiles[i], {
            access: 'public',
            handleUploadUrl: '/api/upload',
          });
          payload.files.push({url:newBlob.url, fileName:userFiles[i].name, mimeType:userFiles[i].type});
        } else {
          // Fallback to Base64 (Will fail for >3MB on Vercel)
          const b64=await toBase64(userFiles[i]);
          payload.files.push({data:b64,fileName:userFiles[i].name,mimeType:userFiles[i].type});
        }
      }catch (err) {
        console.error('Upload error', err);
        throw new Error('Failed to upload media. Please try again.');
      }
    }
    stateEl.textContent='Submitting review…';
  }else{
    stateEl.textContent='Submitting review…';
  }

  try{
    const res=await fetch('/api/reviews',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
    });
    
    let out;
    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (isJson) {
      out = await res.json();
    } else {
      if (res.status === 413) throw new Error('File is too large for the server to process. Please use a smaller file or a shorter video.');
      throw new Error(`Server returned an unexpected response (${res.status}).`);
    }
    
    if(!res.ok)throw new Error(out.error||'Submission failed');

    const msg=out.status==='approved'
      ?'✅ Review published! Thank you for sharing.'
      :'✅ Submitted! It will appear after approval.';
    stateEl.textContent=msg;
    form.reset();
    userFiles=[];
    renderQueue();
    setTimeout(()=>dialog.close(),3500);
    loadReviews();
  }catch(err){
    stateEl.textContent='⚠️ '+( err.message||'Submission unavailable. Please try again.');
    submitBtn.disabled=false;
    submitBtn.innerHTML='<i class="hgi-stroke hgi-send-02"></i> Send for approval';
  }
};

loadReviews();
})();
