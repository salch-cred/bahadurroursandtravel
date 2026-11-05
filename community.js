const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const empty = (text) => `<div class="empty-state">${esc(text)}</div>`;

function render({ reviews = [], photos = [], videos = [] }) {
  $('#community-reviews').innerHTML = reviews.length ? reviews.map((r) => `<article class="rv-card"><div class="stars">${'★'.repeat(Math.max(1, Math.min(5, Number(r.rating) || 5)))}</div><blockquote>${esc(r.text)}</blockquote><footer><b>${esc(r.name)}</b>${esc(r.trip)}</footer></article>`).join('') : empty('Be the first verified guest to share a story.');
  $('#community-photos').innerHTML = photos.length ? photos.map((p) => `<figure><button type="button" data-zoom="${esc(p.url)}" data-alt="${esc(p.caption || p.trip)}" aria-label="Open photo"><img src="${esc(p.url)}" alt="${esc(p.caption || p.trip)}" loading="lazy"></button><figcaption><b>${esc(p.trip)}</b>${esc(p.guest_name || 'Bahadur guest')}</figcaption></figure>`).join('') : empty('Approved guest photos will appear here.');
  const videoSection = $('#videos');
  videoSection.hidden = !videos.length;
  $('#community-videos').innerHTML = videos.map((v) => `<figure><video controls preload="metadata" playsinline><source src="${esc(v.url)}" type="${esc(v.mime_type || 'video/mp4')}"></video></figure>`).join('');
}

(async () => {
  try {
    const res = await fetch('/api/community');
    const data = await res.json();
    if (!res.ok) throw new Error();
    render(data);
  } catch { render({}); }
})();

// Photos are shrunk in the browser so they stay under the 4.5 MB request limit
function shrink(file, maxW = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = () => reject(new Error('Could not read that photo'));
    img.src = URL.createObjectURL(file);
  });
}

$('#community-review-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target, state = $('#community-form-state'), btn = form.querySelector('button[type=submit]');
  state.textContent = 'Sending…';
  btn.disabled = true;
  const data = Object.fromEntries(new FormData(form));
  const photo = form.elements.photo.files[0];
  delete data.photo;
  data.consent = Boolean(data.consent);
  try {
    if (photo) Object.assign(data, { data: await shrink(photo), mimeType: 'image/jpeg', fileName: photo.name.replace(/\.[^.]+$/, '') + '.jpg' });
    const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not submit');
    state.textContent = result.status === 'approved' ? 'Thank you! Your review is now live.' : 'Thank you. Your review is waiting for a quick check.';
    form.reset();
  } catch (error) {
    state.textContent = error.message;
  }
  btn.disabled = false;
});
