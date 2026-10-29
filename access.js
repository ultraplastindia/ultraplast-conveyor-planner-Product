/*
 * access.js - COSTING ACCESS (ask once, owner approves, owner can revoke any time)
 * ---------------------------------------------------------------------------
 * How it works: a visitor presses "Costing" and sends a request (name, company, mobile, email).
 * The request lands in the "CostingAccess" tab of your Google Sheet as Pending. You set Status to
 * Approved (access) or Revoked (stops it). The browser only keeps a random device code; every time
 * Costing is opened, and every 2 minutes while it is open, the status is checked again, so a
 * revoke takes effect quickly.
 *
 * Honest limits: this is an approval gate on the page, not bank-grade security. The tool ships with
 * NO prices (staff type their own rates), so nothing confidential is exposed by the page itself.
 * If the approval service is not configured or cannot be reached, Costing stays LOCKED.
 * No secrets live in this file; only a random device code is kept in the browser (no personal data).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.UCPAccess = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var ID_KEY = 'ucp.deviceId';

  function randomId() {
    var a = [], i, c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null;
    if (c) { var u = new Uint8Array(16); c.getRandomValues(u); for (i = 0; i < 16; i++) a.push(('0' + u[i].toString(16)).slice(-2)); }
    else { for (i = 0; i < 16; i++) a.push(('0' + Math.floor(Math.random() * 256).toString(16)).slice(-2)); }
    return a.join('');
  }
  /** Random per-browser code. Not personal data. Falls back to an in-memory code if storage is blocked. */
  var memId = null;
  function deviceId(storage) {
    try { var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null); if (s) { var v = s.getItem(ID_KEY); if (!/^[a-f0-9]{32}$/.test(v || '')) { v = randomId(); s.setItem(ID_KEY, v); } return v; } } catch (e) { }
    if (!memId) memId = randomId(); return memId;
  }

  function validateWho(w) {
    var e = {}; w = w || {}; var t = function (k) { return String(w[k] === undefined || w[k] === null ? '' : w[k]).trim(); };
    if (t('name').length < 2) e.name = 'Enter your name.';
    if (t('company').length < 2) e.company = 'Enter your company name.';
    if (!/^\+\d{8,15}$/.test(t('mobile').replace(/[\s\-()]/g, ''))) e.mobile = 'Enter the mobile with country code, e.g. +91 98XXXXXXXX.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t('email'))) e.email = 'Enter a valid email.';
    return e;
  }

  /** POST one action to the Apps Script. @returns Promise<{state:'approved'|'pending'|'revoked'|'none'|'not_configured'|'failed', message}> */
  function call(cfg, body, fetchImpl) {
    var f = fetchImpl || (typeof fetch === 'function' ? fetch : null); cfg = cfg || {};
    if (!cfg.endpoint) return Promise.resolve({ state: 'not_configured', message: 'Costing approval is not set up on this website yet, so Costing stays locked. Please contact Ultraplast.' });
    if (!f) return Promise.resolve({ state: 'failed', message: 'This browser cannot reach the approval service.' });
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, timedOut = false, timer = null;
    var timeout = new Promise(function (resolve) { timer = setTimeout(function () { timedOut = true; if (ctl) ctl.abort(); resolve({ state: 'failed', message: 'The approval service did not answer in time. Costing stays locked. Try again.' }); }, cfg.timeoutMs || 15000); });
    var req = Promise.resolve().then(function () {
      return f(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined, credentials: 'omit', referrerPolicy: 'no-referrer' });
    }).then(function (resp) {
      if (!resp || !resp.ok) return { state: 'failed', message: 'The approval service returned an error. Costing stays locked.' };
      return resp.json().then(function (j) {
        if (!j || j.ok !== true) return { state: 'failed', message: 'The approval service did not accept the request (' + (j && j.error ? j.error : 'unknown') + '). Costing stays locked.' };
        var s = String(j.status || '');
        return { state: s === 'approved' || s === 'pending' || s === 'revoked' || s === 'none' ? s : 'failed', message: '' };
      }, function () { return { state: 'failed', message: 'The approval reply could not be read. Costing stays locked.' }; });
    }).catch(function () { return timedOut ? null : { state: 'failed', message: 'Network error. Costing stays locked. Check your connection and try again.' }; });
    return Promise.race([req, timeout]).then(function (r) { clearTimeout(timer); return r || { state: 'failed', message: 'The approval service did not answer in time. Costing stays locked.' }; });
  }
  function check(cfg, id, fetchImpl) { return call(cfg, { action: 'costingCheck', id: id }, fetchImpl); }
  function request(cfg, id, who, fetchImpl) {
    var e = validateWho(who); if (Object.keys(e).length) return Promise.resolve({ state: 'invalid', errors: e, message: 'Please fix the highlighted fields.' });
    return call(cfg, { action: 'costingRequest', id: id, who: { name: String(who.name).trim(), company: String(who.company).trim(), mobile: String(who.mobile).replace(/[\s\-()]/g, ''), email: String(who.email).trim() } }, fetchImpl);
  }

  /* ------------------------------------------------------------ browser UI (dialog) */
  var dlg = null;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function closeDlg() { if (dlg) { dlg.remove(); dlg = null; } }
  function showDlg(html) {
    if (typeof document === 'undefined') return null;
    closeDlg(); dlg = document.createElement('div'); dlg.className = 'accessback';
    dlg.innerHTML = '<div class="accessbox" role="dialog" aria-modal="true" aria-labelledby="accTitle">' + html + '</div>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDlg(); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDlg(); });
    var f = dlg.querySelector('input,button'); if (f) f.focus(); return dlg;
  }
  /** Run the whole gate. cfg = enquiry config (endpoint). Resolves true only when owner-approved. */
  function gate(cfg, fetchImpl) {
    var id = deviceId();
    return check(cfg, id, fetchImpl).then(function (r) {
      if (r.state === 'approved') { closeDlg(); return true; }
      if (r.state === 'pending') { showDlg(pendingHtml()); wireClose(); return false; }
      if (r.state === 'revoked') { showDlg('<h3 id="accTitle">Costing access has been withdrawn</h3><p>Your access to Costing was turned off by Ultraplast. Please contact Ultraplast if you think this is a mistake.</p><div class="btnrow"><button type="button" class="btn" data-acc-close>Close</button></div>'); wireClose(); return false; }
      if (r.state === 'none') return new Promise(function (resolve) { askForm(cfg, id, fetchImpl, resolve); });
      showDlg('<h3 id="accTitle">Costing is locked</h3><p class="err">' + esc(r.message) + '</p><div class="btnrow"><button type="button" class="btn" data-acc-close>Close</button></div>'); wireClose(); return false;
    });
  }
  function pendingHtml() { return '<h3 id="accTitle">Waiting for approval</h3><p>Your request has been recorded. Ultraplast will approve it. After that, press <b>Costing</b> again. You only need to ask once on this device.</p><div class="btnrow"><button type="button" class="btn" data-acc-close>Close</button></div>'; }
  function wireClose() { if (!dlg) return; var b = dlg.querySelectorAll('[data-acc-close]'); for (var i = 0; i < b.length; i++) b[i].addEventListener('click', closeDlg); }
  function askForm(cfg, id, fetchImpl, resolve) {
    showDlg('<h3 id="accTitle">Costing needs approval (one time)</h3><p class="note">Costing is for Ultraplast staff and approved partners. Send this request once; Ultraplast approves it and can withdraw it at any time. Your details are used only to decide this request.</p>' +
      '<form id="accForm" novalidate><div class="field"><label for="acc_name">Your name</label><input id="acc_name" type="text" autocomplete="name"><p class="err" data-e="name"></p></div>' +
      '<div class="field"><label for="acc_company">Company</label><input id="acc_company" type="text" autocomplete="organization"><p class="err" data-e="company"></p></div>' +
      '<div class="field"><label for="acc_mobile">Mobile (with country code)</label><input id="acc_mobile" type="tel" placeholder="+91 98XXXXXXXX" autocomplete="tel"><p class="err" data-e="mobile"></p></div>' +
      '<div class="field"><label for="acc_email">Email</label><input id="acc_email" type="email" autocomplete="email"><p class="err" data-e="email"></p></div>' +
      '<p class="err" id="accMsg" role="alert"></p><div class="btnrow"><button type="submit" class="btn" id="accSend">Request access</button><button type="button" class="btn ghost" data-acc-close>Cancel</button></div></form>');
    wireClose(); if (!dlg) return resolve(false);
    dlg.querySelector('[data-acc-close]').addEventListener('click', function () { resolve(false); });
    dlg.querySelector('#accForm').addEventListener('submit', function (ev) {
      ev.preventDefault(); var who = { name: dlg.querySelector('#acc_name').value, company: dlg.querySelector('#acc_company').value, mobile: dlg.querySelector('#acc_mobile').value, email: dlg.querySelector('#acc_email').value };
      var btn = dlg.querySelector('#accSend'); btn.disabled = true; dlg.querySelector('#accMsg').textContent = 'Sending...';
      request(cfg, id, who, fetchImpl).then(function (r) {
        if (!dlg) return resolve(false);
        btn.disabled = false;
        ['name', 'company', 'mobile', 'email'].forEach(function (k) { var p = dlg.querySelector('[data-e="' + k + '"]'); if (p) p.textContent = (r.errors && r.errors[k]) || ''; });
        if (r.state === 'invalid') { dlg.querySelector('#accMsg').textContent = r.message; return; }
        if (r.state === 'approved') { closeDlg(); return resolve(true); }
        if (r.state === 'pending') { showDlg('<h3 id="accTitle">Request sent</h3><p>Your request is recorded and <b>waiting for Ultraplast approval</b>. After approval, press <b>Costing</b> again. You only need to ask once on this device.</p><div class="btnrow"><button type="button" class="btn" data-acc-close>Close</button></div>'); wireClose(); return resolve(false); }
        dlg.querySelector('#accMsg').textContent = r.message || 'The request could not be sent. Costing stays locked.';
      });
    });
  }

  return { deviceId: deviceId, validateWho: validateWho, check: check, request: request, gate: gate, closeDialog: closeDlg };
});
