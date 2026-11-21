// Builds the deployed site into ./dist on every Vercel deploy.
//   /      -> Arabic page (static Arabic HTML, so Google indexes Arabic text)
//   /en/   -> English page
// index.html stays the single source you edit. The translations come from the
// T dictionary inside it, exactly as the in-page language switch applies them.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'dist');
const SITE = 'https://www.getnexcrm.com';
const SKIP = new Set(['dist', 'node_modules', '.git', '.github', 'build.mjs', 'package.json',
  'package-lock.json', 'vercel.json', 'README.md', '.gitignore', '.vercel']);

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// 1. Pull the T dictionary out of the page script and evaluate it in isolation.
const start = src.indexOf('const T = {');
const end = src.indexOf('function toggleLang');
if (start < 0 || end < 0) throw new Error('Translation dictionary not found');
const ctx = {};
vm.runInNewContext(src.slice(start, end) + '\n;this.T = T;', ctx);
const T = ctx.T;
if (!T || !T.ar || !T.en) throw new Error('T.ar / T.en missing');

const META = {
  ar: {
    title: 'NexCRM | نظام CRM عربي للشركات في السعودية — واتساب وفواتير زاتكا',
    desc: 'نظام إدارة علاقات العملاء (CRM) عربي مصمم للشركات السعودية: صندوق واتساب موحّد، تقييم العملاء بالذكاء الاصطناعي، فواتير ضريبية برمز زاتكا، وسعر ثابت غير مرتبط بعدد المستخدمين. جرّبه مجاناً 14 يوماً.',
    url: SITE + '/', locale: 'ar_SA', alt: 'en_US', dir: 'rtl',
  },
  en: {
    title: 'NexCRM — The Arabic-First CRM Built for Saudi Business',
    desc: 'The Arabic-first CRM for Saudi businesses: one WhatsApp inbox, AI lead scoring, ZATCA QR VAT invoices and a flat monthly price, not per seat. Start a 14-day free trial.',
    url: SITE + '/en/', locale: 'en_US', alt: 'ar_SA', dir: 'ltr',
  },
};

function setAttr(doc, sel, attr, val) {
  doc.querySelectorAll(sel).forEach((el) => el.setAttribute(attr, val));
}

function build(lang) {
  const { document } = parseHTML(src);
  const m = META[lang];
  const html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', m.dir);
  if (lang === 'ar') document.body.classList.add('ar'); else document.body.classList.remove('ar');

  // Same order as the runtime switch: T[lang] applied by element id.
  for (const [id, val] of Object.entries(T[lang])) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = val;
  }

  // Head: per-language title, description, canonical, hreflang, social tags.
  document.title = m.title;
  setAttr(document, 'meta[name="description"]', 'content', m.desc);
  setAttr(document, 'meta[property="og:title"], meta[name="twitter:title"]', 'content', m.title);
  setAttr(document, 'meta[property="og:description"], meta[name="twitter:description"]', 'content', m.desc);
  setAttr(document, 'meta[property="og:url"]', 'content', m.url);
  setAttr(document, 'meta[property="og:locale"]', 'content', m.locale);
  setAttr(document, 'meta[property="og:locale:alternate"]', 'content', m.alt);
  setAttr(document, 'link[rel="canonical"]', 'href', m.url);
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((l) => l.remove());
  const canon = document.querySelector('link[rel="canonical"]');
  for (const [hl, href] of [['ar', SITE + '/'], ['en', SITE + '/en/'], ['x-default', SITE + '/']]) {
    const l = document.createElement('link');
    l.setAttribute('rel', 'alternate'); l.setAttribute('hreflang', hl); l.setAttribute('href', href);
    canon.after(l);
  }
  const flag = document.createElement('script');
  flag.textContent = `window.NX_PAGE_LANG=${JSON.stringify(lang)};`;
  document.head.prepend(flag);
  // charset must stay first in <head>
  const charset = document.querySelector('meta[charset]');
  if (charset) document.head.prepend(charset);

  let out = '<!DOCTYPE html>\n' + html.outerHTML;
  // Root-relative asset paths so /en/ resolves favicons, images, scripts.
  out = out.replace(/\b(src|href)="(?!https?:|\/|#|mailto:|tel:|data:|javascript:)([^"]+)"/g, '$1="/$2"');
  return out;
}

// 2. Copy static files, then write the two language pages.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(ROOT)) {
  if (SKIP.has(f) || f.startsWith('.')) continue;
  const p = path.join(ROOT, f);
  if (fs.statSync(p).isFile()) fs.copyFileSync(p, path.join(OUT, f));
}
fs.writeFileSync(path.join(OUT, 'index.html'), build('ar'));
fs.mkdirSync(path.join(OUT, 'en'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'en', 'index.html'), build('en'));

// 3. Sitemap with hreflang pairs.
const today = new Date().toISOString().slice(0, 10);
const pair = '\n    <xhtml:link rel="alternate" hreflang="ar" href="' + SITE + '/"/>' +
  '\n    <xhtml:link rel="alternate" hreflang="en" href="' + SITE + '/en/"/>' +
  '\n    <xhtml:link rel="alternate" hreflang="x-default" href="' + SITE + '/"/>';
const urls = [
  [SITE + '/', '1.0', pair],
  [SITE + '/en/', '0.9', pair],
  [SITE + '/privacy', '0.3', ''],
  [SITE + '/terms', '0.3', ''],
];
fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
  urls.map(([u, pr, alt]) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${pr}</priority>${alt}\n  </url>`).join('\n') +
  '\n</urlset>\n');

console.log('Built dist/: / (ar), /en/ (en), sitemap with', urls.length, 'URLs');
