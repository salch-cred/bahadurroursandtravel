/* ── Package Admin ─────────────────────────────────────── */
const $ = s => document.querySelector(s);
let items = [];
let galleryImages = []; // [{src: string, primary: bool}]

const token = () => localStorage.getItem('bahadur-admin-token') || '';
const auth  = () => ({ Authorization: `Bearer ${token()}` });
const lines = v => String(v || '').split('\n').map(x => x.trim()).filter(Boolean);
const esc   = v => String(v || '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── Activity log ────────────────────────────────────────── */
const actLog = [];
function log(msg) {
  actLog.unshift({ msg, t: new Date().toLocaleTimeString() });
  if (actLog.length > 30) actLog.pop();
  const feed = $('#activity-feed');
  if (feed) feed.innerHTML = actLog.map(a =>
    `<li><span></span><div><strong>${esc(a.msg)}</strong><small>${a.t}</small></div></li>`
  ).join('') || '<li style="color:#96a09c;padding:10px 0">No activity yet.</li>';
}

/* ── Image compress ──────────────────────────────────────── */
function compress(file, maxW = 1400, q = 0.82) {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onerror = fail;
    r.onload = e => {
      const img = new Image();
      img.onerror = fail;
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        ok(c.toDataURL('image/jpeg', q));
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });
}

