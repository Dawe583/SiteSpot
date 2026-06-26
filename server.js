/**
 * SiteSpot — server.js
 * Express backend: contact form → email via Nodemailer
 *
 * Setup:
 *   1. cp .env.example .env  a vyplň hodnoty
 *   2. npm install
 *   3. node server.js
 */

require('dotenv').config();
const express    = require('express');
const nodemailer = require('nodemailer');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statické soubory — celý projekt servírujeme z rootu
app.use(express.static(path.join(__dirname)));

// ── Nodemailer transporter ────────────────────────────────
// Funguje s jakýmkoliv SMTP (Gmail, Outlook, Wedos, Forpsi…)
// Pro Gmail: zapni "App Password" v Google účtu (ne heslo k účtu)
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true = port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Rate limiting (jednoduchý in-memory) ─────────────────
// Maximálně 5 zpráv za hodinu ze stejné IP
const rateMap = new Map();
function rateLimit(ip) {
  const now   = Date.now();
  const entry = rateMap.get(ip) || { count: 0, reset: now + 3600_000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 3600_000; }
  entry.count++;
  rateMap.set(ip, entry);
  return entry.count > 5;
}

// ── Sanitize helper ───────────────────────────────────────
function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .slice(0, 1000); // max délka pole
}

// ── GET /api/locale ──────────────────────────────────────
// Vrátí zemi uživatele podle jeho IP adresy
app.get('/api/locale', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

  // Lokální / privátní IP → fallback na češtinu
  const isPrivate = /^(::1|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip);
  if (isPrivate) {
    return res.json({ country: 'CZ' });
  }

  try {
    const response = await fetch(`https://ipapi.co/${ip}/country/`);
    const country = (await response.text()).trim();
    res.json({ country: country || 'XX' });
  } catch {
    res.json({ country: 'XX' });
  }
});

// ── POST /api/contact ─────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

  if (rateLimit(ip)) {
    return res.status(429).json({ ok: false, message: 'Příliš mnoho zpráv. Zkuste to za hodinu.' });
  }

  const { name, email, company, message } = req.body;

  // Validace
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ ok: false, message: 'Jméno a e-mail jsou povinné.' });
  }
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(email)) {
    return res.status(400).json({ ok: false, message: 'Neplatný e-mail.' });
  }

  // E-mail vám (notifikace)
  const toYou = {
    from:    `"SiteSpot Web" <${process.env.SMTP_USER}>`,
    to:      process.env.MAIL_TO || process.env.SMTP_USER,
    replyTo: email,
    subject: `Nová zpráva od ${esc(name)} — SiteSpot`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;color:#111">
        <h2 style="color:#27b7a5;margin-bottom:4px">Nová zpráva z webu</h2>
        <hr style="border:none;border-top:1px solid #eee;margin:12px 0"/>
        <p><strong>Jméno:</strong> ${esc(name)}</p>
        <p><strong>E-mail:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
        ${company ? `<p><strong>Firma:</strong> ${esc(company)}</p>` : ''}
        <p><strong>Zpráva:</strong></p>
        <blockquote style="border-left:3px solid #27b7a5;margin:0;padding:8px 16px;color:#333">
          ${esc(message).replace(/\n/g, '<br/>')}
        </blockquote>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <small style="color:#999">Odesláno z sitespot.cz · IP: ${ip}</small>
      </div>
    `,
  };

  // Potvrzení odesílateli
  const toSender = {
    from:    `"SiteSpot" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: 'Vaši zprávu jsme dostali — SiteSpot',
    html: `
      <div style="font-family:sans-serif;max-width:560px;color:#111">
        <h2 style="color:#27b7a5">Díky, ${esc(name)}!</h2>
        <p>Vaši zprávu jsme obdrželi a ozveme se do 24 hodin.</p>
        <p style="color:#666;font-size:14px">
          Pokud máte urgentní dotaz, napište přímo na
          <a href="mailto:hello@sitespot.cz">hello@sitespot.cz</a>.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <small style="color:#aaa">SiteSpot · Plzeň, Česká republika</small>
      </div>
    `,
  };

  try {
    await transporter.sendMail(toYou);
    await transporter.sendMail(toSender);
    res.json({ ok: true, message: `Zpráva odeslána! Ozvu se do 24 hodin. Díky, ${esc(name)}!` });
  } catch (err) {
    console.error('Mail error:', err);
    res.status(500).json({ ok: false, message: 'Nepodařilo se odeslat. Zkuste to znovu nebo napište přímo na hello@sitespot.cz' });
  }
});

// ── Fallback — SPA ────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✓ SiteSpot běží na http://localhost:${PORT}`);
  transporter.verify().then(() => {
    console.log('✓ SMTP připojení OK');
  }).catch(err => {
    console.warn('⚠ SMTP verify failed:', err.message);
  });
});