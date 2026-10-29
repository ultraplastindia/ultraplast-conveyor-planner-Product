/* Catalogue page: recommender + browser. Uses only UCPCatalogue data (transcribed from the Ultraplast catalogue). Stores nothing. */
(function () {
  'use strict';
  var K = window.UCPCatalogue, P = window.UCPProducts || {};
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tbl(head, rows) { return '<div class="tablewrap"><table><thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'; }
  function imgs(list, alt) { return (list && list.length) ? '<div class="cimgs">' + list.map(function (s) { return '<img src="' + esc(s) + '" alt="' + esc(alt) + ' - photo from the Ultraplast catalogue" loading="lazy">'; }).join('') + '</div>' : ''; }
  function pg(n) { return '<small class="note">catalogue p.' + n + '</small>'; }

  /* ---------------------------------------------------------- recommender */
  var F = [
    ['handling', 'What are you conveying?', 'select', [['', 'Not sure'], ['bottles', 'Bottles, cans, jars'], ['glass', 'Glass bottles'], ['cartons', 'Cartons, boxes, crates'], ['trays', 'Trays, tubs, cups'], ['bags', 'Bags, pouches'], ['small_parts', 'Small parts'], ['heavy', 'Heavy items']]],
    ['layout', 'Route', 'select', [['straight', 'Straight line'], ['curve', 'Has a curve / turn']]],
    ['width', 'Widest product across the belt (mm)', 'number', 'e.g. 100'],
    ['radius', 'Curve radius (mm, centre-line)', 'number', 'e.g. 1000 (only if there is a curve)'],
    ['angle', 'Curve angle (degrees)', 'number', 'e.g. 90'],
    ['lanes', 'Lanes (products side by side, 1-4)', 'number', '1'],
    ['temp', 'Temperature at the belt (deg C)', 'number', 'blank = normal room'],
    ['wet', 'Wet or washed down?', 'select', [['', 'No / not sure'], ['wet', 'Wet / washdown']]],
    ['mat', 'Stainless steel needed?', 'select', [['', 'Not sure'], ['ss304', 'Yes - stainless steel'], ['plastic_other', 'No - thermoplastic']]]
  ];
  function buildForm() {
    $('#recoForm').innerHTML = F.map(function (f) {
      var inp = f[2] === 'select' ? '<select id="r_' + f[0] + '">' + f[3].map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>' : '<input id="r_' + f[0] + '" type="number" min="0" step="any" placeholder="' + esc(f[3]) + '">';
      return '<div class="field"><label for="r_' + f[0] + '">' + esc(f[1]) + '</label>' + inp + '</div>';
    }).join('') + '<div class="field"><button type="button" class="btn primary" id="recoGo">Show recommended parts</button></div>';
    $('#recoGo').addEventListener('click', recommend);
    $('#recoForm').addEventListener('change', recommend);
  }
  function v(id) { var e = $('#r_' + id); return e ? e.value : ''; }
  function nv(id) { var x = parseFloat(v(id)); return isFinite(x) ? x : null; }
  function recommend() {
    var curve = v('layout') === 'curve', r = nv('radius'), a = nv('angle');
    var h = v('handling'), ctx = {
      categoryId: curve ? 'side_flex' : (v('mat') === 'ss304' || h === 'glass' ? '' : 'thermoplastic_slat'), handling: h === 'glass' ? 'bottles' : h, material: v('mat') || (h === 'glass' ? 'ss304' : ''), conditions: v('wet') ? ['wet'] : [],
      tempC: nv('temp'), envelopeWidthMm: nv('width'), lanes: nv('lanes') || 1, curves: curve && r ? [{ radiusMm: r, angleDeg: a || 90 }] : []
    };
    if (!curve && !v('mat') && h !== 'glass' && (v('wet') || h === 'small_parts' || h === 'cartons' || h === 'heavy')) ctx.categoryId = 'straight_modular';
    var out = K.recommend(ctx);
    $('#recoOut').innerHTML = renderReco(out, false);
  }
  function renderReco(out) { return K.renderHtml(out); }

  /* ---------------------------------------------------------- browse */
  var TABS = [
    ['belts', 'Modular belts'], ['chains', 'Slat chains'], ['sprockets', 'Sprockets'], ['idlers', 'Idler wheels'], ['wear', 'Wearstrips & guides'], ['corner', 'Corner tracks'], ['other', 'Components'], ['all', 'Search results']
  ];
  var cur = 'belts';
  function buildTabs() {
    $('#tabs').innerHTML = TABS.map(function (t) { return '<button type="button" class="btn ghost sm" data-t="' + t[0] + '" aria-pressed="' + (t[0] === cur) + '">' + esc(t[1]) + '</button>'; }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('#tabs button'), function (b) { b.addEventListener('click', function () { cur = b.getAttribute('data-t'); buildTabs(); showTab(); }); });
  }
  function beltCard(b) {
    return '<h3>' + esc(b.name) + ' <small>(' + esc(b.group) + ', pitch ' + b.pitchMm + ' mm)</small></h3><p>' + esc(b.use) + ' ' + pg(b.page) + '</p>' + imgs(b.images, b.name) + tbl(['Item', 'Value'], [
      ['Drive', esc(b.drive || '-')], ['Material, temperature, max tensile load', b.materials.map(function (m) { return esc(m.m) + ' (' + (m.tMin > 0 ? '+' : '') + m.tMin + ' to +' + m.tMax + ' deg C): ' + m.tensileKg + ' kg'; }).join('<br>')],
      ['Pin', esc(b.pinMm)], ['Widths', b.widthMm[0] + ' to ' + b.widthMm[1] + ' mm (exact widths on request)'], ['Top surfaces', esc(b.tops.join('; ') || '-')],
      ['Flights / side walls', b.flightsMm ? 'Flights ' + b.flightsMm.join(', ') + ' mm; side walls ' + b.sidewallsMm.join(', ') + ' mm' : '-'], ['Turning radius (innermost)', b.turnFactor ? b.turnFactor + ' x belt width' : '-'],
      ['Drive sprockets', b.sprockets.map(function (s) { return s.teeth + ' teeth, OD ' + s.od + ' mm, bore ' + esc(s.bore); }).join('<br>')]]);
  }
  function showTab() {
    var q = $('#q').value.trim(), h = '', c = q ? 'all' : cur;
    if (c === 'belts') h = K.belts.map(beltCard).join('');
    else if (c === 'chains') h = Object.keys(K.familyImages).map(function (k) { return '<h3>' + esc(k) + 's</h3>' + imgs(K.familyImages[k], k); }).join('') + K.chains.map(function (x) { return '<h3>' + esc(x.family) + ' - ' + esc(x.name) + ' <small>(series ' + esc(x.series) + ')</small></h3>' + pg(x.page) + imgs(x.images, x.name) + tbl(['Item', 'Value'], [['Pitch', x.pitchMm + ' mm'], ['Plate thickness', x.plateMm ? x.plateMm + ' mm' : '-'], ['Min side-flex radius', x.minRadiusMm ? x.minRadiusMm + ' mm' : 'Straight running'], ['Material', esc(x.material)]]) + tbl(['Part no.', 'Width K (inch)', 'Width K (mm)'], x.widths.map(function (w) { return ['<b>' + esc(w.part) + '</b>', esc(w.inch || '-'), w.mm]; })); }).join('') + '<p class="note">' + esc(K.CHAIN_NOTE) + '</p>';
    else if (c === 'sprockets') h = K.sprockets.map(function (s) { return '<h3>Split sprockets for series ' + esc(s.chainSeries.join(' / ')) + '</h3>' + pg(s.page) + imgs(s.images, 'Split sprocket') + tbl(['Part no.', 'Teeth', 'OD (mm)', 'Pitch dia (mm)', 'Bore (mm)', 'Make'], s.rows.map(function (r) { return ['<b>' + esc(r.part) + '</b>', r.teeth, r.odMm, r.pdMm, esc(r.boreMm), esc(r.make)]; })); }).join('');
    else if (c === 'idlers') h = K.idlers.map(function (s) { return '<h3>Idler wheels for series ' + esc(s.chainSeries.join(' / ')) + '</h3>' + pg(s.page) + imgs(s.images, 'Idler wheel') + tbl(['Part no.', 'Teeth', 'OD (mm)', 'Bore (mm)'], s.rows.map(function (r) { return ['<b>' + esc(r.part) + '</b>', r.teeth, r.odMm, esc(r.boreMm)]; })); }).join('');
    else if (c === 'wear') h = '<h3>UHMWPE wearstrips &amp; chain guides</h3>' + pg(K.wearstrips.page) + imgs(K.wearstrips.images, 'UHMWPE wearstrips') + imgs([K.wearstrips.profileSheet], 'Profile drawings') + '<p>' + esc(K.wearstrips.material) + '</p><p>' + K.wearstrips.profiles.map(function (p) { return '<span class="tag" style="margin:2px">' + esc(p) + '</span>'; }).join(' ') + '</p><p class="note">Profile drawings are in the catalogue (p.27). Request a profile by part number.</p>';
    else if (c === 'corner') { var t = K.cornerTracks.tab, m = K.cornerTracks.magnetic; h = '<h3>' + esc(t.name) + '</h3>' + pg(t.page) + imgs(t.images, t.name) + '<p>For 3.25" (82.5 mm) chain, 90 degrees, track pitch 85 mm, ' + t.straightMm + ' mm straight each side, UHMWPE.</p>' + tbl(['Part no.', 'Radius CR1 (mm)', 'Tracks', 'A (mm)', 'H (mm)'], t.rows.map(function (r) { return ['<b>' + r.part + '</b>', r.crMm, r.tracks, r.aMm, r.hMm]; })) +
      '<h3>' + esc(m.name) + '</h3>' + pg(m.page) + imgs(m.images, m.name) + '<p>' + esc(m.material) + '. Chain width 3.25" (82.5 mm), track pitch 85 mm, ' + m.straightMm + ' mm straight on both sides.</p>' + tbl(['Part no.', 'Radii CR1 (mm)', 'Tracks', 'Width (mm)', 'H (mm)'], m.rows.map(function (r) { return ['<b>' + r.part + '</b>', r.crMm.join(', '), r.tracks, r.widthMm, esc(r.h)]; })); }
    else if (c === 'other') h = K.components.map(function (g) { return '<h3>' + esc(g.name) + '</h3>' + pg(g.page) + imgs(g.images, g.name) + '<p>' + esc(g.material) + '</p>' + tbl(['Part no.', 'Details'], g.items.map(function (i) { return ['<b>' + esc(i.part) + '</b>', esc(i.note)]; })); }).join('');
    else { var res = K.search(q); h = '<p>' + res.length + ' item(s)' + (q ? ' for "' + esc(q) + '"' : '') + '.</p>' + tbl(['Category', 'Part', 'Details', 'Page'], res.slice(0, 300).map(function (p) { return [esc(p.cat), '<b>' + esc(p.part) + '</b>', esc(p.desc), p.page]; })); }
    $('#browse').innerHTML = h;
  }

  buildForm(); buildTabs(); showTab(); recommend();
  $('#q').addEventListener('input', showTab);
  $('#srcNote').textContent = 'Source: ' + K.SOURCE + '. Contact: ' + K.company.tel + ', ' + K.company.mobile.join(', ') + ', ' + K.company.emails.join(' / ') + ', ' + K.company.web + '.';
  var co = P.company, el = $('#contactLine'); if (el && co) el.innerHTML = esc(co.address) + ' &middot; ' + (co.phones || []).map(esc).join(', ') + ' &middot; ' + esc(co.enquiryEmail);
  window.UCPCatalogueUI = { renderReco: renderReco };
})();
