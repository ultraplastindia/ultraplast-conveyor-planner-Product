/* BOM and motor sheet. Uses only customer entries, calculated values and verified data in products.js (bom section).
   It never invents a part, quantity, motor or price. Project data arrives from index.html via a one-time sessionStorage
   hand-over (removed on read) or from a project JSON file. Nothing is saved. */
(function () {
  'use strict';
  var K = window.UCPCatalogue, C = window.UCPCalc, P = window.UCPProducts;
  var out = document.getElementById('out');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var ER = '<span class="tag">Engineering review required</span>';
  function num(v) { var x = parseFloat(v); return isFinite(x) ? x : null; }
  function r(v, d) { return v == null ? null : Math.round(v * Math.pow(10, d)) / Math.pow(10, d); }
  function tbl(head, rows) { return '<div class="tablewrap"><table><thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>'; }
  function tr(cells) { return '<tr>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }

  function empty() {
    out.innerHTML = '<div class="card"><h2>No project loaded</h2><p>Open this sheet with the <b>BOM &amp; Motor</b> button in the planner, or load a project JSON file you downloaded from the results page (<b>Load JSON</b>, top right).</p><p><a class="btn primary" href="index.html">Go to the planner</a></p></div>';
  }

  function render(raw) {
    var inp, res;
    try { inp = C.normalize(raw); res = C.analyse(inp, P); } catch (e) { out.innerHTML = '<div class="banner bad">Could not calculate this project: ' + esc(e.message) + '</div>'; return; }
    var path = res.path, total = path && path.complete ? path.total : null;
    var curves = path ? path.details.filter(function (d) { return d.type === 'curve'; }).length : null;
    var famId = res.recommendation && res.recommendation.selectedId, famName = res.recommendation && res.recommendation.selected ? res.recommendation.selected.name : '-';
    var spd = num(inp.speed) || (res.throughput && res.throughput.requiredSpeed) || null;
    var h = '';
    h += '<div class="banner warn"><b>Preliminary.</b> Not a quotation, no prices, not for manufacture. Parts come from the Ultraplast catalogue; quantities appear only where the catalogue makes them certain; everything else is <b>Engineering review required</b>.</div>';
    h += '<div class="card"><h2>Project</h2>' + tbl(['Item', 'Value'], [
      tr(['Project', esc(inp.projectName || inp.project || '-')]), tr(['Conveyor type (selected)', esc(famName)]),
      tr(['Route length', total != null ? r(total, 3) + ' m' : ER]), tr(['Curves', curves != null ? curves : '-']),
      tr(['Net rise', path && path.netRise != null ? r(path.netRise, 3) + ' m' : '-']),
      tr(['Belt speed', spd != null ? r(spd, 2) + ' m/min' + (num(inp.speed) ? '' : ' (minimum calculated)') : ER]),
      tr(['Product weight', num(inp.weight) != null ? esc(inp.weight) + ' kg' : ER]),
      tr(['Required throughput', res.throughput && res.throughput.ratePerMin ? r(res.throughput.ratePerMin, 2) + ' per min' : ER])]) + '</div>';

    /* Motor / drive */
    var motors = (P.bom && P.bom.motors) || [];
    h += '<div class="card"><h2>Motor and drive</h2><p>The motor is <b>not selected by this tool</b>. Power depends on the verified belt/chain pull, friction, load, efficiency and duty - an Ultraplast engineer decides it.</p>';
    h += '<h3>Inputs known for the engineer</h3>' + tbl(['Input', 'Value', 'Source'], [
      tr(['Belt speed', spd != null ? r(spd, 2) + ' m/min' : ER, num(inp.speed) ? 'Customer-provided' : 'Calculated estimate']),
      tr(['Product weight', num(inp.weight) != null ? esc(inp.weight) + ' kg' : ER, 'Customer-provided']),
      tr(['Route length', total != null ? r(total, 3) + ' m' : ER, 'Calculated']),
      tr(['Net rise / incline', path && path.netRise != null ? r(path.netRise, 3) + ' m' : '-', 'Calculated']),
      tr(['Hours per day / operation', esc(inp.hoursPerDay || '-') + ' h / ' + esc(inp.operation || '-'), 'Customer-provided']),
      tr(['Electrical supply', esc(inp.electrical || '-'), 'Customer-provided']),
      tr(['Belt-to-wear-strip friction, efficiency, service factor', ER, 'Ultraplast engineering'])]);
    h += '<h3>Ultraplast motor catalogue</h3>';
    h += motors.length ? tbl(['ID', 'Motor', 'Power (kW)', 'Supply', 'Output rpm', 'Note'], motors.map(function (m) { return tr([esc(m.id), esc(m.name), esc(m.powerKw), esc(m.voltage), esc(m.outputRpm), esc(m.note || '')]); })) + '<p class="note">Listed for reference only - choosing one still needs engineering review.</p>'
      : '<p>No verified motors entered yet in <code>products.js</code> (bom.motors). ' + ER + '</p>';
    h += '</div>';

    /* BOM */
    var parts = ((P.bom && P.bom.parts) || []).filter(function (p) { return !p.appliesTo || p.appliesTo.indexOf(famId) >= 0; });
    var legs = (P.engineering && P.engineering.legSpacingMm && total != null) ? Math.ceil(total * 1000 / P.engineering.legSpacingMm) + 1 : null;
    h += '<div class="card"><h2>Bill of materials (preliminary)</h2>';
    var rc = K ? K.recommend(K.contextFrom(inp, res)) : null;
    if (!parts.length && rc) {
      h += '<p>Catalogue-based parts for this project (from the Ultraplast Product Range catalogue). Quantities are shown only where the catalogue makes them certain; everything else is for Ultraplast engineering to confirm. This is not a priced or final bill of materials.</p>';
      h += tbl(['Category', 'Part no.', 'Details', 'Qty', 'Catalogue page'], rc.parts.map(function (p) { return tr([esc(p.group), '<b>' + esc(p.part) + '</b>', esc(p.desc), p.qty != null ? esc(p.qty) + (p.qtyBasis ? '<br><small>' + esc(p.qtyBasis) + '</small>' : '') : ER, esc(p.page)]); }));
      if (rc.notes.length) h += '<h3>Checks</h3><ul>' + rc.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    } else if (!parts.length) {
      h += '<p>No parts data available. ' + ER + '</p>';
    } else {
      h += tbl(['Category', 'Item', 'Part no.', 'Qty', 'Unit', 'Basis'], parts.map(function (p) {
        var q = null, f = num(p.qtyFactor);
        if (f != null) { if (p.qtyBasis === 'fixed') q = f; else if (p.qtyBasis === 'perMetre' && total != null) q = Math.ceil(f * total); else if (p.qtyBasis === 'perCurve' && curves != null) q = f * curves; else if (p.qtyBasis === 'perLeg' && legs != null) q = f * legs; }
        return tr([esc(p.category), esc(p.item), esc(p.partNo || '-'), q != null ? q : ER, esc(p.unit || ''), esc((p.qtyBasis || '') + (f != null ? ' x ' + f : '') + (p.note ? ' - ' + p.note : ''))]);
      }));
    }
    h += '</div>';

    h += '<div class="card"><h2>Preliminary equipment checklist (from the planner)</h2>' + (res.equipment && res.equipment.length ? tbl(['Item', 'Qty', 'Basis', 'Status'], res.equipment.map(function (e) { return tr([esc(e.item), e.qty != null ? esc(e.qty) + ' ' + esc(e.unit || '') : ER, esc(e.basis || ''), esc((res.statusLabels || {})[e.status] || e.status || '')]); })) : '<p>No items yet.</p>') + '</div>';
    h += '<div class="card"><h2>Engineering review required</h2>' + tbl(['Item', 'Needs'], (res.engineering || []).map(function (e) { return tr([esc(e.item), esc((e.requires || []).join('; '))]); })) + '</div>';
    h += '<p class="note">To fill the BOM and motor tables, an Ultraplast engineer edits the <code>bom</code> section of <code>products.js</code> (format shown in the file). Request a quotation from the planner results page.</p>';
    out.innerHTML = h;
  }

  function load(file) {
    var rd = new FileReader();
    rd.onload = function () { try { var j = JSON.parse(rd.result); var f = j && j.formState ? j.formState : j; if (!f || f.layout === undefined) throw 0; render(f); } catch (e) { alert('Not an Ultraplast Planner project file.'); } };
    rd.readAsText(file);
  }
  document.getElementById('print').addEventListener('click', function () { window.print(); });
  var imp = document.getElementById('importFile'); imp.addEventListener('change', function () { if (imp.files[0]) load(imp.files[0]); imp.value = ''; });
  var raw = null;
  try { var s = sessionStorage.getItem('ucpl_bom_handoff'); sessionStorage.removeItem('ucpl_bom_handoff'); if (s) raw = JSON.parse(s); } catch (e) { raw = null; }
  if (raw) render(raw); else empty();
})();
