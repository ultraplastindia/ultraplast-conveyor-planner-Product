/*
 * optional-fields.js - which OPTIONAL planner input fields are shown.
 * The admin switches a field off in Settings > Optional fields; it then disappears from the form and comes back,
 * in the same place, when it is switched on again. The list lives on the server (so it applies to every user)
 * and is delivered with login. A hidden field is not shown and is not used in the calculation (its value is
 * treated as "not entered"). Required fields (conveyor length, layout) can never be hidden.
 */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.UCPOptional = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var GROUPS = [
    ['Step 1 - Factory space', [['projectName', 'Project name'], ['industry', 'Industry'], ['floorLength', 'Available floor length'], ['floorWidth', 'Available floor width'], ['workingHeight', 'Available working height'], ['inletHeight', 'Inlet height'], ['dischargeHeight', 'Discharge height'], ['startX', 'Start X'], ['startY', 'Start Y'], ['startHeading', 'Start direction'], ['endX', 'End X'], ['endY', 'End Y'], ['obstacles', 'Obstacles block'], ['drawingAvailable', 'Floor plan / drawing available'], ['upload', 'Upload floor plan / drawing']]],
    ['Step 2 - Product', [['productName', 'Product name'], ['handling', 'Product category'], ['prodLength', 'Product length'], ['prodWidth', 'Product width'], ['prodHeight', 'Product height'], ['weight', 'Weight per product'], ['maxWeight', 'Maximum product weight'], ['fragility', 'Fragility'], ['temperature', 'Product temperature'], ['foodContact', 'Food contact / hygiene'], ['cleaning', 'Cleaning method'], ['orientation', 'Product orientation'], ['gap', 'Gap between products'], ['accumulation', 'Accumulation / buffering']]],
    ['Step 3 - Production', [['rate', 'Required throughput'], ['speed', 'Conveying speed'], ['hoursPerDay', 'Operating hours per day'], ['shifts', 'Shifts per day'], ['operation', 'Operation'], ['feeding', 'Feeding'], ['discharge', 'Discharge'], ['upstream', 'Upstream machine'], ['downstream', 'Downstream machine'], ['electrical', 'Electrical supply']]],
    ['Step 3 - Conveyor options', [['categoryPref', 'Conveyor category'], ['material', 'Belt / chain material'], ['beltWidth', 'Conveyor width'], ['friction', 'Belt-to-product friction'], ['lanes', 'Number of lanes'], ['transfers', 'Transfer points'], ['infeedPoints', 'Infeed points'], ['dischargePoints', 'Discharge points'], ['washdown', 'Washdown requirement'], ['guarding', 'Guarding'], ['guideRails', 'Side guide rails required']]],
    ['Advanced', [['pitch', 'Belt / chain pitch'], ['sprocketTeeth', 'Sprocket teeth'], ['pulleyDia', 'Pulley / sprocket diameter'], ['centreDistance', 'Centre distance between shafts'], ['drives', 'Number of drives']]]
  ];
  var hidden = {}, listeners = [];
  function names() { var o = []; GROUPS.forEach(function (g) { g[1].forEach(function (f) { o.push(f[0]); }); }); return o; }
  function set(list) {
    var ok = names(), h = {}; (Array.isArray(list) ? list : []).forEach(function (n) { if (ok.indexOf(n) >= 0) h[n] = true; });
    var before = Object.keys(hidden).sort().join(','), after = Object.keys(h).sort().join(',');
    hidden = h; if (before !== after) listeners.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
  }
  return {
    GROUPS: GROUPS, names: names, set: set,
    list: function () { return Object.keys(hidden); },
    isHidden: function (n) { return hidden[n] === true; },
    onChange: function (f) { listeners.push(f); }
  };
});
