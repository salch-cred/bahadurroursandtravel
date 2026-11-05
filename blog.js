const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const when = (v) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
const wanted = new URLSearchParams(location.search).get('slug') || location.hash.slice(1);

function showPost(p) {
  document.title = `${p.title} — Bahadur Tours and Travels`;
  $('#blog-title').textContent = p.title;
  $('#blog-title').setAttribute('aria-label', p.title);
  $('#blog-sub').textContent = `${p.category || 'Travel guide'} · ${when(p.created_at)}`;
  $('#blog-body').innerHTML = `<article class="article">${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : ''}${String(p.content || '').split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, '<br>')}</p>`).join('')}<a class="link-arrow" href="blog.html"><i class="hgi-stroke hgi-arrow-left-01"></i> All guides</a></article>`;
}

(async () => {
  const host = $('#blog-body');
  try {
    if (wanted) {
      const res = await fetch(`/api/blog?slug=${encodeURIComponent(wanted)}`);
      if (res.ok) { showPost((await res.json()).post); return; }
    }
    const { posts = [] } = await (await fetch('/api/blog')).json();
    host.innerHTML = posts.length
      ? `<div class="guide-grid">${posts.map((p) => `<a class="guide" href="blog.html?slug=${encodeURIComponent(p.slug)}"><img src="${esc(p.image_url || 'assets/images/island-beach.jpg')}" alt="" loading="lazy"><div><small>${esc(p.category || 'Travel guide')}</small><h3>${esc(p.title)}</h3><p>${esc(p.excerpt || '')}</p></div></a>`).join('')}</div>`
      : '<div class="empty-state"><h3>Guides are on the way</h3><p>Our team is writing them now.</p></div>';
  } catch {
    host.innerHTML = '<div class="empty-state">Could not load guides right now.</div>';
  }
})();
