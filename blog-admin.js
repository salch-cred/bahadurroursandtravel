import { boot, api, esc, $, toast, confirmBox, dialog, pill } from './admin-ui.js';

let rows = [];
await boot({ page: 'blog', title: 'Travel guides', subtitle: 'Articles on your website', actions: '<button class="btn primary" id="add"><i class="hgi-stroke hgi-add-01"></i>New guide</button>' });
$('main.ad-main').innerHTML = '<div class="tile-grid" id="grid"></div>';

function render() {
  $('#grid').innerHTML = rows.length ? rows.map((p) => `<article class="tile"><img src="${esc(p.image_url || 'assets/images/explorer/turquoise-lagoon.jpg')}" alt="" loading="lazy"><div class="b"><strong>${esc(p.title)}</strong><small>${esc(p.category || '')}</small></div><div class="f">${pill(p.status)}<button class="btn sm" data-edit="${p.id}">Edit</button><a class="btn sm icon" href="blog.html?slug=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener" title="View"><i class="hgi-stroke hgi-view"></i></a><button class="btn sm icon danger" data-del="${p.id}" title="Delete"><i class="hgi-stroke hgi-delete-02"></i></button></div></article>`).join('') : '<div class="empty" style="grid-column:1/-1"><i class="hgi-stroke hgi-document-validation"></i>Write your first guide to help travellers find you.</div>';
}
async function load() { rows = (await api('blog?admin=1')).posts; render(); }

function editor(post) {
  const p = post || { status: 'published', category: 'Travel Guide' };
  const dlg = dialog({
    title: post ? 'Edit guide' : 'New guide', wide: true,
    body: `<form id="f" class="form-grid">
      <label class="field full"><span>Title</span><input name="title" required value="${esc(p.title ?? '')}"></label>
      <label class="field"><span>Web address</span><input name="slug" value="${esc(p.slug ?? '')}" placeholder="Made from the title"></label>
      <label class="field"><span>Category</span><input name="category" value="${esc(p.category ?? '')}"></label>
      <label class="field full"><span>Cover image link</span><input name="image_url" value="${esc(p.image_url ?? '')}"></label>
      <label class="field full"><span>Short intro</span><textarea name="excerpt" rows="2">${esc(p.excerpt ?? '')}</textarea></label>
      <label class="field full"><span>Article</span><textarea name="content" rows="12" required>${esc(p.content ?? '')}</textarea></label>
      <label class="field"><span>Status</span><select name="status"><option value="published"${p.status === 'published' ? ' selected' : ''}>Published</option><option value="draft"${p.status === 'draft' ? ' selected' : ''}>Draft</option></select></label>
    </form>`,
    footer: '<button class="btn" data-c>Cancel</button><button class="btn primary" data-ok>Save guide</button>',
  });
  $('[data-c]', dlg.el).onclick = dlg.close;
  $('[data-ok]', dlg.el).onclick = async () => {
    const f = $('#f', dlg.el);
    if (!f.reportValidity()) return;
    try {
      await api(post ? `blog?id=${post.id}` : 'blog', { method: post ? 'PUT' : 'POST', body: Object.fromEntries(new FormData(f)) });
      dlg.close(); toast('Guide saved', 'good'); await load();
    } catch (e) { toast(e.message, 'bad'); }
  };
}
$('#add').onclick = () => editor();
$('#grid').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  try {
    if (t.dataset.edit) editor(rows.find((x) => x.id === t.dataset.edit));
    if (t.dataset.del) {
      if (!(await confirmBox('Delete this guide?', 'It will be removed from the website.', 'Delete', true))) return;
      await api(`blog?id=${t.dataset.del}`, { method: 'DELETE' }); toast('Deleted'); await load();
    }
  } catch (err) { toast(err.message, 'bad'); }
});
load().catch((e) => toast(e.message, 'bad'));
