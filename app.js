/*
 * app.js — USER INTERFACE (wizard, results dashboard, enquiry form)
 * Calculation logic lives in calculations.js, product data in products.js,
 * reports in report.js, enquiry submission in enquiry.js.
 * Customer data is kept in memory only (no localStorage / cookies).
 */
(function () {
  'use strict';
  var C = window.UCPCalc, P = window.UCPProducts, R = window.UCPReport, E = window.UCPEnquiry, S = window.UCPSchematic, SIM = window.UCPSim, sim = null;
  var CFG = window.UCP_CONFIG || {};
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var STEPS = [
    { id: 1, title: 'Factory space' }, { id: 2, title: 'Product' }, { id: 3, title: 'Production' }, { id: 4, title: 'Conveyor' }, { id: 5, title: 'Results & enquiry' }
  ];

  /* ------------------------------------------------------------------ state */
  function fresh() {
    return {
      step: 1, maxStep: 1, dirty: false,
      unitSystem: 'metric', advanced: false,
      values: {
        projectName: '', industry: '', floorLength: '', floorWidth: '', workingHeight: '', inletHeight: '', dischargeHeight: '',
        startX: '', startY: '', startHeading: '0', endX: '', endY: '', drawingAvailable: false, layout: 'straight',
        productName: '', handling: '', prodLength: '', prodWidth: '', prodHeight: '', weight: '', weightUnit: 'kg', maxWeight: '', maxWeightUnit: 'kg',
        fragility: 'low', temperature: '', foodContact: 'none', cleaning: 'dry', orientation: 'length_leading', gap: '', accumulation: 'none',
        rate: '', rateUnit: 'per_min', speed: '', hoursPerDay: '', shifts: '', operation: 'continuous', feeding: 'manual', discharge: 'manual', upstream: '', downstream: '', electrical: '',
        categoryPref: 'auto', material: 'unknown', beltWidth: '', routeLength: '', lanes: '1', transfers: '0', infeedPoints: '1', dischargePoints: '1',
        washdown: 'none', guarding: 'basic', guideRails: false, pitch: '', sprocketTeeth: '', pulleyDia: '', centreDistance: '', drives: ''
      },
      conditions: ['dry'], obstacles: [], segments: [], contact: { name: '', company: '', email: '', mobile: '+91 ', city: '', state: '', timeline: '', budget: '', comments: '', consent: false },
      result: null, enquiry: { status: 'idle', message: '' }
    };
  }
  var state = fresh();

  function raw() {
    var r = {};
    Object.keys(state.values).forEach(function (k) { r[k] = state.values[k]; });
    r.unitSystem = state.unitSystem; r.advanced = state.advanced;
    r.conditions = state.conditions.slice();
    r.obstacles = JSON.parse(JSON.stringify(state.obstacles));
    r.segments = JSON.parse(JSON.stringify(state.segments));
    return r;
  }

  /* ----------------------------------------------------------- unit labels */
  function ul(kind) {
    var im = state.unitSystem === 'imperial';
    return { m: im ? 'ft' : 'm', mm: im ? 'in' : 'mm', speed: im ? 'ft/min' : 'm/min', temp: im ? '°F' : '°C', deg: '°', num: '', weight: '' }[kind] || '';
  }
  function fmtLen(m) {                       // metres -> display string honouring unit system
    if (m === null || m === undefined || isNaN(m)) return '-';
    var s = (Math.round(m * 100) / 100).toFixed(2) + ' m';
    return state.unitSystem === 'imperial' ? (Math.round(m / 0.3048 * 100) / 100).toFixed(2) + ' ft (' + s + ')' : s;
  }
  function fmtMm(mm) {
    if (mm === null || mm === undefined || isNaN(mm)) return '-';
    var s = Math.round(mm) + ' mm';
    return state.unitSystem === 'imperial' ? (Math.round(mm / 25.4 * 100) / 100) + ' in (' + s + ')' : s;
  }
  function num2(v, dp) { return v === null || v === undefined || isNaN(v) ? '-' : String(Math.round(v * Math.pow(10, dp === undefined ? 2 : dp)) / Math.pow(10, dp === undefined ? 2 : dp)); }

  /* ------------------------------------------------------- field rendering */
  function opt(list, cur) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(cur) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); }
  function tipBtn(text) { return text ? ' <button type="button" class="tip" aria-label="Help: ' + esc(text) + '" data-tip="' + esc(text) + '">?</button>' : ''; }

  function field(name, label, o) {
    o = o || {};
    var v = state.values[name], id = 'f_' + name, hint = o.hint ? '<small class="hint" id="h_' + name + '">' + esc(o.hint) + '</small>' : '';
    var kind = o.kind || C.FIELD_KINDS[name], unit = kind && kind !== 'num' && kind !== 'weight' ? ' <span class="unit">(' + ul(kind) + ')</span>' : (o.unit ? ' <span class="unit">(' + esc(o.unit) + ')</span>' : '');
    var req = o.req ? ' <span class="req" title="Required">*</span>' : '';
    var desc = ' aria-describedby="' + (o.hint ? 'h_' + name + ' ' : '') + 'e_' + name + '"';
    var ctl;
    if (o.type === 'select') ctl = '<select id="' + id + '" data-name="' + name + '"' + desc + '>' + opt(o.options, v) + '</select>';
    else if (o.type === 'check') return '<div class="field check ' + (o.cls || '') + '"><label class="chk"><input type="checkbox" id="' + id + '" data-name="' + name + '"' + (v ? ' checked' : '') + '> <span>' + esc(label) + '</span></label>' + tipBtn(o.tip) + hint + '<span class="err" id="e_' + name + '" role="alert"></span></div>';
    else if (o.type === 'weight') {
      var uname = name + 'Unit';
      ctl = '<div class="combo"><input id="' + id + '" data-name="' + name + '" type="text" inputmode="decimal" autocomplete="off" value="' + esc(v) + '"' + desc + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '><select aria-label="' + esc(label) + ' unit" data-name="' + uname + '">' + opt([['g', 'g'], ['kg', 'kg'], ['oz', 'oz'], ['lb', 'lb']], state.values[uname]) + '</select></div>';
    } else if (o.type === 'rate') {
      ctl = '<div class="combo"><input id="' + id + '" data-name="rate" type="text" inputmode="decimal" autocomplete="off" value="' + esc(v) + '"' + desc + ' placeholder="e.g. 60"><select aria-label="Throughput unit" data-name="rateUnit">' + opt([['per_min', 'products / min'], ['per_hour', 'products / hour']], state.values.rateUnit) + '</select></div>';
    } else if (o.type === 'text') ctl = '<input id="' + id + '" data-name="' + name + '" type="text" autocomplete="off" value="' + esc(v) + '"' + desc + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>';
    else ctl = '<input id="' + id + '" data-name="' + name + '" type="text" inputmode="decimal" autocomplete="off" value="' + esc(v) + '"' + desc + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>';
    return '<div class="field ' + (o.cls || '') + (o.adv ? ' adv' : '') + '"><label for="' + id + '">' + esc(label) + unit + req + '</label>' + tipBtn(o.tip) + ctl + hint + '<span class="err" id="e_' + name + '" role="alert"></span></div>';
  }

  var HEADINGS = [['0', 'East (→ along floor length)'], ['90', 'North (↑ along floor width)'], ['180', 'West (←)'], ['270', 'South (↓)']];
  var LAYOUTS = [
    ['straight', 'Straight line', 'One straight run.'], ['L', 'L-shaped', 'Two runs joined by a 90° curve.'], ['U', 'U-shaped', 'Out, turn, across, turn, back.'],
    ['S', 'S-shaped', 'Two opposite 90° curves.'], ['inclined', 'Inclined', 'Raises or lowers product between heights.'], ['curved', 'Curved', 'Straight, one curve, straight.'],
    ['multi', 'Multi-conveyor line', 'Several conveyors with transfers (engineering review).'], ['custom', 'Custom layout', 'Build your own list of segments.']
  ];
  var TEMPLATES = {
    L: [['straight'], ['curve', 'left'], ['straight']], U: [['straight'], ['curve', 'left'], ['straight'], ['curve', 'left'], ['straight']],
    S: [['straight'], ['curve', 'left'], ['straight'], ['curve', 'right'], ['straight']], inclined: [['straight'], ['incline'], ['straight']],
    curved: [['straight'], ['curve', 'left'], ['straight']], multi: [['straight']], custom: [['straight']]
  };
  function newSeg(type, dir) { return { type: type, length: '', angle: type === 'curve' ? '90' : '', radius: '', direction: dir || 'left', horizontal: '', rise: '', inclineAngle: '' }; }

  function stepHtml(n) {
    var h = [];
    if (n === 1) {
      h.push('<fieldset><legend>Project and available space</legend><div class="grid2">');
      h.push(field('projectName', 'Project name', { type: 'text', hint: 'e.g. "Bottling line 2 - Plant A".', ph: 'My conveyor project' }));
      h.push(field('industry', 'Industry', { type: 'select', options: [['', 'Select industry...']].concat(P.industries.map(function (i) { return [i.id, i.label]; })) }));
      h.push(field('floorLength', 'Available floor length', { req: true, hint: 'Longest usable side of the floor area.', ph: 'e.g. 20', tip: 'Measure the clear floor space where the conveyor may be installed.' }));
      h.push(field('floorWidth', 'Available floor width', { req: true, hint: 'Shorter usable side.', ph: 'e.g. 6' }));
      h.push(field('workingHeight', 'Available working height', { hint: 'Clear height from floor to the lowest ceiling / pipe / beam.', ph: 'e.g. 3500' }));
      h.push(field('inletHeight', 'Inlet height (product enters)', { hint: 'Height of the conveying surface at the start, above the floor.', ph: 'e.g. 900' }));
      h.push(field('dischargeHeight', 'Discharge height (product leaves)', { hint: 'Height of the conveying surface at the end.', ph: 'e.g. 900' }));
      h.push('</div></fieldset>');
      h.push('<fieldset><legend>Layout</legend><div class="layouts" role="radiogroup" aria-label="Conveyor layout">');
      LAYOUTS.forEach(function (l) { h.push('<label class="lay' + (state.values.layout === l[0] ? ' on' : '') + '"><input type="radio" name="layout" value="' + l[0] + '" data-name="layout"' + (state.values.layout === l[0] ? ' checked' : '') + '><b>' + l[1] + '</b><span>' + l[2] + '</span></label>'); });
      h.push('</div><span class="err" id="e_layout" role="alert"></span></fieldset>');
      h.push('<fieldset><legend>Start / end points <small>(optional - leave blank to auto-place)</small></legend><p class="note">Measure from the bottom-left corner of the floor plan (X along the length, Y along the width). If blank, the route is auto-placed and marked "proposed".</p><div class="grid3">');
      h.push(field('startX', 'Start X', { ph: 'e.g. 0.5' })); h.push(field('startY', 'Start Y', { ph: 'e.g. 0.5' }));
      h.push(field('startHeading', 'Start direction', { type: 'select', options: HEADINGS, kind: 'deg' }));
      h.push(field('endX', 'End X (to check)', { ph: 'optional' })); h.push(field('endY', 'End Y (to check)', { ph: 'optional' }));
      h.push('</div></fieldset>');
      h.push('<fieldset><legend>Obstacles <small>(columns, machines, doors, pits)</small></legend><div id="obsBox">' + obstaclesHtml() + '</div><button type="button" class="btn ghost" id="addObs">+ Add obstacle</button></fieldset>');
      h.push('<fieldset><legend>Drawings</legend>');
      h.push(field('drawingAvailable', 'A floor plan or reference drawing is available', { type: 'check', hint: 'Ultraplast will ask you to send it with the enquiry.' }));
      h.push(uploadHtml());
      h.push('</fieldset>');
    } else if (n === 2) {
      h.push('<fieldset><legend>Product</legend><div class="grid2">');
      h.push(field('productName', 'Product name', { type: 'text', ph: 'e.g. 500 ml PET bottle' }));
      h.push(field('handling', 'Product category', { type: 'select', options: [['', 'Select...']].concat(P.handlingTypes.map(function (t) { return [t.id, t.label]; })), tip: 'Used to suggest a conveyor type (rigid flat-base items suit rollers; bottles often suit slat chains).' }));
      h.push(field('prodLength', 'Product length', { req: true, ph: 'e.g. 200' })); h.push(field('prodWidth', 'Product width', { req: true, ph: 'e.g. 100' }));
      h.push(field('prodHeight', 'Product height', { req: true, ph: 'e.g. 250' }));
      h.push(field('weight', 'Weight per product', { type: 'weight', req: true, ph: 'e.g. 520', hint: 'Typical single-product weight.' }));
      h.push(field('maxWeight', 'Maximum product weight', { type: 'weight', hint: 'Heaviest product expected. Optional.' }));
      h.push(field('fragility', 'Fragility', { type: 'select', options: [['low', 'Robust'], ['medium', 'Moderately fragile'], ['high', 'Fragile']] }));
      h.push(field('temperature', 'Product temperature', { hint: 'At the conveyor. Leave blank if ambient.', ph: 'e.g. 25' }));
      h.push('</div><div class="field"><span class="lbl">Conditions</span><div class="chips" role="group" aria-label="Product conditions">');
      [['dry', 'Dry'], ['wet', 'Wet'], ['oily', 'Oily / greasy'], ['sticky', 'Sticky'], ['abrasive', 'Abrasive']].forEach(function (c) { h.push('<label class="chip"><input type="checkbox" data-cond="' + c[0] + '"' + (state.conditions.indexOf(c[0]) >= 0 ? ' checked' : '') + '> ' + c[1] + '</label>'); });
      h.push('</div></div></fieldset>');
      h.push('<fieldset><legend>Hygiene and cleaning</legend><div class="grid2">');
      h.push(field('foodContact', 'Food contact / hygiene', { type: 'select', options: [['none', 'No food contact'], ['incidental', 'Packaged food (incidental contact)'], ['direct', 'Direct food contact']] }));
      h.push(field('cleaning', 'Cleaning method', { type: 'select', options: [['dry', 'Dry brush / wipe'], ['wet', 'Damp wipe'], ['washdown', 'Water washdown'], ['chemical', 'Chemical / sanitiser']] }));
      h.push('</div></fieldset>');
      h.push('<fieldset><legend>Spacing and buffering</legend><div class="grid2">');
      h.push(field('orientation', 'Product orientation on belt', { type: 'select', options: [['length_leading', 'Length along travel'], ['width_leading', 'Width along travel']], tip: 'Which product side points in the direction of travel.' }));
      h.push(field('gap', 'Gap between products', { hint: 'Spacing between product edges along the belt.', ph: 'e.g. 50' }));
      h.push(field('accumulation', 'Accumulation / buffering', { type: 'select', options: [['none', 'None'], ['short', 'Short buffer'], ['long', 'Long buffer / accumulation table']], tip: 'Accumulation means products queue up touching each other.' }));
      h.push('</div></fieldset>');
    } else if (n === 3) {
      h.push('<fieldset><legend>Throughput</legend><div class="grid2">');
      h.push(field('rate', 'Required throughput', { type: 'rate', req: true, hint: 'How many products must pass the end of the conveyor.' }));
      h.push(field('speed', 'Conveying speed', { hint: 'Optional. If blank, the minimum speed needed is calculated.', ph: 'e.g. 10' }));
      h.push(field('hoursPerDay', 'Operating hours per day', { hint: '0-24 hours.', ph: 'e.g. 16' })); h.push(field('shifts', 'Shifts per day', { hint: 'Whole number.', ph: 'e.g. 2' }));
      h.push(field('operation', 'Operation', { type: 'select', options: [['continuous', 'Continuous'], ['intermittent', 'Intermittent / batch']] }));
      h.push('</div></fieldset><fieldset><legend>Feeding and discharge</legend><div class="grid2">');
      h.push(field('feeding', 'Feeding', { type: 'select', options: [['manual', 'Manual'], ['automated', 'Automated']] }));
      h.push(field('discharge', 'Discharge', { type: 'select', options: [['manual', 'Manual'], ['automated', 'Automated']] }));
      h.push(field('upstream', 'Existing upstream machine', { type: 'text', ph: 'e.g. Filler, oven, packer' })); h.push(field('downstream', 'Existing downstream machine', { type: 'text', ph: 'e.g. Labeller, wrapper' }));
      h.push(field('electrical', 'Available electrical supply', { type: 'text', ph: 'e.g. 415 V, 3-phase, 50 Hz - or type "none"', hint: 'If you type exactly "none", an unpowered conveyor is considered.' }));
      h.push('</div></fieldset>');
    } else if (n === 4) {
      h.push('<fieldset><legend>Conveyor type and size</legend><div class="grid2">');
      h.push(field('categoryPref', 'Conveyor category', { type: 'select', options: [['auto', 'Automatic recommendation']].concat(P.categories.map(function (c) { return [c.id, c.name]; })), tip: 'Pick one to override the recommendation. The tool will flag incompatibilities.' }));
      h.push(field('material', 'Belt / chain material (if known)', { type: 'select', options: P.materials.map(function (m) { return [m.id, m.label]; }) }));
      h.push(field('beltWidth', 'Conveyor width', { hint: 'Leave blank for engineering to recommend.', ph: 'e.g. 200' }));
      h.push(field('lanes', 'Number of lanes', { hint: 'Products side by side.' })); h.push(field('transfers', 'Transfer points', { hint: 'Where product passes from one conveyor to another.' }));
      h.push(field('infeedPoints', 'Infeed points')); h.push(field('dischargePoints', 'Discharge points'));
      h.push('</div></fieldset>');
      h.push('<fieldset><legend>Route</legend><div id="routeBox">' + routeHtml() + '</div></fieldset>');
      h.push('<fieldset><legend>Washdown, guarding and safety</legend><div class="grid2">');
      h.push(field('washdown', 'Washdown requirement', { type: 'select', options: [['none', 'None'], ['splash', 'Occasional splash / wipe'], ['washdown', 'Regular washdown']] }));
      h.push(field('guarding', 'Guarding', { type: 'select', options: [['none', 'None requested'], ['basic', 'Basic (nip points, drive)'], ['full', 'Full enclosure']] }));
      h.push(field('guideRails', 'Side guide rails required', { type: 'check' }));
      h.push('</div></fieldset>');
      h.push('<div class="adv-toggle"><label class="chk"><input type="checkbox" id="advToggle2"' + (state.advanced ? ' checked' : '') + '> <span><b>Advanced engineering inputs</b> (for technical users)</span></label></div>');
      h.push('<fieldset class="adv-box"' + (state.advanced ? '' : ' hidden') + '><legend>Advanced engineering inputs</legend><p class="note">These allow a belt/chain loop-length estimate for a simple straight, flat, two-pulley conveyor. They never select a motor or belt strength.</p><div class="grid2">');
      h.push(field('pitch', 'Belt / chain pitch', { hint: 'Use a verified pitch from Ultraplast.', ph: 'e.g. 38' }));
      h.push(field('sprocketTeeth', 'Sprocket teeth', { hint: 'Whole number, e.g. 8.' }));
      h.push(field('pulleyDia', 'Pulley / sprocket diameter', { hint: 'Overrides the value calculated from pitch + teeth.' }));
      h.push(field('centreDistance', 'Centre distance between shafts', { hint: 'If blank, route length is assumed equal to the centre distance.' }));
      h.push(field('drives', 'Number of drives', { hint: 'Whole number.' }));
      h.push('</div></fieldset>');
    }
    return h.join('');
  }

  function obstaclesHtml() {
    if (!state.obstacles.length) return '<p class="empty">No obstacles added. Add columns, machines or doors that the conveyor must avoid.</p>';
    return state.obstacles.map(function (o, i) {
      return '<div class="row" role="group" aria-label="Obstacle ' + (i + 1) + '"><input aria-label="Obstacle ' + (i + 1) + ' name" data-obs="name" data-i="' + i + '" placeholder="Name" value="' + esc(o.name) + '">' +
        ['x', 'y', 'w', 'd'].map(function (k) { return '<input aria-label="Obstacle ' + (i + 1) + ' ' + ({ x: 'X position', y: 'Y position', w: 'width', d: 'depth' })[k] + '" data-obs="' + k + '" data-i="' + i + '" inputmode="decimal" placeholder="' + ({ x: 'X', y: 'Y', w: 'Width', d: 'Depth' })[k] + ' (' + ul('m') + ')" value="' + esc(o[k]) + '">'; }).join('') +
        '<button type="button" class="btn ghost sm" data-del-obs="' + i + '" aria-label="Remove obstacle ' + (i + 1) + '">✕</button></div>';
    }).join('') + '<small class="hint">X, Y = position of the obstacle\'s bottom-left corner from the floor\'s bottom-left corner.</small>';
  }

  function routeHtml() {
    var lay = state.values.layout, h = [];
    if (lay === 'straight') {
      h.push('<div class="grid2">' + field('routeLength', 'Total conveyor route length', { req: true, hint: 'Centre-line length of the straight run. This is NOT the floor area.', ph: 'e.g. 12' }) + '</div>');
    } else {
      h.push('<p class="note">Describe the route as a list of segments from the inlet to the discharge. Path length is calculated from these. Curve radius is the <b>centre-line</b> radius.</p>');
      h.push('<div id="segBox">' + segmentsHtml() + '</div><div class="btnrow"><button type="button" class="btn ghost" data-add-seg="straight">+ Straight</button><button type="button" class="btn ghost" data-add-seg="curve">+ Curve</button><button type="button" class="btn ghost" data-add-seg="incline">+ Incline / decline</button></div>');
      h.push('<p class="note" id="horizTotal"></p>');
    }
    return h.join('');
  }

  function segmentsHtml() {
    if (!state.segments.length) return '<p class="empty">No segments yet. Use the buttons below to add straight, curve or incline segments.</p>';
    return state.segments.map(function (s, i) {
      var inputs = '', ph = function (k, t, kind) { return '<label class="mini"><span>' + t + (kind ? ' (' + ul(kind) + ')' : '') + '</span><input data-seg="' + k + '" data-i="' + i + '" inputmode="decimal" value="' + esc(s[k]) + '"></label>'; };
      if (s.type === 'straight') inputs = ph('length', 'Length', 'm');
      else if (s.type === 'curve') inputs = ph('angle', 'Angle', 'deg') + ph('radius', 'Centre-line radius', 'mm') + '<label class="mini"><span>Turn</span><select data-seg="direction" data-i="' + i + '"><option value="left"' + (s.direction === 'left' ? ' selected' : '') + '>Left</option><option value="right"' + (s.direction === 'right' ? ' selected' : '') + '>Right</option></select></label>';
      else inputs = ph('horizontal', 'Horizontal run', 'm') + ph('rise', 'Rise (− = decline)', 'mm') + ph('inclineAngle', 'or angle', 'deg');
      return '<div class="seg" role="group" aria-label="Segment ' + (i + 1) + '"><b class="segn">' + (i + 1) + '</b><label class="mini"><span>Type</span><select data-seg="type" data-i="' + i + '"><option value="straight"' + (s.type === 'straight' ? ' selected' : '') + '>Straight</option><option value="curve"' + (s.type === 'curve' ? ' selected' : '') + '>Curve</option><option value="incline"' + (s.type === 'incline' ? ' selected' : '') + '>Incline / decline</option></select></label>' + inputs +
        '<span class="segerr err" id="e_segment' + i + '" role="alert"></span><button type="button" class="btn ghost sm" data-del-seg="' + i + '" aria-label="Remove segment ' + (i + 1) + '">✕</button></div>';
    }).join('');
  }

  function uploadHtml() {
    var up = CFG.upload && CFG.upload.endpoint;
    if (!up) return '<p class="note">File upload is not enabled on this site (no secure upload service is configured). Tick the box above and email your drawing to <a href="mailto:' + esc(P.company.enquiryEmail) + '">' + esc(P.company.enquiryEmail) + '</a> after sending your enquiry.</p>';
    return '<div class="field"><label for="upfile">Upload floor plan / drawing (' + esc((CFG.upload.allowed || []).join(', ')) + ', max ' + (CFG.upload.maxMB || 10) + ' MB)</label><input type="file" id="upfile"><button type="button" class="btn ghost" id="upBtn">Upload</button><span class="note" id="upMsg" role="status"></span></div>';
  }

  /* ------------------------------------------------------------ render core */
  function renderProgress() {
    $('#progress').innerHTML = STEPS.map(function (s) {
      var cls = s.id === state.step ? 'cur' : (s.id < state.step ? 'done' : (s.id <= state.maxStep ? 'avail' : ''));
      var can = s.id <= state.maxStep;
      return '<li class="' + cls + '"' + (s.id === state.step ? ' aria-current="step"' : '') + '><button type="button" data-goto="' + s.id + '"' + (can ? '' : ' disabled') + '><span class="dot">' + (s.id < state.step ? '✓' : s.id) + '</span><span class="lbl">' + s.title + '</span></button></li>';
    }).join('');
    $('#progressBar').style.width = ((state.step - 1) / (STEPS.length - 1) * 100) + '%';
    $('#progressText').textContent = 'Step ' + state.step + ' of ' + STEPS.length + ': ' + STEPS[state.step - 1].title;
  }

  function render(focus) {
    renderProgress();
    if (sim && state.step !== 5) { sim.destroy(); sim = null; }
    if (liveSim && state.step === 5) { liveSim.destroy(); liveSim = null; }
    var wiz = $('#wizardWrap'), resWrap = $('#resultsWrap');
    document.body.classList.toggle('on-results', state.step === 5);
    if (state.step < 5) {
      wiz.hidden = false; resWrap.hidden = true;
      $('#stepTitle').textContent = STEPS[state.step - 1].title;
      $('#stepIntro').textContent = ['Tell us about the floor space and where the conveyor must run.', 'Describe the product to be conveyed.', 'How many products, how fast, and how are they loaded and unloaded?', 'Choose the conveyor type, describe the route, or let us recommend.'][state.step - 1];
      $('#stepBody').innerHTML = stepHtml(state.step);
      $('#btnBack').hidden = state.step === 1;
      $('#btnNext').textContent = state.step === 4 ? 'Calculate results →' : 'Next →';
      $('#errSummary').hidden = true; $('#errSummary').innerHTML = '';
      live();
      if (state.step === 4) updateHoriz();
    } else {
      wiz.hidden = true; resWrap.hidden = false;
      renderResults();
    }
    if (focus !== false) { var h = state.step < 5 ? $('#stepTitle') : $('#resultsTitle'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: false }); } window.scrollTo(0, 0); }
  }

  /* ------------------------------------------------------------ live panel */
  var liveTimer = null;
  function live() { clearTimeout(liveTimer); liveTimer = setTimeout(doLive, 120); }
  var liveSim = null, liveTime = 0;
  function productPreview(inp) {
    if (!(inp.prodLength > 0 && inp.prodWidth > 0)) return '';
    var L = inp.prodLength, Wd = inp.prodWidth, k = Math.min(200 / L, 90 / Wd), w = L * k, h = Wd * k;
    return '<svg viewBox="0 0 260 130" class="sc prodprev" role="img" aria-label="Product top view"><rect x="' + (130 - w / 2) + '" y="' + (65 - h / 2) + '" width="' + w + '" height="' + h + '" rx="4" class="sim-prod" style="stroke-width:1.5"/>' +
      '<text x="130" y="' + (65 + h / 2 + 14) + '" text-anchor="middle" class="sc-text sc-small">' + esc(Math.round(L)) + ' mm (length) × ' + esc(Math.round(Wd)) + ' mm (width)</text></svg>';
  }
  function doLive() {
    if (state.step === 5) return;
    if (liveSim) { liveTime = liveSim.state().time; liveSim.destroy(); liveSim = null; }
    var inp = C.normalize(raw()), res;
    try { res = C.analyse(inp, P); } catch (e) { $('#liveSchem').innerHTML = '<p class="err">Preview unavailable: ' + esc(e.message) + '</p>'; return; }
    var plan = simPlan(inp, res), pathOk = res.path && res.path.points.length > 1, prodOk = inp.prodLength > 0 && inp.prodWidth > 0 && inp.prodHeight > 0 && inp.weight > 0, prodKnown = res.throughput.productPitchMm;
    var done = [
      ['Floor space', res.floor.area !== null], ['Product', !!prodOk], ['Throughput / speed', !!(inp.speed || res.throughput.requiredSpeed)],
      ['Route', !!(res.path && res.path.complete)], ['Conveyor running', !plan.why]
    ];
    var host = $('#liveSchem');
    host.innerHTML = '<ul class="build" aria-label="Build progress">' + done.map(function (d) { return '<li class="' + (d[1] ? 'on' : '') + '"><span aria-hidden="true">' + (d[1] ? '✓' : '○') + '</span> ' + d[0] + '</li>'; }).join('') + '</ul>' +
      (state.step === 2 ? productPreview(inp) : '') + simSvg(inp, res, plan) + (pathOk ? S.LEGEND_CV : S.LEGEND);
    if (!plan.why && prodKnown) liveSim = SIM.create(host, simCtx(inp, res, plan, { compact: true, startTime: liveTime }));
    var rows = [];
    if (res.floor.area !== null) rows.push(['Floor area', num2(res.floor.area) + ' m²', 'calc']);
    if (res.path) rows.push(['Route path length' + (res.path.complete ? '' : ' (partial)'), fmtLen(res.path.total), res.path.complete ? 'calc' : 'review']);
    if (res.fit.status !== 'unknown') rows.push(['Fits on floor?', res.fit.status === 'fits' ? 'Yes (centre-line)' : 'No', res.fit.status === 'fits' ? 'ok' : 'bad']);
    if (res.throughput.requiredSpeed !== undefined) rows.push(['Min. speed for throughput', num2(res.throughput.requiredSpeed, 2) + ' m/min', 'calc']);
    $('#liveStats').innerHTML = rows.length ? '<dl>' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd class="' + r[2] + '">' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' : '<p class="note">Live results appear as you type.</p>';
  }
  function updateHoriz() {
    var el = $('#horizTotal'); if (!el) return;
    var inp = C.normalize(raw()), segs = C.segmentsFromInputs(inp); if (!segs.length) { el.textContent = ''; return; }
    var p = C.buildPath(segs, { x: 0, y: 0 }, 0);
    el.innerHTML = '<b>Calculated so far:</b> total path ' + esc(fmtLen(p.lengths.total)) + ' (horizontal projection ' + esc(fmtLen(p.lengths.horizontal)) + ')' + (p.truncated ? ' — <span class="warn">segment ' + (p.incompleteIdx[0] + 1) + ' is incomplete</span>' : '') + '.';
  }

  /* ------------------------------------------------------------ validation */
  function validateStep(n) {
    var inp = C.normalize(raw()), errs = [];
    var v = C.validate(inp);
    v.errors.forEach(function (e) { if (e.step === n) errs.push(e); });
    C.requiredForStep(n, inp).forEach(function (r) { if (!errs.some(function (e) { return e.field === r.field; })) errs.push({ field: r.field, msg: r.msg }); });
    return errs;
  }
  function showErrors(errs) {
    $$('.err').forEach(function (e) { e.textContent = ''; });
    $$('[aria-invalid]').forEach(function (e) { e.removeAttribute('aria-invalid'); });
    errs.forEach(function (e) {
      var el = document.getElementById('e_' + e.field);
      if (el) el.textContent = e.msg;
      var inp = document.getElementById('f_' + e.field); if (inp) inp.setAttribute('aria-invalid', 'true');
    });
    var box = $('#errSummary');
    if (errs.length) {
      box.hidden = false;
      box.innerHTML = '<b>Please fix ' + errs.length + ' item' + (errs.length > 1 ? 's' : '') + ' before continuing:</b><ul>' + errs.map(function (e) { return '<li>' + esc(e.msg) + '</li>'; }).join('') + '</ul>';
      box.setAttribute('tabindex', '-1'); box.focus();
      var first = errs[0], t = document.getElementById('f_' + first.field) || document.querySelector('[name="' + first.field + '"]');
      if (t) { try { t.scrollIntoView({ block: 'center' }); } catch (x) { } }
    } else { box.hidden = true; box.innerHTML = ''; }
  }

  /* ----------------------------------------------------------- results page */
  function pill(status) {
    var cls = { 'Customer-provided': 'p-cust', 'Calculated estimate': 'p-calc', 'Configuration-dependent': 'p-conf', 'Engineering review required': 'p-rev' }[status] || 'p-none';
    return status ? '<span class="pill ' + cls + '">' + esc(status) + '</span>' : '';
  }
  function metric(label, value, status, sub) { return '<div class="metric"><span class="m-l">' + esc(label) + '</span><span class="m-v">' + value + '</span>' + (sub ? '<span class="m-s">' + sub + '</span>' : '') + pill(status) + '</div>'; }

  function renderResults() {
    var rw = raw(), inp = C.normalize(rw), res;
    var wrap = $('#resultsBody');
    try { res = C.analyse(inp, P); } catch (e) { wrap.innerHTML = '<div class="banner bad" role="alert"><b>Calculation error.</b> ' + esc(e.message) + ' Please go back, check your inputs, and try again.</div>'; return; }
    state.result = { raw: rw, inp: inp, res: res };
    var S_ = C.STATUS, t = res.throughput, rec = res.recommendation, h = [];
    var errs = res.issues.filter(function (i) { return i.level === 'error'; }), warns = res.issues.filter(function (i) { return i.level === 'warning'; }), infos = res.issues.filter(function (i) { return i.level === 'info'; });

    $('#resultsTitle').textContent = 'Preliminary results' + (rw.projectName ? ': ' + rw.projectName : '');
    h.push('<div class="banner ' + (errs.length ? 'bad' : (res.path && res.path.complete ? 'ok' : 'warn')) + '" role="status"><b>' + esc(res.summaryStatus) + '.</b> ' + (errs.length ? errs.length + ' problem(s) need your attention below.' : 'These are preliminary estimates, not an engineering design or quotation.') + '</div>');
    if (res.issues.length) {
      h.push('<section class="card"><h3>Checks and flags</h3><ul class="issues">' + errs.concat(warns, infos).map(function (i) { return '<li class="' + i.level + '"><b>' + ({ error: 'Problem', warning: 'Check', info: 'Note' })[i.level] + '</b> ' + esc(i.msg) + '</li>'; }).join('') + '</ul></section>');
    }
    // recommendation
    var cats = {}; P.categories.forEach(function (c) { cats[c.id] = c; });
    h.push('<section class="card hero"><h3>Recommended conveyor type</h3><p class="big">' + esc(rec.selected.name) + '</p>' + pill(S_.CONFIG) +
      (rec.selectedId !== rec.primaryId ? '<p class="note">You selected this type. Automatic suggestion was: <b>' + esc(cats[rec.primaryId].name) + '</b>.</p>' : '') +
      '<p>' + esc(rec.selected.summary) + '</p><h4>Why</h4><ul>' + rec.reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' +
      (rec.alternatives.length ? '<h4>Alternatives to discuss</h4><p>' + rec.alternatives.map(function (a) { return esc(cats[a].name); }).join(' &middot; ') + '</p>' : '') + '</section>');
    h.push('<section class="card" id="simCard"><h3>Your conveyor, running</h3><p class="note">Built from your answers: route, width, speed, product size and spacing. Press Pause to inspect.</p><div id="simHost"></div></section>');
    // space and route
    var pa = res.path;
    h.push('<section class="card"><h3>Space and route</h3><div class="metrics">' +
      metric('Available floor', esc(fmtLen(res.floor.length)) + ' × ' + esc(fmtLen(res.floor.width)), S_.CUSTOMER) +
      metric('Floor area', res.floor.area === null ? '-' : num2(res.floor.area) + ' m²', res.floor.area === null ? '' : S_.CALC, 'Floor area is not conveyor length') +
      metric('Total conveyor path length', pa ? esc(fmtLen(pa.total)) + (pa.complete ? '' : ' (partial)') : '<span class="na">Not calculable yet</span>', pa ? pa.totalStatus : S_.REVIEW) +
      metric('Straight segments', pa ? esc(fmtLen(pa.straight)) : '-', pa ? pa.status : '') + metric('Curved segments', pa ? esc(fmtLen(pa.curved)) : '-', pa ? S_.CALC : '') +
      metric('Inclined segments', pa ? esc(fmtLen(pa.inclined)) : '-', pa ? S_.CALC : '') + (pa && pa.netRise ? metric('Net height change', esc(fmtMm(pa.netRise * 1000)), S_.CALC) : '') +
      metric('Route footprint', res.fit.footprint ? esc(fmtLen(res.fit.footprint.w)) + ' × ' + esc(fmtLen(res.fit.footprint.h)) : '-', res.fit.footprint ? S_.CALC : '', res.fit.status === 'fits' ? 'Fits inside floor (centre-line only)' : (res.fit.status === 'does_not_fit' ? '<b class="bad-t">Does not fit</b>' : '')) +
      '</div><div class="schem" id="resSchem">' + S.render({ floorL: inp.floorLength, floorW: inp.floorWidth, path: pa, obstacles: inp.obstacles, fmt: fmtLen }) + S.LEGEND + '</div></section>');
    // product / throughput
    h.push('<section class="card"><h3>Product and throughput</h3><div class="metrics">' +
      metric('Product', esc(rw.productName || '-') + '<br><small>' + esc(num2(inp.prodLength, 1)) + ' × ' + esc(num2(inp.prodWidth, 1)) + ' × ' + esc(num2(inp.prodHeight, 1)) + ' mm, ' + esc(num2(inp.weight, 3)) + ' kg</small>', S_.CUSTOMER) +
      metric('Throughput', t.ratePerMin === null ? '-' : esc(num2(t.ratePerMin, 1)) + ' / min <small>(' + esc(num2(t.ratePerHour, 0)) + ' / h)</small>', S_.CUSTOMER) +
      metric('Product pitch along travel', t.productPitchMm ? esc(num2(t.productPitchMm, 1)) + ' mm' : '-', t.productPitchMm ? S_.CALC : '') +
      metric('Minimum speed to meet throughput', t.requiredSpeed !== undefined ? esc(num2(t.requiredSpeed, 2)) + ' m/min' : '-', t.requiredSpeed !== undefined ? S_.CALC : '') +
      (inp.speed ? metric('Capacity at entered speed', esc(num2(t.capacityPerMin, 1)) + ' / min', S_.CALC, t.utilisation !== undefined ? 'Utilisation ' + Math.round(t.utilisation * 100) + '%' : '') : '') +
      (t.unitsOnConveyor !== undefined ? metric('Products on conveyor', String(t.unitsOnConveyor), S_.CALC, 'At running spacing') : '') +
      (t.liveLoadKg !== undefined ? metric('Indicative product load', esc(num2(t.liveLoadKg, 1)) + ' kg', S_.CALC, 'Product only, not a design load') : '') +
      (t.accumulationLoadKg !== undefined ? metric('Worst-case accumulation load', esc(num2(t.accumulationLoadKg, 0)) + ' kg', S_.CALC, 'Product touching, full route') : '') +
      (t.transitTimeSec !== undefined ? metric('Transit time', esc(num2(t.transitTimeSec, 1)) + ' s', S_.CALC) : '') +
      (t.perDay !== undefined ? metric('Products per day', esc(String(t.perDay)), S_.CALC, esc(t.perDayNote)) : '') + '</div></section>');
    // width + loop
    var W = res.width, L = res.loop;
    h.push('<section class="card"><h3>Belt / chain and conveyor width</h3><div class="metrics">' +
      metric('Product envelope across belt', W.productEnvelopeMm ? esc(fmtMm(W.productEnvelopeMm)) : '-', W.productEnvelopeMm ? S_.CALC : '', W.envelopeNote ? esc(W.envelopeNote) : '') +
      metric('Conveyor width', W.entered ? esc(fmtMm(W.entered)) : '<span class="na">Engineering review required</span>', W.entered ? S_.CUSTOMER : S_.REVIEW, W.note ? esc(W.note) : '') +
      (L.applicable === false ? metric('Belt / chain loop', '<span class="na">Not applicable</span>', '', esc(L.note || '')) :
        (L.status === S_.CALC ? metric('Belt / chain loop length', esc(num2(L.loopLengthM, 2)) + ' m', S_.CALC, 'Differs from route length (' + esc(num2(L.routeLengthM, 2)) + ' m). C ' + esc(L.centreSource) + '; D ' + esc(L.diameterSource)) + (L.pitchRowsMin ? metric('Minimum pitch rows', String(L.pitchRowsMin), S_.CALC, esc(L.pitchRowsNote)) : '') :
          metric('Belt / chain quantity', '<span class="na">Not estimated</span>', S_.REVIEW, esc((L.needs || []).join('; ')) + '. Route length is not belt length.'))) +
      '</div>' + (L.status === S_.CALC ? '<p class="note">' + esc(L.formula) + '.</p>' : '') +
      (W.candidateFamilies && W.candidateFamilies.length ? '<h4>Published reference families <small>(unverified)</small></h4><ul>' + W.candidateFamilies.map(function (c) { return '<li>' + esc(c.label) + (c.publishedRangeMm ? ' - published width ' + c.publishedRangeMm[0] + '–' + c.publishedRangeMm[1] + ' mm' + (c.envelopeWithinRange ? '' : ' (<b>product envelope is outside this range</b>)') : '') + '</li>'; }).join('') + '</ul>' : '') + '</section>');
    // engineering review
    h.push('<section class="card"><h3>Engineering review required</h3><p class="note">These cannot be calculated safely from the information provided. Ultraplast engineers will size them using verified product data.</p><div class="tablewrap"><table><thead><tr><th>Item</th><th>Needs</th><th>Status</th></tr></thead><tbody>' +
      res.engineering.map(function (e) { return '<tr><td data-l="Item">' + esc(e.item) + '</td><td data-l="Needs">' + esc(e.requires.join(', ')) + '</td><td data-l="Status">' + pill(e.status) + '</td></tr>'; }).join('') + '</tbody></table></div></section>');
    // equipment
    h.push('<section class="card"><h3>Preliminary equipment checklist</h3><p class="note">Not a bill of materials. Only items suggested by your answers are listed; the final list depends on detailed engineering. No prices are shown.</p><div class="tablewrap"><table><thead><tr><th>Item</th><th>Quantity</th><th>Basis</th><th>Status</th></tr></thead><tbody>' +
      res.equipment.map(function (e) { return '<tr><td data-l="Item">' + esc(e.item) + '</td><td data-l="Quantity">' + esc(e.qty) + (e.unit ? ' ' + esc(e.unit) : '') + '</td><td data-l="Basis">' + esc(e.basis) + '</td><td data-l="Status">' + pill(e.status) + '</td></tr>'; }).join('') + '</tbody></table></div></section>');
    // missing/assumptions/exclusions/next
    h.push('<div class="cols"><section class="card"><h3>Missing engineering inputs</h3>' + (res.missing.length ? '<ul>' + res.missing.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>' : '<p>None identified by the calculator.</p>') + '<button type="button" class="btn ghost" data-goto="1">Edit inputs</button></section>' +
      '<section class="card"><h3>Assumptions</h3><ul>' + res.assumptions.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></section>' +
      '<section class="card"><h3>Exclusions</h3><ul>' + res.exclusions.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></section>' +
      '<section class="card"><h3>Next steps</h3><ol>' + res.nextSteps.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ol></section></div>');
    // downloads + enquiry
    h.push('<section class="card" id="actions"><h3>Download your project summary</h3><div class="btnrow"><button type="button" class="btn primary" id="btnPdf">Download PDF report</button><button type="button" class="btn" id="btnJson">Download JSON summary</button><button type="button" class="btn ghost" id="btnPrint">Print</button></div><p class="note" id="dlMsg" role="status"></p></section>');
    h.push(enquiryHtml());
    if (sim) { sim.destroy(); sim = null; }
    wrap.innerHTML = h.join('');
    startSim(inp, res);
    updateEnquiryStatus();
  }

  function simPlan(inp, res) {
    var t = res.throughput, speed = inp.speed && !isNaN(inp.speed) ? inp.speed : t.requiredSpeed, why = null;
    if (!res.path || res.path.total <= 0) why = 'Enter the route (length or segments) to see the conveyor.';
    else if (!res.path.complete) why = 'The route is incomplete; finish all segments to see the full conveyor.';
    else if (!t.productPitchMm) why = 'Enter the product length and width to see products on the conveyor.';
    else if (!speed) why = 'Enter a conveying speed or a throughput to start the conveyor.';
    var W = res.width, wM, wNote;
    if (inp.beltWidth && !isNaN(inp.beltWidth)) { wM = inp.beltWidth / 1000; wNote = 'entered width'; }
    else if (W.productEnvelopeMm) { wM = W.productEnvelopeMm / 1000; wNote = 'product envelope - real width to be confirmed'; }
    else { wM = 0.3; wNote = 'illustrative width'; }
    return { why: why, speed: speed, widthM: wM, widthNote: wNote };
  }
  function simSvg(inp, res, plan) {
    return S.render({ floorL: inp.floorLength, floorW: inp.floorWidth, path: res.path, obstacles: inp.obstacles, fmt: fmtLen, conveyor: res.path && res.path.points.length > 1 ? { widthM: plan.widthM } : null }) + S.profile(res.path, fmtLen);
  }
  function simCtx(inp, res, plan, extra) {
    var t = res.throughput, along = t.productPitchMm - (inp.gap && !isNaN(inp.gap) ? inp.gap : 0);
    var c = { points: res.path.points, v: plan.speed, pitchMm: t.productPitchMm, alongMm: along, acrossMm: t.acrossMm, lanes: t.lanes, speedAssumed: !(inp.speed && !isNaN(inp.speed)) };
    for (var k in extra) c[k] = extra[k]; return c;
  }
  function startSim(inp, res) {
    var host = $('#simHost'); if (!host) return;
    var plan = simPlan(inp, res);
    host.innerHTML = simSvg(inp, res, plan) + S.LEGEND_CV;
    if (plan.why) { host.insertAdjacentHTML('afterbegin', '<p class="banner warn">' + esc(plan.why) + '</p>'); return; }
    host.insertAdjacentHTML('afterbegin', '<p class="note">Conveyor drawn at ' + esc(fmtMm(plan.widthM * 1000)) + ' wide (' + esc(plan.widthNote) + ').</p>');
    sim = SIM.create(host, simCtx(inp, res, plan, {}));
  }

  function enquiryHtml() {
    var c = state.contact, co = P.company, wa = E.whatsappUrl(co, 'x');
    function cf(name, label, type, extra) {
      extra = extra || {};
      return '<div class="field' + (extra.full ? ' full' : '') + '"><label for="c_' + name + '">' + label + (extra.req === false ? '' : ' <span class="req">*</span>') + '</label>' +
        (type === 'select' ? '<select id="c_' + name + '" data-contact="' + name + '">' + opt(extra.options, c[name]) + '</select>' : type === 'textarea' ? '<textarea id="c_' + name + '" data-contact="' + name + '" rows="3">' + esc(c[name]) + '</textarea>' :
          '<input id="c_' + name + '" data-contact="' + name + '" type="' + (type || 'text') + '" value="' + esc(c[name]) + '" autocomplete="' + (extra.ac || 'off') + '"' + (extra.ph ? ' placeholder="' + esc(extra.ph) + '"' : '') + '>') +
        '<span class="err" id="ce_' + name + '" role="alert"></span></div>';
    }
    return '<section class="card" id="enquiry"><h3>Request a detailed quotation from Ultraplast</h3><p>No prices are shown in this tool. Send your project to Ultraplast engineers for a detailed design and official quotation.</p>' +
      '<form id="enqForm" novalidate><div class="grid2">' + cf('name', 'Your name', 'text', { ac: 'name' }) + cf('company', 'Company name', 'text', { ac: 'organization' }) + cf('email', 'Work email', 'email', { ac: 'email' }) + cf('mobile', 'Mobile (with country code)', 'tel', { ac: 'tel', ph: '+91 98XXXXXXXX' }) +
      cf('city', 'City', 'text', { ac: 'address-level2' }) + cf('state', 'State', 'text', { ac: 'address-level1' }) +
      cf('timeline', 'Project timeline', 'select', { options: [['', 'Select...'], ['Immediate (< 1 month)', 'Immediate (< 1 month)'], ['1-3 months', '1-3 months'], ['3-6 months', '3-6 months'], ['6+ months', '6+ months'], ['Just exploring', 'Just exploring']] }) +
      cf('budget', 'Estimated budget range (optional)', 'text', { req: false, ph: 'e.g. INR 5-10 lakh' }) + '</div>' + cf('comments', 'Technical comments (optional)', 'textarea', { req: false, full: true }) +
      '<div class="hp" aria-hidden="true"><label>Leave this empty <input type="text" id="c_website" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="field check"><label class="chk"><input type="checkbox" id="c_consent" data-contact="consent"' + (c.consent ? ' checked' : '') + '> <span>I agree that Ultraplast Chainbelts Pvt. Ltd. may contact me about this enquiry. <span class="req">*</span></span></label><span class="err" id="ce_consent" role="alert"></span></div>' +
      '<p class="note">Your details are sent only when you press Submit, and only to the configured enquiry service. This tool does not store them in your browser.</p>' +
      '<div class="btnrow"><button type="submit" class="btn primary" id="btnSubmit">Submit enquiry</button><button type="button" class="btn" id="btnMail">Email Ultraplast (draft)</button>' +
      (wa ? '<button type="button" class="btn wa" id="btnWa">WhatsApp enquiry</button>' : '<button type="button" class="btn wa" id="btnWa" disabled aria-disabled="true" title="Official WhatsApp number not yet verified">WhatsApp (not yet available)</button>') + '</div></form>' +
      '<div id="enqStatus" class="enq-status" role="status" aria-live="polite"></div>' +
      '<p class="note">Direct contact: <a href="mailto:' + esc(co.enquiryEmail) + '">' + esc(co.enquiryEmail) + '</a> &middot; ' + co.phones.map(function (p) { return '<a href="tel:' + esc(p.replace(/[^+\d]/g, '')) + '">' + esc(p) + '</a>'; }).join(' &middot; ') + ' &middot; ' + esc(co.hours) + '</p></section>';
  }
  function updateEnquiryStatus() {
    var el = $('#enqStatus'); if (!el) return;
    var s = state.enquiry; el.className = 'enq-status ' + s.status;
    el.textContent = s.status === 'idle' ? (CFG.enquiry && CFG.enquiry.endpoint ? '' : 'Online submission is not connected on this site yet. "Submit" will tell you so, and nothing is sent. Use the email draft or phone instead.') : s.message;
    var b = $('#btnSubmit'); if (b) { b.disabled = s.status === 'sending'; b.textContent = s.status === 'sending' ? 'Sending...' : 'Submit enquiry'; }
  }

  /* ------------------------------------------------------------- downloads */
  function slug(s) { return String(s || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'project'; }
  function download(name, data, type) {
    var blob = new Blob([data], { type: type }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function msg(t, bad) { var el = $('#dlMsg'); if (el) { el.textContent = t; el.className = 'note ' + (bad ? 'bad-t' : 'ok-t'); } }
  function doJson() {
    try { var r = state.result, sum = R.buildSummary(r.raw, r.inp, r.res, P); download('Ultraplast-' + slug(r.raw.projectName) + '.json', JSON.stringify(sum, null, 2), 'application/json'); msg('JSON summary downloaded.'); }
    catch (e) { msg('Could not create the JSON file (' + e.message + ').', true); }
  }
  function doPdf() {
    try { var r = state.result, bytes = R.renderPdf(R.buildReportModel(r.raw, r.inp, r.res, P)); download('Ultraplast-' + slug(r.raw.projectName) + '.pdf', bytes, 'application/pdf'); msg('PDF report downloaded.'); }
    catch (e) { msg('The PDF could not be created (' + e.message + '). Use "Print" and choose "Save as PDF" instead.', true); }
  }

  /* ---------------------------------------------------------------- enquiry */
  function contactErrors(errs) {
    $$('[id^="ce_"]').forEach(function (e) { e.textContent = ''; });
    Object.keys(errs).forEach(function (k) { var el = document.getElementById('ce_' + k); if (el) el.textContent = errs[k]; });
    var first = Object.keys(errs)[0]; if (first) { var i = document.getElementById('c_' + first); if (i) i.focus(); }
  }
  function modelLine() {
    var r = state.result, res = r.res, t = res.throughput;
    return { project: r.raw.projectName || 'Untitled project', type: res.recommendation.selected.name, path: res.path ? fmtLen(res.path.total) + (res.path.complete ? '' : ' (partial)') : null, rate: t.ratePerMin ? num2(t.ratePerMin, 1) + '/min' : null, product: r.raw.productName || null };
  }
  function onSubmitEnquiry(ev) {
    ev.preventDefault();
    if ($('#c_website').value) return;                                   // honeypot: silently ignore bots
    var errs = E.validateContact(state.contact); contactErrors(errs);
    if (Object.keys(errs).length) { state.enquiry = { status: 'failed', message: 'Please complete the highlighted fields.' }; updateEnquiryStatus(); return; }
    var r = state.result, payload = E.enquiryPayload(state.contact, R.buildSummary(r.raw, r.inp, r.res, P));
    state.enquiry = { status: 'sending', message: '' }; updateEnquiryStatus();
    E.submit(payload, CFG.enquiry || {}).then(function (out) { state.enquiry = out; updateEnquiryStatus(); });
  }
  function onMail() {
    var errs = E.validateContact(state.contact); delete errs.consent;
    contactErrors(errs); if (Object.keys(errs).length) { state.enquiry = { status: 'failed', message: 'Please complete the highlighted fields first.' }; updateEnquiryStatus(); return; }
    var m = modelLine(), body = E.shortText(m, state.contact) + '\n\nPhone: ' + state.contact.mobile + '\nEmail: ' + state.contact.email + '\nCity: ' + state.contact.city + ', ' + state.contact.state + '\nTimeline: ' + state.contact.timeline + '\n\nPlease attach the downloaded PDF/JSON.';
    window.location.href = E.mailtoUrl(P.company.enquiryEmail, 'Conveyor enquiry: ' + m.project, body);
    state.enquiry = { status: 'idle', message: '' };
    var el = $('#enqStatus'); el.className = 'enq-status info'; el.textContent = 'Your email app should open with a draft. The enquiry is NOT sent until you press Send there. Attach the PDF/JSON you downloaded.';
  }
  function onWa() {
    var url = E.whatsappUrl(P.company, E.shortText(modelLine(), state.contact)); if (url) window.open(url, '_blank', 'noopener');
  }

  /* ------------------------------------------------------------- import/reset */
  function importJson(file) {
    var rd = new FileReader();
    rd.onerror = function () { alert('Could not read that file.'); };
    rd.onload = function () {
      try {
        var j = JSON.parse(rd.result);
        var f = j && j.schema === 'ultraplast-conveyor-planner/project/1' && j.formState ? j.formState : (j && j.unitSystem && j.layout !== undefined ? j : null);
        if (!f) throw new Error('Not an Ultraplast Planner project file.');
        var s = fresh();
        s.unitSystem = f.unitSystem === 'imperial' ? 'imperial' : 'metric';
        Object.keys(s.values).forEach(function (k) { if (f[k] !== undefined) s.values[k] = typeof s.values[k] === 'boolean' ? !!f[k] : String(f[k]); });
        s.conditions = Array.isArray(f.conditions) ? f.conditions.map(String) : [];
        s.obstacles = (f.obstacles || []).map(function (o) { return { name: String(o.name || ''), x: String(o.x || ''), y: String(o.y || ''), w: String(o.w || ''), d: String(o.d || '') }; });
        s.segments = (f.segments || []).map(function (g) { var n = newSeg(['straight', 'curve', 'incline'].indexOf(g.type) >= 0 ? g.type : 'straight'); Object.keys(n).forEach(function (k) { if (g[k] !== undefined) n[k] = String(g[k]); }); return n; });
        s.advanced = !!f.advanced; s.step = 1; s.maxStep = 4; s.dirty = true;
        state = s; syncHeader(); render();
      } catch (e) { alert('Could not load project: ' + e.message); }
    };
    rd.readAsText(file);
  }
  function reset(ask) {
    if (ask && state.dirty && !window.confirm('Start a new project? Everything you entered will be cleared (nothing is saved on this device).')) return;
    state = fresh(); syncHeader(); render();
  }
  function syncHeader() {
    $$('input[name="units"]').forEach(function (r) { r.checked = r.value === state.unitSystem; });
    $('#advToggle').checked = state.advanced;
  }

  /* ------------------------------------------------------------ unit switching */
  function convertStr(str, kind, from, to) {
    var n = C.parseNum(str); if (n === null || isNaN(n)) return str;
    var m = C.toMetric(kind, n, from), out = C.fromMetric(kind, m, to);
    return String(+out.toFixed(3));
  }
  function switchUnits(to) {
    var from = state.unitSystem; if (from === to) return;
    Object.keys(state.values).forEach(function (k) { var kind = C.FIELD_KINDS[k]; if (kind && kind !== 'num' && kind !== 'weight') state.values[k] = convertStr(state.values[k], kind, from, to); });
    state.obstacles.forEach(function (o) { ['x', 'y', 'w', 'd'].forEach(function (k) { o[k] = convertStr(o[k], 'm', from, to); }); });
    state.segments.forEach(function (s) { Object.keys(C.SEGMENT_KINDS).forEach(function (k) { var kind = C.SEGMENT_KINDS[k]; if (kind !== 'deg') s[k] = convertStr(s[k], kind, from, to); }); });
    state.unitSystem = to; render(false);
  }

  /* ---------------------------------------------------------- layout changes */
  function applyLayout(id) {
    var has = state.segments.some(function (s) { return s.length || s.radius || s.horizontal || s.rise || s.inclineAngle; });
    if (has && id !== 'straight' && !window.confirm('Changing the layout replaces your segment list. Continue?')) { $$('input[name="layout"]').forEach(function (r) { r.checked = r.value === state.values.layout; }); return; }
    state.values.layout = id;
    state.segments = (TEMPLATES[id] || []).map(function (t) { return newSeg(t[0], t[1]); });
    $$('.lay').forEach(function (l) { l.classList.toggle('on', l.querySelector('input').value === id); });
    live();
  }

  /* ------------------------------------------------------------------ events */
  function bind() {
    var form = $('#wizard');
    form.addEventListener('input', onInput); form.addEventListener('change', onChange);
    form.addEventListener('submit', function (e) { e.preventDefault(); next(); });
    document.addEventListener('click', onClick);
    document.addEventListener('input', function (e) { var c = e.target.getAttribute && e.target.getAttribute('data-contact'); if (c) { state.contact[c] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; } });
    document.addEventListener('change', function (e) { var c = e.target.getAttribute && e.target.getAttribute('data-contact'); if (c) state.contact[c] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; });
    document.addEventListener('submit', function (e) { if (e.target.id === 'enqForm') onSubmitEnquiry(e); });
    $$('input[name="units"]').forEach(function (r) { r.addEventListener('change', function () { if (r.checked) switchUnits(r.value); }); });
    $('#advToggle').addEventListener('change', function (e) { state.advanced = e.target.checked; var b = $('.adv-box'); if (b) b.hidden = !state.advanced; var t2 = $('#advToggle2'); if (t2) t2.checked = state.advanced; });
    $('#btnReset').addEventListener('click', function () { reset(true); });
    $('#btnBack').addEventListener('click', function () { go(state.step - 1); });
    var imp = $('#importFile'); if (imp) imp.addEventListener('change', function () { if (imp.files[0]) importJson(imp.files[0]); imp.value = ''; });
    if (!CFG.allowImport) { var ib = $('#importWrap'); if (ib) ib.hidden = true; }
    window.addEventListener('beforeunload', function (e) { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $$('.tip.open').forEach(function (t) { t.classList.remove('open'); }); });
  }
  function onInput(e) {
    var t = e.target, n = t.getAttribute('data-name');
    state.dirty = true;
    if (n && t.type !== 'radio') { state.values[n] = t.type === 'checkbox' ? t.checked : t.value; live(); if (state.step === 4) updateHoriz(); }
    var os = t.getAttribute('data-obs'); if (os) { state.obstacles[+t.getAttribute('data-i')][os] = t.value; live(); }
    var sg = t.getAttribute('data-seg'); if (sg && sg !== 'type') { state.segments[+t.getAttribute('data-i')][sg] = t.value; live(); updateHoriz(); }
    if (t.hasAttribute('data-cond')) { var c = t.getAttribute('data-cond'), i = state.conditions.indexOf(c); if (t.checked && i < 0) state.conditions.push(c); if (!t.checked && i >= 0) state.conditions.splice(i, 1); }
  }
  function onChange(e) {
    var t = e.target; state.dirty = true;
    if (t.getAttribute('data-name') === 'layout') { applyLayout(t.value); if (state.step === 4) { $('#routeBox').innerHTML = routeHtml(); } return; }
    var n = t.getAttribute('data-name'); if (n && t.tagName === 'SELECT') { state.values[n] = t.value; live(); }
    if (t.getAttribute('data-seg') === 'type') { var s = state.segments[+t.getAttribute('data-i')], nt = newSeg(t.value, s.direction); state.segments[+t.getAttribute('data-i')] = nt; $('#segBox').innerHTML = segmentsHtml(); live(); updateHoriz(); }
    if (t.id === 'advToggle2') { state.advanced = t.checked; var b = $('.adv-box'); if (b) b.hidden = !state.advanced; $('#advToggle').checked = state.advanced; }
    if (t.hasAttribute('data-cond')) onInput(e);
    // inline number check on change
    if (n && state.step < 5 && t.tagName === 'INPUT' && t.type === 'text') {
      var inp = C.normalize(raw()), er = C.validate(inp).errors.filter(function (x) { return x.field === n; })[0], el = document.getElementById('e_' + n);
      if (el) el.textContent = er ? er.msg : ''; if (er) t.setAttribute('aria-invalid', 'true'); else t.removeAttribute('aria-invalid');
    }
  }
  function onClick(e) {
    var t = e.target.closest ? e.target.closest('button, a') : null; if (!t) { $$('.tip.open').forEach(function (x) { x.classList.remove('open'); }); return; }
    if (t.classList.contains('tip')) { var was = t.classList.contains('open'); $$('.tip.open').forEach(function (x) { x.classList.remove('open'); }); if (!was) t.classList.add('open'); return; }
    var g = t.getAttribute('data-goto'); if (g) { go(+g); return; }
    if (t.id === 'addObs') { state.obstacles.push({ name: '', x: '', y: '', w: '', d: '' }); $('#obsBox').innerHTML = obstaclesHtml(); var last = $$('#obsBox .row').pop(); if (last) last.querySelector('input').focus(); }
    var d = t.getAttribute('data-del-obs'); if (d !== null) { state.obstacles.splice(+d, 1); $('#obsBox').innerHTML = obstaclesHtml(); live(); }
    var as = t.getAttribute('data-add-seg'); if (as) { state.segments.push(newSeg(as)); $('#segBox').innerHTML = segmentsHtml(); live(); updateHoriz(); }
    var ds = t.getAttribute('data-del-seg'); if (ds !== null) { state.segments.splice(+ds, 1); $('#segBox').innerHTML = segmentsHtml(); live(); updateHoriz(); }
    if (t.id === 'btnPdf') doPdf(); if (t.id === 'btnJson') doJson(); if (t.id === 'btnPrint') window.print();
    if (t.id === 'btnMail') onMail(); if (t.id === 'btnWa') onWa();
    if (t.id === 'btnNew') reset(true);
    if (t.id === 'upBtn') doUpload();
  }
  function doUpload() {
    var f = $('#upfile').files[0], m = $('#upMsg'), cfg = CFG.upload || {};
    if (!f) { m.textContent = 'Choose a file first.'; return; }
    var ext = f.name.split('.').pop().toLowerCase();
    if ((cfg.allowed || []).indexOf(ext) < 0) { m.textContent = 'File type .' + ext + ' is not allowed.'; return; }
    if (f.size > (cfg.maxMB || 10) * 1048576) { m.textContent = 'File is larger than ' + (cfg.maxMB || 10) + ' MB.'; return; }
    var fd = new FormData(); fd.append('file', f); m.textContent = 'Uploading...';
    fetch(cfg.endpoint, { method: 'POST', body: fd, credentials: 'omit' }).then(function (r) { m.textContent = r.ok ? 'Upload accepted by the service.' : 'Upload failed (HTTP ' + r.status + '). Please email the drawing instead.'; }, function () { m.textContent = 'Upload failed (network). Please email the drawing instead.'; });
  }

  function go(n) {
    if (n < 1 || n > 5) return;
    if (n > state.step) { for (var s = state.step; s < n; s++) { var errs = validateStep(s); if (errs.length) { state.step = s; render(false); showErrors(errs); return; } } }
    state.step = n; state.maxStep = Math.max(state.maxStep, n); render();
  }
  function next() {
    var errs = validateStep(state.step);
    if (errs.length) { showErrors(errs); return; }
    go(state.step + 1);
  }

  /* -------------------------------------------------------------------- init */
  function init() {
    if (!C || !P || !R || !E || !S) { document.getElementById('app').innerHTML = '<p class="banner bad">The calculator could not start because a script failed to load. Please reload the page.</p>'; return; }
    var logo = $('#logo'); if (logo) { logo.src = P.company.logoUrl; logo.addEventListener('error', function () { logo.hidden = true; $('#logoText').hidden = false; }); }
    bind(); syncHeader(); render(false);
    document.documentElement.classList.add('js-ready');
  }
  window.UCPApp = { state: function () { return state; }, raw: raw };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
