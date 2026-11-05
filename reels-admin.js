import { boot, api, esc, $, toast, confirmBox } from './admin-ui.js';

let rows = [], file = null;
await boot({ page: 'reels', title: 'Reels', subtitle: 'Short videos on the home page' });

$('main.ad-main').innerHTML = `
  <section class="card"><div class="card-head"><h3>Add a reel</h3><small>Vertical MP4 works best</small></div><div class="card-body">
    <label class="drop" style="display:block"><i class="hgi-stroke hgi-upload-04"></i> <span id="fname">Choose a video</span><input type="file" id="file" accept="video/mp4,video/webm,video/quicktime" hidden></label>
    <div class="form-grid mt"><label class="field"><span>Title</span><input id="title"></label><label class="check" style="align-self:end"><input type="checkbox" id="active" checked> Show on the website</label></div>
    <div class="meter mt" hidden id="prog-wrap"><span id="prog" style="width:0"></span></div>
    <button class="btn primary mt" id="go" disabled>Upload reel</button>
  </div></section>
  <div class="tile-grid mt" id="grid"></div>`;

function render() {
  $('#grid').innerHTML = rows.length ? rows.map((r) => `<article class="tile"><video src="${esc(r.video_url)}" controls preload="metadata" style="aspect-ratio:9/12"></video><div class="b"><strong>${esc(r.title || 'Untitled reel')}</strong></div><div class="f"><span class="pill ${r.active ? 'active' : 'draft'}">${r.active ? 'Live' : 'Hidden'}</span><button class="btn sm" data-toggle="${r.id}">${r.active ? 'Hide' : 'Show'}</button><button class="btn sm icon danger" data-del="${r.id}" title="Delete"><i class="hgi-stroke hgi-delete-02"></i></button></div></article>`).join('') : '<div class="empty" style="grid-column:1/-1"><i class="hgi-stroke hgi-video-01"></i>No reels yet.</div>';
}
async function load() { rows = (await api('media?type=reels&admin=1')).reels; render(); }

$('#file').onchange = (e) => { file = e.target.files[0] || null; $('#fname').textContent = file ? file.name : 'Choose a video'; $('#go').disabled = !file; };
$('#go').onclick = async () => {
  const btn = $('#go');
  btn.disabled = true;
  $('#prog-wrap').hidden = false;
  try {
    // Loaded only when needed, so the reel list still works if this ever fails
    const { upload } = await import('./assets/vendor/blob-client.js');
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    // Uploads straight from the browser to Vercel Blob, so large files skip the 4.5 MB function limit
    const blob = await upload(`reels/${Date.now()}-${safe}`, file, {
      access: 'public', handleUploadUrl: '/api/upload-media',
      clientPayload: JSON.stringify({ adminToken: localStorage.getItem('bahadur-admin-token') || '' }),
      onUploadProgress: ({ percentage }) => { $('#prog').style.width = percentage + '%'; },
    });
    await api('media?type=reels', { method: 'POST', body: { video_url: blob.url, title: $('#title').value, active: $('#active').checked } });
    toast('Reel added', 'good');
    file = null; $('#fname').textContent = 'Choose a video'; $('#title').value = '';
    await load();
  } catch (e) { toast(e.message, 'bad'); btn.disabled = false; }
  $('#prog-wrap').hidden = true;
};
$('#grid').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  try {
    if (t.dataset.toggle) { const r = rows.find((x) => x.id === t.dataset.toggle); await api(`media?type=reels&id=${r.id}`, { method: 'PUT', body: { active: !r.active } }); await load(); }
    if (t.dataset.del) {
      if (!(await confirmBox('Delete this reel?', 'It will leave the home page.', 'Delete', true))) return;
      await api(`media?type=reels&id=${t.dataset.del}`, { method: 'DELETE' }); toast('Deleted'); await load();
    }
  } catch (err) { toast(err.message, 'bad'); }
});
load().catch((e) => toast(e.message, 'bad'));
