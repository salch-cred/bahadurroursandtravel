// Full package page: every section is built from the admin data, and a section with no data is left out.
import { destinations } from './destinations.js';
import { lazyMap } from './app.js';
import { cardHTML, groupOf } from './live-packages.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const WA = '919187440916';
const slugify = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const safe = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const asArray = (v) => { if (Array.isArray(v)) return v; if (!v) return []; if (typeof v === 'string') { try { const j = JSON.parse(v); if (Array.isArray(j)) return j; } catch {} return v.split('\n').map((x) => x.trim()).filter(Boolean); } return []; };
const asObject = (v) => { if (typeof v === 'string') { try { return JSON.parse(v || '{}'); } catch { return {}; } } return v || {}; };
const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const curated = {
  lakshadweep: { name: 'Lakshadweep', slug: 'lakshadweep', region: 'Agatti Island, Lakshadweep', duration: '4 days · 3 nights', image_url: 'assets/images/island-beach.jpg', summary: 'An Agatti island escape with permit guidance, stay, meals, transfers and water activities.', description: 'Experience Lakshadweep without planning stress. This four-day Agatti itinerary balances lagoon time, island sightseeing and optional adventures, with local support from landing to departure.', highlights: ['Entry-permit assistance', 'Comfortable stay and stated meals', 'Airport pickup and drop', 'Island sightseeing', 'Snorkelling, kayaking and glass-bottom boat coordination'], itinerary: ['Arrival: Welcome drink, lunch, island sightseeing and dinner', 'Lagoon day: Dolphin watch, lunch, snorkelling and island time', 'Adventure day: Optional scuba, kayaking and glass-bottom boat experience', 'Departure: Breakfast and airport transfer'], included: ['Permit assistance', 'Accommodation', 'Meals listed in itinerary', 'Airport transfers', 'Island sightseeing', 'Local support'], excluded: ['Flight tickets', 'Optional scuba diving', 'Banana boat ride', 'Night fishing', 'Personal expenses'], gallery: ['assets/images/hero-yacht.jpg', 'assets/images/scuba.jpg', 'assets/images/kayak-sunset.jpg', 'assets/images/banana-boat.jpg'], latitude: 10.8589, longitude: 72.1934 },
  kashmir: { name: 'Kashmir', slug: 'kashmir', region: 'Srinagar · Gulmarg · Sonmarg · Pahalgam', duration: '5 days · 4 nights', image_url: 'assets/images/packages/kashmir.jpg', summary: 'A scenic Kashmir circuit with Srinagar, Gulmarg, Sonmarg and Pahalgam.', description: 'See Kashmir through lake views, Mughal gardens, alpine roads and mountain valleys, with a comfortable route and dependable ground support.', highlights: ['3 nights Srinagar and 1 night Pahalgam', 'One-hour Shikara ride', 'Gulmarg and Sonmarg excursions', 'Breakfast and dinner', 'Ground transport and support'], itinerary: ['Srinagar: Arrival, gardens, temple and Shikara ride', 'Gulmarg: Excursion and optional seasonal activities', 'Sonmarg: Excursion and Srinagar stay', 'Pahalgam: Transfer via scenic stops', 'Departure: Breakfast and Srinagar Airport transfer'], included: ['Airport transfers', 'Hotels as listed', 'Tempo Traveller', 'Daily breakfast and dinner', 'Shikara ride', 'Ground support'], excluded: ['Union cabs', 'Gondola tickets', 'Lunch', 'Entry fees', 'Personal expenses'], gallery: ['assets/images/explorer/island-mangrove.jpg'] },
  umrah: { name: 'Umrah Package', slug: 'umrah', region: 'Makkah & Madinah', duration: '15 days', package_type: 'pilgrimage', image_url: 'assets/images/umrah/kaaba-sunset.jpg', summary: 'A 15-day spiritual journey with accommodation, coordinated travel and guided support.', description: 'Travel for Umrah with thoughtful guidance at every stage. This package supports a calm pilgrimage with accommodation options near key worship areas, coordinated transfers, assistance during the sacred rites and a team available throughout. Exact hotels, flights, meals and visa services are confirmed in the final quotation.', highlights: ['15-day guided journey', 'Stay options near the Haram area', 'Makkah and Madinah coordination', 'Pre-departure document checklist', 'On-ground and WhatsApp support'], itinerary: ['Arrival and transfer to Makkah', 'Guided preparation and performance of Umrah', 'Worship days and optional Makkah ziyarat', 'Transfer to Madinah', 'Worship and coordinated Madinah visits', 'Checkout and airport departure'], included: ['Journey planning', 'Accommodation options', 'Makkah and Madinah transfers', 'Guided support', 'Selected ziyarat coordination', 'Document checklist'], excluded: ['Airfare unless quoted', 'Visa and insurance unless stated', 'Meals not listed', 'Personal expenses', 'Services not in the final quote'], gallery: ['assets/images/umrah/kaaba-aerial.jpg', 'assets/images/umrah/kaaba-spiral.jpg', 'assets/images/umrah/masjid-haram.png'] },
  manali: { name: 'Manali', slug: 'manali', region: 'Himachal Pradesh, India', duration: '5 days · 4 nights', image_url: 'assets/images/package-posters/manali.jpg', summary: 'Snow valleys, seasonal adventure sports and Himalayan scenery.', description: 'A flexible mountain break built around Manali scenery, snow points, local sightseeing and seasonal adventure activities.', highlights: ['Four nights and five days', 'Snow valleys', 'Seasonal activities', 'Hotel and transport choices', 'Local support'], itinerary: ['Arrival and check-in', 'Local Manali sightseeing', 'Solang Valley', 'Flexible mountain excursion', 'Checkout and return'], included: ['Hotel option', 'Breakfast option', 'Sightseeing', 'Selected transfers', 'Trip support'], excluded: ['Travel to Manali unless quoted', 'Adventure activity fees', 'Entry fees', 'Unlisted meals', 'Personal expenses'], gallery: ['assets/images/explorer/island-mangrove.jpg'] },
};

