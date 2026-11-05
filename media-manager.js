import { boot, api, esc, $, pill, toast, confirmBox } from './admin-ui.js';

let rows = [], filter = 'all', queue = [];
await boot({ page: 'media', title: 'Guest media', subtitle: 'Photos and videos for the guest stories page' });

$('main.ad-main').innerHTML = `
  <section class="card"><div class="card-head"><h3>Upload</h3><small>Up to 4 MB per file. Use Reels for longer video.</small></div><div class="card-body">
    <label class="drop" style="display:block"><i class="hgi-stroke hgi-upload-04"></i> Choose photos or videos<input type="file" id="files" multiple accept="image/*,video/mp4,video/webm" hidden></label>
    <p id="queue" style="color:var(--muted);font-size:13px;margin:8px 0"></p>
    <div class="form-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      <label class="field"><span>Guest name</span><input id="m-guest"></label><label class="field"><span>Journey</span><input id="m-trip"></label><label class="field"><span>Caption</span><input id="m-caption"></label>
      <label class="field"><span>Publish</span><select id="m-status"><option value="approved">Publish now</option><option value="pending">Keep for review</option></select></label>
    </div>
    <button class="btn primary mt" id="upload" disabled>Upload files</button>
  </div></section>
  <section class="card mt"><div class="card-head"><div class="tabs" id="tabs"></div></div><div class="card-body"><div class="tile-grid" id="grid"></div></div></section>`;

const toBase64 = (file) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1]); r.onerror = reject; r.readAsDataURL(file); });

function render() {
  $('#tabs').innerHTML = [['all', 'All'], ['pending', 'Waiting'], ['approved', 'Published'], ['rejected', 'Rejected']].map(([k, l]) => `<button data-f="${k}" class="${k === filter ? 'active' : ''}">${l}</button>`).join('');
  $('#grid').innerHTML = rows.length ? rows.map((m) => `<article class="tile">${m.type === 'video' ? `<video src="${esc(m.url)}" controls preload="metadata"></video>` : `<img src="${esc(m.url)}" alt="${esc(m.caption || '')}" loading="lazy">`}<div class="b"><strong>${esc(m.guest_name || 'Guest')}</strong><small>${esc([m.trip, m.caption].filter(Boolean).join(' · '))}</small></div><div class="f">${pill(m.status)}${m.status !== 'approved' ? `<button class="btn sm" data-st="approved" data-id="${m.id}">Publish</button>` : `<button class="btn sm" data-st="rejected" data-id="${m.id}">Hide</button>`}<button class="btn sm icon danger" data-del="${m.id}" title="Delete"><i class="hgi-stroke hgi-delete-02"></i></button></div></article>`).join('') : '<div class="empty" style="grid-column:1/-1"><i class="hgi-stroke hgi-image-01"></i>No media here.</div>';
}
async function load() { rows = (await api(filter === 'all' ? 'media' : `media?status=${filter}`)).media; render(); }

$('#files').onchange = (e) => {
  queue = [...e.target.files].filter((f) => { if (f.size > 4 * 1024 * 1024) { toast(`${f.name} is over 4 MB`, 'bad'); return false; } return true; });
  $('#queue').textContent = queue.length ? `${queue.length} file${queue.length > 1 ? 's' : ''} ready: ${queue.map((f) => f.name).join(', ')}` : '';
  $('#upload').disabled = !queue.length;
};
$('#upload').onclick = async () => {
  const btn = $('#upload');
  btn.disabled = true;
  let done = 0;
  for (const file of queue) {
    try {
      await api('media', { method: 'POST', body: { files: [{ data: await toBase64(file), fileName: file.name, mimeType: file.type }], guestName: $('#m-guest').value || 'Guest', trip: $('#m-trip').value, caption: $('#m-caption').value, status: $('#m-status').value, consent: true } });
      done += 1;
    } catch (e) { toast(`${file.name}: ${e.message}`, 'bad'); }
  }
  toast(`${done} uploaded`, 'good');
  queue = [];
  $('#queue').textContent = '';
  await load();
};
$('main.ad-main').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  try {
    if (t.dataset.f) { filter = t.dataset.f; await load(); }
    if (t.dataset.st) { await api(`media?id=${t.dataset.id}`, { method: 'PATCH', body: { status: t.dataset.st } }); toast('Updated', 'good'); await load(); }
    if (t.dataset.del) {
      if (!(await confirmBox('Delete this file?', 'It will be removed permanently.', 'Delete', true))) return;
      await api(`media?id=${t.dataset.del}`, { method: 'DELETE' }); toast('Deleted'); await load();
    }
  } catch (err) { toast(err.message, 'bad'); }
});
load().catch((e) => toast(e.message, 'bad'));
