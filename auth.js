/*
 * auth.js - LOGIN GATE (register -> email OTP -> Ultraplast approval -> login)
 * ---------------------------------------------------------------------------
 * Talks to the Ultraplast Planner API (the /backend folder: Vercel + Neon Postgres). It is OFF until
 * UCP_CONFIG.auth.endpoint is set, so the planner opens normally while the backend is not set up.
 * No secrets live here. The browser keeps only a short-lived login token in sessionStorage (cleared when the
 * browser/tab is closed); no personal data is stored in the browser.
 * Honest limit: this is a gate on a static page. It controls who gets into the planner screens; it is not a
 * substitute for server-side protection of confidential data (the planner holds none: no prices, no customer files).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.UCPAuth = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var TOKEN_KEY = 'ucp.session', user = null, token = '', cfg = {}, locked = false, gate = null, fetchImpl = null, step = 'login', pendingEmail = '', cooldown = null;
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function store(op, v) { try { var s = typeof sessionStorage !== 'undefined' ? sessionStorage : null; if (!s) return ''; if (op === 'get') return s.getItem(TOKEN_KEY) || ''; if (op === 'set') s.setItem(TOKEN_KEY, v); else s.removeItem(TOKEN_KEY); } catch (e) { /* storage blocked: stay logged in for this page only */ } return ''; }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  /** Same rules as the server (the server checks again). Returns {field: message}. */
  function validateRegister(b) {
    var e = {}, t = function (k) { return String(b[k] === undefined || b[k] === null ? '' : b[k]).trim(); }, ph = t('phone').replace(/[\s\-()]/g, ''), pw = String(b.password || '');
    if (t('name').length < 2) e.name = 'Enter your name.';
    if (t('company').length < 2) e.company = 'Enter your company name.';
    if (!EMAIL_RE.test(t('email'))) e.email = 'Enter a valid email address.';
    if (!/^\+?\d{8,15}$/.test(ph)) e.phone = 'Enter the contact number with country code, e.g. +91 98XXXXXXXX.';
    if (t('purpose').length < 3) e.purpose = 'Tell us the purpose of using the planner.';
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) e.password = 'Password must be at least 8 characters with letters and numbers.';
    if (b.password2 !== undefined && b.password2 !== pw) e.password2 = 'The two passwords are not the same.';
    return e;
  }

  /** One API call. Always resolves {ok, status, body}; never throws. */
  function api(method, path, body, tok) {
    var f = fetchImpl || (typeof fetch === 'function' ? fetch : null), base = String(cfg.endpoint || '').replace(/\/$/, '');
    if (!base) return Promise.resolve({ ok: false, status: 0, body: { ok: false, error: 'Login is not set up on this website yet.' } });
    if (!f) return Promise.resolve({ ok: false, status: 0, body: { ok: false, error: 'This browser cannot reach the login service.' } });
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, cfg.timeoutMs || 20000) : null, headers = { 'Content-Type': 'application/json' };
    if (tok || token) headers.Authorization = 'Bearer ' + (tok || token);
    var url = base + path + (method === 'GET' && body ? '?' + Object.keys(body).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(body[k]); }).join('&') : '');
    return Promise.resolve().then(function () { return f(url, { method: method, headers: headers, body: method === 'GET' ? undefined : JSON.stringify(body || {}), signal: ctl ? ctl.signal : undefined, credentials: 'omit', referrerPolicy: 'no-referrer' }); })
      .then(function (r) { clearTimeout(timer); return r.json().then(function (j) { if (r.status === 401 && token && path !== '/auth/login') relock('Your session ended. Please log in again.'); return { ok: !!(r.ok && j && j.ok), status: r.status, body: j || {} }; }, function () { return { ok: false, status: r.status, body: { ok: false, error: 'The server reply could not be read.' } }; }); })
      .catch(function () { clearTimeout(timer); return { ok: false, status: 0, body: { ok: false, error: 'Network error. Please check your connection and try again.' } }; });
  }

  /* ---------------------------------------------------------------- gate UI */
  function inertPage(on) { ['header.top', '#main', 'footer'].forEach(function (s) { var el = $(s); if (!el) return; if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); } else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); } }); }
  function field(id, label, type, extra) { return '<label class="authf" for="' + id + '"><span>' + label + '</span><input id="' + id + '" name="' + id + '" type="' + (type || 'text') + '" ' + (extra || '') + ' autocomplete="off"><em class="err" id="e_' + id + '" role="alert"></em></label>'; }
  function gateHtml(msg) {
    var tabs = '<div class="authtabs" role="tablist"><button type="button" role="tab" data-astep="login" aria-selected="' + (step === 'login') + '">Login</button><button type="button" role="tab" data-astep="register" aria-selected="' + (step === 'register' || step === 'otp') + '">Register</button></div>', body = '';
    if (step === 'login') body = '<form id="authForm" novalidate><h3>Login</h3>' + field('aEmail', 'Email', 'email', 'inputmode="email" autocomplete="username"') + field('aPass', 'Password', 'password', 'autocomplete="current-password"') + '<p class="err" id="aMsg" role="alert">' + esc(msg || '') + '</p><button class="btn primary" type="submit" id="aGo">Login</button><p class="note">First time here? Press <b>Register</b>. After you verify your email, Ultraplast approves your request and then you can log in.</p></form>';
    else if (step === 'register') body = '<form id="authForm" novalidate><h3>Register</h3><p class="note">Fill in your details. We email a 6-digit code to verify your email, then your request goes to Ultraplast for approval.</p>' +
      field('rName', 'Your name', 'text', 'maxlength="80"') + field('rCompany', 'Company name', 'text', 'maxlength="120"') + field('rEmail', 'Email', 'email', 'inputmode="email"') + field('rPhone', 'Contact number (with country code)', 'tel', 'inputmode="tel" placeholder="+91 98XXXXXXXX"') + field('rPurpose', 'Purpose of using the planner', 'text', 'maxlength="200" placeholder="e.g. plan a bottle line for a customer"') +
      field('rPass', 'Create password', 'password', 'autocomplete="new-password"') + field('rPass2', 'Repeat password', 'password', 'autocomplete="new-password"') + '<p class="err" id="aMsg" role="alert">' + esc(msg || '') + '</p><button class="btn primary" type="submit" id="aGo">Send verification code</button></form>';
    else if (step === 'otp') body = '<form id="authForm" novalidate><h3>Verify your email</h3><p>We sent a 6-digit code to <b>' + esc(pendingEmail) + '</b>. It is valid for a few minutes.</p>' + field('oCode', '6-digit code', 'text', 'inputmode="numeric" maxlength="6" pattern="[0-9]*"') + '<p class="err" id="aMsg" role="alert">' + esc(msg || '') + '</p><button class="btn primary" type="submit" id="aGo">Verify</button> <button class="btn ghost" type="button" id="aResend">Resend code</button></form>';
    else body = '<div id="authForm"><h3>Request submitted</h3><p class="ok" role="status">' + esc(msg || '') + '</p><p class="note">You will get an email when Ultraplast approves your access. Then come back here and log in.</p><button class="btn primary" type="button" data-astep="login">Back to login</button></div>';
    return '<div class="authbox" role="dialog" aria-modal="true" aria-labelledby="authBrand"><div class="authbrand" id="authBrand"><b>ULTRA</b>PLAST <small>Smart Conveyor Planner</small></div>' + (step === 'done' ? '' : tabs) + body + '</div>';
  }
  function showGate(msg) {
    if (typeof document === 'undefined') return; locked = true;
    if (!gate) { gate = document.createElement('div'); gate.id = 'authGate'; gate.className = 'authgate'; document.body.appendChild(gate); gate.addEventListener('click', onClick); gate.addEventListener('submit', onSubmit); }
    gate.innerHTML = gateHtml(msg); inertPage(true); var f = gate.querySelector('input'); if (f) f.focus();
  }
  function hideGate() { locked = false; if (gate) { gate.remove(); gate = null; } inertPage(false); }
  function setMsg(m, good) { var el = $('#aMsg', gate); if (el) { el.textContent = m || ''; el.className = good ? 'ok' : 'err'; } }
  function busy(on) { var b = $('#aGo', gate); if (b) { b.disabled = on; b.dataset.t = b.dataset.t || b.textContent; b.textContent = on ? 'Please wait...' : b.dataset.t; } }
  function showFieldErrors(map, ids) { Object.keys(ids).forEach(function (k) { var el = $('#e_' + ids[k], gate); if (el) el.textContent = map[k] || ''; }); }
  function onClick(e) {
    var t = e.target.closest ? e.target.closest('button') : null; if (!t) return;
    var s = t.getAttribute('data-astep'); if (s) { step = s; showGate(''); return; }
    if (t.id === 'aResend') resend();
  }
  function startCooldown() { var b = $('#aResend', gate); if (!b) return; var n = 30; b.disabled = true; clearInterval(cooldown); cooldown = setInterval(function () { var bb = $('#aResend', gate); if (!bb) { clearInterval(cooldown); return; } n--; if (n <= 0) { clearInterval(cooldown); bb.disabled = false; bb.textContent = 'Resend code'; } else bb.textContent = 'Resend code (' + n + 's)'; }, 1000); }
  function resend() { setMsg(''); api('POST', '/auth/resend', { email: pendingEmail }).then(function (r) { setMsg(r.ok ? 'A new code was sent.' : (r.body.error || 'Could not send the code.'), r.ok); if (r.ok) startCooldown(); }); }
  function onSubmit(e) {
    e.preventDefault(); if (step === 'login') doLogin(); else if (step === 'register') doRegister(); else if (step === 'otp') doVerify();
  }
  function doLogin() {
    var em = $('#aEmail', gate).value.trim(), pw = $('#aPass', gate).value; if (!EMAIL_RE.test(em) || !pw) { setMsg('Enter your email and password.'); return; }
    busy(true); api('POST', '/auth/login', { email: em, password: pw }).then(function (r) {
      busy(false);
      if (r.ok && r.body.token) { token = r.body.token; store('set', token); user = r.body.user; hideGate(); installBar(); return; }
      if (r.body.status === 'unverified') { pendingEmail = em.toLowerCase(); step = 'otp'; showGate('Your email is not verified yet. Press Resend code to get a new code.'); return; }
      setMsg(r.body.error || 'Login failed.');
    });
  }
  var RIDS = { name: 'rName', company: 'rCompany', email: 'rEmail', phone: 'rPhone', purpose: 'rPurpose', password: 'rPass', password2: 'rPass2' };
  function doRegister() {
    var b = { name: $('#rName', gate).value, company: $('#rCompany', gate).value, email: $('#rEmail', gate).value, phone: $('#rPhone', gate).value, purpose: $('#rPurpose', gate).value, password: $('#rPass', gate).value, password2: $('#rPass2', gate).value };
    var er = validateRegister(b); showFieldErrors(er, RIDS); if (Object.keys(er).length) { setMsg('Please fix the highlighted fields.'); return; }
    delete b.password2; busy(true); api('POST', '/auth/register', b).then(function (r) {
      busy(false);
      if (r.ok) { pendingEmail = b.email.trim().toLowerCase(); step = 'otp'; showGate(r.body.message || ''); setMsg(r.body.message || '', true); startCooldown(); return; }
      if (r.body.fields) showFieldErrors(r.body.fields, RIDS);
      if (r.status === 409 && r.body.status === 'approved') { setMsg(r.body.error); return; }
      setMsg(r.body.error || 'Registration failed.');
    });
  }
  function doVerify() {
    var code = $('#oCode', gate).value.trim(); if (!/^\d{6}$/.test(code)) { setMsg('Enter the 6-digit code.'); return; }
    busy(true); api('POST', '/auth/verify', { email: pendingEmail, otp: code }).then(function (r) { busy(false); if (r.ok) { step = 'done'; showGate(r.body.message || 'Email verified.'); } else setMsg(r.body.error || 'Could not verify.'); });
  }

  /* ---------------------------------------------------------------- header bar (after login) */
  function installBar() {
    if (typeof document === 'undefined' || !user) return; var host = $('header.top .tools') || $('header.top .wrap') || $('header.top'); if (!host) return;
    var old = $('#authBar'); if (old) old.remove();
    var bar = document.createElement('span'); bar.id = 'authBar'; bar.className = 'authbar';
    bar.innerHTML = '<span class="authwho" title="' + esc(user.email) + '">' + esc(user.name) + (user.company ? ' &middot; ' + esc(user.company) : '') + '</span>' + (user.role === 'admin' ? '<button type="button" class="btn gold sm" id="btnSettings" title="Admin settings: users, mail, database">Settings</button>' : '') + '<button type="button" class="btn ghost sm" id="btnLogout">Logout</button>';
    host.appendChild(bar);
    bar.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('button') : null; if (!b) return; if (b.id === 'btnLogout') logout(); else if (b.id === 'btnSettings' && typeof window !== 'undefined' && window.UCPSettings) window.UCPSettings.open({ api: api, user: user }); });
  }
  function logout() { token = ''; user = null; store('clear'); var b = $('#authBar'); if (b) b.remove(); if (typeof window !== 'undefined' && window.UCPSettings) window.UCPSettings.close(); step = 'login'; showGate('You are logged out.'); }
  function relock(msg) { if (locked) return; token = ''; user = null; store('clear'); var b = $('#authBar'); if (b) b.remove(); if (typeof window !== 'undefined' && window.UCPSettings) window.UCPSettings.close(); step = 'login'; showGate(msg); }

  function init(config, opts) {
    cfg = config || {}; opts = opts || {}; if (opts.fetch) fetchImpl = opts.fetch;
    var enabled = !!(cfg.endpoint) && cfg.enabled !== false; if (!enabled || typeof document === 'undefined') return Promise.resolve({ enabled: false });
    token = store('get'); showGate('');
    if (!token) return Promise.resolve({ enabled: true, user: null });
    return api('GET', '/auth/me').then(function (r) { if (r.ok && r.body.user) { user = r.body.user; hideGate(); installBar(); return { enabled: true, user: user }; } token = ''; store('clear'); return { enabled: true, user: null }; });
  }
  return { init: init, api: api, validateRegister: validateRegister, logout: logout, user: function () { return user; }, isLocked: function () { return locked; } };
});
if (typeof window !== 'undefined' && window.UCP_CONFIG && window.UCP_CONFIG.auth) { (function () { var go = function () { window.UCPAuth.init(window.UCP_CONFIG.auth); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go(); })(); }
