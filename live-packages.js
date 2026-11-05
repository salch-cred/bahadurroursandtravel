// Package cards and the full catalogue page. Combines packages from the admin with the destination list.
import { destinations, loadCommonsPhoto } from './destinations.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const FALLBACK_PACKAGES = [
  { name: 'Lakshadweep Island Escape', slug: 'lakshadweep', region: 'Agatti Island, Lakshadweep', duration: '4 days · 3 nights', price: 'Custom quote', summary: 'An Agatti island escape with permit guidance, stay, meals, transfers and water activities.', image_url: 'assets/images/island-beach.jpg', category: 'Lakshadweep' },
  { name: 'Umrah Package', slug: 'umrah', region: 'Makkah & Madinah', duration: '15 days', price: 'Custom quote', summary: 'A guided spiritual journey with accommodation, coordinated travel and support.', image_url: 'assets/images/umrah/kaaba-sunset.jpg', package_type: 'pilgrimage' },
  { name: 'Kashmir', slug: 'kashmir', region: 'Srinagar · Gulmarg · Pahalgam', duration: '5 days · 4 nights', price: 'Custom quote', summary: 'A scenic circuit of lakes, gardens and mountain valleys.', image_url: 'assets/images/packages/kashmir.jpg' },
  { name: 'Manali', slug: 'manali', region: 'Himachal Pradesh, India', duration: '5 days · 4 nights', price: 'Custom quote', summary: 'Snow valleys, seasonal adventure sports and Himalayan scenery.', image_url: 'assets/images/package-posters/manali.jpg' },
];

export function groupOf(p) {
  const type = String(p.package_type || '').toLowerCase();
  const text = `${p.category || ''} ${p.name || ''} ${p.slug || ''}`.toLowerCase();
  if (type === 'transport' || /urbania|vehicle/.test(text)) return 'transport';
  if (type === 'pilgrimage' || /umrah|ziyarat|pilgrim|tirupati|ajmer/.test(text)) return 'pilgrimage';
  if (type === 'international') return 'international';
  return 'domestic';
}

const LABELS = { transport: 'Vehicle hire', pilgrimage: 'Pilgrimage', international: 'International', domestic: 'India' };

function chips(p) {
  const text = [...(Array.isArray(p.included) ? p.included : []), p.summary || ''].join(' ').toLowerCase();
  const out = [];
  if (/hotel|resort|stay|houseboat|villa|accommodation/.test(text)) out.push(['building-05', 'Stay']);
  if (/flight/.test(text)) out.push(['airplane-01', 'Flights']);
  if (/transfer|airport|pickup|vehicle|transport/.test(text)) out.push(['car-01', 'Transfers']);
  if (/meal|breakfast|dinner|lunch/.test(text)) out.push(['restaurant-02', 'Meals']);
  if (/guide|support/.test(text)) out.push(['maps', 'Guide']);
  if (/permit/.test(text)) out.push(['passport', 'Permit']);
  return out.slice(0, 3);
}

export function cardHTML(p) {
  const group = groupOf(p);
  const href = group === 'pilgrimage' && /^umrah$/i.test(p.slug || '') ? 'umrah.html' : `package.html?slug=${encodeURIComponent(p.slug)}`;
  const meta = [String(p.region || '').split('·')[0].split(',')[0].trim(), String(p.duration || '').split('/')[0].trim()].filter(Boolean).join(' · ');
  const inc = chips(p);
  const price = p.price && p.price !== 'Custom quote' ? p.price : 'Custom quote';
  return `<article class="pk">
    <a class="pk-img" href="${href}" tabindex="-1" aria-hidden="true"><img src="${esc(p.image_url || 'assets/images/island-beach.jpg')}" alt="" loading="lazy" onerror="this.onerror=null;this.src='assets/images/explorer/island-sunset-beach.jpg'" ${p.commons ? `data-commons-query="${esc(p.commons)}"` : ''}></a>
    <span class="pk-badge">${LABELS[group]}</span>
    <div class="pk-body">
      <div class="pk-meta">${esc(meta)}</div>
      <h3><a href="${href}">${esc(p.name)}</a></h3>
      <p class="pk-sum">${esc(p.summary || '')}</p>
      ${inc.length ? `<div class="pk-inc">${inc.map(([icon, label]) => `<span><i class="hgi-stroke hgi-${icon}"></i>${label}</span>`).join('')}</div>` : ''}
      <div class="pk-foot"><div class="pk-price">${/\d/.test(price) ? '<small>Starts at</small>' : ''}<b>${esc(price)}</b></div><button class="btn btn-dark small" data-book data-trip="${esc(p.name)}">Book</button></div>
    </div>
  </article>`;
}

// Only runs on the catalogue page
async function catalogue() {
  const grid = document.getElementById('catalogue');
  if (!grid) return;
  const search = document.getElementById('package-search'), sort = document.getElementById('sort'), count = document.getElementById('result-count');
  let filter = new URLSearchParams(location.search).get('filter') || 'all';
  if (filter === 'local') filter = 'domestic';
  let managed = [];
  try {
    const res = await fetch('/api/packages');
    if (res.ok) managed = (await res.json()).packages || [];
  } catch {}
  if (!managed.length) managed = FALLBACK_PACKAGES;
  const known = new Set(managed.flatMap((p) => [p.slug, slugify(p.name)]));
  const places = destinations.filter((d) => !known.has(slugify(d.name))).map((d) => ({
    name: d.name, slug: slugify(d.name), region: d.region, duration: d.days, price: 'Custom quote', summary: d.blurb, image_url: d.fallback, commons: d.photoQuery,
    package_type: d.category === 'pilgrimage' ? 'pilgrimage' : d.category === 'international' ? 'international' : 'domestic',
  }));
  const all = [...managed, ...places];
  const amount = (p) => Number(p.package_price) || Number(String(p.price || '').replace(/[^\d]/g, '')) || Infinity;

  function render() {
    const q = search.value.trim().toLowerCase();
    let list = all.filter((p) => (filter === 'all' || groupOf(p) === filter) && (!q || `${p.name} ${p.region} ${p.category} ${p.summary}`.toLowerCase().includes(q)));
    if (sort.value === 'low') list = [...list].sort((a, b) => amount(a) - amount(b));
    if (sort.value === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    grid.innerHTML = list.length ? list.map(cardHTML).join('') : '<div class="empty-state"><h3>No journeys match that search</h3><p>Tell us where you want to go and we’ll build it for you.</p><button class="btn btn-sky" data-book style="margin-top:14px">Request a custom trip</button></div>';
    count.textContent = `${list.length} ${list.length === 1 ? 'journey' : 'journeys'}`;
    document.querySelectorAll('#filter-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.filter === filter));
    grid.querySelectorAll('[data-commons-query]').forEach((img) => photoWatch.observe(img));
  }

  const photoWatch = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { photoWatch.unobserve(en.target); loadCommonsPhoto(en.target); }
  }), { rootMargin: '200px' });

  document.getElementById('filter-tabs').addEventListener('click', (e) => {
    if (!e.target.dataset.filter) return;
    filter = e.target.dataset.filter;
    history.replaceState(null, '', filter === 'all' ? 'booking.html' : `booking.html?filter=${filter}`);
    render();
  });
  search.addEventListener('input', render);
  sort.addEventListener('change', render);
  render();
}
catalogue();
