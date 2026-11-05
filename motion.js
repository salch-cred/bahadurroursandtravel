// Landing page motion. Everything here is decoration: without GSAP, or with reduced motion, the page is complete.
(function () {
  'use strict';
  const plane = document.getElementById('hero-plane');
  if (plane && window.BAHADUR) {
    plane.innerHTML = window.BAHADUR.PLANE + '<i class="contrail"></i>';
    const style = document.createElement('style');
    style.textContent = '.contrail{position:absolute;right:92%;top:46%;width:58vw;height:7px;background:linear-gradient(270deg,rgba(255,255,255,.85),rgba(255,255,255,0));border-radius:9px;pointer-events:none}.contrail::after{content:"";position:absolute;inset:14px 0 auto;height:5px;background:inherit;border-radius:9px}';
    document.head.append(style);
  }
  if (!window.gsap || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { gsap, ScrollTrigger, MotionPathPlugin } = window;
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

  const hero = document.getElementById('hero');
  const title = document.getElementById('hero-title');
  const isDesktop = () => matchMedia('(min-width: 781px)').matches;

  // Headline rises word by word
  if (title) {
    title.setAttribute('aria-label', title.textContent);
    title.innerHTML = title.textContent.split(' ').map((w) => `<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(' ');
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from('[data-intro]', { y: 22, opacity: 0, duration: 1, stagger: 0.14 }, 0.1)
      .from('#hero-title .w > span', { yPercent: 115, duration: 1.2, stagger: 0.07 }, 0.15)
      .from('#porthole', { yPercent: 40, rotate: 6, opacity: 0, duration: 1.5 }, 0.3)
      .from('.c1', { xPercent: -30, opacity: 0, duration: 2 }, 0)
      .from('.c2', { xPercent: 30, opacity: 0, duration: 2 }, 0);
  }

  // Clouds drift slowly; the plane crosses the sky on a loop
  const loops = gsap.utils.toArray('[data-drift]').map((el) => gsap.to(el, { x: Number(el.dataset.drift), duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
  if (plane) {
    gsap.set(plane, { left: 0, right: 'auto', top: '42%', x: () => -innerWidth * 0.32 });
    loops.push(gsap.to(plane, { x: () => innerWidth * 1.25, y: -190, rotate: -7, duration: 26, ease: 'none', repeat: -1, repeatDelay: 2, delay: 0.8, repeatRefresh: true }));
  }

  // The sky rests once the visitor has flown past it
  if (hero) new IntersectionObserver(([en]) => { hero.classList.toggle('resting', !en.isIntersecting); loops.forEach((t) => (en.isIntersecting ? t.play() : t.pause())); }).observe(hero);

  // Pointer depth on the hero
  if (hero && matchMedia('(pointer: fine)').matches) {
    const items = gsap.utils.toArray('[data-depth]').map((el) => ({ depth: Number(el.dataset.depth), setX: gsap.quickTo(el, 'xPercent', { duration: 1.4, ease: 'power3' }), setY: gsap.quickTo(el, 'yPercent', { duration: 1.4, ease: 'power3' }) }));
    hero.addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      items.forEach((it) => { it.setX(nx * it.depth * 5); it.setY(ny * it.depth * 5); });
    });
  }

  // Scroll: the clouds part and the airplane window opens into the islands
  ScrollTrigger.matchMedia({
    '(min-width: 781px)': function () {
      const fill = document.getElementById('hero-fill');
      const port = document.getElementById('porthole');
      const startClip = () => {
        const r = port.getBoundingClientRect(), h = hero.getBoundingClientRect();
        const top = Math.max(0, r.top - h.top), left = r.left - h.left, right = h.right - r.right, bottom = Math.max(0, h.bottom - r.bottom);
        return `inset(${top}px ${right}px ${bottom}px ${left}px round 170px)`;
      };
      const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: '+=170%', pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true } });
      tl.to('.hero-copy', { yPercent: -36, opacity: 0, duration: 0.34, ease: 'none' }, 0)
        .to('.fc-left', { x: -220, y: -60, opacity: 0, duration: 0.3 }, 0)
        .to('.fc-right', { x: 220, y: -60, opacity: 0, duration: 0.3 }, 0)
        .to('.scroll-cue', { opacity: 0, duration: 0.1 }, 0)
        .to('.c1', { x: () => -innerWidth * 0.55, duration: 0.55, ease: 'power1.in' }, 0)
        .to('.c2', { x: () => innerWidth * 0.55, duration: 0.55, ease: 'power1.in' }, 0)
        .to('.bank.back', { yPercent: 40, duration: 0.5 }, 0)
        .to('.bank.front', { yPercent: 60, duration: 0.5 }, 0)
        .to('#porthole', { bottom: () => (innerHeight - port.offsetHeight) / 2, rotate: 0, scale: 1.12, duration: 0.42, ease: 'power2.inOut' }, 0)
        .set(fill, { visibility: 'visible' }, 0.42)
        .fromTo(fill, { clipPath: startClip }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.5, ease: 'power2.in', immediateRender: false }, 0.42)
        .from('.hero-fill-copy', { y: 40, opacity: 0, duration: 0.14 }, 0.84);
    },
  });

  // Number counters
  gsap.utils.toArray('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count), dec = Number(el.dataset.dec || 0), state = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(state, { v: target, duration: 1.7, ease: 'power3.out', onUpdate: () => { el.textContent = state.v.toFixed(dec); } }),
    });
  });

  // Image parallax
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    gsap.fromTo(el, { yPercent: 0 }, { yPercent: -Math.abs(Number(el.dataset.parallax)) / 2, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Plane follows the dashed line on the blue day-plan card
  const route = document.getElementById('tile-route');
  if (route) {
    const svg = route.ownerSVGElement;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    g.setAttribute('d', 'M-15-13 15 0-15 13-8 0Z');
    g.setAttribute('fill', '#fff');
    svg.append(g);
    gsap.to(g, { motionPath: { path: route, align: route, autoRotate: true, alignOrigin: [0.5, 0.5] }, ease: 'none', scrollTrigger: { trigger: svg, start: 'top 85%', end: 'bottom 45%', scrub: 1 } });
  }

  // The "how it works" route is drawn through the cards and a plane flies along it on scroll
  const map = document.getElementById('flow-map');
  if (map) {
    const path = document.getElementById('flow-path'), svg = document.getElementById('flow-svg');
    const NS = 'http://www.w3.org/2000/svg';
    const flyer = document.createElementNS(NS, 'path');
    flyer.setAttribute('d', 'M-22-18 22 0-22 18-12 0Z');
    flyer.setAttribute('fill', '#0284c7');
    svg.append(flyer);
    let tween;
    const draw = () => {
      tween?.scrollTrigger?.kill(); tween?.kill();
      if (!isDesktop() || innerWidth <= 1080) return;
      const base = map.getBoundingClientRect();
      const pts = [...map.querySelectorAll('.flow-step')].map((c) => { const r = c.getBoundingClientRect(); return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 }; });
      const start = { x: -60, y: pts[0].y - 170 }, end = { x: base.width + 60, y: pts[3].y - 200 };
      const all = [start, ...pts, end];
      let d = `M${all[0].x} ${all[0].y}`;
      for (let i = 1; i < all.length; i += 1) {
        const a = all[i - 1], b = all[i], mid = (a.x + b.x) / 2;
        d += `C${mid} ${a.y} ${mid} ${b.y} ${b.x} ${b.y}`;
      }
      path.setAttribute('d', d);
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: `9 10`, opacity: 1 });
      const mask = document.getElementById('flow-mask') || (() => {
        const defs = document.createElementNS(NS, 'defs');
        defs.innerHTML = '<mask id="flow-mask" maskUnits="userSpaceOnUse" x="-200" y="-400" width="4000" height="1600"><path id="flow-mask-path" fill="none" stroke="#fff" stroke-width="6"/></mask>';
        svg.prepend(defs);
        path.setAttribute('mask', 'url(#flow-mask)');
        return defs.firstChild;
      })();
      const maskPath = mask.firstChild;
      maskPath.setAttribute('d', d);
      gsap.set(maskPath, { strokeDasharray: len, strokeDashoffset: len });
      const trigger = { trigger: map, start: 'top 72%', end: 'bottom 55%', scrub: 1 };
      tween = gsap.timeline({ scrollTrigger: trigger })
        .to(maskPath, { strokeDashoffset: 0, ease: 'none', duration: 1 }, 0)
        .to(flyer, { motionPath: { path, align: path, autoRotate: true, alignOrigin: [0.5, 0.5] }, ease: 'none', duration: 1 }, 0);
    };
    draw();
    let t;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { draw(); ScrollTrigger.refresh(); }, 200); });
    addEventListener('load', () => { draw(); ScrollTrigger.refresh(); });
  }

  // Sections and images load in as the visitor reaches them, so measurements stay correct
  addEventListener('load', () => ScrollTrigger.refresh());
})();