// Links on the home page and footer must always open a page, even if the admin has not added that package yet
const ALIASES = { 'island-escape': 'lakshadweep', 'kashmir-valley-in-bloom': 'kashmir' };
const BASIC = {
  'kerala-backwaters-tour': { name: 'Kerala Backwaters', region: 'Kerala, India', image_url: 'assets/images/packages/kerala.jpg', summary: 'Houseboats, quiet canals and green countryside, planned around your dates.' },
  'maldives-overwater-quiet': { name: 'Maldives Overwater Quiet', region: 'Maldives', package_type: 'international', image_url: 'assets/images/packages/maldives.jpg', summary: 'A private resort stay with turquoise on every side.' },
  'dubai-city-tour': { name: 'Dubai City and Desert', region: 'Dubai, UAE', package_type: 'international', image_url: 'assets/images/packages/dubai.jpg', summary: 'Skyline, desert and old souks, planned around your dates.' },
};
const basicPackage = (slug, x) => ({ slug, duration: 'Flexible', description: x.summary, highlights: ['Tailored itinerary', 'Stay and transfer options', 'WhatsApp support'], itinerary: ['Arrival and transfer', 'Signature sightseeing', 'Local experience', 'Departure assistance'], included: ['Trip planning', 'Selected transfers', 'Accommodation options', 'Local support'], excluded: ['Personal expenses', 'Anything not confirmed in writing'], gallery: [x.image_url], ...x });

const DEFAULT_FAQS = [
  { q: 'How is my booking confirmed?', a: 'Send a request and we check availability. Your trip is confirmed in writing once the required deposit or full payment is received.' },
  { q: 'Can this plan be changed for my group?', a: 'Yes. Dates, stays and activities can be adjusted. Tell us what you need and we will send a revised plan and price.' },
  { q: 'What happens if I need to cancel?', a: 'Supplier cancellation charges and service charges may apply. The full policy is on our terms page and in your quotation.' },
];

