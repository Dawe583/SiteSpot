/**
 * SiteSpot — animations.js v4.0
 * Wraps each section in a fixed full-screen panel via JS.
 * Zero changes to existing HTML/CSS files.
 */
(function () {
  'use strict';

  if (window.innerWidth <= 768) { initHover(); return; }

  /* ── Skip panel mode on subpages (no main sections) ─────── */
  const hasMainSections = !!(document.getElementById('hero') && document.getElementById('work'));
  if (!hasMainSections) {
    // Still run hover effects and reveal on subpages
    const revealObs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
    initHover();
    return;
  }

  /* ── Config ─────────────────────────────────────────────── */
  const ANIM_MS     = 900;
  const WHEEL_THRESH = 200;

  /* ── Collect panels: every top-level section + footer ───── */
  const sourceEls = [
    document.getElementById('hero'),
    document.getElementById('work'),
    document.getElementById('services'),
    document.getElementById('contact'),
    document.querySelector('footer'),
  ].filter(Boolean);

  const LABELS = ['Hero','Work','Services','Contact','Footer'];

  /* ── Global styles ──────────────────────────────────────── */
  const st = document.createElement('style');
  st.textContent = `
    html, body { overflow: hidden !important; height: 100% !important; }

    /* Each wrapper panel fills the viewport */
    .ss-panel {
      position: fixed !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--bg);
      display: flex;
      flex-direction: column;
      justify-content: center;
      will-change: transform, opacity;
      transition:
        transform ${ANIM_MS}ms cubic-bezier(0.76,0,0.24,1),
        opacity   ${ANIM_MS}ms cubic-bezier(0.76,0,0.24,1);
      z-index: 10;
    }

    /* z-index stacking so nav always on top */
    #nav { z-index: 9000 !important; }

    .ss-panel--above { transform: translateY(-100%); opacity: 0; pointer-events: none; }
    .ss-panel--active{ transform: translateY(0);     opacity: 1; pointer-events: auto; }
    .ss-panel--below { transform: translateY(100%);  opacity: 0; pointer-events: none; }

    /* Footer panel: align content to center */
    .ss-panel--footer {
      justify-content: center;
      padding: 3rem;
    }
    .ss-panel--footer footer {
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    /* Entrance keyframes */
    @keyframes ssUp {
      from { opacity:0; transform:translateY(40px); }
      to   { opacity:1; transform:translateY(0);    }
    }

    /* Per-section entrance animations on .ss-entering */
    .ss-entering .hero-headline { animation: heroIn 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s both !important; opacity:0; }
    .ss-entering .hero-sub      { animation: heroIn 0.9s cubic-bezier(0.16,1,0.3,1) 0.32s both !important; opacity:0; }
    .ss-entering .hero-bottom   { animation: fadeIn 0.8s ease 0.65s both !important; opacity:0; }

    .ss-entering .work-header                { animation: ssUp .7s cubic-bezier(0.16,1,0.3,1) .10s both; }
    .ss-entering .work-item:nth-child(1)     { animation: ssUp .6s cubic-bezier(0.16,1,0.3,1) .18s both; }
    .ss-entering .work-item:nth-child(2)     { animation: ssUp .6s cubic-bezier(0.16,1,0.3,1) .26s both; }
    .ss-entering .work-item:nth-child(3)     { animation: ssUp .6s cubic-bezier(0.16,1,0.3,1) .34s both; }
    .ss-entering .work-item:nth-child(4)     { animation: ssUp .6s cubic-bezier(0.16,1,0.3,1) .42s both; }
    .ss-entering .work-item:nth-child(5)     { animation: ssUp .6s cubic-bezier(0.16,1,0.3,1) .50s both; }

    .ss-entering .services-intro             { animation: ssUp .7s cubic-bezier(0.16,1,0.3,1) .10s both; }
    .ss-entering .service-item:nth-child(1)  { animation: ssUp .6s cubic-bezier(0.16,1,0.3,1) .20s both; }
    .ss-entering .service-item:nth-child(2)  { animation: ssUp .6s cubic-bezier(0.16,1,0.3,1) .30s both; }
    .ss-entering .service-item:nth-child(3)  { animation: ssUp .6s cubic-bezier(0.16,1,0.3,1) .40s both; }
    .ss-entering .service-item:nth-child(4)  { animation: ssUp .6s cubic-bezier(0.16,1,0.3,1) .50s both; }

    .ss-entering .cta-band                   { animation: ssUp .7s cubic-bezier(0.16,1,0.3,1) .10s both; }
    .ss-entering .contact-info               { animation: ssUp .7s cubic-bezier(0.16,1,0.3,1) .22s both; }
    .ss-entering .form                       { animation: ssUp .7s cubic-bezier(0.16,1,0.3,1) .36s both; }

    .ss-entering .footer-top                 { animation: ssUp .7s cubic-bezier(0.16,1,0.3,1) .15s both; }
    .ss-entering .footer-bottom              { animation: ssUp .6s cubic-bezier(0.16,1,0.3,1) .30s both; }

    /* Disable old .reveal so nothing fights us */
    .ss-panel .reveal { opacity:1 !important; transform:none !important; transition:none !important; }

    /* ── Nav dots ── */
    #ss-dots {
      position:fixed; right:1.75rem; top:50%; transform:translateY(-50%);
      display:flex; flex-direction:column; gap:10px; z-index:9100;
    }
    .ss-dot {
      position:relative; width:7px; height:7px; border-radius:50%;
      background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.12);
      cursor:pointer;
      transition: background .3s, transform .3s, box-shadow .3s;
    }
    .ss-dot.active {
      background:var(--accent); border-color:var(--accent);
      box-shadow:0 0 10px rgba(39,183,165,.55); transform:scale(1.45);
    }
    .ss-dot:hover:not(.active) { background:rgba(255,255,255,.4); }
    .ss-dot::before {
      content:attr(data-label);
      position:absolute; right:18px; top:50%;
      transform:translateY(-50%) translateX(4px);
      font-size:.62rem; font-family:var(--font-sans);
      color:var(--gray-2); letter-spacing:.1em; text-transform:uppercase;
      white-space:nowrap; opacity:0;
      transition: opacity .2s, transform .2s;
      pointer-events:none;
    }
    .ss-dot:hover::before, .ss-dot.active::before {
      opacity:1; transform:translateY(-50%) translateX(0); color:var(--accent-2);
    }

    /* ── Progress bar ── */
    #ss-bar {
      position:fixed; top:0; left:0; height:2px; z-index:9200;
      pointer-events:none;
      background:linear-gradient(90deg,var(--accent),var(--accent-2));
      transition: width .6s cubic-bezier(0.16,1,0.3,1);
    }

    /* ── Hover effects ── */
    #ss-cursor {
      position:fixed; width:300px; height:300px; border-radius:50%;
      pointer-events:none; z-index:1;
      transform:translate(-50%,-50%);
      background:radial-gradient(circle,rgba(39,183,165,.07) 0%,transparent 70%);
      transition:opacity .4s; opacity:0;
    }
    .work-item { position:relative; overflow:hidden; }
    .work-item::before {
      content:''; position:absolute; left:-100%; top:0; bottom:0; width:60%;
      background:linear-gradient(90deg,transparent,rgba(39,183,165,.07),transparent);
      transition:left .55s cubic-bezier(0.16,1,0.3,1); pointer-events:none;
    }
    .work-item:hover::before { left:140%; }
    .service-item {
      transform-style:preserve-3d;
      transition:background .25s, transform .35s cubic-bezier(0.16,1,0.3,1), box-shadow .35s;
    }
    .service-item:hover { box-shadow:0 24px 64px rgba(0,0,0,.5); }
    .nav-links a { position:relative; }
    .nav-links a::after {
      content:''; position:absolute; bottom:-3px; left:0;
      width:0; height:1px; background:var(--accent);
      transition:width .3s cubic-bezier(0.16,1,0.3,1);
    }
    .nav-links a:hover::after { width:100%; }
    .tpl-filter { position:relative; overflow:hidden; }
    .tpl-filter .ripple {
      position:absolute; border-radius:50%;
      background:rgba(39,183,165,.25); transform:scale(0);
      animation:rippleOut .5s linear; pointer-events:none;
    }
    @keyframes rippleOut { to { transform:scale(4); opacity:0; } }

    /* btn-primary: arrow nudge + glow pulse */
    .btn-primary { position:relative; overflow:hidden; }
    .btn-primary svg { transition: transform 0.35s cubic-bezier(0.16,1,0.3,1); }
    .btn-primary:hover svg { transform: translate(3px,-3px); }
    .btn-primary::after {
      content:''; position:absolute; inset:0; border-radius:inherit;
      pointer-events:none;
    }
    .btn-primary:hover { animation: btnGlow 0.55s ease forwards; }
    @keyframes btnGlow {
      0%   { box-shadow: 0 8px 32px rgba(39,183,165,0.35); }
      60%  { box-shadow: 0 8px 48px rgba(39,183,165,0.55); }
      100% { box-shadow: 0 8px 32px rgba(39,183,165,0.35); }
    }

    /* btn-outline: shimmer sweep */
    .btn-outline { position:relative; overflow:hidden; }
    .btn-outline::before {
      content:''; position:absolute; top:0; left:-100%; bottom:0; width:60%;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent);
      transition:left 0.5s cubic-bezier(0.16,1,0.3,1);
    }
    .btn-outline:hover::before { left:140%; }
  `;
  document.head.appendChild(st);

  /* ── Wrap each source element in a panel div ────────────── */
  const panels = sourceEls.map((el, i) => {
    const panel = document.createElement('div');
    panel.className = 'ss-panel';
    if (el.tagName.toLowerCase() === 'footer') panel.classList.add('ss-panel--footer');

    // Insert panel right before the element, then move element inside
    el.parentNode.insertBefore(panel, el);
    panel.appendChild(el);
    return panel;
  });

  // Initial state
  panels.forEach((p, i) => p.classList.add(i === 0 ? 'ss-panel--active' : 'ss-panel--below'));
  panels[0].classList.add('ss-entering');

  /* ── Dot nav ─────────────────────────────────────────────── */
  const dotsWrap = document.createElement('div');
  dotsWrap.id = 'ss-dots';
  panels.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'ss-dot' + (i === 0 ? ' active' : '');
    d.dataset.label = LABELS[i] || '';
    d.setAttribute('aria-label', LABELS[i] || 'Section');
    d.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(d);
  });
  document.body.appendChild(dotsWrap);
  const dots = [...dotsWrap.querySelectorAll('.ss-dot')];

  /* ── Progress bar ────────────────────────────────────────── */
  const bar = document.createElement('div');
  bar.id = 'ss-bar'; bar.style.width = '0%';
  document.body.appendChild(bar);

  /* ── State ───────────────────────────────────────────────── */
  let current = 0, animating = false;

  /* ── goTo ────────────────────────────────────────────────── */
  function goTo(next) {
    if (next === current || animating) return;
    if (next < 0 || next >= panels.length) return;
    animating = true;

    const prev = current;
    const down = next > prev;

    panels[prev].classList.remove('ss-entering');
    panels[prev].classList.remove('ss-panel--active');
    panels[prev].classList.add(down ? 'ss-panel--above' : 'ss-panel--below');

    // Position next panel on the correct side instantly (no transition)
    panels[next].style.transition = 'none';
    panels[next].classList.remove('ss-panel--above', 'ss-panel--below', 'ss-panel--active');
    panels[next].classList.add(down ? 'ss-panel--below' : 'ss-panel--above');
    void panels[next].offsetHeight; // force reflow
    panels[next].style.transition = '';

    // Animate in
    requestAnimationFrame(() => {
      panels[next].classList.remove('ss-panel--above', 'ss-panel--below');
      panels[next].classList.add('ss-panel--active', 'ss-entering');
    });

    // Fix all others
    panels.forEach((p, i) => {
      if (i !== prev && i !== next) {
        p.classList.remove('ss-panel--active', 'ss-panel--above', 'ss-panel--below', 'ss-entering');
        p.classList.add(i < next ? 'ss-panel--above' : 'ss-panel--below');
      }
    });

    current = next;
    dots.forEach((d, i) => d.classList.toggle('active', i === next));
    bar.style.width = (next / (panels.length - 1) * 100) + '%';

    setTimeout(() => { animating = false; }, ANIM_MS + 60);
  }

  /* ── Wheel ───────────────────────────────────────────────── */
  let acc = 0, lastWheel = 0;
  window.addEventListener('wheel', e => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastWheel > 400) acc = 0;
    lastWheel = now;
    acc += e.deltaY;
    if (Math.abs(acc) >= WHEEL_THRESH) {
      goTo(current + (acc > 0 ? 1 : -1));
      acc = 0;
    }
  }, { passive: false });

  /* ── Touch ───────────────────────────────────────────────── */
  let ty = null;
  window.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', e => {
    if (ty === null) return;
    const dy = ty - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 60) goTo(current + (dy > 0 ? 1 : -1));
    ty = null;
  }, { passive: true });

  /* ── Keyboard ────────────────────────────────────────────── */
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(current + 1); }
    if (e.key === 'ArrowUp'   || e.key === 'PageUp')   { e.preventDefault(); goTo(current - 1); }
  });

  /* ── Nav anchor links ────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const idx = sourceEls.findIndex(s => s.id === id);
      if (idx !== -1) { e.preventDefault(); goTo(idx); }
    });
  });

  initHover();

  /* ── Hover effects ───────────────────────────────────────── */
  function initHover() {
    // Cursor glow
    const cur = document.createElement('div'); cur.id = 'ss-cursor';
    document.body.appendChild(cur);
    let mx=0,my=0,cx=0,cy=0;
    document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; cur.style.opacity='1'; });
    document.addEventListener('mouseleave', () => { cur.style.opacity='0'; });
    (function loop(){ cx+=(mx-cx)*.1; cy+=(my-cy)*.1; cur.style.left=cx+'px'; cur.style.top=cy+'px'; requestAnimationFrame(loop); })();

    // Magnetic buttons — includes hero-actions added by HTML
    document.querySelectorAll('.btn-primary,.btn-outline,.nav-cta,.footer-cta').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r=el.getBoundingClientRect();
        el.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.25}px,${(e.clientY-r.top-r.height/2)*.35}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transition='transform .5s cubic-bezier(0.16,1,0.3,1)';
        el.style.transform='';
        setTimeout(()=>el.style.transition='',500);
      });
    });

    // Service 3D tilt
    document.querySelectorAll('.service-item').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r=el.getBoundingClientRect();
        el.style.transform=`perspective(600px) rotateY(${((e.clientX-r.left)/r.width-.5)*6}deg) rotateX(${-((e.clientY-r.top)/r.height-.5)*6}deg) translateZ(6px)`;
      });
      el.addEventListener('mouseleave', ()=>el.style.transform='');
    });

    // Filter ripple
    document.querySelectorAll('.tpl-filter').forEach(btn => {
      btn.addEventListener('click', e => {
        const r=btn.getBoundingClientRect(), sz=Math.max(r.width,r.height);
        const rip=document.createElement('span'); rip.className='ripple';
        Object.assign(rip.style,{width:sz+'px',height:sz+'px',left:(e.clientX-r.left-sz/2)+'px',top:(e.clientY-r.top-sz/2)+'px'});
        btn.appendChild(rip); setTimeout(()=>rip.remove(),500);
      });
    });
  }

})();