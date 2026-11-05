/*
 * settings-panel.js - ADMIN-ONLY Settings panel (users & approvals, mail, rules, database, my account, audit log).
 * Opened from the "Settings" button that auth.js shows only to admins. Every action is also checked again on the server.
 */
(function () {
  'use strict';
  var ctx = null, box = null, tab = 'users', filter = 'pending', cache = {};
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s) { return box ? box.querySelector(s) : null; }
  function fmt(d) { if (!d) return '-'; var x = new Date(d); return isNaN(x) ? esc(d) : x.toLocaleString(); }
  var TABS = [['users', 'Users & approvals'], ['mail', 'Mail'], ['rules', 'Registration rules'], ['db', 'Database'], ['me', 'My account'], ['audit', 'Audit log']];

  function open(c) {
    if (!c || !c.user || c.user.role !== 'admin') return; ctx = c; close();
    box = document.createElement('div'); box.id = 'setPanel'; box.className = 'setback';
    box.innerHTML = '<div class="setbox" role="dialog" aria-modal="true" aria-label="Admin settings"><div class="sethead"><b>Admin settings</b><button type="button" class="btn ghost sm" data-sclose>Close</button></div><div class="settabs" role="tablist">' +
      TABS.map(function (t) { return '<button type="button" role="tab" data-stab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div class="setbody" id="setBody">Loading...</div></div>';
    document.body.appendChild(box); box.addEventListener('click', onClick); box.addEventListener('submit', function (e) { e.preventDefault(); });
    go(tab);
  }
  function close() { if (box) { box.remove(); box = null; } }
  function go(t) { tab = t; if (!box) return; [].forEach.call(box.querySelectorAll('[data-stab]'), function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-stab') === t)); }); ({ users: users, mail: mail, rules: rules, db: db, me: me, audit: audit })[t](); }
  function body(h) { var b = $('#setBody'); if (b) b.innerHTML = h; }
  function say(m, good) { var el = $('#setMsg'); if (el) { el.textContent = m || ''; el.className = good ? 'ok' : 'err'; } }
  function call(m, p, b) { return ctx.api(m, p, b); }

  /* ---- Users */
  function users() {
    body('<div class="setbar">' + ['pending', 'approved', 'rejected', 'revoked', 'unverified', 'all'].map(function (s) { return '<button type="button" class="chip" data-sfilter="' + s + '" aria-pressed="' + (filter === s) + '">' + s + '</button>'; }).join('') + '</div><p id="setMsg" role="status"></p><div id="uList">Loading...</div>');
    call('GET', '/admin/users', { status: filter }).then(function (r) {
      var el = $('#uList'); if (!el) return; if (!r.ok) { el.innerHTML = '<p class="err">' + esc(r.body.error || 'Could not load users.') + '</p>'; return; }
      var list = r.body.users || []; if (!list.length) { el.innerHTML = '<p class="note">No users in "' + esc(filter) + '".</p>'; return; }
      el.innerHTML = '<div class="settable"><table><thead><tr><th>Name / company</th><th>Contact</th><th>Purpose</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + list.map(function (u) {
        var acts = []; if (u.status === 'pending') acts.push(['approve', 'Approve', 'primary'], ['reject', 'Reject', 'ghost']); if (u.status === 'approved') acts.push(['revoke', 'Revoke', 'ghost']); if (u.status === 'revoked' || u.status === 'rejected') acts.push(['restore', 'Approve again', 'primary']);
        if (u.status === 'approved') acts.push([u.role === 'admin' ? 'make-user' : 'make-admin', u.role === 'admin' ? 'Make user' : 'Make admin', 'ghost']); if (u.status === 'approved') acts.push(['reset-password', 'Reset password', 'ghost']); acts.push(['delete', 'Delete', 'ghost']);
        return '<tr><td><b>' + esc(u.name) + '</b>' + (u.role === 'admin' ? ' <span class="badge">admin</span>' : '') + '<br>' + esc(u.company) + '</td><td>' + esc(u.email) + '<br>' + esc(u.phone) + '</td><td>' + esc(u.purpose) + '<br><small>Registered ' + fmt(u.createdAt) + '</small></td><td>' + esc(u.status) + (u.note ? '<br><small>' + esc(u.note) + '</small>' : '') + '</td><td>' +
          acts.map(function (a) { return '<button type="button" class="btn sm ' + a[2] + '" data-uact="' + a[0] + '" data-uid="' + esc(u.id) + '" data-uname="' + esc(u.email) + '">' + a[1] + '</button>'; }).join(' ') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    });
  }
  function userAct(act, id, who) {
    var b = { id: id, action: act };
    if (act === 'delete' && !confirm('Delete ' + who + ' permanently?')) return;
    if (act === 'reject') { var n = prompt('Reason for rejecting (shown to the user; optional):', ''); if (n === null) return; b.note = n; }
    if (act === 'reset-password') { var p = prompt('New password for ' + who + ' (min 8 characters, letters and numbers):', ''); if (!p) return; b.password = p; }
    call('POST', '/admin/user-action', b).then(function (r) { if (r.ok) users(); else say(r.body.error || 'Action failed.'); });
  }

  /* ---- Mail */
  function mail() {
    body('<p id="setMsg" role="status"></p><div id="mailBox">Loading...</div>');
    call('GET', '/admin/settings').then(function (r) {
      var el = $('#mailBox'); if (!el) return; if (!r.ok) { el.innerHTML = '<p class="err">' + esc(r.body.error || 'Could not load.') + '</p>'; return; }
      cache = r.body; var m = r.body.mail;
      el.innerHTML = '<p>' + (m ? 'Sending mail from <b>' + esc(m.user) + '</b> (' + esc(m.host) + ':' + esc(m.port) + ')' + (m.verifiedAt ? ' - verified ' + fmt(m.verifiedAt) : ' - <span class="err">not verified</span>') : (r.body.mailSource ? 'Using the server mail settings (' + esc(r.body.mailSource) + ').' : '<span class="err">No mail connected yet. OTP emails cannot be sent.</span>')) + '</p>' +
        (r.body.settingsKeySet ? '' : '<p class="err">SETTINGS_KEY is not set on the server, so a mail password cannot be stored. See the setup guide.</p>') +
        '<form id="mailForm" novalidate><label class="authf"><span>Mail id (any provider)</span><input id="mUser" type="email" value="' + esc(m ? m.user : '') + '" autocomplete="off"></label>' +
        '<label class="authf"><span>App password / mail secret key</span><input id="mPass" type="password" autocomplete="new-password" placeholder="' + (m && m.hasPassword ? 'Saved - leave empty to keep it' : 'Paste it here') + '"></label>' +
        '<label class="authf"><span>From name</span><input id="mFrom" type="text" value="' + esc(m ? m.fromName : 'Ultraplast Planner') + '"></label>' +
        '<p id="mDet" class="note"></p><details><summary>Advanced: server (SMTP) details</summary><div class="setgrid"><label class="authf"><span>Host</span><input id="mHost" type="text" value="' + esc(m ? m.host : '') + '" placeholder="auto"></label><label class="authf"><span>Port</span><input id="mPort" type="number" value="' + esc(m ? m.port : '') + '" placeholder="auto"></label><label class="authf"><span>Secure (SSL)</span><select id="mSecure"><option value="">auto</option><option value="true">yes (465)</option><option value="false">no / STARTTLS (587)</option></select></label></div></details>' +
        '<button class="btn primary" type="button" data-smail="save">Save &amp; connect</button> <button class="btn ghost" type="button" data-smail="detect">Detect server</button>' + (m ? ' <button class="btn ghost" type="button" data-smail="remove">Remove</button>' : '') + '</form>' +
        '<h4>Send a test mail</h4><div class="setrow"><input id="mTo" type="email" placeholder="send test to..." value="' + esc(ctx.user.email) + '"><button class="btn ghost" type="button" data-smail="test">Send test</button></div>' +
        '<p class="note">Gmail: turn on 2-Step Verification, then create an App Password. Outlook / Zoho / company mail: use that provider\'s app password. The password is encrypted on the server and is never shown again.</p>';
    });
  }
  function mailAct(a) {
    var em = ($('#mUser') || {}).value || '';
    if (a === 'detect') { call('POST', '/admin/mail-detect', { email: em }).then(function (r) { var d = r.body.smtp; $('#mDet').textContent = r.ok && d ? 'Detected: ' + d.host + ':' + d.port + (d.secure ? ' (SSL)' : ' (STARTTLS)') + (d.provider ? ' - ' + d.provider : '') : (r.body.error || 'Could not detect.'); }); return; }
    if (a === 'remove') { if (confirm('Remove the saved mail connection?')) call('POST', '/admin/mail-remove', {}).then(function () { mail(); }); return; }
    if (a === 'test') { say('Sending...', true); call('POST', '/admin/mail-test', { to: ($('#mTo') || {}).value }).then(function (r) { say(r.ok ? r.body.message : (r.body.error || 'Test failed.'), r.ok); }); return; }
    say('Connecting and checking the login...', true);
    call('POST', '/admin/mail', { email: em, appPassword: $('#mPass').value, fromName: $('#mFrom').value, host: $('#mHost').value, port: $('#mPort').value, secure: $('#mSecure').value }).then(function (r) {
      if (r.ok) { say(r.body.message, !!r.body.verified); setTimeout(function () { if (box && tab === 'mail') { var s = $('#setMsg'), t = s && s.textContent, c = s && s.className; mail(); setTimeout(function () { say(t, c === 'ok'); }, 400); } }, 50); }
      else { say((r.body.error || 'Could not connect.') + (r.body.smtp ? ' (tried ' + r.body.smtp.host + ':' + r.body.smtp.port + ')' : '')); }
    });
  }

  /* ---- Rules */
  function rules() {
    body('<p id="setMsg" role="status"></p><div id="rBox">Loading...</div>');
    call('GET', '/admin/settings').then(function (r) {
      var el = $('#rBox'); if (!el) return; if (!r.ok) { el.innerHTML = '<p class="err">' + esc(r.body.error) + '</p>'; return; } var R = r.body.rules || {};
      el.innerHTML = '<form novalidate><label class="authf"><span>OTP valid for (minutes, 3-30)</span><input id="rOtp" type="number" min="3" max="30" value="' + esc(R.otpMinutes || 10) + '"></label>' +
        '<label class="setchk"><input id="rReq" type="checkbox"' + (R.requireApproval !== false ? ' checked' : '') + '> Require Ultraplast approval after email verification</label>' +
        '<label class="setchk"><input id="rNot" type="checkbox"' + (R.notifyAdmin !== false ? ' checked' : '') + '> Email the admins when a new request arrives</label>' +
        '<label class="authf"><span>Allowed email domains (empty = any)</span><input id="rAllow" type="text" value="' + esc([].concat(R.allowedDomains || []).join(', ')) + '" placeholder="e.g. ultraplastindia.in, customer.com"></label>' +
        '<label class="authf"><span>Blocked email domains</span><input id="rBlock" type="text" value="' + esc([].concat(R.blockedDomains || []).join(', ')) + '" placeholder="e.g. mailinator.com"></label><button class="btn primary" type="button" data-srules>Save rules</button></form>';
    });
  }
  function saveRules() { call('POST', '/admin/rules', { otpMinutes: $('#rOtp').value, requireApproval: $('#rReq').checked, notifyAdmin: $('#rNot').checked, allowedDomains: $('#rAllow').value, blockedDomains: $('#rBlock').value }).then(function (r) { say(r.ok ? 'Rules saved.' : (r.body.error || 'Could not save.'), r.ok); }); }

  /* ---- Database */
  function db() {
    body('<p id="setMsg" role="status"></p><div id="dBox">Checking...</div>');
    call('GET', '/admin/db').then(function (r) {
      var el = $('#dBox'); if (!el) return; if (!r.ok) { el.innerHTML = '<p class="err">' + esc(r.body.error || 'Could not check.') + '</p>'; return; }
      var c = r.body.counts || {};
      el.innerHTML = (r.body.connected ? '<p class="ok">Neon database connected.</p><ul>' + Object.keys(c).map(function (k) { return '<li>' + esc(k) + ': <b>' + esc(c[k]) + '</b> rows</li>'; }).join('') + '</ul>' : '<p class="err">' + esc(r.body.error || 'Not connected.') + '</p>') +
        '<button class="btn ghost" type="button" data-sdb>Run database setup</button><p class="note">Creates the tables if they are missing. Safe to press again; it never deletes data.</p>';
    });
  }

  /* ---- My account */
  function me() {
    body('<p>Logged in as <b>' + esc(ctx.user.name) + '</b> (' + esc(ctx.user.email) + ')</p><p id="setMsg" role="status"></p><form novalidate><label class="authf"><span>Current password</span><input id="pOld" type="password" autocomplete="current-password"></label><label class="authf"><span>New password</span><input id="pNew" type="password" autocomplete="new-password"></label><button class="btn primary" type="button" data-spw>Change password</button></form>');
  }
  function changePw() { call('POST', '/auth/change-password', { oldPassword: $('#pOld').value, currentPassword: $('#pOld').value, newPassword: $('#pNew').value }).then(function (r) { say(r.ok ? 'Password changed.' : (r.body.error || 'Could not change.'), r.ok); if (r.ok) { $('#pOld').value = ''; $('#pNew').value = ''; } }); }

  /* ---- Audit */
  function audit() {
    body('<div id="aBox">Loading...</div>'); call('GET', '/admin/audit').then(function (r) {
      var el = $('#aBox'); if (!el) return; if (!r.ok) { el.innerHTML = '<p class="err">' + esc(r.body.error) + '</p>'; return; }
      el.innerHTML = '<div class="settable"><table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead><tbody>' + (r.body.rows || []).map(function (x) { return '<tr><td>' + fmt(x.at) + '</td><td>' + esc(x.actor) + '</td><td>' + esc(x.action) + '</td><td>' + esc(x.target) + '</td><td>' + esc(x.detail) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    });
  }

  function onClick(e) {
    var t = e.target.closest ? e.target.closest('button') : null; if (!t) return;
    if (t.hasAttribute('data-sclose')) return close();
    if (t.getAttribute('data-stab')) return go(t.getAttribute('data-stab'));
    if (t.getAttribute('data-sfilter')) { filter = t.getAttribute('data-sfilter'); return users(); }
    if (t.getAttribute('data-uact')) return userAct(t.getAttribute('data-uact'), t.getAttribute('data-uid'), t.getAttribute('data-uname'));
    if (t.getAttribute('data-smail')) return mailAct(t.getAttribute('data-smail'));
    if (t.hasAttribute('data-srules')) return saveRules();
    if (t.hasAttribute('data-sdb')) { say('Running...', true); return call('POST', '/admin/db-setup', {}).then(function (r) { say(r.ok ? r.body.message : (r.body.error || 'Failed.'), r.ok); }); }
    if (t.hasAttribute('data-spw')) return changePw();
  }
  window.UCPSettings = { open: open, close: close };
})();