async function getPackage() {
  const wanted = new URLSearchParams(location.search).get('slug');
  if (!wanted) throw new Error('Package not found');
  try {
    const r = await fetch('/api/packages?slug=' + encodeURIComponent(wanted));
    if (r.ok) { const data = await r.json(); if (data.package) return data.package; }
  } catch {}
  if (curated[ALIASES[wanted] || wanted]) return curated[ALIASES[wanted] || wanted];
  if (BASIC[wanted]) return basicPackage(wanted, BASIC[wanted]);
  const found = destinations.find((x) => slugify(x.name) === wanted);
  if (found) return {
    name: found.name, slug: wanted, region: found.region, duration: found.days, image_url: found.fallback, summary: found.blurb, description: found.blurb, latitude: found.lat, longitude: found.lng,
    package_type: found.category === 'pilgrimage' ? 'pilgrimage' : found.category === 'international' ? 'international' : 'domestic',
    highlights: ['Tailored itinerary', 'Stay and transfer options', 'WhatsApp support'], itinerary: ['Arrival and transfer', 'Signature sightseeing', 'Local experience', 'Departure assistance'], included: ['Trip planning', 'Selected transfers', 'Accommodation options', 'Local support'], excluded: ['Personal expenses', 'Anything not confirmed in writing'], gallery: [found.fallback],
  };
  throw new Error('Package not found');
}

function dayParts(item) {
  if (item && typeof item === 'object') return { title: item.title || item.name || '', text: item.description || item.desc || item.detail || '' };
  const text = String(item);
  const at = text.indexOf(':');
  return at > 0 && at < 60 ? { title: text.slice(0, at).trim(), text: text.slice(at + 1).trim() } : { title: text, text: '' };
}
const words = (item) => (item && typeof item === 'object' ? item.title || item.text || '' : item);

function setMeta(p) {
  document.title = `${p.name} — Bahadur Tours and Travels`;
  let d = $('meta[name="description"]');
  if (!d) { d = document.createElement('meta'); d.name = 'description'; document.head.append(d); }
  d.content = `${p.name}: ${p.summary || p.description || 'Travel package by Bahadur Tours and Travels'}`.slice(0, 160);
  for (const [prop, val] of [['og:title', p.name], ['og:description', (p.summary || '').slice(0, 200)], ['og:image', p.image_url || 'assets/brand/bahadur-logo.png']]) {
    const el = document.createElement('meta'); el.setAttribute('property', prop); el.content = val; document.head.append(el);
  }
}

