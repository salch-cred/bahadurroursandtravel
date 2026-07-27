// site-ui.js — shared UI utilities injected on every page

// ── WhatsApp sticky button ────────────────────────────────────
(function(){
  if(document.querySelector('.wa-sticky'))return;
  const a=document.createElement('a');
  a.href='https://wa.me/919187440916?text=Hi%20Bahadur%20Tours%2C%20I%27d%20like%20to%20enquire%20about%20a%20trip.';
  a.className='wa-sticky';
  a.target='_blank';
  a.rel='noopener noreferrer';
  a.setAttribute('aria-label','Chat on WhatsApp');
  a.innerHTML='<i class="hgi-stroke hgi-whatsapp"></i>';
  document.body.appendChild(a);
})();

// ── Mobile hamburger nav ─────────────────────────────────────
(function(){
  const nav=document.querySelector('.nav');
  if(!nav)return;
  // Add hamburger button if not already there
  if(!nav.querySelector('.nav-hamburger')){
    const btn=document.createElement('button');
    btn.className='nav-hamburger';
    btn.id='nav-hamburger';
    btn.setAttribute('aria-label','Toggle navigation');
    btn.setAttribute('aria-expanded','false');
    btn.innerHTML='<i class="hgi-stroke hgi-menu-01 nav-hamburger-icon"></i><i class="hgi-stroke hgi-cancel-01 nav-close-icon"></i>';
    nav.appendChild(btn);
    btn.addEventListener('click',()=>{
      const open=nav.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded',open);
      document.body.style.overflow=open?'hidden':'';
    });
    // Close on outside click
    document.addEventListener('click',e=>{
      if(nav.classList.contains('nav-open')&&!nav.contains(e.target)){
        nav.classList.remove('nav-open');
        btn.setAttribute('aria-expanded','false');
        document.body.style.overflow='';
      }
    });
    // Close on nav link click
    nav.querySelectorAll('.nav-links a').forEach(a=>{
      a.addEventListener('click',()=>{
        nav.classList.remove('nav-open');
        btn.setAttribute('aria-expanded','false');
        document.body.style.overflow='';
      });
    });
  }
})();

// ── Package details inline (for index.html hero) ─────────────
const body=document.body;
const footer=document.querySelector('.site-footer');
if(body&&footer){
  const d=document.createElement('div');
  d.className='package-details';
  d.innerHTML='<span><i class="hgi-stroke hgi-checkmark-02"></i> Tailored itinerary</span><span><i class="hgi-stroke hgi-checkmark-02"></i> Stay &amp; transfer options</span><span><i class="hgi-stroke hgi-checkmark-02"></i> WhatsApp support</span>';
  body.insertBefore(d,footer);
}
