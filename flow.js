// Decor and flowing motion for every visitor page. All of it is decoration: without it the pages stay complete.
(function () {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  // Flight line: a thin route across the top that shows how far the visitor has travelled
  const bar = document.createElement('div');
  bar.className = 'flightline';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2 12 22 3l-5 18-5-7-10-2Z"/></svg>';
  document.body.append(bar);
  let ticking = false;
  const updateBar = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max) : 0);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateBar); } }, { passive: true });
  updateBar();

  // Waves: two looping layers along the edge of a coloured band
  function wave(host, side, color) {
    const d = `M0 50 ${'q180 -46 360 0 t360 0'.repeat(4)} V90 H0Z`;
    const svg = (c) => `<svg viewBox="0 0 2880 90" preserveAspectRatio="none"><path fill="${c}" d="${d}"/></svg>`;
    const w = document.createElement('div');
    w.className = `wave ${side}`;
    w.setAttribute('aria-hidden', 'true');
    w.innerHTML = svg(color) + svg(color);
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.prepend(w);
  }
  $$('.flow').forEach((el) => { wave(el, 'bottom', '#fff'); wave(el, 'top', '#fff'); });

  // Package rail: arrows and drag to scroll
  const rail = document.getElementById('home-packages');
  if (rail) {
    const move = (dir) => rail.scrollBy({ left: dir * Math.max(320, rail.clientWidth * 0.7), behavior: 'smooth' });
    document.getElementById('rail-prev')?.addEventListener('click', () => move(-1));
    document.getElementById('rail-next')?.addEventListener('click', () => move(1));
    if (fine) {
      let down = false, startX = 0, startLeft = 0, moved = false;
      rail.addEventListener('pointerdown', (e) => { down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft; });
      addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 6) { moved = true; rail.classList.add('dragging'); rail.scrollLeft = startLeft - dx; }
      });
      addEventListener('pointerup', () => { down = false; setTimeout(() => rail.classList.remove('dragging'), 0); });
      rail.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    }
  }

  if (reduced) return;

  const rest = new IntersectionObserver((entries) => entries.forEach((en) => en.target.classList.toggle('resting', !en.isIntersecting)), { rootMargin: '120px' });
  $$('.skyline, .ft-cta, #why, .flow, .page-hero').forEach((el) => rest.observe(el));

  // Cards tilt towards the pointer with a soft light following it
  if (fine) {
    let active = null;
    const clear = () => { if (active) { active.style.rotate = ''; active = null; } };
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest?.('.pk,.tile,.tier');
      if (card !== active) clear();
      if (!card || card.closest('.dragging')) return;
      active = card;
      const r = card.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      const size = Math.hypot(nx, ny);
      card.style.rotate = `${-ny / (size || 1)} ${nx / (size || 1)} 0 ${(size * 7).toFixed(2)}deg`;
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
    document.addEventListener('pointerleave', clear);
    // Main buttons lean towards the pointer
    document.addEventListener('pointermove', (e) => {
      const b = e.target.closest?.('.btn');
      $$('.btn[data-leaning]').forEach((x) => { if (x !== b) { x.style.translate = ''; x.removeAttribute('data-leaning'); } });
      if (!b) return;
      const r = b.getBoundingClientRect();
      b.dataset.leaning = '1';
      b.style.translate = `${((e.clientX - r.left) / r.width - 0.5) * 9}px ${((e.clientY - r.top) / r.height - 0.5) * 7}px`;
    }, { passive: true });
  }

  if (!window.gsap) return;
  const { gsap, ScrollTrigger, MotionPathPlugin } = window;
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  const wide = () => innerWidth > 1080;

  // Headings rise word by word
  function splitWords(el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    [...el.childNodes].forEach((node) => {
      if (node.nodeType !== 3 || !node.textContent.trim()) return;
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part.trim()) { frag.append(' '); return; }
        const outer = document.createElement('span');
        outer.className = 'w';
        outer.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.12em;margin-bottom:-.12em';
        outer.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('span');
        inner.style.display = 'inline-block';
        inner.textContent = part;
        outer.append(inner);
        frag.append(outer);
      });
      node.replaceWith(frag);
    });
  }
  $$('main h2.h2, .page-hero h1, .pd-hero h1').forEach((el) => {
    if (el.closest('#hero')) return;
    el.removeAttribute('data-reveal');
    splitWords(el);
    gsap.from($$('.w > span', el), { yPercent: 112, duration: 1, ease: 'expo.out', stagger: 0.045, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });

  // Large photos open up as they enter, and settle while scrolling past
  $$('.band, .place-view, .collage .main, .fleet-media > *').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(9% 7% 9% 7% round 34px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 96%', end: 'top 45%', scrub: 0.6 } });
  });
  $$('.band > img').forEach((el) => gsap.fromTo(el, { scale: 1.2, yPercent: -5 }, { scale: 1, yPercent: 5, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.pd-hero > img').forEach((el) => gsap.to(el, { yPercent: 12, scale: 1.08, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top top', end: 'bottom top', scrub: true } }));

  // Bento cards and stamps
  $$('.stamp').forEach((el) => gsap.from(el, { scale: 2, opacity: 0, duration: 0.45, ease: 'back.out(2.4)', scrollTrigger: { trigger: el, start: 'top 84%', once: true } }));
  $$('.spin-badge').forEach((el) => gsap.to(el, { y: -70, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.arc path').forEach((el) => gsap.from(el, { strokeDashoffset: 1, ease: 'none', scrollTrigger: { trigger: el.closest('svg'), start: 'top 86%', end: 'bottom 40%', scrub: 1 } }));
  $$('.orb').forEach((el, i) => gsap.to(el, { y: i ? -160 : 140, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

  // Text bands run on their own and speed up with the scroll
  const rows = $$('.k-row').map((row) => {
    row.innerHTML += row.innerHTML + row.innerHTML;
    return { row, dir: Number(row.dataset.speed) || 1, x: 0, set: gsap.quickSetter(row, 'x', 'px'), skew: gsap.quickSetter(row, 'skewX', 'deg') };
  });
  if (rows.length) {
    let boost = 0, onScreen = false;
    const measure = () => rows.forEach((r) => { r.third = r.row.scrollWidth / 3; });
    measure();
    addEventListener('load', measure);
    addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    ScrollTrigger.create({ trigger: '.kinetic', start: 'top bottom', end: 'bottom top', onToggle: (self) => { onScreen = self.isActive; }, onUpdate: (self) => { boost = gsap.utils.clamp(-1400, 1400, self.getVelocity()) / 90; } });
    gsap.ticker.add(() => {
      if (!onScreen) return;
      boost *= 0.93;
      rows.forEach((r) => {
        const third = r.third;
        r.x += r.dir * (1 + Math.abs(boost));
        if (r.dir < 0 && r.x <= -third) r.x += third;
        if (r.dir > 0 && r.x >= 0) r.x -= third;
        r.set(r.x);
        r.skew(gsap.utils.clamp(-8, 8, boost * 0.5 * r.dir));
      });
    });
    rows.filter((r) => r.dir > 0).forEach((r) => { r.x = -r.third; });
  }

  // Inner page skies: drifting clouds and a plane crossing
  $$('.page-hero').forEach((hero) => {
    $$('.cloud', hero).forEach((c, i) => gsap.to(c, { x: i % 2 ? -46 : 46, duration: 12 + i * 3, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    if (window.BAHADUR) {
      const fly = document.createElement('div');
      fly.className = 'flyer';
      fly.innerHTML = window.BAHADUR.PLANE;
      hero.append(fly);
      gsap.fromTo(fly, { x: () => -innerWidth * 0.25, y: 70, rotate: -5 }, { x: () => innerWidth * 1.1, y: -60, duration: 20, ease: 'none', repeat: -1, repeatDelay: 3 });
    }
    gsap.to($$('.wrap', hero), { yPercent: 18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  });

  // A plane travels down each itinerary as it is read
  function itineraryRail(host) {
    if (!host || host.querySelector('.line-rail')) return;
    const line = document.createElement('span');
    line.className = 'line-rail';
    line.setAttribute('aria-hidden', 'true');
    line.innerHTML = '<i></i><b></b>';
    host.prepend(line);
    gsap.to(line, { '--f': 1, ease: 'none', scrollTrigger: { trigger: host, start: 'top 72%', end: 'bottom 62%', scrub: 0.5 } });
  }
  itineraryRail(document.querySelector('.tl'));
  addEventListener('bahadur:rendered', () => {
    const days = document.querySelector('.days');
    itineraryRail(days);
    const img = document.querySelector('.pd-hero > img');
    if (img) gsap.to(img, { yPercent: 12, scale: 1.08, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top top', end: 'bottom top', scrub: true } });
    ScrollTrigger.refresh();
  });

  // Footer skyline: every sticker rises at its own speed, leans to the pointer and can be picked up
  const skyline = document.querySelector('.skyline');
  if (skyline) {
    // Decode every sticker before the footer arrives, so none of them pop in late
    new IntersectionObserver(([en], io) => { if (!en.isIntersecting) return; io.disconnect(); $$('img', skyline).forEach((i) => i.decode?.().catch(() => {})); }, { rootMargin: '1600px' }).observe(skyline);
    const stickers = $$('.stk', skyline).map((el, i) => {
      const depth = Number(el.dataset.depth) || 1;
      gsap.fromTo(el, { y: () => 50 + depth * 170, rotate: i % 2 ? 5 : -5 }, { y: 0, rotate: 0, ease: 'none', scrollTrigger: { trigger: skyline, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 + depth * 0.35 } });
      return { depth, setX: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }) };
    });
    if (fine) skyline.addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      stickers.forEach((s) => s.setX(nx * s.depth * -26));
    }, { passive: true });
    let held = null, sx = 0, sy = 0;
    skyline.addEventListener('pointerdown', (e) => {
      if (e.target.tagName !== 'IMG' || e.pointerType === 'touch') return;
      held = e.target; sx = e.clientX; sy = e.clientY;
      gsap.killTweensOf(held);
      held.parentElement.style.zIndex = 9;
      held.setPointerCapture(e.pointerId);
    });
    skyline.addEventListener('pointermove', (e) => { if (held) gsap.set(held, { x: e.clientX - sx, y: e.clientY - sy }); });
    const drop = () => { if (!held) return; gsap.to(held, { x: 0, y: 0, duration: 1.3, ease: 'elastic.out(1,.45)' }); held = null; };
    skyline.addEventListener('pointerup', drop);
    skyline.addEventListener('pointercancel', drop);
  }

  // One flight route winds through the whole home page, along the margins and across the gaps
  const main = document.querySelector('body.home main');
  if (main) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.id = 'thread';
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<path class="line" id="thread-line"/>';
    main.style.position = 'relative';
    main.classList.add('has-thread');
    main.prepend(svg);
    // The route itself is painted once; only this small plane moves, which stays cheap on phones
    const plane = document.createElement('div');
    plane.id = 'thread-plane';
    plane.setAttribute('aria-hidden', 'true');
    plane.innerHTML = '<svg viewBox="-22 -18 44 36"><path d="M-20-16 20 0-20 16-11 0Z" fill="#d9a84e"/></svg>';
    main.prepend(plane);
    const line = svg.querySelector('#thread-line');
    let tl = null, lastHeight = 0;
    const draw = () => {
      tl?.scrollTrigger?.kill(); tl?.kill(); tl = null;
      if (!wide()) { lastHeight = 0; return; }
      const base = main.getBoundingClientRect(), W = base.width, H = main.scrollHeight;
      lastHeight = H;
      const sections = $$(':scope > section', main).filter((s) => !s.hidden && s.offsetHeight > 120);
      const hero = main.querySelector('.hero-track').getBoundingClientRect().bottom - base.top;
      const left = 26, right = W - 26;
      let side = 0, y = hero + 30, d = `M${left} ${y}`;
      sections.forEach((s, i) => {
        const r = s.getBoundingClientRect(), bottom = r.bottom - base.top;
        const x = side ? right : left;
        if (bottom - 70 > y) { d += ` L${x} ${bottom - 70}`; y = bottom - 70; }
        if (i < sections.length - 1) {
          side = 1 - side;
          const nx = side ? right : left, ny = y + 120;
          d += ` C${x} ${y + 92} ${nx} ${y + 28} ${nx} ${ny}`;
          y = ny;
        }
      });
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.style.height = H + 'px';
      line.setAttribute('d', d);
      tl = gsap.to(plane, { motionPath: { path: line, align: line, autoRotate: true, alignOrigin: [0.5, 0.5] }, ease: 'none', scrollTrigger: { trigger: svg, start: () => `${hero + 40 - innerHeight * 0.55}px top`, end: 'bottom bottom', scrub: 1.2 } });
    };
    let timer;
    const redraw = () => { clearTimeout(timer); timer = setTimeout(() => { if (Math.abs(main.scrollHeight - lastHeight) > 4 || !lastHeight) { draw(); ScrollTrigger.refresh(); } }, 260); };
    new ResizeObserver(redraw).observe(main);
    addEventListener('load', () => { draw(); ScrollTrigger.refresh(); });
    addEventListener('resize', () => { lastHeight = 0; redraw(); });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
