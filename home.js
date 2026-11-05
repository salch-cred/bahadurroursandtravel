// Home page behaviour that must work with or without the motion layer.
import { cardHTML, FALLBACK_PACKAGES } from './live-packages.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// Destination tiles swap the large photo
const views = $$('#place-view img');
const places = $$('#place-grid .place');
const setPlace = (i) => { places.forEach((p, n) => p.classList.toggle('on', n === i)); views.forEach((v, n) => v.classList.toggle('on', n === i)); };
places.forEach((p, i) => { p.addEventListener('mouseenter', () => setPlace(i)); p.addEventListener('focus', () => setPlace(i)); });

// The airplane window cycles through journeys until the visitor starts scrolling
const panes = $$('#pane img');
let paneIndex = 0;
const paneTimer = setInterval(() => {
  if (scrollY > 40 || document.hidden) return;
  panes[paneIndex].classList.remove('on');
  paneIndex = (paneIndex + 1) % panes.length;
  panes[paneIndex].classList.add('on');
}, 3800);
addEventListener('scroll', () => {
  if (scrollY > 40 && paneIndex !== 0) { panes[paneIndex].classList.remove('on'); paneIndex = 0; panes[0].classList.add('on'); }
}, { passive: true });
window.addEventListener('pagehide', () => clearInterval(paneTimer));

// A second copy of the images lets the gallery loop without a jump
const track = $('#gallery');
if (track) track.parentElement.append(Object.assign(track.cloneNode(true), { id: '', ariaHidden: 'true' }));

// Featured packages
(async () => {
  const rail = $('#home-packages');
  let list = [];
  try {
    const res = await fetch('/api/packages');
    if (res.ok) list = (await res.json()).packages || [];
  } catch {}
  if (!list.length) list = FALLBACK_PACKAGES;
  rail.innerHTML = list.slice(0, 8).map(cardHTML).join('');
})();

// Testimonials: approved reviews first, then the guests quoted on the site
const quotes = [
  { text: 'Every transfer felt easy and the island team was always one message away.', name: 'Safwan', trip: 'Island escape' },
  { text: 'Everything was perfect, from the permit guidance to our scuba session.', name: 'Ashraf', trip: 'Scuba experience' },
  { text: 'A memorable family holiday. Thoughtful, calm and very well organised.', name: 'Ahsan', trip: 'Family trip' },
];
let current = 0, timer;
function showQuote(i) {
  current = i;
  const q = quotes[i], el = $('#quote'), by = $('#quote-by');
  el.textContent = `“${q.text}”`;
  by.textContent = '';
  by.append(Object.assign(document.createElement('b'), { textContent: q.name }), ` · ${q.trip}`);
  $$('#quote-nav button').forEach((b, n) => b.classList.toggle('on', n === i));
}
function buildQuotes() {
  $('#quote-nav').innerHTML = quotes.map((q, i) => `<button role="tab" aria-label="Review ${i + 1}" data-i="${i}"></button>`).join('');
  showQuote(0);
  clearInterval(timer);
  timer = setInterval(() => { if (!document.hidden) showQuote((current + 1) % quotes.length); }, 6000);
}
$('#quote-nav').addEventListener('click', (e) => { if (e.target.dataset.i) showQuote(Number(e.target.dataset.i)); });
buildQuotes();
(async () => {
  try {
    const res = await fetch('/api/reviews?limit=6');
    if (!res.ok) return;
    const { reviews = [] } = await res.json();
    const fresh = reviews.filter((r) => r.text && r.text.length < 170 && !quotes.some((q) => q.name === r.name)).map((r) => ({ text: r.text, name: r.name, trip: r.trip }));
    if (fresh.length) { quotes.unshift(...fresh); buildQuotes(); }
  } catch {}
})();
