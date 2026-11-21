/* NexCRM: cookie consent + Google Analytics 4.
   Analytics only loads after the visitor accepts. The choice is stored in
   localStorage ("nx_consent" = "granted" | "denied") and can be changed from
   any element with data-cookie-settings (footer link "Cookie settings"). */
(function () {
  var GA_ID = 'G-PENDING';
  if (!/^G-[A-Z0-9]{6,}$/.test(GA_ID)) GA_ID = '';

  var KEY = 'nx_consent';
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function isAr() { return (document.documentElement.lang || '').slice(0, 2) === 'ar'; }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', wait_for_update: 500
  });

  var loaded = false;
  function loadGA() {
    if (loaded || !GA_ID) return;
    loaded = true;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, { site_language: isAr() ? 'ar' : 'en' });
  }

  // Conversion + intent events (only sent once GA is loaded and consented)
  document.addEventListener('click', function (e) {
    if (!loaded) return;
    var a = e.target.closest && e.target.closest('a,button');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('wa.me/') !== -1) gtag('event', 'contact', { method: 'whatsapp', link_id: a.id || '' });
    else if (href.indexOf('nexcrm-jet.vercel.app') !== -1) gtag('event', 'view_demo', { link_id: a.id || '' });
    else if ((a.getAttribute('onclick') || '').indexOf('openLeadModal') !== -1) gtag('event', 'begin_trial_request', { link_id: a.id || '' });
  }, true);

  var css = '#nx-cc{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;' +
    'background:#0e1420;border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:16px 18px;' +
    'color:#f1f5ff;font-family:inherit;font-size:14px;line-height:1.6;box-shadow:0 12px 40px rgba(0,0,0,0.45)}' +
    '#nx-cc p{margin:0 0 12px;color:#aab6cc}#nx-cc a{color:#7aa2ff}' +
    '#nx-cc .nx-cc-b{display:flex;gap:10px;flex-wrap:wrap}' +
    '#nx-cc button{font-family:inherit;font-size:14px;font-weight:600;border-radius:10px;padding:9px 18px;cursor:pointer}' +
    '#nx-cc .nx-ok{background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;border:none}' +
    '#nx-cc .nx-no{background:transparent;color:#f1f5ff;border:1px solid rgba(255,255,255,0.2)}' +
    '#nx-cc button:focus-visible{outline:2px solid #7aa2ff;outline-offset:2px}';

  function close() { var b = document.getElementById('nx-cc'); if (b) b.remove(); }
  function show() {
    if (!GA_ID || document.getElementById('nx-cc')) return;
    if (!document.getElementById('nx-cc-css')) {
      var st = document.createElement('style'); st.id = 'nx-cc-css'; st.textContent = css; document.head.appendChild(st);
    }
    var ar = isAr();
    var box = document.createElement('div');
    box.id = 'nx-cc'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-live', 'polite');
    box.setAttribute('aria-label', ar ? 'ملفات تعريف الارتباط' : 'Cookies');
    box.dir = ar ? 'rtl' : 'ltr';
    box.innerHTML = ar
      ? '<p>نستخدم ملفات تعريف الارتباط التحليلية لنعرف كيف يُستخدم الموقع ونحسّنه. لا نحمّلها إلا بموافقتك. <a href="/privacy">سياسة الخصوصية</a></p>' +
        '<div class="nx-cc-b"><button class="nx-ok" type="button">موافق</button><button class="nx-no" type="button">رفض</button></div>'
      : '<p>We use analytics cookies to understand how the site is used and improve it. They only load if you agree. <a href="/privacy">Privacy Policy</a></p>' +
        '<div class="nx-cc-b"><button class="nx-ok" type="button">Accept</button><button class="nx-no" type="button">Decline</button></div>';
    box.querySelector('.nx-ok').onclick = function () { set('granted'); close(); loadGA(); };
    box.querySelector('.nx-no').onclick = function () {
      var was = get(); set('denied'); close();
      if (was === 'granted') { gtag('consent', 'update', { analytics_storage: 'denied' }); location.reload(); }
    };
    document.body.appendChild(box);
  }

  function init() {
    var c = get();
    if (c === 'granted') loadGA(); else if (c !== 'denied') show();
    document.querySelectorAll('[data-cookie-settings]').forEach(function (el) {
      if (!GA_ID) { el.style.display = 'none'; return; }
      el.addEventListener('click', function (e) { e.preventDefault(); show(); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
