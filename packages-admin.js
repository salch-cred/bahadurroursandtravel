import { boot, api, esc, $, toast, confirmBox, dialog, debounce, compressImage } from './admin-ui.js';

let rows = [], filter = 'all';

await boot({
  page: 'packages', title: 'Packages', subtitle: 'Everything here shows on the website',
  actions: '<button class="btn primary" id="add"><i class="hgi-stroke hgi-add-01"></i>New package</button>',
});

$('main.ad-main').innerHTML = `
  <div class="grid g-4" id="stats"></div>
  <section class="card mt">
    <div class="card-head"><div class="tabs" id="tabs"></div><span class="sp"></span><label class="search"><i class="hgi-stroke hgi-search-01"></i><input id="q" placeholder="Search packages" aria-label="Search"></label></div>
    <div class="card-body"><div class="tile-grid" id="grid"></div></div>
  </section>`;

const TYPES = [['domestic', 'India'], ['international', 'International'], ['pilgrimage', 'Pilgrimage'], ['transport', 'Vehicle hire']];
const slugify = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const asList = (v) => { if (Array.isArray(v)) return v; if (typeof v === 'string' && v) { try { const j = JSON.parse(v); return Array.isArray(j) ? j : []; } catch { return v.split('\n').filter(Boolean); } } return []; };
const lineOf = (x) => (typeof x === 'string' ? x : [x.title, x.description || x.detail].filter(Boolean).join(': '));
const parseLines = (v) => String(v || '').split('\n').map((x) => x.trim()).filter(Boolean);

function render() {
  const q = $('#q').value.trim().toLowerCase();
  $('#stats').innerHTML = `
    <div class="stat hero"><small>Live on website</small><strong>${rows.filter((p) => p.active !== false).length}</strong><span>${rows.length} in total</span></div>
    ${TYPES.slice(0, 3).map(([k, l]) => `<div class="stat"><small>${l}</small><strong>${rows.filter((p) => (p.package_type || 'domestic') === k).length}</strong><span>Packages</span></div>`).join('')}`;
  $('#tabs').innerHTML = [['all', 'All'], ...TYPES].map(([k, l]) => `<button data-f="${k}" class="${k === filter ? 'active' : ''}">${l}</button>`).join('');
  const list = rows.filter((p) => (filter === 'all' || (p.package_type || 'domestic') === filter) && (!q || `${p.name} ${p.region}`.toLowerCase().includes(q)));
  $('#grid').innerHTML = list.length ? list.map((p) => `<article class="tile">
    <img src="${esc(p.image_url || 'assets/images/island-beach.jpg')}" alt="${esc(p.name)}" loading="lazy">
    <div class="b"><strong>${esc(p.name)}</strong><small>${esc([p.region, p.duration].filter(Boolean).join(' · '))}</small><small>${esc(p.price || 'Custom quote')}</small></div>
    <div class="f">
      <span class="pill ${p.active === false ? 'draft' : 'active'}">${p.active === false ? 'Hidden' : 'Live'}</span>
      <button class="btn sm" data-edit="${p.id}">Edit</button>
      <a class="btn sm icon" href="package.html?slug=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener" title="View"><i class="hgi-stroke hgi-view"></i></a>
      <a class="btn sm icon" href="itinerary-print.html?slug=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener" title="Print itinerary"><i class="hgi-stroke hgi-printer"></i></a>
      <button class="btn sm icon" data-toggle="${p.id}" title="${p.active === false ? 'Show on website' : 'Hide from website'}"><i class="hgi-stroke hgi-${p.active === false ? 'view-off' : 'view'}"></i></button>
      <button class="btn sm icon danger" data-del="${p.id}" title="Delete"><i class="hgi-stroke hgi-delete-02"></i></button>
    </div></article>`).join('') : '<div class="empty" style="grid-column:1/-1"><i class="hgi-stroke hgi-layers-01"></i>No packages found.</div>';
}

async function load() {
  rows = (await api('packages?admin=1')).packages;
  render();
}

function thumbs(host, list) {
  host.innerHTML = list.map((src, i) => `<div class="thumb"><img src="${esc(src)}" alt=""><button type="button" data-i="${i}" aria-label="Remove image">×</button>${i === 0 ? '<span class="cover">Cover</span>' : ''}</div>`).join('');
}

