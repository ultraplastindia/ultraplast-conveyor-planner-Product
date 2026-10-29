/**
 * Ultraplast Conveyor Planner - Google Apps Script that SAVES ENQUIRIES INTO THE SHEET.
 *
 * Setup: open the Google Sheet -> Extensions -> Apps Script -> paste this file -> Deploy -> New deployment
 *        -> type "Web app" -> Execute as: Me -> Who has access: Anyone -> Deploy -> copy the Web app URL
 *        into config.js (enquiry.endpoint). See docs/GOOGLE_SHEETS_SETUP.md.
 * Nothing secret is stored in the website. Re-deploy ("Manage deployments" -> edit -> New version) after any change here.
 */
var SHEET_NAME = 'Enquiries';
var HEADERS = ['Received (server time)', 'Name', 'Company', 'Email', 'Mobile', 'City', 'State', 'Timeline', 'Budget', 'Comments', 'Consent',
  'Project name', 'Conveyor type', 'Route length (m)', 'Throughput (/min)', 'Product', 'Floor L x W (m)', 'Status', 'Project JSON'];
var ACCESS_SHEET = 'CostingAccess';
var ACCESS_HEADERS = ['Requested (server time)', 'Request ID', 'Name', 'Company', 'Mobile', 'Email', 'Status', 'Decided on', 'Notes'];
var OWNER_EMAIL = '';       // optional: put your email here to get a mail whenever someone asks for Costing access
var MAX_ACCESS_ROWS = 2000; // stops the sheet filling up with junk requests
var MAX_BODY = 200000;      // characters
var MAX_CELL = 45000;       // Sheets cell limit is 50,000

function doPost(e) {
  var lock = LockService.getScriptLock(), locked = false;
  try {
    locked = lock.tryLock(15000);
    if (!locked) return out_({ ok: false, error: 'busy' });
    var raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > MAX_BODY) return out_({ ok: false, error: 'bad_size' });
    var b = JSON.parse(raw);
    if (b && b.action === 'costingRequest') return accessRequest_(b);
    if (b && b.action === 'costingCheck') return accessCheck_(b);
    var c = b.contact || {}, p = b.project || {}, r = p.results || {}, f = p.formState || {};
    var err = validate_(c); if (err) return out_({ ok: false, error: err });
    var sh = sheet_();
    sh.appendRow([
      new Date(), s_(c.name), s_(c.company), s_(c.email), s_(c.mobile), s_(c.city), s_(c.state), s_(c.timeline), s_(c.budgetRange), s_(c.comments, 2000), c.consentToContact ? 'YES' : 'NO',
      s_(f.projectName), s_(r.recommendation && r.recommendation.selectedName), r.path ? r.path.total_m : '', r.throughput ? r.throughput.ratePerMin : '', s_(f.productName),
      s_(f.floorLength + ' x ' + f.floorWidth), 'New', s_(JSON.stringify(p), MAX_CELL)
    ]);
    return out_({ ok: true });
  } catch (x) {
    return out_({ ok: false, error: 'server_error' });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function doGet() { return out_({ ok: true, service: 'ultraplast-enquiry' }); }

function validate_(c) {
  if (!c.consentToContact) return 'no_consent';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(c.email || ''))) return 'bad_email';
  if (String(c.name || '').length < 2 || String(c.company || '').length < 2) return 'missing_fields';
  if (!/^\+\d{8,15}$/.test(String(c.mobile || ''))) return 'bad_mobile';
  return null;
}
/** Text cell, truncated, with formula-injection guard (=, +, -, @ at the start become plain text). */
function s_(v, max) {
  if (v === null || v === undefined) return '';
  var t = String(v).slice(0, max || 500);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}
function sheet_() {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.appendRow(HEADERS); sh.setFrozenRows(1); sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold'); }
  return sh;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------------------------------------------------------------------------------------------
 * COSTING ACCESS. A visitor asks for access (status Pending). YOU decide in the "CostingAccess" tab:
 *   set Status to  Approved  -> that device can open Costing (one-time approval, remembered by the device)
 *   set Status to  Revoked   -> access stops the next time the page checks (within about 2 minutes)
 *   delete the row           -> same as revoked; the visitor would have to ask again
 * Nothing secret is stored in the website. The device ID is a random code, not personal data.
 * ------------------------------------------------------------------------------------------- */
function accessSheet_() {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(ACCESS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(ACCESS_SHEET); sh.appendRow(ACCESS_HEADERS); sh.setFrozenRows(1); sh.getRange(1, 1, 1, ACCESS_HEADERS.length).setFontWeight('bold');
    try { sh.getRange(2, 7, 1000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Pending', 'Approved', 'Revoked'], true).build()); } catch (e) { }
  }
  return sh;
}
function findAccessRow_(sh, id) {
  var last = sh.getLastRow(); if (last < 2) return 0;
  var ids = sh.getRange(2, 2, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}
function accessId_(b) { var id = String(b.id || ''); return /^[a-f0-9]{32}$/.test(id) ? id : ''; }
function statusWord_(v) { var s = String(v || '').toLowerCase().trim(); return s === 'approved' ? 'approved' : s === 'revoked' ? 'revoked' : 'pending'; }
function accessCheck_(b) {
  var id = accessId_(b); if (!id) return out_({ ok: false, error: 'bad_id' });
  var sh = accessSheet_(), row = findAccessRow_(sh, id);
  if (!row) return out_({ ok: true, status: 'none' });
  return out_({ ok: true, status: statusWord_(sh.getRange(row, 7).getValue()) });
}
function accessRequest_(b) {
  var id = accessId_(b); if (!id) return out_({ ok: false, error: 'bad_id' });
  var w = b.who || {}, name = String(w.name || '').trim(), company = String(w.company || '').trim(), mobile = String(w.mobile || '').replace(/[\s\-()]/g, ''), email = String(w.email || '').trim();
  if (name.length < 2 || company.length < 2) return out_({ ok: false, error: 'missing_fields' });
  if (!/^\+\d{8,15}$/.test(mobile)) return out_({ ok: false, error: 'bad_mobile' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return out_({ ok: false, error: 'bad_email' });
  var sh = accessSheet_(), row = findAccessRow_(sh, id);
  if (row) return out_({ ok: true, status: statusWord_(sh.getRange(row, 7).getValue()) });   // never resets an existing decision
  if (sh.getLastRow() > MAX_ACCESS_ROWS) return out_({ ok: false, error: 'full' });
  sh.appendRow([new Date(), id, s_(name), s_(company), s_(mobile), s_(email), 'Pending', '', '']);
  if (OWNER_EMAIL) { try { MailApp.sendEmail(OWNER_EMAIL, 'Costing access requested: ' + s_(name), s_(name) + ' (' + s_(company) + ', ' + s_(mobile) + ') asked for Costing access in the Ultraplast planner. Open the CostingAccess tab and set Status to Approved or leave it Pending.'); } catch (e) { } }
  return out_({ ok: true, status: 'pending' });
}
