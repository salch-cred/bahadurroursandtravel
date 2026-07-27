/* ── Visitor Review Widget (public) ───────────────────────────────────── */
const host = document.createElement('section');
host.className = 'visitor-review-widget section';
host.innerHTML = `
<div class="section-head">
  <div>
    <span class="kicker">Visitor voices</span>
    <h2>Real moments,<br><em>shared honestly.</em></h2>
  </div>
  <button class="btn btn-outline" data-open-review>Share your journey</button>
</div>
<div class="visitor-review-grid" data-review-list>
  <div class="community-empty">Loading approved guest reviews…</div>
</div>

<dialog class="visitor-review-dialog">
  <form>
    <button type="button" class="modal-close" data-close-review><i class="hgi-stroke hgi-cancel-01"></i></button>
    <span class="kicker">Submit for verification</span>
    <h2>Share your journey.</h2>
    <div class="review-upload-grid">
      <label>Name<input name="name" required placeholder="Your name"></label>
      <label>Trip<input name="trip" required placeholder="e.g. Lakshadweep, Wayanad…"></label>
      <label>Rating<select name="rating">
        <option value="5">5 — Excellent</option>
        <option value="4">4 — Very good</option>
        <option value="3">3 — Good</option>
      </select></label>
      <label>Booking reference<input name="bookingRef" required placeholder="Kept private"></label>
      <label class="span-2">Your review<textarea name="text" rows="4" required></textarea></label>

      <!-- ── Photo / video upload ─────────────────────────── -->
      <div class="span-2" style="margin:4px 0">
        <div class="user-drop-zone" id="user-drop-zone">
          <input type="file" id="user-file-input" multiple accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/webm,video/quicktime">
          <i class="hgi-stroke hgi-image-upload" style="font-size:30px;color:#b0c4bc;display:block;margin-bottom:8px"></i>
          <strong style="font-size:14px">Add photos or videos</strong>
          <p style="color:#8fa099;font-size:12px;margin:4px 0 0">Tap to browse or drag files here · Any size accepted</p>
        </div>
        <div class="user-file-queue" id="user-file-queue" style="display:none"></div>
      </div>

      <label class="consent span-2">
        <input type="checkbox" name="consent" required>
        I own this content and permit Bahadur Tours to display it after approval.
      </label>
      <button class="btn span-2">Send for approval</button>
      <small class="span-2" data-review-state></small>
    </div>
  </form>
</dialog>`;

const mainEl = document.querySelector('main');
mainEl ? mainEl.append(host) : document.body.append(host);

const dlg      = host.querySelector('dialog');
const fileInp  = host.querySelector('#user-file-input');
const dropZone = host.querySelector('#user-drop-zone');
const queueEl  = host.querySelector('#user-file-queue');

host.querySelector('[data-open-review]').onclick  = () => dlg.showModal();
host.querySelector('[data-close-review]').onclick = () => dlg.close();

/* ── File queue ────────────────────────────────────────────── */
let userFiles = [];

const addUserFiles = files => {
  [...files].forEach(f => {
    if (!userFiles.find(x => x.name === f.name && x.size === f.size)) userFiles.push(f);
  });
  renderUserQueue();
};

dropZone.ondragover  = e => { e.preventDefault(); dropZone.classList.add('dz-over'); };
dropZone.ondragleave = () => dropZone.classList.remove('dz-over');
dropZone.ondrop      = e => { e.preventDefault(); dropZone.classList.remove('dz-over'); addUserFiles(e.dataTransfer.files); };
fileInp.onchange     = () => { addUserFiles(fileInp.files); fileInp.value = ''; };

function renderUserQueue() {
  if (!userFiles.length) { queueEl.style.display = 'none'; return; }
  queueEl.style.display = 'flex';
  queueEl.innerHTML = userFiles.map((f, i) => {
    const isVid = f.type.startsWith('video/');
    const sz    = f.size > 1e6 ? (f.size/1e6).toFixed(1)+'MB' : (f.size/1024).toFixed(0)+'KB';
    return `<div class="uq-item" data-idx="${i}">
      <span class="uq-icon">${isVid?'🎬':'📸'}</span>
      <span class="uq-name" title="${esc(f.name)}">${esc(f.name.length>22?f.name.slice(0,19)+'…':f.name)}</span>
      <span class="uq-sz">${sz}</span>
      <button type="button" class="uq-rm" onclick="window.__rmUserFile(${i})"><i class="hgi-stroke hgi-cancel-01"></i></button>
    </div>`;
  }).join('');
}
window.__rmUserFile = i => { userFiles.splice(i, 1); renderUserQueue(); };

/* ── Helpers ───────────────────────────────────────────────── */
const esc = v => String(v||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function toBase64(file) {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onload  = () => ok(String(r.result).split(',')[1]);
    r.onerror = fail;
    r.readAsDataURL(file);
  });
}

/* ── Load reviews ──────────────────────────────────────────── */
async function load() {
  try {
    const res = await fetch('/api/reviews?limit=6');
    const d   = await res.json();
    host.querySelector('[data-review-list]').innerHTML = d.reviews?.length
      ? d.reviews.map(x => `<article class="visitor-review-card">
          ${x.media_url
            ? (x.media_type==='video'
              ? `<video src="${x.media_url}" controls preload="metadata"></video>`
              : `<img src="${x.media_url}" alt="Guest media" loading="lazy">`)
            : ''}
          <div>
            <span class="stars">${'★'.repeat(Number(x.rating||5))}</span>
            <blockquote>"${esc(x.text)}"</blockquote>
            <strong>${esc(x.name)}</strong>
            <small>${esc(x.trip)}</small>
          </div>
        </article>`).join('')
      : '<div class="community-empty">Approved visitor stories will appear here.</div>';
  } catch {
    host.querySelector('[data-review-list]').innerHTML = '<div class="community-empty">Visitor stories load once connected.</div>';
  }
}

/* ── Submit ────────────────────────────────────────────────── */
host.querySelector('form').onsubmit = async e => {
  e.preventDefault();
  const form  = e.target;
  const state = form.querySelector('[data-review-state]');
  const fd    = new FormData(form);
  state.textContent = userFiles.length ? `Uploading ${userFiles.length} file(s)…` : 'Sending securely…';

  // Build media list
  const files = [];
  for (const f of userFiles) {
    try {
      const base64 = await toBase64(f);
      files.push({ data: base64, fileName: f.name, mimeType: f.type });
    } catch { /* skip broken file */ }
  }

  const payload = Object.fromEntries(fd);
  delete payload.media;
  payload.consent      = Boolean(payload.consent);
  payload.packageSlug  = window.currentPackage?.slug || '';
  if (files.length) payload.files = files;

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error);
    state.textContent = 'Submitted! It will appear after booking verification and approval.';
    form.reset();
    userFiles = [];
    renderUserQueue();
  } catch (err) {
    state.textContent = err.message || 'Submission unavailable';
  }
};

load();