/* ── Gallery manager ─────────────────────────────────────── */
function renderGallery() {
  const grid = $('#gallery-preview-container');
  if (!grid) return;

  if (!galleryImages.length) {
    grid.innerHTML = '<div style="color:#96a09c;font-size:13px;padding:8px 0">No images yet — upload or paste a URL.</div>';
  } else {
    grid.innerHTML = galleryImages.map((img, i) => `
      <div style="position:relative;width:110px;height:80px;border-radius:10px;overflow:hidden;
        border:2px solid ${img.primary ? 'var(--green)' : 'var(--line)'};flex-shrink:0">
        <img src="${esc(img.src)}" alt="Image ${i + 1}" loading="lazy"
          style="width:100%;height:100%;object-fit:cover"
          onerror="this.src='assets/images/island-beach.jpg'">
        ${img.primary ? '<span style="position:absolute;bottom:3px;left:3px;background:#0b6655;color:#fff;font-size:9px;font-weight:800;padding:2px 5px;border-radius:4px;letter-spacing:.04em">COVER</span>' : ''}
        <button type="button" title="Remove" data-rm="${i}"
          style="position:absolute;top:3px;right:3px;border:0;background:#e53e3ecc;color:#fff;
            border-radius:6px;width:22px;height:22px;cursor:pointer;font-size:13px;line-height:1;
            display:flex;align-items:center;justify-content:center">×</button>
        ${!img.primary ? `<button type="button" title="Set as cover" data-cover="${i}"
          style="position:absolute;top:3px;left:3px;border:0;background:#0b6655cc;color:#fff;
            border-radius:6px;width:22px;height:22px;cursor:pointer;font-size:11px;line-height:1;
            display:flex;align-items:center;justify-content:center">★</button>` : ''}
      </div>`).join('');

    grid.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
      galleryImages.splice(Number(b.dataset.rm), 1);
      if (galleryImages.length && !galleryImages.some(g => g.primary)) galleryImages[0].primary = true;
      syncPrimaryToForm();
      renderGallery();
      updateLivePreview();
    });
    grid.querySelectorAll('[data-cover]').forEach(b => b.onclick = () => {
      galleryImages.forEach(g => g.primary = false);
      galleryImages[Number(b.dataset.cover)].primary = true;
      syncPrimaryToForm();
      renderGallery();
      updateLivePreview();
      log('Set cover photo');
    });
  }

  const hidden = $('#gallery_json');
  if (hidden) hidden.value = JSON.stringify(galleryImages.map(g => g.src));
  updateLivePreview();
}

function syncPrimaryToForm() {
  const primary = galleryImages.find(g => g.primary) || galleryImages[0];
  const urlInput = $('[name="image_url"]');
  if (urlInput && primary) urlInput.value = primary.src;
}

/* ── Upload file handler ─────────────────────────────────── */
async function handleFileUpload(files) {
  const state = $('#package-state');
  const arr = [...files];
  if (state) state.textContent = `Compressing ${arr.length} image(s)…`;
  let added = 0;
  for (const f of arr) {
    if (!f.type.startsWith('image/')) { if (state) state.textContent = 'Only image files accepted.'; continue; }
    try {
      const src = await compress(f, 1400, 0.82);
      galleryImages.push({ src, primary: galleryImages.length === 0 });
      added++;
    } catch (err) { if (state) state.textContent = 'Image error: ' + err.message; }
  }
  syncPrimaryToForm();
  renderGallery();
  if (state) state.textContent = `${added} image(s) added. Gallery: ${galleryImages.length} total.`;
  log(`Uploaded ${added} image(s)`);
}

/* ── Live preview ────────────────────────────────────────── */
function updateLivePreview() {
  const preview = $('#live-preview');
  if (!preview) return;
  const f = $('#package-form');
  if (!f) return;
  const name     = f.elements.name?.value || 'Package name';
  const region   = f.elements.region?.value || '';
  const duration = f.elements.duration?.value || '';
  const price    = f.elements.price?.value || 'Custom quote';
  const summary  = f.elements.summary?.value || '';
  const active   = f.elements.active?.checked;
  const type     = f.elements.package_type?.value || 'domestic';
  const primary  = galleryImages.find(g => g.primary) || galleryImages[0];
  const img      = primary?.src || $('[name="image_url"]')?.value || 'assets/images/island-beach.jpg';
  const galCount = galleryImages.length;

  preview.innerHTML = `
    <div style="border-radius:16px;overflow:hidden;border:1px solid var(--line);background:#fff;max-width:320px">
      <div style="position:relative;height:200px;background:#061f1c">
        <img src="${esc(img)}" alt="${esc(name)}" loading="lazy"
          style="width:100%;height:100%;object-fit:cover"
          onerror="this.src='assets/images/island-beach.jpg'">
        <span style="position:absolute;top:10px;left:10px;background:${active ? '#0b6655' : '#666'};
          color:#fff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:6px">
          ${active ? 'Live' : 'Hidden'}
        </span>
        <span style="position:absolute;top:10px;right:10px;background:#fff;
          color:#333;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px">
          ${type === 'international' ? 'International' : 'Domestic'}
        </span>
        ${galCount > 1 ? `<span style="position:absolute;bottom:10px;right:10px;background:#00000088;
          color:#fff;font-size:11px;padding:3px 8px;border-radius:6px">🖼 ${galCount}</span>` : ''}
      </div>
      <div style="padding:16px">
        <small style="color:#64716d;font-size:12px">${esc(region)}${region && duration ? ' · ' : ''}${esc(duration)}</small>
        <h3 style="margin:4px 0 8px;font-size:18px;line-height:1.3">${esc(name)}</h3>
        <p style="color:#64716d;font-size:13px;margin:0 0 12px;line-height:1.5">${esc(summary.slice(0, 100))}${summary.length > 100 ? '…' : ''}</p>
        <strong style="color:#0b6655;font-size:15px">${esc(price)}</strong>
      </div>
    </div>
    <small style="display:block;text-align:center;color:#96a09c;margin-top:8px;font-size:11px">
      ● Live preview — updates as you type
    </small>`;
}

/* ── Fill form for editing ───────────────────────────────── */
function fill(p = {}) {
  const f = $('#package-form');
  const skip = new Set(['id', 'flight_details', 'room_details', 'gallery',
    'highlights', 'itinerary', 'included', 'excluded']);
  for (const [k, v] of Object.entries(p)) {
    if (skip.has(k)) continue;
    const el = f.elements[k];
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = Boolean(v);
    else el.value = Array.isArray(v) ? v.join('\n') : (v ?? '');
  }
  // hidden arrays
  for (const k of ['highlights', 'itinerary', 'included', 'excluded']) {
    const el = f.elements[k];
    if (el && Array.isArray(p[k])) el.value = p[k].join('\n');
  }
  f.elements.id.value = p.id || '';

  // Sub-objects
  const fl = p.flight_details || {}, rm = p.room_details || {};
  const sub = {
    flight_included: fl.included, flight_airline: fl.airline, flight_cabin: fl.cabin,
    flight_from: fl.from, flight_to: fl.to, flight_baggage: fl.baggage,
    hotel_included: rm.included, hotel_name: rm.name, hotel_city: rm.city,
    hotel_category: rm.category, hotel_room_type: rm.room_type, hotel_rooms: rm.rooms, hotel_meals: rm.meals
  };
  for (const [k, v] of Object.entries(sub)) {
    const el = f.elements[k]; if (!el) continue;
    if (el.type === 'checkbox') el.checked = Boolean(v); else el.value = v ?? '';
  }

  // Load gallery
  const raw = p.gallery;
  if (Array.isArray(raw) && raw.length) {
    galleryImages = raw.map((src, i) => ({ src: String(src), primary: i === 0 }));
    if (p.image_url && p.image_url !== raw[0]) {
      const exists = galleryImages.find(g => g.src === p.image_url);
      if (!exists) galleryImages.unshift({ src: p.image_url, primary: true });
      else { galleryImages.forEach(g => g.primary = false); exists.primary = true; }
    }
  } else if (p.image_url) {
    galleryImages = [{ src: p.image_url, primary: true }];
  } else {
    galleryImages = [];
  }
  renderGallery();
  toggleType();
  updateLivePreview();
  log(`Editing: ${p.name}`);
  scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Render package list ─────────────────────────────────── */
function render() {
  const h = $('#admin-package-list');
  if (!h) return;
  h.innerHTML = items.length
    ? items.map(p => {
      const imgs = Array.isArray(p.gallery) ? p.gallery : [];
      const cover = p.image_url || imgs[0] || 'assets/images/island-beach.jpg';
      return `<article class="admin-pkg-card">
        <img src="${esc(cover)}" alt="${esc(p.name)}"
          onerror="this.src='assets/images/island-beach.jpg'" loading="lazy">
        <div class="admin-pkg-info">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
            <span class="${p.active ? 'status' : 'status pending'}">${p.active ? 'Live' : 'Hidden'}</span>
            <small class="kicker">${p.package_type === 'international' ? '✈ International' : '🏔 Domestic'}</small>
            ${imgs.length > 1 ? `<small class="kicker" style="color:var(--green)">🖼 ${imgs.length} photos</small>` : ''}
          </div>
          <h3>${esc(p.name)}</h3>
          <p>${[p.region, p.duration, p.price].filter(Boolean).join(' · ')}</p>
          ${p.summary ? `<p style="font-size:12px;color:#64716d;margin-top:4px">${esc(p.summary.slice(0, 100))}${p.summary.length > 100 ? '…' : ''}</p>` : ''}
        </div>
        <div class="admin-pkg-actions">
          <button data-edit="${p.id}" class="btn btn-small btn-outline">
            <i class="hgi-stroke hgi-edit-01"></i> Edit
          </button>
          <button data-toggle="${p.id}" data-active="${p.active}" class="btn btn-small btn-outline" title="${p.active ? 'Hide' : 'Publish'}">
            <i class="hgi-stroke hgi-${p.active ? 'eye-off' : 'eye'}"></i> ${p.active ? 'Hide' : 'Publish'}
          </button>
          <button data-dup="${p.id}" class="btn btn-small btn-outline" title="Duplicate">
            <i class="hgi-stroke hgi-copy-01"></i>
          </button>
          <button data-delete="${p.id}" class="btn btn-small danger-button">
            <i class="hgi-stroke hgi-delete-02"></i> Delete
          </button>
        </div>
      </article>`;
    }).join('')
    : '<div class="community-empty">No packages yet. Use the form to publish your first one.</div>';

  h.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
    const p = items.find(x => x.id === b.dataset.edit);
    if (p) fill(p);
  });
  h.querySelectorAll('[data-toggle]').forEach(b => b.onclick = async () => {
    const id = b.dataset.toggle, nowActive = b.dataset.active === 'true';
    const p = items.find(x => x.id === id); if (!p) return;
    b.disabled = true;
    try {
      const r = await fetch('/api/packages?id=' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify({
          ...p, active: !nowActive,
          highlights: Array.isArray(p.highlights) ? p.highlights : [],
          itinerary: Array.isArray(p.itinerary) ? p.itinerary : [],
          included: Array.isArray(p.included) ? p.included : [],
          excluded: Array.isArray(p.excluded) ? p.excluded : [],
          gallery: Array.isArray(p.gallery) ? p.gallery : []
        })
      });
      if (!r.ok) throw new Error((await r.json()).error);
      p.active = !nowActive;
      log(`${p.active ? 'Published' : 'Hidden'}: ${p.name}`);
      render();
    } catch (err) { alert('Toggle failed: ' + err.message); }
    finally { b.disabled = false; }
  });
  h.querySelectorAll('[data-dup]').forEach(b => b.onclick = () => {
    const p = items.find(x => x.id === b.dataset.dup); if (!p) return;
    fill({ ...p, id: '', name: p.name + ' (copy)', slug: p.slug + '-copy', active: false });
    log('Duplicating: ' + p.name);
  });
  h.querySelectorAll('[data-delete]').forEach(b => b.onclick = async () => {
    const p = items.find(x => x.id === b.dataset.delete);
    if (!confirm(`Delete "${p?.name || 'this package'}" permanently?`)) return;
    b.disabled = true;
    try {
      const r = await fetch('/api/packages?id=' + b.dataset.delete, { method: 'DELETE', headers: auth() });
      if (!r.ok) throw new Error((await r.json()).error);
      log('Deleted: ' + (p?.name || b.dataset.delete));
      load();
    } catch (err) { alert('Delete failed: ' + err.message); b.disabled = false; }
  });
}

/* ── Load packages ───────────────────────────────────────── */
async function safeJson(r) {
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error('Server error (' + r.status + '): ' + (await r.text()).slice(0, 200).replace(/<[^>]+>/g, '').trim());
  }
  return r.json();
}

async function load() {
  if (!token()) { $('#package-login')?.showModal(); return; }
  const list = $('#admin-package-list');
  if (list) list.innerHTML = '<div class="community-empty">Loading packages…</div>';
  try {
    const r = await fetch('/api/packages?admin=1', { headers: auth() });
    const d = await safeJson(r);
    if (r.status === 401) { localStorage.removeItem('bahadur-admin-token'); $('#package-login')?.showModal(); return; }
    if (!r.ok) throw new Error(d.error);
    items = d.packages || [];
    render();
    const live = items.filter(x => x.active).length;
    const state = $('#package-state');
    if (state) state.textContent = `${items.length} packages · ${live} live`;
    log(`Loaded ${items.length} packages (${live} live)`);
  } catch (err) {
    const list = $('#admin-package-list');
    if (list) list.innerHTML = `<div class="community-empty" style="color:#c0392b">
      <strong>Cannot load packages</strong><br>${esc(err.message)}<br>
      <small>Make sure DATABASE_URL is set in Vercel → Settings → Environment Variables.</small>
    </div>`;
  }
}

/* ── Form submit ─────────────────────────────────────────── */
$('#package-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target, fd = new FormData(f), d = Object.fromEntries(fd);
  const id = d.id;
  const btn = f.querySelector('[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  const state = $('#package-state'); if (state) state.textContent = '';

  d.active = f.elements.active.checked;
  for (const k of ['highlights', 'itinerary', 'included', 'excluded']) d[k] = lines(d[k]);

  // Gallery
  d.gallery = galleryImages.map(g => g.src);
  const primary = galleryImages.find(g => g.primary) || galleryImages[0];
  if (primary) d.image_url = primary.src;

  d.flight_details = {
    included: f.elements.flight_included?.checked, airline: d.flight_airline,
    cabin: d.flight_cabin, from: d.flight_from, to: d.flight_to, baggage: d.flight_baggage
  };
  d.room_details = {
    included: f.elements.hotel_included?.checked, name: d.hotel_name, city: d.hotel_city,
    category: d.hotel_category, room_type: d.hotel_room_type,
    rooms: Number(d.hotel_rooms) || 1, meals: d.hotel_meals
  };
  for (const k of ['id', 'gallery_json', 'flight_included', 'flight_airline', 'flight_cabin',
    'flight_from', 'flight_to', 'flight_baggage', 'hotel_included', 'hotel_name', 'hotel_city',
    'hotel_category', 'hotel_room_type', 'hotel_rooms', 'hotel_meals']) delete d[k];

  try {
    const r = await fetch('/api/packages' + (id ? '?id=' + id : ''), {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify(d)
    });
    const out = await safeJson(r);
    if (!r.ok) throw new Error(out.error || 'Save failed');

    if (state) state.textContent = id ? '✅ Package updated.' : '✅ Package published.';
    log((id ? 'Updated' : 'Published') + ': ' + d.name);

    f.reset(); f.elements.id.value = ''; f.elements.active.checked = true;
    galleryImages = []; renderGallery(); updateLivePreview(); toggleType();
    load();
  } catch (err) {
    if (state) state.textContent = '⚠️ ' + err.message;
    log('Save error: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save package'; }
  }
};

/* ── Reset button ────────────────────────────────────────── */
$('#package-reset')?.addEventListener('click', () => {
  $('#package-form').reset();
  $('#package-form').elements.id.value = '';
  galleryImages = []; renderGallery(); updateLivePreview();
  toggleType();
  const state = $('#package-state'); if (state) state.textContent = '';
  log('Form cleared');
});

/* ── Slug auto-gen ───────────────────────────────────────── */
$('[name="name"]')?.addEventListener('input', e => {
  const slugEl = $('[name="slug"]');
  if (!slugEl || slugEl.dataset.manualEdit) return;
  slugEl.value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  updateLivePreview();
});
$('[name="slug"]')?.addEventListener('input', () => { $('[name="slug"]').dataset.manualEdit = '1'; });

/* ── Type toggle ─────────────────────────────────────────── */
function toggleType() {
  const t = $('#package-type')?.value;
  $('#package-flight-fields')?.classList.toggle('show', t === 'international');
}
$('#package-type')?.addEventListener('change', () => { toggleType(); updateLivePreview(); });

/* ── Gallery upload input ────────────────────────────────── */
$('#gallery-upload-input')?.addEventListener('change', async e => {
  await handleFileUpload(e.target.files);
  e.target.value = '';
});

/* ── Primary image upload ────────────────────────────────── */
$('#primary-upload-input')?.addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  const state = $('#package-state');
  if (state) state.textContent = 'Compressing image…';
  try {
    const src = await compress(file, 1400, 0.82);
    // Set as first gallery image and mark primary
    const existing = galleryImages.find(g => g.primary);
    if (existing) existing.src = src;
    else galleryImages.unshift({ src, primary: true });
    $('[name="image_url"]').value = src;
    renderGallery();
    if (state) state.textContent = 'Primary image ready.';
    log('Primary image uploaded');
  } catch (err) { if (state) state.textContent = 'Image error: ' + err.message; }
  e.target.value = '';
});

/* ── Live preview live updates ───────────────────────────── */
document.querySelectorAll('#package-form input, #package-form textarea, #package-form select').forEach(el => {
  el.addEventListener('input', updateLivePreview);
  el.addEventListener('change', updateLivePreview);
});

/* ── Ctrl+S shortcut ─────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    $('[type="submit"]')?.click();
  }
});

/* ── Login ───────────────────────────────────────────────── */
$('#package-login-form')?.addEventListener('submit', e => {
  e.preventDefault();
  localStorage.setItem('bahadur-admin-token', $('#package-token').value.trim());
  $('#package-login').close();
  load();
});
$('#package-refresh')?.addEventListener('click', load);

/* ── Init ────────────────────────────────────────────────── */
toggleType();
renderGallery();
updateLivePreview();
load();