/**
 * SiteSpot — main.js
 * Handles: nav scroll state, mobile burger menu, scroll-reveal,
 *          smooth anchor scrolling, contact form UX
 */

(function () {
  'use strict';

  // ── Helpers ───────────────────────────────────────────────────
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // ── Nav: scrolled state ───────────────────────────────────────
  const nav = $('#nav');

  function updateNav() {
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav(); // run once on load

  // ── Mobile burger menu ────────────────────────────────────────
  const burger = $('#burger');
  const navLinks = $('.nav__links');

  // Inject mobile drawer styles dynamically (keeps CSS clean)
  const mobileStyle = document.createElement('style');
  mobileStyle.textContent = `
    .nav__links.open {
      display: flex !important;
      flex-direction: column;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(5, 13, 26, 0.97);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      justify-content: center;
      align-items: center;
      gap: 2.5rem;
      z-index: 99;
      animation: fadeIn 0.25s ease forwards;
    }
    .nav__links.open a {
      font-size: 1.4rem;
      color: var(--col-text);
    }
    .nav__burger.open span:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
    }
    .nav__burger.open span:nth-child(2) {
      opacity: 0;
      transform: scaleX(0);
    }
    .nav__burger.open span:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
    }
  `;
  document.head.appendChild(mobileStyle);

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

  // Close on any nav link click
  $$('a', navLinks).forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // ── Smooth anchor scrolling ───────────────────────────────────
  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = $(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navHeight = nav.offsetHeight;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ── Scroll-reveal ─────────────────────────────────────────────
  // Add .reveal class to elements we want animated in
  const revealTargets = [
    '.service-card',
    '.process__step',
    '.work-card',
    '.section-header',
    '.contact__title',
    '.contact__sub',
    '.contact__form',
  ];

  revealTargets.forEach(sel => {
    $$(sel).forEach(el => el.classList.add('reveal'));
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
  );

  $$('.reveal').forEach(el => revealObserver.observe(el));

  // Stagger sibling reveal elements (cards, steps)
  ['service-card', 'process__step', 'work-card'].forEach(cls => {
    $$(`.${cls}`).forEach((el, i) => {
      el.style.transitionDelay = `${i * 80}ms`;
    });
  });

  // ── Contact form ──────────────────────────────────────────────
  const form = $('#contact-form');
  if (form) {
    const submitBtn = $('[type="submit"]', form);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name    = $('#name').value.trim();
      const email   = $('#email').value.trim();
      const message = $('#message').value.trim();

      if (!name || !email) return;

      // Loading state
      const originalHTML = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
          </path>
        </svg>
        Odesílám…
      `;

      // Simulate / replace with your actual fetch to API endpoint
      await new Promise(r => setTimeout(r, 1400));

      // Success state
      form.innerHTML = `
        <div style="
          padding: 3rem 2rem;
          text-align: center;
          border: 1px solid rgba(200,255,62,0.2);
          border-radius: 12px;
          background: rgba(200,255,62,0.04);
        ">
          <svg viewBox="0 0 48 48" fill="none" width="48" height="48" style="margin: 0 auto 1.5rem; display:block;">
            <circle cx="24" cy="24" r="22" stroke="#c8ff3e" stroke-width="1.5"/>
            <path d="M14 24l7 7 13-13" stroke="#c8ff3e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p style="font-size:1.1rem; font-weight:600; color:#f0ede8; margin-bottom:0.5rem; font-family:'Syne',sans-serif;">Zpráva odeslána!</p>
          <p style="color:#888880; font-size:0.95rem;">Ozvu se vám do 24 hodin. Díky, ${escapeHTML(name)}!</p>
        </div>
      `;
    });
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  // ── Active nav link on scroll ─────────────────────────────────
  const sections = $$('section[id]');
  const navAnchors = $$('.nav__links a[href^="#"]');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navAnchors.forEach(a => {
            a.style.color = a.getAttribute('href') === `#${id}`
              ? 'var(--col-cyan)'
              : '';
          });
        }
      });
    },
    { threshold: 0.4 }
  );

  sections.forEach(s => sectionObserver.observe(s));

  // ── Service cards: tilt on hover (desktop only) ───────────────
  if (window.matchMedia('(hover: hover)').matches) {
    $$('.service-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width  - 0.5;
        const y = (e.clientY - rect.top)  / rect.height - 0.5;
        card.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

})();