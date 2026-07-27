(() => {
  const nav = document.querySelector('.nav');
  const links = nav?.querySelector('.nav-links');
  let menu = nav?.querySelector('.menu');
  if (nav && links) {
    links.id = 'primary-navigation';
    if (!menu) {
      menu = document.createElement('button');
      menu.className = 'menu'; menu.type = 'button'; menu.textContent = 'Menu';
      nav.appendChild(menu);
    }
    if(!menu.textContent.trim()) menu.textContent='Menu'; menu.setAttribute('aria-label','Open navigation'); menu.setAttribute('aria-controls','primary-navigation'); menu.setAttribute('aria-expanded','false');
    const close = () => { nav.classList.remove('nav-open'); menu.textContent='Menu'; menu.setAttribute('aria-expanded','false'); };
    menu.addEventListener('click', () => { const open=!nav.classList.contains('nav-open'); nav.classList.toggle('nav-open',open); menu.textContent=open?'Close':'Menu'; menu.setAttribute('aria-expanded',String(open)); });
    links.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
    document.addEventListener('click',e=>{if(!nav.contains(e.target))close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }
  const enrich=()=>document.querySelectorAll('.package-card:not([data-enriched])').forEach(card=>{
    card.dataset.enriched='true'; const body=card.querySelector('.package-body'),footer=card.querySelector('.package-footer');
    if(body&&footer){const d=document.createElement('div');d.className='package-details';d.innerHTML='<span>✓ Tailored itinerary</span><span>✓ Stay & transfer options</span><span>✓ WhatsApp support</span>';body.insertBefore(d,footer)}
    card.querySelectorAll('img').forEach(img=>{img.loading='lazy';img.decoding='async';img.onerror=()=>{img.onerror=null;img.src='assets/images/island-beach.jpg'}});
  });
  enrich(); window.addEventListener('bahadur:destinations-ready',enrich); new MutationObserver(enrich).observe(document.body,{childList:true,subtree:true});
})();
