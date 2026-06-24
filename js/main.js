/**
 * SiteSpot — main.js  v3.0
 * Works with: #nav, .nav-links, .reveal, #contact-form
 */
(function () {
  'use strict';

  // ── Helpers ───────────────────────────────────────────────────
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // ── Nav: scrolled state ───────────────────────────────────────
  const nav = $('#nav');
  if (!nav) return;

  // Don't override .scrolled if already set (subpage)
  const alreadyScrolled = nav.classList.contains('scrolled');

  function updateNav() {
    if (alreadyScrolled) return; // subpage always stays scrolled
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // ── Mobile nav ────────────────────────────────────────────────
  const navLinks = $('.nav-links');

  // Inject mobile overlay
  const mobileStyle = document.createElement('style');
  mobileStyle.textContent = `
    @media (max-width: 768px) {
      .nav-links.open {
        display: flex !important;
        flex-direction: column;
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(7,10,15,0.97);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        justify-content: center;
        align-items: center;
        gap: 2.5rem;
        z-index: 99;
        animation: fadeIn 0.2s ease forwards;
      }
      .nav-links.open li a {
        font-size: 1.5rem;
        color: #eef2f7;
      }
      .nav-burger {
        display: flex;
        flex-direction: column;
        gap: 6px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        z-index: 100;
      }
      .nav-burger span {
        display: block;
        width: 22px;
        height: 1.5px;
        background: #eef2f7;
        transition: transform 0.3s, opacity 0.3s;
      }
      .nav-burger.open span:nth-child(1) { transform: translateY(7.5px) rotate(45deg); }
      .nav-burger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
      .nav-burger.open span:nth-child(3) { transform: translateY(-7.5px) rotate(-45deg); }
    }
  `;
  document.head.appendChild(mobileStyle);

  // Hide burger on desktop by default
  const burgerDesktopStyle = document.createElement('style');
  burgerDesktopStyle.textContent = '.nav-burger { display: none !important; }';
  document.head.insertBefore(burgerDesktopStyle, document.head.firstChild);

  // Create burger button — only insert into DOM on mobile
  const burger = document.createElement('button');
  burger.className = 'nav-burger';
  burger.setAttribute('aria-label', 'Toggle menu');
  burger.innerHTML = '<span></span><span></span><span></span>';
  if (window.innerWidth <= 768) {
    const navCta = $('.nav-cta');
    if (navCta) { nav.insertBefore(burger, navCta); } else { nav.appendChild(burger); }
  }

  function closeMenu() {
    burger.classList.remove('open');
    navLinks.classList.remove('open');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', () => {
    const isOpen = burger.classList.toggle('open');
    navLinks.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close on nav link click
  if (navLinks) {
    $$('a', navLinks).forEach(link => link.addEventListener('click', closeMenu));
  }

  // ── Smooth anchor scroll ──────────────────────────────────────
  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      const top = target.getBoundingClientRect().top + window.scrollY - nav.offsetHeight - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ── Scroll-reveal ─────────────────────────────────────────────
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  $$('.reveal').forEach(el => revealObs.observe(el));

  // ── Contact form ──────────────────────────────────────────────
  const form = $('#contact-form');
  if (form) {
    const submitBtn = $('[type="submit"]', form);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameEl  = $('#name');
      const emailEl = $('#email');
      if (!nameEl || !emailEl) return;

      const name  = nameEl.value.trim();
      const email = emailEl.value.trim();
      if (!name || !email) return;

      const orig = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate"
              from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
          </path>
        </svg>
        Odesílám…
      `;

      await new Promise(r => setTimeout(r, 1400));

      form.innerHTML = `
        <div style="
          padding: 3rem 2rem;
          text-align: center;
          border: 1px solid rgba(39,183,165,0.25);
          border-radius: 8px;
          background: rgba(39,183,165,0.05);
        ">
          <svg viewBox="0 0 48 48" fill="none" width="48" height="48"
            style="margin: 0 auto 1.5rem; display:block;">
            <circle cx="24" cy="24" r="22" stroke="#27b7a5" stroke-width="1.5"/>
            <path d="M14 24l7 7 13-13" stroke="#27b7a5" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p style="font-size:1.1rem; font-weight:700; color:#eef2f7; margin-bottom:0.5rem;">
            Zpráva odeslána!
          </p>
          <p style="color:#7da8c4; font-size:0.95rem;">
            Ozvu se vám do 24 hodin. Díky, ${escapeHTML(name)}!
          </p>
        </div>
      `;
    });
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[m]);
  }

  // ── Active nav link highlight on scroll ───────────────────────
  const sections = $$('section[id]');
  const navAnchors = navLinks ? $$('a[href^="#"]', navLinks) : [];

  if (sections.length && navAnchors.length) {
    const secObs = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navAnchors.forEach(a => {
              const active = a.getAttribute('href') === `#${id}`;
              a.style.color = active ? 'var(--accent-2)' : '';
            });
          }
        });
      },
      { threshold: 0.45 }
    );
    sections.forEach(s => secObs.observe(s));
  }

})();