function render(p) {
  setMeta(p);
  const highlights = asArray(p.highlights), itinerary = asArray(p.itinerary), included = asArray(p.included), excluded = asArray(p.excluded || p.exclusions);
  const gallery = [...new Set([p.image_url, ...asArray(p.gallery || p.gallery_images)].filter(Boolean))];
  const flight = asObject(p.flight_details), room = asObject(p.room_details);
  const faqs = asArray(p.faqs).length ? asArray(p.faqs) : DEFAULT_FAQS;
  const isService = groupOf(p) === 'transport';
  const unit = Number(p.package_price) || 0;
  const hasPlace = Number(p.latitude) && Number(p.longitude);
  const hasStay = flight.included || room.included;
  const price = p.price && p.price !== 'Custom quote' ? p.price : 'Custom quote';
  const tabs = [['overview', 'Overview'], itinerary.length && ['itinerary', isService ? 'How it works' : 'Itinerary'], (included.length || excluded.length) && ['cover', 'Included'], hasStay && ['stay', 'Stay & flights'], ['gallery', 'Gallery'], hasPlace && ['where', 'Map'], ['reviews', 'Reviews'], ['faq', 'Good to know']].filter(Boolean);

  $('#package-detail').innerHTML = `
  <section class="pd-hero"><img src="${safe(p.image_url || 'assets/images/island-beach.jpg')}" alt="${safe(p.name)}" fetchpriority="high"><div class="wrap">
    <a class="pd-crumb" href="booking.html"><i class="hgi-stroke hgi-arrow-left-01"></i>All journeys</a>
    <h1>${safe(p.name)}</h1>
    <div class="pd-facts">${p.region ? `<span><i class="hgi-stroke hgi-location-01"></i>${safe(p.region)}</span>` : ''}${p.duration ? `<span><i class="hgi-stroke hgi-calendar-03"></i>${safe(p.duration)}</span>` : ''}<span><i class="hgi-stroke hgi-customer-support"></i>WhatsApp support</span></div>
  </div></section>
  <div class="pd-tabs"><div class="wrap"><nav aria-label="Package sections">${tabs.map(([id, label], i) => `<a href="#${id}" class="${i ? '' : 'on'}">${label}</a>`).join('')}</nav></div></div>
  <div class="wrap pd-layout">
    <div>
      <section class="pd-sec" id="overview"><h2>Overview</h2><p class="pd-desc">${safe(p.description || p.summary)}</p>${highlights.length ? `<div class="hl-grid">${highlights.map((x) => `<div><i class="hgi-stroke hgi-tick-02"></i>${safe(words(x))}</div>`).join('')}</div>` : ''}</section>
      ${itinerary.length ? `<section class="pd-sec" id="itinerary"><div class="days-tools"><h2 style="margin:0">${isService ? 'How it works' : 'Day by day'}</h2><button type="button" id="toggle-days">Expand all</button></div><div class="days">${itinerary.map((item, i) => { const d = dayParts(item); return `<details class="day" ${i === 0 ? 'open' : ''}><summary><b>${isService ? i + 1 : 'D' + (i + 1)}</b>${safe(d.title || `${isService ? 'Step' : 'Day'} ${i + 1}`)}${d.text ? '<i class="hgi-stroke hgi-arrow-down-01"></i>' : ''}</summary>${d.text ? `<p>${safe(d.text)}</p>` : ''}</details>`; }).join('')}</div><p style="color:var(--muted);font-size:15px;margin-top:12px">The final schedule is confirmed for your dates and services.</p></section>` : ''}
      ${included.length || excluded.length ? `<section class="pd-sec" id="cover"><h2>What’s included</h2><div class="cover"><div><h3>Included</h3>${included.map((x) => `<span><i class="hgi-stroke hgi-tick-02"></i>${safe(words(x))}</span>`).join('')}</div><div class="no"><h3>Not included</h3>${excluded.map((x) => `<span><i class="hgi-stroke hgi-cancel-01"></i>${safe(words(x))}</span>`).join('')}</div></div></section>` : ''}
      ${hasStay ? `<section class="pd-sec" id="stay"><h2>Stay & flights</h2><div class="arrange">${flight.included ? `<article><small>Flight</small><h3>${safe(flight.airline || 'Scheduled flight')}${flight.cabin ? ' · ' + safe(flight.cabin) : ''}</h3><p>${safe([flight.from, flight.to].filter(Boolean).join(' → '))}</p><p>${safe(flight.baggage || 'As per airline policy')}</p></article>` : ''}${room.included ? `<article><small>Stay</small><h3>${safe(room.name || room.category || 'Selected hotel')}</h3><p>${safe(room.room_type || 'Room confirmed with booking')}</p><p>${safe(room.meals || room.city || '')}</p></article>` : ''}</div></section>` : ''}
      <section class="pd-sec" id="gallery"><h2>Gallery</h2><div class="pd-gallery">${gallery.slice(0, 7).map((src, i) => `<button type="button" data-zoom="${safe(src)}" data-alt="${safe(p.name)}" aria-label="Open image ${i + 1}"><img src="${safe(src)}" alt="${safe(p.name)} photo ${i + 1}" loading="lazy"></button>`).join('')}</div></section>
      ${hasPlace ? '<section class="pd-sec" id="where"><h2>Where it is</h2><div class="pd-map" id="pd-map"></div></section>' : ''}
      <section class="pd-sec" id="reviews"><h2>Guest reviews</h2><div id="pd-reviews"><p style="color:var(--muted)">Loading reviews…</p></div></section>
      <section class="pd-sec" id="faq"><h2>Good to know</h2><div class="faq">${faqs.map((f, i) => `<details ${i === 0 ? 'open' : ''}><summary>${safe(f.q)}</summary><p>${safe(f.a)}</p></details>`).join('')}</div>${p.terms ? `<p style="color:var(--muted);margin-top:14px;font-size:15.5px">${safe(p.terms)}</p>` : ''}<p style="margin-top:12px;font-size:15.5px"><a href="terms.html" style="color:var(--sky-700);font-weight:600">Read the full terms and cancellation policy</a></p></section>
    </div>
    <aside class="side"><div class="book-card">
      ${/\d/.test(price) ? '<small>Starts at</small>' : ''}<div class="price">${safe(price)}</div>
      <label class="f">Guests<select id="pd-guests">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option${n === 2 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      ${unit ? '<div class="calc"><span>Estimate</span><span id="pd-est"></span></div>' : ''}
      <button class="btn btn-sky" data-book data-trip="${safe(p.name)}">Request this trip</button>
      <a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/${WA}?text=${encodeURIComponent(`Hi Bahadur Tours, I'm interested in ${p.name}.`)}">Ask on WhatsApp</a>
      <div class="mini-links"><a href="itinerary-print.html?slug=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener"><i class="hgi-stroke hgi-printer"></i>Itinerary PDF</a><button type="button" id="pd-share"><i class="hgi-stroke hgi-share-08"></i>Share</button></div>
    </div></aside>
  </div>
  <section class="section" style="padding-top:0" id="similar-wrap" hidden><div class="wrap"><h2 class="h3" style="margin-bottom:22px">You may also like</h2><div class="pk-grid" id="similar"></div></div></section>
  <div class="mob-book"><div>${/\d/.test(price) ? '<small style="color:var(--muted)">Starts at</small><br>' : ''}<b>${safe(price)}</b></div><button class="btn btn-sky small" data-book data-trip="${safe(p.name)}">Request this trip</button></div>`;

  if (unit) {
    const est = () => { $('#pd-est').textContent = inr(unit * Number($('#pd-guests').value)); };
    $('#pd-guests').onchange = est;
    est();
  }
  $('#toggle-days')?.addEventListener('click', (e) => {
    const days = $$('.day'), open = days.some((d) => !d.open);
    days.forEach((d) => { d.open = open; });
    e.target.textContent = open ? 'Collapse all' : 'Expand all';
  });
  $('#pd-share').onclick = async () => {
    const data = { title: p.name, text: p.summary || p.name, url: location.href };
    if (navigator.share) { navigator.share(data).catch(() => {}); return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${p.name} ${location.href}`)}`, '_blank', 'noopener');
  };
  document.body.classList.add('keep-nav');
  const links = $$('.pd-tabs a');
  const spy = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-30% 0px -60% 0px' });
  $$('.pd-sec').forEach((s) => spy.observe(s));
  if (hasPlace) lazyMap('pd-map', { center: [Number(p.longitude), Number(p.latitude)], zoom: 11, label: `<strong>${safe(p.name)}</strong>` });
  loadReviews(p);
  loadSimilar(p);
  window.dispatchEvent(new Event('bahadur:rendered'));
}

async function loadReviews(p) {
  const host = $('#pd-reviews');
  let rows = [];
  try { const r = await fetch(`/api/reviews?package=${encodeURIComponent(p.slug)}&limit=4`); if (r.ok) rows = (await r.json()).reviews || []; } catch {}
  host.innerHTML = (rows.length ? rows.map((r) => `<article class="rv"><div class="stars">${'★'.repeat(Math.max(1, Math.min(5, Number(r.rating) || 5)))}</div><p>${safe(r.text)}</p><footer>${safe(r.name)} · ${safe(r.trip)}</footer></article>`).join('') : '<p style="color:var(--muted)">No reviews for this journey yet.</p>') + '<a class="link-arrow" href="community.html#share" style="margin-top:8px">Share your experience <i class="hgi-stroke hgi-arrow-up-right-01"></i></a>';
}

async function loadSimilar(p) {
  try {
    const r = await fetch('/api/packages');
    if (!r.ok) return;
    const list = ((await r.json()).packages || []).filter((x) => x.slug !== p.slug);
    const same = list.filter((x) => groupOf(x) === groupOf(p));
    const picks = [...same, ...list.filter((x) => !same.includes(x))].slice(0, 3);
    if (!picks.length) return;
    $('#similar').innerHTML = picks.map(cardHTML).join('');
    $('#similar-wrap').hidden = false;
  } catch {}
}

getPackage().then(render).catch(() => {
  $('#package-detail').innerHTML = `<section class="page-hero"><div class="wrap"><h1>Package not found</h1><p>This package may have moved or been updated.</p><a class="btn btn-white" style="margin-top:22px" href="booking.html">Browse all packages <i class="hgi-stroke hgi-arrow-right-01"></i></a></div></section>`;
});
