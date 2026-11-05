import { boot, api, esc, $, pill, toast, confirmBox, setBadge } from './admin-ui.js';

let rows = [], filter = 'pending';
await boot({ page: 'reviews', title: 'Reviews', subtitle: 'Approve what guests can see on the website' });

$('main.ad-main').innerHTML = `<div class="grid g-4" id="stats"></div><section class="card mt"><div class="card-head"><div class="tabs" id="tabs"></div></div><div class="table-wrap"><table class="t"><thead><tr><th>Guest</th><th>Review</th><th>Rating</th><th>Booking</th><th>Status</th><th></th></tr></thead><tbody id="rows"></tbody></table></div></section>`;

function render() {
  const count = (s) => rows.filter((r) => r.status === s).length;
  const approved = rows.filter((r) => r.status === 'approved');
  $('#stats').innerHTML = `<div class="stat hero"><small>Average rating</small><strong>${approved.length ? (approved.reduce((s, r) => s + Number(r.rating), 0) / approved.length).toFixed(1) : '—'}</strong><span>From approved reviews</span></div><div class="stat warn"><small>Waiting</small><strong>${count('pending')}</strong><span>Need a decision</span></div><div class="stat good"><small>Approved</small><strong>${count('approved')}</strong><span>On the website</span></div><div class="stat"><small>Rejected</small><strong>${count('rejected')}</strong><span>Hidden</span></div>`;
  $('#tabs').innerHTML = [['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']].map(([k, l]) => `<button data-f="${k}" class="${k === filter ? 'active' : ''}">${l}</button>`).join('');
  const list = rows.filter((r) => filter === 'all' || r.status === filter);
  $('#rows').innerHTML = list.length ? list.map((r) => `<tr>
    <td><strong>${esc(r.name)}</strong><small>${esc(r.trip)}</small><small>${new Date(r.created_at).toLocaleDateString('en-IN')}</small></td>
    <td style="max-width:420px">${esc(r.text)}${r.media_url ? `<small><a href="${esc(r.media_url)}" target="_blank" rel="noopener" style="color:var(--sky-700)">View ${esc(r.media_type || 'media')}</a></small>` : ''}</td>
    <td class="nowrap" style="color:var(--gold)">${'★'.repeat(Number(r.rating) || 0)}</td><td class="nowrap">${esc(r.booking_ref || '—')}</td><td>${pill(r.status)}</td>
    <td><div class="actions">${r.status !== 'approved' ? `<button class="btn sm" data-st="approved" data-id="${r.id}">Approve</button>` : ''}${r.status !== 'rejected' ? `<button class="btn sm" data-st="rejected" data-id="${r.id}">Reject</button>` : ''}<button class="btn sm icon danger" data-del="${r.id}" title="Delete"><i class="hgi-stroke hgi-delete-02"></i></button></div></td></tr>`).join('') : '<tr><td colspan="6"><div class="empty"><i class="hgi-stroke hgi-star"></i>Nothing here.</div></td></tr>';
  setBadge('reviews', count('pending'));
}
async function load() { rows = (await api('reviews?admin=1&limit=200')).reviews; render(); }
$('main.ad-main').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  try {
    if (t.dataset.f) { filter = t.dataset.f; render(); }
    if (t.dataset.st) { await api(`reviews?id=${t.dataset.id}`, { method: 'PATCH', body: { status: t.dataset.st } }); toast('Review updated', 'good'); await load(); }
    if (t.dataset.del) {
      if (!(await confirmBox('Delete this review?', 'It will be removed permanently.', 'Delete', true))) return;
      await api(`reviews?id=${t.dataset.del}`, { method: 'DELETE' }); toast('Deleted'); await load();
    }
  } catch (err) { toast(err.message, 'bad'); }
});
load().catch((e) => toast(e.message, 'bad'));
