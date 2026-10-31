/*
 * app.js — USER INTERFACE (wizard, results dashboard, enquiry form)
 * Calculation logic lives in calculations.js, product data in products.js,
 * reports in report.js, enquiry submission in enquiry.js.
 * Customer data is kept in memory only (no localStorage / cookies).
 */
(function () {
  'use strict';
  var C = window.UCPCalc, P = window.UCPProducts, R = window.UCPReport, E = window.UCPEnquiry, S = window.UCPSchematic, SIM = window.UCPSim, V3 = window.UCP3D, K = window.UCPCosting, CAD = window.UCPCad, CATL = window.UCPCatalogue, ACC = window.UCPAccess, PH = window.UCPPhysics, sim = null, view3 = null, planStarted = false;
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
        beltColor: '', productColor: '', friction: '', washdown: 'none', guarding: 'basic', guideRails: false, pitch: '', sprocketTeeth: '', pulleyDia: '', centreDistance: '', drives: ''
      },
      conditions: ['dry'], obstacles: [], segments: [], equipment: [], contact: { name: '', company: '', email: '', mobile: '+91 ', city: '', state: '', timeline: '', budget: '', comments: '', consent: false },
      result: null, enquiry: { status: 'idle', message: '' }, suggested: {}, qfNote: ''
    };
  }
  var state = fresh();

  function raw() {
    var r = {};
    Object.keys(state.values).forEach(function (k) { r[k] = state.values[k]; });
    r.unitSystem = state.unitSystem; r.advanced = state.advanced; r.suggestedFields = Object.keys(state.suggested || {});
    r.conditions = state.conditions.slice();
    r.obstacles = JSON.parse(JSON.stringify(state.obstacles));
    r.segments = JSON.parse(JSON.stringify(state.segments));
    r.equipment = JSON.parse(JSON.stringify(state.equipment));
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
    var req = (state.suggested && state.suggested[name]) ? ' <span class="badge sug" title="Typical value filled in for you - please check or edit">Suggested - check</span>' : o.req ? ' <span class="badge need">Needed</span>' : (o.type === 'select' || o.type === 'check' ? '' : (o.rec ? ' <span class="badge rec">Helpful</span>' : ' <span class="badge opt">Optional</span>'));
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

  function colourField(name, label, palette, hint) {
    var v = state.values[name] || '';
    return '<div class="field full"><label>' + esc(label) + '</label><div class="swatches" role="group" aria-label="' + esc(label) + '">' +
      '<button type="button" class="sw auto' + (v === '' ? ' on' : '') + '" data-swatch-for="' + name + '" data-val="" title="Automatic">Auto</button>' +
      palette.map(function (c) { return '<button type="button" class="sw' + (v.toLowerCase() === c[0] ? ' on' : '') + '" style="background:' + c[0] + '" data-swatch-for="' + name + '" data-val="' + c[0] + '" title="' + esc(c[1]) + '" aria-label="' + esc(c[1]) + '"></button>'; }).join('') +
      '<label class="swpick">Custom <input type="color" data-name="' + name + '" value="' + (/^#[0-9a-f]{6}$/i.test(v) ? v : '#808080') + '" aria-label="' + esc(label) + ' custom colour"></label></div>' + (hint ? '<small class="hint">' + esc(hint) + '</small>' : '') + '</div>';
  }
  var HEADINGS = [['0', 'East (→ along floor length)'], ['90', 'North (↑ along floor width)'], ['180', 'West (←)'], ['270', 'South (↓)']];
  var LAYICON = { straight: 'M4 16 H44', L: 'M4 8 H30 Q40 8 40 18 V28', U: 'M6 6 H32 Q44 6 44 16 Q44 26 32 26 H6', S: 'M4 7 H24 Q34 7 34 16 Q34 25 44 25', inclined: 'M4 26 H14 L32 8 H44', curved: 'M4 25 H18 Q40 25 40 6', multi: 'M4 10 H20 M4 22 H20 M26 10 H44 M26 22 H44 M20 10 V22', custom: 'M4 24 L14 10 L24 22 L34 8 L44 20' };
  function layIcon(id) { return '<svg class="layicon" viewBox="0 0 48 32" aria-hidden="true"><path d="' + (LAYICON[id] || LAYICON.straight) + '" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"' + (id === 'custom' ? ' stroke-dasharray="1 6"' : '') + '/></svg>'; }
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

  /* ---------------------------------------------------------------- Quick fill: industry + weight -> suggested product details */
  var KG = { g: 0.001, kg: 1, oz: 0.0283495, lb: 0.45359237 };
  function weightKg() { var w = C.parseNum(state.values.weight); return (w === null || isNaN(w) || w <= 0) ? null : w * (KG[state.values.weightUnit] || 1); }
  function presetsFor(ind) { var all = P.presets || []; var f = ind ? all.filter(function (p) { return p.industry.indexOf(ind) >= 0; }) : []; return f.length ? f : all; }
  function nearestPreset(ind, kg) { var best = null, bd = 1e9; presetsFor(ind).forEach(function (p) { var d = Math.abs(Math.log(kg / p.kg)); if (d < bd) { bd = d; best = p; } }); return best; }
  function quickFillHtml() {
    var ind = state.values.industry, list = presetsFor(ind), indLabel = (P.industries.filter(function (i) { return i.id === ind; })[0] || {}).label;
    return '<div class="quickfill"><h3>Quick fill <small>(optional)</small></h3><p class="note">' + (indLabel ? 'Industry: <b>' + esc(indLabel) + '</b>. ' : 'Pick an industry on step 1 for better suggestions. ') + 'Choose a typical product, <b>or just type the weight below</b> and we suggest the size, gap and throughput. Everything stays editable.</p>' +
      '<div class="grid2"><div class="field"><label for="qfProduct">Typical product' + (indLabel ? ' in this industry' : '') + '</label><select id="qfProduct"><option value="">Choose...</option>' + list.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + ' - ' + p.kg + ' kg</option>'; }).join('') + '</select></div></div>' +
      '<p id="qfNote" class="note qfnote">' + esc(state.qfNote || '') + '</p></div>';
  }
  function mm2disp(v) { return convertStr(String(v), 'mm', 'metric', state.unitSystem); }
  function applyPreset(p, setWeight) {
    var V = state.values, S = state.suggested;
    function put(k, v) { V[k] = String(v); S[k] = true; }
    if (!V.productName) put('productName', p.name);
    if (!V.handling) put('handling', p.handling);
    put('prodLength', mm2disp(p.l)); put('prodWidth', mm2disp(p.w)); put('prodHeight', mm2disp(p.h));
    if (setWeight) { V.weightUnit = 'kg'; put('weight', p.kg); }
    if (!V.gap) put('gap', mm2disp(p.gap));
    if (!V.rate) { V.rateUnit = 'per_min'; put('rate', p.rate); }
    if (V.fragility === 'low' && p.fragility) put('fragility', p.fragility);
    if (state.conditions.length === 1 && state.conditions[0] === 'dry' && p.cond && p.cond.length) state.conditions = p.cond.slice();
    if (!V.routeLength && (V.layout === 'straight' || !V.layout) && !state.segments.length) put('routeLength', convertStr('6', 'm', 'metric', state.unitSystem));
    state.qfNote = 'Filled from the typical product "' + p.name + '" (' + p.kg + ' kg). Fields marked "Suggested - check" are typical values, not your data: please edit them. A starting conveyor length was set if you had none.';
    state.dirty = true; render(false);
  }
  function autoFromWeight() {
    var V = state.values, kg = weightKg();
    if (state.step !== 2 || kg === null || !V.industry) return;
    if (V.prodLength || V.prodWidth || V.prodHeight) return;           /* never overwrite sizes the customer typed */
    var p = nearestPreset(V.industry, kg); if (p) applyPreset(p, false);
  }

  function stepHtml(n) {
    var h = [];
    if (n === 1) {
      h.push('<div class="welcome"><h3>Welcome - this takes about 2 minutes</h3><ol><li>Fill in <b>only what you know</b>. The only thing we really need is the <b>conveyor length</b>.</li><li>Not sure about something? <b>Leave it blank</b> or press <b>Skip</b> - we will tell you what is still missing.</li><li>At the end you get a <b>3D view, a drawing and a report</b> you can download.</li></ol><div class="btnrow"><button type="button" class="btn primary" id="quickStart">Quick start: I only know the conveyor length</button><button type="button" class="btn ghost" id="tryExample">Fill an example for me</button></div></div>');
      h.push('<fieldset><legend>Project and available space</legend><div class="grid2">');
      h.push(field('projectName', 'Project name', { type: 'text', hint: 'e.g. "Bottling line 2 - Plant A".', ph: 'My conveyor project' }));
      h.push(field('industry', 'Industry', { type: 'select', options: [['', 'Select industry...']].concat(P.industries.map(function (i) { return [i.id, i.label]; })) }));
      h.push(field('floorLength', 'Available floor length', { hint: 'Longest side of the free floor area, in metres. Leave blank if you do not know it.', ph: 'e.g. 20', tip: 'Measure the clear floor space where the conveyor may be installed.' }));
      h.push(field('floorWidth', 'Available floor width', { hint: 'Shorter side of the free floor area, in metres.', ph: 'e.g. 6' }));
      h.push(field('workingHeight', 'Available working height', { hint: 'Free height from the floor up to the lowest ceiling, pipe or beam, in mm.', ph: 'e.g. 3500' }));
      h.push(field('inletHeight', 'Inlet height (product enters)', { hint: 'How high above the floor the belt is where products get ON, in mm. Not sure? Leave blank.', ph: 'e.g. 900' }));
      h.push(field('dischargeHeight', 'Discharge height (product leaves)', { hint: 'How high above the floor the belt is where products get OFF, in mm. Different from the inlet if the belt goes up or down.', ph: 'e.g. 900' }));
      h.push('</div></fieldset>');
      h.push('<fieldset><legend>Layout</legend><div class="layouts" role="radiogroup" aria-label="Conveyor layout">');
      LAYOUTS.forEach(function (l) { h.push('<label class="lay' + (state.values.layout === l[0] ? ' on' : '') + '"><input type="radio" name="layout" value="' + l[0] + '" data-name="layout"' + (state.values.layout === l[0] ? ' checked' : '') + '>' + layIcon(l[0]) + '<b>' + l[1] + '</b><span>' + l[2] + '</span></label>'); });
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
      h.push(quickFillHtml());
      h.push('<fieldset><legend>Product</legend><div class="grid2">');
      h.push(field('productName', 'Product name', { type: 'text', ph: 'e.g. 500 ml PET bottle' }));
      h.push(field('handling', 'Product category', { type: 'select', options: [['', 'Select...']].concat(P.handlingTypes.map(function (t) { return [t.id, t.label]; })), tip: 'Used to suggest a conveyor type (rigid flat-base items suit rollers; bottles often suit slat chains).' }));
      h.push(field('prodLength', 'Product length', { rec: true, hint: 'The longest side of one product, in mm. A rough size is fine.', ph: 'e.g. 200' })); h.push(field('prodWidth', 'Product width', { rec: true, hint: 'The side across, in mm.', ph: 'e.g. 100' }));
      h.push(field('prodHeight', 'Product height', { rec: true, hint: 'How tall one product stands, in mm.', ph: 'e.g. 250' }));
      h.push(colourField('productColor', 'Product colour (for the 3D view)', P.productColours, 'Only changes how the product is drawn.'));
      h.push(field('weight', 'Weight per product', { type: 'weight', rec: true, ph: 'e.g. 520', hint: 'Weight of ONE product. Pick g or kg in the box next to it.' }));
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
      h.push(field('gap', 'Gap between products', { hint: 'Space between one product and the next along the belt, in mm. Not sure? Leave blank.', ph: 'e.g. 50' }));
      h.push(field('accumulation', 'Accumulation / buffering', { type: 'select', options: [['none', 'None'], ['short', 'Short buffer'], ['long', 'Long buffer / accumulation table']], tip: 'Accumulation means products queue up touching each other.' }));
      h.push('</div></fieldset>');
    } else if (n === 3) {
      h.push('<fieldset><legend>Throughput</legend><div class="grid2">');
      h.push(field('rate', 'Required throughput', { type: 'rate', rec: true, hint: 'How many products must reach the end. Example: 60 per minute. Choose per minute or per hour in the box next to it.' }));
      h.push(field('speed', 'Conveying speed', { hint: 'Belt speed in metres per minute. Not sure? Leave blank - we work out the minimum speed needed.', ph: 'e.g. 10' }));
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
      h.push(colourField('beltColor', 'Belt colour (for the 3D view)', P.beltColours, 'Automatic uses a default for the belt type. Only changes the drawing.'));
      h.push(field('friction', 'Belt-to-product friction μ', { kind: 'num', hint: 'Leave blank to use the generic value for the belt type. Type a measured value to test your own belt: it decides when products slide, tip or slip.', ph: 'e.g. 0.3' }));
      h.push(field('lanes', 'Number of lanes', { hint: 'How many products sit side by side across the belt. Usually 1.', ph: '1' })); h.push(field('transfers', 'Transfer points', { hint: 'How many times product moves from one conveyor to the next. Usually 0.', ph: '0' }));
      h.push(field('infeedPoints', 'Infeed points', { hint: 'Places where products are put on the belt. Usually 1.', ph: '1' })); h.push(field('dischargePoints', 'Discharge points', { hint: 'Places where products leave the belt. Usually 1.', ph: '1' }));
      h.push('</div></fieldset>');
      h.push('<fieldset><legend>Route</legend><div id="routeBox">' + routeHtml() + '</div></fieldset>');
      h.push('<fieldset id="equipSet"><legend>Drive motor and sensors <small>(optional)</small></legend><p class="note">Add your motor, sensors, camera or control panel. They appear in the live 3D view, the results 3D view and every drawing, with the values you type. Leave a size blank and a grey placeholder is drawn. This tool never selects or sizes a motor or sensor.</p><div id="equipBox">' + equipmentHtml() + '</div><div class="btnrow"><button type="button" class="btn ghost" data-add-eq="motor">+ Add motor</button><button type="button" class="btn ghost" data-add-eq="photoeye">+ Add photo-eye sensor</button><button type="button" class="btn ghost" data-add-eq="proximity">+ Add proximity sensor</button><button type="button" class="btn ghost" data-add-eq="other">+ Add other equipment</button></div></fieldset>');
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

  var EQ_TYPES = (C && C.EQUIP_TYPES) || {};
  function equipmentHtml() {
    if (!state.equipment.length) return '<p class="empty">No motor or sensors added yet.</p>';
    var mm = ul('mm');
    function inp(i, k, label, ph, v) { return '<div class="field"><label for="eq_' + k + i + '">' + label + '</label><input type="text" id="eq_' + k + i + '" data-eq="' + k + '" data-i="' + i + '" inputmode="decimal" placeholder="' + ph + '" value="' + esc(v) + '"></div>'; }
    return state.equipment.map(function (e, i) {
      var cam = e.type === 'camera';
      return '<div class="eqrow" role="group" aria-label="Equipment ' + (i + 1) + '"><div class="eqhead"><b>E' + (i + 1) + '</b> <select aria-label="Equipment ' + (i + 1) + ' type" data-eq="type" data-i="' + i + '">' + Object.keys(EQ_TYPES).map(function (k) { return '<option value="' + k + '"' + (k === e.type ? ' selected' : '') + '>' + esc(EQ_TYPES[k]) + '</option>'; }).join('') + '</select>' +
        '<button type="button" class="btn ghost sm" data-del-eq="' + i + '" aria-label="Remove equipment ' + (i + 1) + '">Remove</button></div><div class="grid3">' +
        '<div class="field"><label for="eq_name' + i + '">Name / tag</label><input type="text" id="eq_name' + i + '" data-eq="name" data-i="' + i + '" placeholder="e.g. M1, PE-1" value="' + esc(e.name) + '"></div>' +
        '<div class="field"><label for="eq_rating' + i + '">Rating / spec (as you know it)</label><input type="text" id="eq_rating' + i + '" data-eq="rating" data-i="' + i + '" placeholder="e.g. 0.37 kW, 1440 rpm, 415 V" value="' + esc(e.rating) + '"></div>' +
        '<div class="field"><label for="eq_side' + i + '">Side</label><select id="eq_side' + i + '" data-eq="side" data-i="' + i + '"' + (cam ? ' disabled' : '') + '><option value="left"' + (e.side !== 'right' ? ' selected' : '') + '>Left of travel</option><option value="right"' + (e.side === 'right' ? ' selected' : '') + '>Right of travel</option></select></div>' +
        inp(i, 'posMm', 'Position from inlet (' + mm + ')', 'blank = default', e.posMm) + inp(i, 'mountMm', 'Height above belt top (' + mm + ')', 'blank = default', e.mountMm) + '<span></span>' +
        inp(i, 'lenMm', 'Length along conveyor (' + mm + ')', 'blank = placeholder', e.lenMm) + inp(i, 'widMm', 'Width across (' + mm + ')', 'blank = placeholder', e.widMm) + inp(i, 'bodyHMm', 'Body height (' + mm + ')', 'blank = placeholder', e.bodyHMm) + '</div></div>';
    }).join('') + '<small class="hint">Position is measured along the belt route from the inlet end. Motor left blank = drawn at the discharge end. Height 0 = level with the belt top; negative = below it.</small>';
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
      h.push('<div class="grid2">' + field('routeLength', 'Total conveyor route length', { req: true, hint: 'Length of the conveyor from where products get ON to where they get OFF, in metres. Example: 12. This is not the floor area.', ph: 'e.g. 12' }) + '</div>');
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
    if (view3 && state.step !== 5) { view3.destroy(); view3 = null; }
    if (liveSim && state.step === 5) { liveSim.destroy(); liveSim = null; }
    var wiz = $('#wizardWrap'), resWrap = $('#resultsWrap');
    document.body.classList.toggle('on-results', state.step === 5);
    if (state.step < 5) {
      wiz.hidden = false; resWrap.hidden = true;
      $('#stepTitle').textContent = STEPS[state.step - 1].title;
      $('#stepIntro').textContent = ['Floor size is optional - if you do not know it, leave it blank and just enter the conveyor length in step 4.', 'What will the conveyor carry? Rough size and weight are fine - all of this page is optional.', 'How many products per minute, and how are they put on and taken off? If you do not know, press Skip.', 'Last step! Tell us how long the conveyor is. Not sure about the type or width? Leave them as they are and we will suggest one.'][state.step - 1];
      $('#stepBody').innerHTML = stepHtml(state.step);
      $('#btnBack').hidden = state.step === 1; var skip = $('#btnSkip'); if (skip) skip.hidden = state.step === 4;
      var sc = $('#stepCount'); if (sc) sc.textContent = 'Step ' + state.step + ' of 4';
      var nl = $('#stepNeed'); if (nl) nl.innerHTML = ['<b>Needed on this page:</b> nothing. Fill what you know.', '<b>Needed on this page:</b> nothing. A rough size and weight help us a lot.', '<b>Needed on this page:</b> nothing. How many per minute helps us suggest a speed.', '<b>Needed on this page:</b> the conveyor length (marked <span class="badge need">Needed</span>). Everything else is optional.'][state.step - 1];
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
  var liveSim = null, liveTime = 0, liveView = null;
  function productPreview(inp) {
    if (!(inp.prodLength > 0 && inp.prodWidth > 0)) return '';
    var L = inp.prodLength, Wd = inp.prodWidth, k = Math.min(200 / L, 90 / Wd), w = L * k, h = Wd * k;
    return '<svg viewBox="0 0 260 130" class="sc prodprev" role="img" aria-label="Product top view"><rect x="' + (130 - w / 2) + '" y="' + (65 - h / 2) + '" width="' + w + '" height="' + h + '" rx="4" class="sim-prod" style="stroke-width:1.5"/>' +
      '<text x="130" y="' + (65 + h / 2 + 14) + '" text-anchor="middle" class="sc-text sc-small">' + esc(Math.round(L)) + ' mm (length) × ' + esc(Math.round(Wd)) + ' mm (width)</text></svg>';
  }
  function doLive() {
    if (state.step === 5) return;
    if (liveSim) { var st0 = liveSim.state(); liveTime = st0.time; liveView = liveSim.view(); liveSim.destroy(); liveSim = null; }
    var inp = C.normalize(raw()), res;
    try { res = C.analyse(inp, P); } catch (e) { $('#liveSchem').innerHTML = '<p class="err">Preview unavailable: ' + esc(e.message) + '</p>'; return; }
    var plan = simPlan(inp, res), pathOk = res.path && res.path.points.length > 1, prodOk = inp.prodLength > 0 && inp.prodWidth > 0 && inp.prodHeight > 0 && inp.weight > 0, prodKnown = res.throughput.productPitchMm;
    var done = [
      ['Floor space (optional)', res.floor.area !== null], ['Product', !!prodOk], ['Throughput / speed', !!(inp.speed || res.throughput.requiredSpeed)],
      ['Route', !!(res.path && res.path.complete)], ['Conveyor running', !plan.why]
    ];
    var host = $('#liveSchem');
    host.innerHTML = '<ul class="build" aria-label="Build progress">' + done.map(function (d) { return '<li class="' + (d[1] ? 'on' : '') + '"><span aria-hidden="true">' + (d[1] ? '✓' : '○') + '</span> ' + d[0] + '</li>'; }).join('') + '</ul>' +
      (state.step === 2 ? productPreview(inp) : '') + '<div id="live3d"></div><p class="note legend3d">3D view: black dimensions are entered by you, red are calculated, grey are indicative (frame, supports, drive).</p>';
    try { liveSim = V3.create($('#live3d'), v3dOpts(inp, res, plan, { compact: true, startTime: liveTime, view: liveView })); }
    catch (e) { $('#live3d').innerHTML = '<p class="err">3D preview unavailable: ' + esc(e.message) + '</p>'; }
    var rows = [];
    if (res.floor.area !== null) rows.push(['Floor area', num2(res.floor.area) + ' m²', 'calc']);
    if (res.path) rows.push(['Route path length' + (res.path.complete ? '' : ' (partial)'), fmtLen(res.path.total), res.path.complete ? 'calc' : 'review']);
    if (res.fit.status !== 'unknown') rows.push(['Fits on floor?', res.fit.status === 'fits' ? 'Yes (centre-line)' : 'No', res.fit.status === 'fits' ? 'ok' : 'bad']);
    if (res.throughput.requiredSpeed !== undefined) rows.push(['Min. speed for throughput', num2(res.throughput.requiredSpeed, 2) + ' m/min', 'calc']);
    try {
      var sg = $('#liveSuggest');
      if (sg) {
        if (CATL && (prodOk || inp.handling)) {
          var rc0 = CATL.recommend(CATL.contextFrom(inp, res)), pr = rc0.primary.slice(0, 2);
          sg.innerHTML = pr.length ? '<h4>Suggested Ultraplast product</h4>' + pr.map(function (p) { return '<div class="sugprod">' + (p.image ? '<img src="' + esc(p.image) + '" alt="" width="64">' : '') + '<span><b>' + esc(p.title) + '</b><br><small>' + esc(p.why) + '</small></span></div>'; }).join('') + '<p class="note">Based on the Ultraplast catalogue. <a href="catalogue.html" target="_blank" rel="noopener">Open catalogue</a>. Full matching parts on the results page.</p>' : '<h4>Suggested Ultraplast product</h4><p class="note">No belt or chain in the Ultraplast catalogue is a clear match for the conveyor type selected (for example roller conveyors are not in the catalogue). Ultraplast engineering will advise.</p>';
        } else sg.innerHTML = '';
      }
    } catch (e2) { if (window.console) console.log("suggest err", e2.message); }
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

  /** Plain-language summary for people who do not want to read the technical tables. */
  function simpleSummary(inp, res, rec) {
    var told = [], pa = res.path, t = res.throughput;
    if (pa) told.push('a conveyor <b>' + esc(fmtLen(pa.total)) + '</b> long' + (pa.complete ? '' : ' (route not complete yet)'));
    if (inp.prodLength > 0 && inp.prodWidth > 0 && inp.prodHeight > 0) told.push('a product about <b>' + Math.round(inp.prodLength) + ' x ' + Math.round(inp.prodWidth) + ' x ' + Math.round(inp.prodHeight) + ' mm</b>');
    if (t && t.ratePerMin) told.push('<b>' + num2(t.ratePerMin, 1) + ' products per minute</b>');
    if (res.floor.area !== null) told.push('a floor of <b>' + esc(fmtLen(res.floor.length)) + ' x ' + esc(fmtLen(res.floor.width)) + '</b>');
    var miss = res.missing.slice(0, 4).map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('');
    return '<section class="card simple" id="simpleCard"><h3>In simple words</h3><ul>' +
      '<li><b>What you told us:</b> ' + (told.length ? told.join('; ') : 'not much yet - add the conveyor length') + '.</li>' +
      '<li><b>What we suggest:</b> ' + esc(rec.selected.name) + '.</li>' +
      (miss ? '<li><b>Still needed so an engineer can finish the design:</b><ul>' + miss + '</ul>' + (res.missing.length > 4 ? '<small>...and ' + (res.missing.length - 4) + ' more (see "Missing engineering inputs" below).</small>' : '') + '</li>' : '') +
      '<li><b>What to do now:</b> look at the 3D model and the drawing below, download the PDF, then send the enquiry. Ultraplast will confirm everything. This is a first estimate, not a final design or a price.</li></ul></section>';
  }
  function renderResults() {
    var rw = raw(), inp = C.normalize(rw), res;
    var wrap = $('#resultsBody');
    try { res = C.analyse(inp, P); } catch (e) { wrap.innerHTML = '<div class="banner bad" role="alert"><b>Calculation error.</b> ' + esc(e.message) + ' Please go back, check your inputs, and try again.</div>'; return; }
    if (res && state.suggested && Object.keys(state.suggested).length) { var nm = { productName: 'product name', handling: 'product category', prodLength: 'product length', prodWidth: 'product width', prodHeight: 'product height', weight: 'product weight', gap: 'gap between products', rate: 'throughput', fragility: 'fragility', routeLength: 'conveyor length' }; res.assumptions.push('These values were filled in as TYPICAL SUGGESTIONS and were not entered by the customer: ' + Object.keys(state.suggested).map(function (k2) { return nm[k2] || k2; }).join(', ') + '. Please confirm or correct them.'); res.suggestedFields = Object.keys(state.suggested); }
    state.result = { raw: rw, inp: inp, res: res };
    var S_ = C.STATUS, t = res.throughput, rec = res.recommendation, h = [];
    var errs = res.issues.filter(function (i) { return i.level === 'error'; }), warns = res.issues.filter(function (i) { return i.level === 'warning'; }), infos = res.issues.filter(function (i) { return i.level === 'info'; });

    $('#resultsTitle').textContent = 'Preliminary results' + (rw.projectName ? ': ' + rw.projectName : '');
    h.push('<div class="banner ' + (errs.length ? 'bad' : (res.path && res.path.complete ? 'ok' : 'warn')) + '" role="status"><b>' + esc(res.summaryStatus) + '.</b> ' + (errs.length ? errs.length + ' problem(s) need your attention below.' : 'These are preliminary estimates, not an engineering design or quotation.') + '</div>');
    h.push(simpleSummary(inp, res, rec));
    if (res.issues.length) {
      h.push('<section class="card"><h3>Checks and flags</h3><ul class="issues">' + errs.concat(warns, infos).map(function (i) { return '<li class="' + i.level + '"><b>' + ({ error: 'Problem', warning: 'Check', info: 'Note' })[i.level] + '</b> ' + esc(i.msg) + '</li>'; }).join('') + '</ul></section>');
    }
    // recommendation
    var cats = {}; P.categories.forEach(function (c) { cats[c.id] = c; });
    h.push('<section class="card hero"><h3>Recommended conveyor type</h3><p class="big">' + esc(rec.selected.name) + '</p>' + pill(S_.CONFIG) +
      (rec.selectedId !== rec.primaryId ? '<p class="note">You selected this type. Automatic suggestion was: <b>' + esc(cats[rec.primaryId].name) + '</b>.</p>' : '') +
      '<p>' + esc(rec.selected.summary) + '</p><h4>Why</h4><ul>' + rec.reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' +
      (rec.alternatives.length ? '<h4>Alternatives to discuss</h4><p>' + rec.alternatives.map(function (a) { return esc(cats[a].name); }).join(' &middot; ') + '</p>' : '') + '</section>');
    h.push('<section class="card" id="simCard"><h3>Your conveyor in 3D</h3><p class="note">Built from your answers: route, floor (if given), curve radii, inclines, heights, belt width, product size and spacing. Drag to turn it, scroll or pinch to zoom, Shift+drag to move. Use Top, Front and Side for flat views.</p>' +
      '<div class="tabs" role="tablist" aria-label="Conveyor views"><button type="button" role="tab" class="tab" data-tab="3d" aria-selected="true">3D model</button><button type="button" role="tab" class="tab" data-tab="plan" aria-selected="false">Plan view (2D) and side profile</button></div>' +
      '<div id="v3dMsg"></div><div id="v3dHost"></div><div id="simHost" hidden></div></section>');
    h.push(cadCard(inp, res));
    h.push(scheduleHtml(inp, res));
    if (costEnabled()) h.push('<section class="card" id="costCard"></section>');
    // space and route
    var pa = res.path;
    h.push('<section class="card"><h3>Space and route</h3><div class="metrics">' +
      metric('Available floor', res.floor.area === null ? '<span class="na">Not given (optional)</span>' : esc(fmtLen(res.floor.length)) + ' × ' + esc(fmtLen(res.floor.width)), res.floor.area === null ? S_.REVIEW : S_.CUSTOMER, res.floor.area === null ? 'Conveyor drawn on its own; fit on site not checked' : '') +
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
    if (CATL) { try { var rc = CATL.recommend(CATL.contextFrom(inp, res));
      h.push('<section class="card" id="catCard"><h3>Catalogue parts for this project</h3><p class="note">Matched from the Ultraplast product catalogue (belts, chains, sprockets, idlers, corner tracks). Preliminary - Ultraplast engineering confirms sizes and quantities.</p><details><summary><b>Show suggested belt / chain and matching parts</b></summary>' + CATL.renderHtml(rc) + '</details><p><a class="btn ghost sm" href="catalogue.html">Open the full product catalogue</a></p></section>'); } catch (e) { /* catalogue card is optional */ } }
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
    if (sim) { sim.destroy(); sim = null; } if (view3) { view3.destroy(); view3 = null; } planStarted = false;
    wrap.innerHTML = h.join('');
    start3d(inp, res); if (costEnabled()) initCost(inp, res);
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
  function behaviourOf(inp, res) {
    var B = P.behaviour, type = PH.beltTypeOf(inp, res.recommendation && res.recommendation.selectedId), m = PH.muFor(B, type, inp.conditions, parseFloat(inp.friction));
    return { mu: m.mu, basis: m.basis, cogRatio: B.cogRatio, margin: B.marginRatio, stopTimeS: B.stopTimeS, type: type };
  }
  function beltRgbOf(inp, res) {
    var c = V3.hexToRgb(inp.beltColor); if (c) return c;
    var def = { pp: '#2f6fb5', slat: '#8a9099', ss: '#b9bfc6', pu: '#f2f2f0', other: '#3a404a' }; return V3.hexToRgb(def[behaviourOf(inp, res).type]);
  }
  function v3dScene(inp, res, plan, detail) {
    var t = res.throughput, gap = inp.gap && !isNaN(inp.gap) ? inp.gap : 0, along = t.productPitchMm ? t.productPitchMm - gap : null;
    return {
      floorL: inp.floorLength, floorW: inp.floorWidth, workingH: inp.workingHeight > 0 ? inp.workingHeight / 1000 : null, obstacles: inp.obstacles, path: res.path,
      inletMm: inp.inletHeight, dischargeMm: inp.dischargeHeight, beltWidthM: plan.widthM, widthNote: plan.widthNote, pulleyDiaMm: inp.pulleyDia, pitchMm: inp.pitch,
      legSpacingMm: P.engineering.legSpacingMm, detail: detail, beltRgb: beltRgbOf(inp, res),
      prod: { alongMm: along, acrossMm: t.acrossMm, heightMm: inp.prodHeight, pitchMm: t.productPitchMm, lanes: t.lanes },
      equip: inp.equipment, fmt: fmtLen, fmtMm: fmtMm
    };
  }
  /* ---- CAD-style drawing: 2D views + 3D model, DXF / SVG downloads ---- */
  var cadModel = null;
  function cadBuild(inp, res) {
    var plan = simPlan(inp, res), raw = (state.result && state.result.raw) || {};
    return CAD.build(v3dScene(inp, res, plan, true), { title: (raw.projectName || 'Conveyor') + ' - general arrangement', date: new Date().toISOString().slice(0, 10) });
  }
  function cadCard(inp, res) {
    var m; try { m = cadModel = cadBuild(inp, res); } catch (e) { cadModel = null; return '<section class="card"><h3>Engineering drawing (CAD)</h3><p class="banner warn">The drawing could not be generated (' + esc(e.message) + ').</p></section>'; }
    if (!m.ok) return '<section class="card"><h3>Engineering drawing (CAD)</h3><p class="note">' + esc(m.notes[m.notes.length - 1]) + '</p></section>';
    return '<section class="card" id="cadCard"><h3>Engineering drawing (CAD)</h3><p class="note">Drawing sheets made from your entries: plan view, developed side elevation, end view, floor layout and a 3D view, with length, width, radius, angle, rise and height dimensions, plus your motor and sensors with their positions and sizes, and schedules of equipment and route. <b>Download ALL drawings together</b> gives one AutoCAD file with everything. <b>Black</b> = entered, <b>red</b> = calculated, <b>grey</b> = indicative (frame, legs, motor are drawing aids, not Ultraplast engineering data).</p>' +
      '<div class="cadbtns"><button type="button" class="btn primary" id="cadAll" title="One DXF with plan, floor layout, side elevation, end view, schedules, title block and the 3D model">Download ALL drawings together (DXF for AutoCAD)</button><button type="button" class="btn ghost" id="cadSvgAll">Download all sheets (SVG)</button><button type="button" class="btn ghost" id="cadDxf2">Download 2D DXF (AutoCAD)</button><button type="button" class="btn ghost" id="cadDxf3">Download 3D DXF (AutoCAD)</button><button type="button" class="btn ghost" id="cadSvg">Download drawing sheet (SVG, A3)</button></div>' +
      '<div class="cadsheet" role="img" aria-label="Engineering drawing sheet 1">' + CAD.toSVG(m) + '</div>' +
      '<h4>Sheet 2 - equipment and route schedules</h4><div class="cadsheet" role="img" aria-label="Engineering drawing sheet 2: schedules">' + CAD.toSVGSheet2(m) + '</div>' +
      '<p class="note">DXF files are full size in millimetres. Dimensions are lines and text (checked against the geometry they describe), not editable AutoCAD dimension objects. Open the SVG in a browser and use Print &rarr; Save as PDF for a PDF. Engineering review required before any manufacture.</p>' +
      '<details class="mfg"><summary><b>Can this drawing be used for manufacturing? No.</b></summary><p>It is <b>indicative, for engineering review, not for manufacture</b>. Frame, guides, legs, rollers and motor are placeholder sizes; there is no motor, tension or structural engineering, no bill of materials, and dimensions are lines and text only. It is a correct starting point for Ultraplast engineers, who must supply the real standard parts and calculations and approve each drawing before anything is built from it.</p></details></section>';
  }
  function v3dOpts(inp, res, plan, extra) {
    var t = res.throughput, o = { scene: v3dScene(inp, res, plan, !(extra && extra.compact)), speedMPerMin: plan.speed, pitchMm: t.productPitchMm, lanes: t.lanes, behaviour: behaviourOf(inp, res), productRgb: V3.hexToRgb(inp.productColor) };
    for (var k in extra) o[k] = extra[k]; return o;
  }
  function start3d(inp, res) {
    var host = $('#v3dHost'); if (!host) return;
    var plan = simPlan(inp, res);
    if (plan.why) $('#v3dMsg').innerHTML = '<p class="banner warn">' + esc(plan.why) + '</p>';
    try { view3 = V3.create(host, v3dOpts(inp, res, plan, {})); }
    catch (e) { host.innerHTML = ''; $('#v3dMsg').innerHTML = '<p class="banner warn">The 3D view could not start in this browser (' + esc(e.message) + '). The 2D plan view is shown instead.</p>'; selectTab('plan'); }
  }
  function startPlan(inp, res) {
    var host = $('#simHost'); if (!host) return; planStarted = true;
    var plan = simPlan(inp, res);
    host.innerHTML = simSvg(inp, res, plan) + S.LEGEND_CV;
    if (plan.why) { host.insertAdjacentHTML('afterbegin', '<p class="banner warn">' + esc(plan.why) + '</p>'); return; }
    host.insertAdjacentHTML('afterbegin', '<p class="note">Conveyor drawn at ' + esc(fmtMm(plan.widthM * 1000)) + ' wide (' + esc(plan.widthNote) + ').</p>');
    sim = SIM.create(host, simCtx(inp, res, plan, {}));
  }
  function selectTab(name) {
    var tabs = document.querySelectorAll('#simCard .tab'), i;
    for (i = 0; i < tabs.length; i++) tabs[i].setAttribute('aria-selected', tabs[i].getAttribute('data-tab') === name ? 'true' : 'false');
    var h3 = $('#v3dHost'), hp = $('#simHost'), msg = $('#v3dMsg'); if (!h3 || !hp) return;
    h3.hidden = name !== '3d'; msg.hidden = name !== '3d'; hp.hidden = name !== 'plan';
    var r = state.result;
    if (name === 'plan') { if (view3) view3.pause(); if (!planStarted && r) startPlan(r.inp, r.res); else if (sim) sim.play(); }
    else { if (sim) sim.pause(); if (view3) { view3.render(); view3.play(); } }
  }
  function scheduleHtml(inp, res) {
    var plan = simPlan(inp, res), d = V3.describe(v3dScene(inp, res, plan, true));
    if (!d.segments.length) return '';
    var rows = d.segments.map(function (s) {
      var kind = s.type === 'straight' ? 'Straight' : s.type === 'curve' ? 'Curve ' + (s.direction === 'right' ? 'right' : 'left') : (s.riseM < 0 ? 'Decline' : 'Incline');
      var det = s.type === 'curve' ? 'Radius ' + fmtMm(s.radiusM * 1000) + ', sweep ' + num2(s.angleDeg, 1) + '°' : s.type === 'incline' ? 'Run ' + fmtLen(s.horizontalM) + ', rise ' + fmtMm(s.riseM * 1000) + ', slope ' + num2(Math.abs(s.slopeDeg), 1) + '°' : 'Horizontal run ' + fmtLen(s.horizontalM);
      return '<tr><td data-l="No.">S' + s.no + '</td><td data-l="Type">' + kind + '</td><td data-l="Length along belt">' + esc(fmtLen(s.lengthM)) + '</td><td data-l="Details">' + esc(det) + '</td><td data-l="Height at start">' + esc(fmtMm(s.startZ * 1000)) + '</td><td data-l="Height at end">' + esc(fmtMm(s.endZ * 1000)) + '</td></tr>';
    }).join('');
    var e = d.elevations, bits = [];
    bits.push(['Total belt path length', fmtLen(d.overall.pathM) + (d.overall.complete ? '' : ' (route incomplete)')]);
    bits.push(['Plan envelope incl. belt width (approx.)', fmtLen(d.overall.planLengthM) + ' × ' + fmtLen(d.overall.planWidthM)]);
    bits.push(['Belt width', fmtMm(d.belt.widthM * 1000) + ' (' + d.belt.note + ')']);
    bits.push(['Conveying surface height', e.basis === 'illustrative' ? 'Not entered (drawn at an illustrative ' + fmtMm(e.inletM * 1000) + ')' : fmtMm(e.minM * 1000) + ' to ' + fmtMm(e.maxM * 1000) + ' above floor (' + e.basis + ')']);
    if (e.topOfProductM !== null) bits.push(['Top of product at highest point', fmtMm(e.topOfProductM * 1000)]);
    if (d.product) bits.push(['Product (along × across × height)', fmtMm(d.product.alongMm) + ' × ' + fmtMm(d.product.acrossMm) + (d.product.heightMm ? ' × ' + fmtMm(d.product.heightMm) : '') + (d.product.lanes > 1 ? ', ' + d.product.lanes + ' lanes' : '')]);
    return '<section class="card" id="schedCard"><h3>Dimension schedule (as drawn)</h3><p class="note">Every figure here is taken from your entries or calculated from them, and is what the 3D model is built from. Segment numbers match the red tags in the 3D view.</p>' +
      '<div class="tablewrap"><table><thead><tr><th>No.</th><th>Type</th><th>Length along belt</th><th>Details</th><th>Height at start</th><th>Height at end</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<dl class="kv">' + bits.map(function (b) { return '<div><dt>' + esc(b[0]) + '</dt><dd>' + esc(b[1]) + '</dd></div>'; }).join('') + '</dl>' +
      (d.notes.length ? '<ul>' + d.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') + '</section>';
  }

  /* ------------------------------------------------ internal costing (rate card entered by staff; no prices ship with the tool) */
  var costCard = null, costCtx = null, COST_KEY = 'ucp.rateCard';
  /* Costing is shown only after the owner has approved this device (see access.js), or on a private copy where config.js sets costing.enabled. */
  var costGranted = false, costTimer = null;
  function costEnabled() { var c = CFG.costing || {}; return !!(K && (c.enabled || costGranted)); }
  function toast(t) {
    var el = document.getElementById('toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('show'); }, 6000);
  }
  function lockCosting(msg) {
    costGranted = false; costCard = null; costCtx = null; clearInterval(costTimer); costTimer = null;
    try { window.localStorage.removeItem(COST_KEY); } catch (e) { }
    var b = $('#btnCosting'); if (b) b.classList.remove('on');
    if (state.step === 5) render(false); if (msg) toast(msg);
  }
  function startRecheck() {
    clearInterval(costTimer);
    costTimer = setInterval(function () {
      if (!costGranted || !ACC) return;
      ACC.check(CFG.enquiry, ACC.deviceId()).then(function (r) { if (r.state === 'revoked' || r.state === 'none' || r.state === 'pending') lockCosting('Costing access was withdrawn by Ultraplast.'); });
    }, (CFG.costing && CFG.costing.recheckMs) || 120000);
  }
  function openCosting() {
    if (!ACC) { toast('Costing is not available (a script failed to load). Please reload.'); return; }
    if (costEnabled()) { var c0 = $('#costCard'); if (c0) c0.scrollIntoView({ behavior: 'smooth', block: 'start' }); else toast('Costing is on. Finish the steps to see the cost estimate on the results page.'); return; }
    ACC.gate(CFG.enquiry).then(function (ok) {
      if (!ok) return;
      costGranted = true; startRecheck(); var b = $('#btnCosting'); if (b) b.classList.add('on');
      if (state.step === 5) { render(false); var c1 = $('#costCard'); if (c1) c1.scrollIntoView({ behavior: 'smooth', block: 'start' }); } else toast('Costing approved. Finish the steps to see the cost estimate on the results page.');
    });
  }
  function costQ() { var plan = simPlan(costCtx.inp, costCtx.res), sc = V3.buildScene(v3dScene(costCtx.inp, costCtx.res, plan, false)); return K.quantities(costCtx.inp, costCtx.res, { legs: sc.empty ? null : sc.legCount, beltWidthM: plan.widthM }); }
  function initCost(inp, res) {
    costCtx = { inp: inp, res: res };
    if (!costCard) { try { var sv = window.localStorage.getItem(COST_KEY); if (sv) costCard = K.importCard(JSON.parse(sv)); } catch (e) { } }
    if (!costCard) costCard = K.templateCard();
    initCostEvents($('#costCard')); renderCost();
  }
  function renderCost() {
    var host = $('#costCard'); if (!host) return;
    var remembered = false; try { remembered = !!window.localStorage.getItem(COST_KEY); } catch (e) { }
    var drv = Object.keys(K.DRIVERS);
    host.innerHTML = '<h3>Cost estimate (internal)</h3><p class="note"><b>Internal use only - not a quotation.</b> This tool contains no prices: enter your own rates below, or load a rate card file. Rates are never added to the PDF, the JSON summary or the enquiry sent to Ultraplast. Quantities come from the calculated route; type a quantity in the Qty box to override it.</p>' +
      '<div class="btnrow"><label class="btn ghost sm" for="costFile">Load rate card</label><input type="file" id="costFile" accept="application/json,.json" hidden><button type="button" class="btn ghost sm" id="costSave">Save rate card</button><button type="button" class="btn ghost sm" id="costAdd">Add line</button><button type="button" class="btn ghost sm" id="costCsv">Download costing CSV</button><button type="button" class="btn ghost sm" id="costClear">Clear all rates</button>' +
      '<label class="chk"><input type="checkbox" id="costRemember"' + (remembered ? ' checked' : '') + '> Remember this rate card in this browser</label></div><p class="err" id="costMsg" role="alert"></p>' +
      '<div class="tablewrap"><table class="costtbl"><thead><tr><th>On</th><th>Item</th><th>Based on</th><th>Qty</th><th>Rate (' + esc(costCard.currency) + ' per unit)</th><th>Amount</th><th></th></tr></thead><tbody>' +
      costCard.lines.map(function (l, i) {
        return '<tr><td data-l="On"><input type="checkbox" data-cost="enabled" data-i="' + i + '"' + (l.enabled ? ' checked' : '') + ' aria-label="Include line"></td>' +
          '<td data-l="Item"><input type="text" data-cost="label" data-i="' + i + '" value="' + esc(l.label) + '"></td>' +
          '<td data-l="Based on"><select data-cost="driver" data-i="' + i + '">' + drv.map(function (d) { return '<option value="' + d + '"' + (d === l.driver ? ' selected' : '') + '>' + esc(K.DRIVERS[d].label) + '</option>'; }).join('') + '</select></td>' +
          '<td data-l="Qty"><input type="number" step="any" min="0" inputmode="decimal" data-cost="qty" data-i="' + i + '" value="' + (l.qty === null || l.qty === undefined ? '' : esc(l.qty)) + '"><span class="note" data-qs="' + i + '"></span></td>' +
          '<td data-l="Rate"><input type="number" step="any" min="0" inputmode="decimal" data-cost="rate" data-i="' + i + '" value="' + (l.rate === null || l.rate === undefined ? '' : esc(l.rate)) + '" placeholder="enter rate"></td>' +
          '<td data-l="Amount" data-amt="' + i + '">-</td><td><button type="button" class="btn ghost sm" data-cost-del="' + i + '" aria-label="Remove line">Remove</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="kv">' + [['wastage', 'Wastage %'], ['overhead', 'Overhead %'], ['margin', 'Margin %'], ['discount', 'Discount %'], ['tax', 'GST / tax %']].map(function (x) { return '<div><dt><label for="cp_' + x[0] + '">' + x[1] + '</label></dt><dd><input id="cp_' + x[0] + '" type="number" step="any" min="0" data-cost-pct="' + x[0] + '" value="' + esc(costCard.percents[x[0]]) + '"></dd></div>'; }).join('') + '</div>' +
      '<div id="costTotals" aria-live="polite"></div>';
    refreshCost();
  }
  function refreshCost() {
    var q = costQ(), r = K.compute(costCard, q), cur = r.currency, m = function (v) { return esc(K.fmtMoney(v, cur)); };
    r.lines.forEach(function (l, i) {
      var a = document.querySelector('[data-amt="' + i + '"]'), qs = document.querySelector('[data-qs="' + i + '"]'); if (!a) return;
      a.textContent = l.status === 'ok' ? K.fmtMoney(l.amount, cur) : l.status === 'off' ? 'off' : l.status === 'rate-missing' ? 'rate needed' : 'qty unknown';
      var calcQ = q[l.driver]; qs.textContent = l.qtySource === 'manual' ? ' manual ' + l.unit : (calcQ === null || calcQ === undefined ? ' unknown' : ' = ' + (Math.round(calcQ * 100) / 100) + ' ' + l.unit);
    });
    $('#costTotals').innerHTML = (r.complete ? '' : '<p class="banner warn">Total is INCOMPLETE: ' + r.missing.length + ' line(s) need a rate or quantity. ' + esc(r.missing.slice(0, 3).join('; ')) + (r.missing.length > 3 ? '...' : '') + '</p>') +
      '<dl class="kv"><div><dt>Subtotal</dt><dd>' + m(r.subtotal) + '</dd></div><div><dt>Wastage</dt><dd>' + m(r.wastage) + '</dd></div><div><dt>Overhead</dt><dd>' + m(r.overhead) + '</dd></div><div><dt>Margin</dt><dd>' + m(r.margin) + '</dd></div><div><dt>Discount</dt><dd>- ' + m(r.discount) + '</dd></div><div><dt>Tax</dt><dd>' + m(r.tax) + '</dd></div><div><dt><b>Total' + (r.complete ? '' : ' (incomplete)') + '</b></dt><dd><b>' + m(r.total) + '</b></dd></div></dl>' +
      '<p class="note">Internal estimate from your own rates and the calculated quantities (belt, frame, legs and ends are indicative, taken from the planner, not from a final design). Motor, drive, structure and controls need Ultraplast engineering. Not a quotation.</p>';
    costCtx.last = r; persistCost();
  }
  function persistCost() { var cb = $('#costRemember'); try { if (cb && cb.checked) window.localStorage.setItem(COST_KEY, JSON.stringify(costCard)); } catch (e) { } }
  function costMsg(t) { var e = $('#costMsg'); if (e) e.textContent = t || ''; }
  function onCostInput(e) {
    var t = e.target, k = t.getAttribute('data-cost'), pk = t.getAttribute('data-cost-pct'); if (!costCard) return;
    if (pk) { costCard.percents[pk] = t.value === '' ? 0 : Number(t.value); refreshCost(); return; }
    if (!k) return; var i = +t.getAttribute('data-i'), l = costCard.lines[i]; if (!l) return;
    if (k === 'enabled') l.enabled = t.checked; else if (k === 'label') l.label = t.value; else if (k === 'driver') { l.driver = t.value; l.unit = K.DRIVERS[t.value].unit; }
    else { l[k] = t.value === '' ? null : Number(t.value); if (l[k] !== null && (isNaN(l[k]) || l[k] < 0)) { l[k] = null; t.value = ''; costMsg('Enter a number, zero or more.'); return; } }
    costMsg(''); refreshCost();
  }
  function onCostClick(e) {
    var t = e.target.closest ? e.target.closest('button') : null; if (!t || !costCard) return;
    var del = t.getAttribute('data-cost-del');
    if (del !== null) { costCard.lines.splice(+del, 1); renderCost(); return; }
    if (t.id === 'costAdd') { costCard.lines.push({ id: 'c' + Date.now(), label: 'New item', driver: 'manual', unit: 'nos', rate: null, qty: null, enabled: true, note: '' }); renderCost(); }
    else if (t.id === 'costSave') download('Ultraplast-rate-card.json', JSON.stringify(costCard, null, 2), 'application/json');
    else if (t.id === 'costClear') { costCard.lines.forEach(function (l) { l.rate = null; }); renderCost(); }
    else if (t.id === 'costCsv') { var r = K.compute(costCard, costQ()); download('Ultraplast-cost-estimate-' + slug(costCtx.raw || (state.result && state.result.raw && state.result.raw.projectName)) + '.csv', K.toCsv(costCard, r, state.result && state.result.raw.projectName), 'text/csv'); }
  }
  function onCostFile(e) {
    var f = e.target.files && e.target.files[0]; if (!f) return; if (f.size > 500000) { costMsg('File too large for a rate card.'); return; }
    var rd = new FileReader(); rd.onload = function () { try { costCard = K.importCard(JSON.parse(String(rd.result))); renderCost(); costMsg(''); } catch (er) { costMsg('Could not load: ' + er.message); } }; rd.readAsText(f);
  }
  function initCostEvents(host) {
    host.addEventListener('input', onCostInput); host.addEventListener('change', function (e) { if (e.target.id === 'costFile') onCostFile(e); else if (e.target.id === 'costRemember') { try { if (e.target.checked) persistCost(); else window.localStorage.removeItem(COST_KEY); } catch (er) { } } else onCostInput(e); });
    host.addEventListener('click', onCostClick);
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
        s.equipment = (f.equipment || []).map(function (q) { var o = { type: C.EQUIP_TYPES[q.type] ? q.type : 'other', name: String(q.name || ''), side: q.side === 'right' ? 'right' : 'left', rating: String(q.rating || ''), note: String(q.note || '') }; Object.keys(C.EQUIP_KINDS).forEach(function (k) { o[k] = q[k] === undefined || q[k] === null ? '' : String(q[k]); }); return o; });
        s.segments = (f.segments || []).map(function (g) { var n = newSeg(['straight', 'curve', 'incline'].indexOf(g.type) >= 0 ? g.type : 'straight'); Object.keys(n).forEach(function (k) { if (g[k] !== undefined) n[k] = String(g[k]); }); return n; });
        s.suggested = {}; s.advanced = !!f.advanced; s.step = 1; s.maxStep = 4; s.dirty = true;
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
    state.equipment.forEach(function (q) { Object.keys(C.EQUIP_KINDS).forEach(function (k) { q[k] = convertStr(q[k], 'mm', from, to); }); });
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
    $('#btnCosting').addEventListener('click', openCosting);
    if (/[?&]openCosting=1\b/.test(window.location.search)) setTimeout(openCosting, 0);
    $('#btnBom').addEventListener('click', function () {
      /* One-time hand-over to bom.html: kept only in this tab's sessionStorage and removed by bom.html as soon as it is read. */
      try { sessionStorage.setItem('ucpl_bom_handoff', JSON.stringify(raw())); } catch (e) { /* bom.html will ask for a JSON file instead */ }
      window.location.href = 'bom.html';
    });
    $('#btnBack').addEventListener('click', function () { go(state.step - 1); });
    var imp = $('#importFile'); if (imp) imp.addEventListener('change', function () { if (imp.files[0]) importJson(imp.files[0]); imp.value = ''; });
    if (!CFG.allowImport) { var ib = $('#importWrap'); if (ib) ib.hidden = true; }
    window.addEventListener('beforeunload', function (e) { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $$('.tip.open').forEach(function (t) { t.classList.remove('open'); }); });
  }
  /** While an error summary is showing, update it as the user types (quietly - no focus change) so the layout does not jump when they click Next. */
  function refreshErrors() {
    var box = $('#errSummary'); if (!box || box.hidden || state.step >= 5) return;
    var errs = validateStep(state.step);
    $$('.err').forEach(function (x) { x.textContent = ''; }); $$('[aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
    errs.forEach(function (er) { var el = document.getElementById('e_' + er.field); if (el) el.textContent = er.msg; var i = document.getElementById('f_' + er.field); if (i) i.setAttribute('aria-invalid', 'true'); });
    if (errs.length) box.innerHTML = '<b>Please fix ' + errs.length + ' item' + (errs.length > 1 ? 's' : '') + ' before continuing:</b><ul>' + errs.map(function (er) { return '<li>' + esc(er.msg) + '</li>'; }).join('') + '</ul>'; else { box.hidden = true; box.innerHTML = ''; }
  }
  function onInput(e) {
    var t = e.target, n = t.getAttribute('data-name');
    state.dirty = true;
    if (n && t.type !== 'radio') { state.values[n] = t.type === 'checkbox' ? t.checked : t.value; if (state.suggested[n]) { delete state.suggested[n]; var bd = t.closest('.field') && t.closest('.field').querySelector('.badge.sug'); if (bd) { bd.className = 'badge opt'; bd.textContent = 'Edited'; } } live(); if (state.step === 4) updateHoriz(); refreshErrors(); }
    var os = t.getAttribute('data-obs'); if (os) { state.obstacles[+t.getAttribute('data-i')][os] = t.value; live(); }
    var eq = t.getAttribute('data-eq'); if (eq && eq !== 'type' && state.equipment[+t.getAttribute('data-i')]) { state.equipment[+t.getAttribute('data-i')][eq] = t.value; live(); }
    var sg = t.getAttribute('data-seg'); if (sg && sg !== 'type') { state.segments[+t.getAttribute('data-i')][sg] = t.value; live(); updateHoriz(); }
    if (t.hasAttribute('data-cond')) { var c = t.getAttribute('data-cond'), i = state.conditions.indexOf(c); if (t.checked && i < 0) state.conditions.push(c); if (!t.checked && i >= 0) state.conditions.splice(i, 1); }
  }
  function onChange(e) {
    var t = e.target; state.dirty = true;
    if (t.getAttribute('data-name') === 'layout') { applyLayout(t.value); if (state.step === 4) { $('#routeBox').innerHTML = routeHtml(); } return; }
    var n = t.getAttribute('data-name'); if (n && t.tagName === 'SELECT') { state.values[n] = t.value; if (state.suggested[n]) delete state.suggested[n]; live(); }
    if (n === 'weight' || n === 'weightUnit') autoFromWeight();
    if (t.id === 'qfProduct') { var pp = (P.presets || []).filter(function (x) { return x.id === t.value; })[0]; if (pp) applyPreset(pp, true); return; }
    if (t.getAttribute('data-eq') === 'type') { var qi = +t.getAttribute('data-i'); if (state.equipment[qi]) { state.equipment[qi].type = t.value; $('#equipBox').innerHTML = equipmentHtml(); live(); } return; }
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
    if (t.id === 'quickStart') { applyLayout('straight'); state.values.layout = 'straight'; state.dirty = true; go(4); return; }
    if (t.id === 'tryExample') { var EX = { projectName: 'Example - bottle line', industry: 'beverages', floorLength: '20', floorWidth: '6', handling: 'bottles', productName: '500 ml PET bottle', prodLength: '70', prodWidth: '70', prodHeight: '200', weight: '520', weightUnit: 'g', gap: '50', rate: '60', speed: '', hoursPerDay: '16', layout: 'straight', routeLength: '12' }; Object.keys(EX).forEach(function (k) { state.values[k] = EX[k]; }); state.dirty = true; render(false); var tn = $('#stepIntro'); if (tn) tn.textContent = 'Example values filled in. Press Next to see each page, or Skip to the end - then change anything you like.'; return; }
    if (t.id === 'btnSkip') { next(); return; }
    if (t.id === 'cadDxf2' || t.id === 'cadDxf3' || t.id === 'cadSvg' || t.id === 'cadAll' || t.id === 'cadSvgAll') {
      var r0 = state.result, nm = slug(r0 && r0.raw && r0.raw.projectName); if (!cadModel) return;
      try { if (t.id === 'cadAll') download('Ultraplast-' + nm + '-ALL-drawings.dxf', CAD.toDXFAll(cadModel), 'application/dxf'); else if (t.id === 'cadSvgAll') download('Ultraplast-' + nm + '-ALL-sheets.svg', CAD.toSVGAll(cadModel), 'image/svg+xml'); else if (t.id === 'cadDxf2') download('Ultraplast-' + nm + '-2D.dxf', CAD.toDXF2D(cadModel), 'application/dxf'); else if (t.id === 'cadDxf3') download('Ultraplast-' + nm + '-3D.dxf', CAD.toDXF3D(cadModel), 'application/dxf'); else download('Ultraplast-' + nm + '-drawing.svg', CAD.toSVG(cadModel), 'image/svg+xml'); msg('Drawing downloaded.'); } catch (er) { msg('Could not create the drawing file: ' + er.message); }
      return;
    }
    var swf = t.getAttribute('data-swatch-for'); if (swf !== null) { state.values[swf] = t.getAttribute('data-val'); state.dirty = true; Array.prototype.forEach.call(document.querySelectorAll('[data-swatch-for="' + swf + '"]'), function (b) { b.classList.toggle('on', b === t); }); live(); return; }
    var tb = t.closest ? t.closest('[data-tab]') : null; if (tb) { selectTab(tb.getAttribute('data-tab')); return; }
    var g = t.getAttribute('data-goto'); if (g) { go(+g); return; }
    var ae = t.getAttribute && t.getAttribute('data-add-eq'); if (ae) { state.equipment.push({ type: ae, name: ae === 'motor' ? 'M' + (state.equipment.filter(function (x) { return x.type === 'motor'; }).length + 1) : '', side: 'left', rating: '', note: '', posMm: '', mountMm: '', lenMm: '', widMm: '', bodyHMm: '' }); $('#equipBox').innerHTML = equipmentHtml(); state.dirty = true; live(); var le = $$('#equipBox .eqrow').pop(); if (le) { var f0 = le.querySelector('input'); if (f0) f0.focus(); } }
    var de = t.getAttribute && t.getAttribute('data-del-eq'); if (de !== null && de !== undefined) { state.equipment.splice(+de, 1); $('#equipBox').innerHTML = equipmentHtml(); state.dirty = true; live(); }
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

  /* keep the frozen header's real height in a CSS variable so sticky panels and anchors sit below it */
  function setHdr() { var h = document.querySelector('header.top'); if (h) document.documentElement.style.setProperty('--hdr', h.offsetHeight + 'px'); }
  window.addEventListener('resize', setHdr); window.addEventListener('load', setHdr);
  /* -------------------------------------------------------------------- init */
  function init() {
    setHdr();
    if (!C || !P || !R || !E || !S) { document.getElementById('app').innerHTML = '<p class="banner bad">The calculator could not start because a script failed to load. Please reload the page.</p>'; return; }
    var logo = $('#logo'); if (logo) { logo.src = P.company.logoUrl; logo.addEventListener('error', function () { logo.hidden = true; $('#logoText').hidden = false; }); }
    var SH = window.UCPSheets;
    var go0 = function (res) {
      var ds = $('#dataSource');
      if (ds && res) {
        if (res.status === 'loaded' || res.status === 'partial') ds.textContent = 'Product data: ' + P.meta.dataSource + (res.unverified ? ' - ' + res.unverified + ' value(s) not yet marked verified by engineering.' : '.') + (res.failed.length ? ' (' + res.failed.join(', ') + ' tab unavailable - built-in values used.)' : '');
        else if (res.status === 'failed') ds.textContent = 'Product data: Google Sheet unavailable - built-in values used.';
        if (res.warnings && res.warnings.length && window.console) console.warn('Sheet data notes:', res.warnings);
      }
      bind(); syncHeader(); render(false);
      document.documentElement.classList.add('js-ready');
    };
    if (SH && CFG.sheets) SH.load(CFG.sheets, P).then(go0, function () { go0(null); }); else go0(null);
  }
  (function contactLine() {
    var co = P.company, el = document.getElementById('contactLine'); if (!el || !co) return;
    var s = (co.address ? esc(co.address) + ' &middot; ' : '') + (co.phones || []).map(esc).join(', ') + (co.enquiryEmail ? ' &middot; <a href="mailto:' + esc(co.enquiryEmail) + '">' + esc(co.enquiryEmail) + '</a>' : '') + (co.hours ? ' &middot; ' + esc(co.hours) : '');
    var so = co.social || {}, l = Object.keys(so).map(function (k) { return '<a href="' + esc(so[k]) + '" target="_blank" rel="noopener">' + ({facebook:'Facebook',instagram:'Instagram',linkedin:'LinkedIn',youtube:'YouTube'}[k] || k) + '</a>'; }).join(' &middot; ');
    el.innerHTML = s + (l ? '<br>' + l : '');
  })();
  window.UCPApp = { state: function () { return state; }, raw: raw };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