function editor(pkg) {
  const p = pkg || { active: true, package_type: 'domestic', price: 'Custom quote' };
  const flight = p.flight_details || {}, room = p.room_details || {};
  const images = [p.image_url, ...asList(p.gallery)].filter((x, i, a) => x && a.indexOf(x) === i);
  const area = (name, label, value, hint) => `<label class="field full"><span>${label}${hint ? ` <small style="font-weight:400;color:var(--faint)">${hint}</small>` : ''}</span><textarea name="${name}" rows="4">${esc(value)}</textarea></label>`;
  const dlg = dialog({
    title: pkg ? `Edit ${p.name}` : 'New package', wide: true,
    body: `<form id="pf" class="form-grid">
      <label class="field"><span>Package name</span><input name="name" required value="${esc(p.name ?? '')}"></label>
      <label class="field"><span>Web address</span><input name="slug" required value="${esc(p.slug ?? '')}"></label>
      <label class="field"><span>Type</span><select name="package_type">${TYPES.map(([k, l]) => `<option value="${k}"${k === p.package_type ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Category</span><input name="category" value="${esc(p.category ?? '')}" placeholder="Lakshadweep, Honeymoon, Family"></label>
      <label class="field"><span>Region</span><input name="region" value="${esc(p.region ?? '')}"></label>
      <label class="field"><span>Duration</span><input name="duration" value="${esc(p.duration ?? '')}" placeholder="4 days · 3 nights"></label>
      <label class="field"><span>Price shown</span><input name="price" value="${esc(p.price ?? '')}" placeholder="₹24,999 per person"></label>
      <label class="field"><span>Price for billing ₹</span><input name="package_price" type="number" min="0" step="1" value="${esc(p.package_price ?? '')}"></label>
      <label class="field full"><span>Short summary</span><textarea name="summary" rows="2">${esc(p.summary ?? '')}</textarea></label>
      <label class="field full"><span>Full description</span><textarea name="description" rows="4">${esc(p.description ?? '')}</textarea></label>
      <div class="full"><span class="lbl">Photos</span><div class="thumbs" id="pthumbs" style="margin:6px 0"></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap"><label class="btn sm"><i class="hgi-stroke hgi-upload-04"></i>Upload<input type="file" id="pfile" accept="image/*" multiple hidden></label><input id="purl" placeholder="Or paste an image link" style="flex:1;min-width:180px"><button type="button" class="btn sm" id="padd">Add link</button></div></div>
      ${area('highlights', 'Highlights', asList(p.highlights).map(lineOf).join('\n'), 'one per line')}
      ${area('itinerary', 'Day by day itinerary', asList(p.itinerary).map(lineOf).join('\n'), 'one day per line. Use “Title: details”')}
      ${area('included', 'Included', asList(p.included).map(lineOf).join('\n'), 'one per line')}
      ${area('excluded', 'Not included', asList(p.excluded).map(lineOf).join('\n'), 'one per line')}
      ${area('faqs', 'Questions and answers', asList(p.faqs).map((f) => `${f.q} | ${f.a}`).join('\n'), 'one per line. Use “Question | Answer”')}
      <label class="field full"><span>Package terms</span><textarea name="terms" rows="2">${esc(p.terms ?? '')}</textarea></label>
      <label class="field"><span>Map latitude</span><input name="latitude" type="number" step="any" value="${esc(p.latitude ?? '')}"></label>
      <label class="field"><span>Map longitude</span><input name="longitude" type="number" step="any" value="${esc(p.longitude ?? '')}"></label>
      <fieldset class="full" style="border:1px solid var(--line);border-radius:10px;padding:10px 12px"><legend class="lbl"><label class="check"><input type="checkbox" name="flight_included"${flight.included ? ' checked' : ''}> Flight details</label></legend><div class="form-grid">
        <label class="field"><span>Airline</span><input name="flight_airline" value="${esc(flight.airline ?? '')}"></label><label class="field"><span>Cabin</span><input name="flight_cabin" value="${esc(flight.cabin ?? '')}"></label>
        <label class="field"><span>From</span><input name="flight_from" value="${esc(flight.from ?? '')}"></label><label class="field"><span>To</span><input name="flight_to" value="${esc(flight.to ?? '')}"></label>
        <label class="field full"><span>Baggage</span><input name="flight_baggage" value="${esc(flight.baggage ?? '')}"></label></div></fieldset>
      <fieldset class="full" style="border:1px solid var(--line);border-radius:10px;padding:10px 12px"><legend class="lbl"><label class="check"><input type="checkbox" name="room_included"${room.included ? ' checked' : ''}> Stay details</label></legend><div class="form-grid">
        <label class="field"><span>Hotel</span><input name="room_name" value="${esc(room.name ?? '')}"></label><label class="field"><span>Category</span><input name="room_category" value="${esc(room.category ?? '')}"></label>
        <label class="field"><span>Room type</span><input name="room_room_type" value="${esc(room.room_type ?? '')}"></label><label class="field"><span>Meals</span><input name="room_meals" value="${esc(room.meals ?? '')}"></label></div></fieldset>
      <label class="check full"><input type="checkbox" name="active"${p.active !== false ? ' checked' : ''}> Show on the website</label>
    </form>`,
    footer: '<button class="btn" data-c>Cancel</button><button class="btn primary" data-ok>Save package</button>',
  });
  const el = dlg.el, form = $('#pf', el), host = $('#pthumbs', el);
  thumbs(host, images);
  form.elements.name.addEventListener('input', () => { if (!pkg) form.elements.slug.value = slugify(form.elements.name.value); });
  host.addEventListener('click', (e) => { if (e.target.dataset.i !== undefined) { images.splice(Number(e.target.dataset.i), 1); thumbs(host, images); } });
  $('#padd', el).onclick = () => { const u = $('#purl', el).value.trim(); if (u) { images.push(u); $('#purl', el).value = ''; thumbs(host, images); } };
  $('#pfile', el).onchange = async (e) => {
    for (const f of e.target.files) { try { images.push(await compressImage(f)); } catch { toast(`Could not read ${f.name}`, 'bad'); } }
    thumbs(host, images);
    e.target.value = '';
  };
  $('[data-c]', el).onclick = dlg.close;
  $('[data-ok]', el).onclick = async () => {
    if (!form.reportValidity()) return;
    const d = Object.fromEntries(new FormData(form));
    const body = {
      ...d, slug: slugify(d.slug), image_url: images[0] || '', gallery: images.slice(1), active: form.elements.active.checked,
      highlights: parseLines(d.highlights), itinerary: parseLines(d.itinerary), included: parseLines(d.included), excluded: parseLines(d.excluded),
      faqs: parseLines(d.faqs).map((l) => { const [q, ...a] = l.split('|'); return { q: q.trim(), a: a.join('|').trim() }; }).filter((f) => f.q && f.a),
      flight_details: { included: form.elements.flight_included.checked, airline: d.flight_airline, cabin: d.flight_cabin, from: d.flight_from, to: d.flight_to, baggage: d.flight_baggage },
      room_details: { included: form.elements.room_included.checked, name: d.room_name, category: d.room_category, room_type: d.room_room_type, meals: d.room_meals },
    };
    try {
      await api(pkg ? `packages?id=${pkg.id}` : 'packages', { method: pkg ? 'PUT' : 'POST', body });
      dlg.close();
      toast('Package saved', 'good');
      await load();
    } catch (e) { toast(e.message, 'bad'); }
  };
}

$('#add').onclick = () => editor();
$('main.ad-main').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  try {
    if (t.dataset.f) { filter = t.dataset.f; render(); }
    if (t.dataset.edit) editor(rows.find((p) => p.id === t.dataset.edit));
    if (t.dataset.toggle) {
      const p = rows.find((x) => x.id === t.dataset.toggle);
      await api(`packages?id=${p.id}`, { method: 'PUT', body: { ...p, active: p.active === false } });
      toast(p.active === false ? 'Now live on the website' : 'Hidden from the website', 'good');
      await load();
    }
    if (t.dataset.del) {
      const p = rows.find((x) => x.id === t.dataset.del);
      if (!(await confirmBox('Delete this package?', `${p.name} will be removed from the website permanently.`, 'Delete', true))) return;
      await api(`packages?id=${p.id}`, { method: 'DELETE' });
      toast('Deleted');
      await load();
    }
  } catch (err) { toast(err.message, 'bad'); }
});
$('#q').addEventListener('input', debounce(render, 120));
load().catch((e) => toast(e.message, 'bad'));
