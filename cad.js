/*
 * cad.js — CAD-STYLE DRAWINGS (2-D views + 3-D model) from the entered data
 * ---------------------------------------------------------------------------
 * build(input, meta)  -> drawing model: views (plan, developed side elevation, end section),
 *                        3-D faces, title-block data.  All geometry is taken from conveyor3d.buildScene.
 * toDXF2D(model)      -> DXF R12 text, full size in millimetres (plan, side, end view laid out in model space)
 * toDXF3D(model)      -> DXF R12 text, 3DFACE solid model + 3-D centre-line + dimension annotations
 * toSVG(model)        -> A3 landscape drawing sheet (scaled views, title block, iso 3-D view)
 *
 * HONESTY: dimensions are drawn as lines + text (not associative AutoCAD DIMENSION objects).
 * Frame, guides, legs, rollers and motor are INDICATIVE (layer names end _IND); they are not
 * manufacturing details. Entered = black, calculated = red, indicative = grey (same as the 3-D view).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./conveyor3d.js'));
  else root.UCPCad = factory(root.UCP3D);
})(typeof self !== 'undefined' ? self : this, function (V3) {
  'use strict';
  var num = function (v) { return typeof v === 'number' && isFinite(v); };
  var pos = function (v) { return num(v) && v > 0; };
  var MM = 1000;
  function r1(x) { return Math.round(x * 10) / 10; }
  function mmTxt(m) { return Math.round(m * MM) + ' mm'; }
  function ang(d) { return (Math.round(d * 10) / 10) + '°'; }

  /* ----- layers: name, ACI colour, linetype, SVG colour, SVG width (paper mm) ----- */
  var LAYERS = {
    OUTLINE: [7, 'CONTINUOUS', '#111', 0.5], FRAME_IND: [8, 'CONTINUOUS', '#777', 0.25], GUIDE_IND: [8, 'CONTINUOUS', '#999', 0.18],
    SUPPORT_IND: [8, 'CONTINUOUS', '#777', 0.25], DRIVE_IND: [6, 'CONTINUOUS', '#a0285a', 0.25], CENTRE: [1, 'CENTER', '#c0392b', 0.18],
    FLOOR: [8, 'CONTINUOUS', '#888', 0.35], OBSTACLE: [3, 'DASHED', '#2e7d32', 0.25], PRODUCT: [30, 'CONTINUOUS', '#b9770e', 0.25],
    DIM_ENTERED: [7, 'CONTINUOUS', '#111', 0.13], DIM_CALC: [1, 'CONTINUOUS', '#c0392b', 0.13], DIM_IND: [8, 'CONTINUOUS', '#888', 0.13],
    TEXT: [7, 'CONTINUOUS', '#111', 0.13], TITLE: [7, 'CONTINUOUS', '#111', 0.35], MODEL3D: [7, 'CONTINUOUS', '#444', 0.1], BELT3D: [5, 'CONTINUOUS', '#345', 0.1],
    EQUIP: [5, 'CONTINUOUS', '#1f5fbf', 0.3], EQUIP_IND: [8, 'DASHED', '#777', 0.25], EQUIP3D: [5, 'CONTINUOUS', '#1f5fbf', 0.1],
    FRAME3D_IND: [8, 'CONTINUOUS', '#777', 0.1], SUPPORT3D_IND: [8, 'CONTINUOUS', '#777', 0.1], DRIVE3D_IND: [6, 'CONTINUOUS', '#a0285a', 0.1], FLOOR3D: [9, 'CONTINUOUS', '#bbb', 0.1], OBSTACLE3D: [3, 'CONTINUOUS', '#2e7d32', 0.1]
  };
  var DIMLAYER = { entered: 'DIM_ENTERED', calc: 'DIM_CALC', ind: 'DIM_IND' };
  var ACI = [[1, 255, 0, 0], [2, 255, 255, 0], [3, 0, 255, 0], [4, 0, 255, 255], [5, 0, 0, 255], [6, 255, 0, 255], [7, 255, 255, 255], [8, 128, 128, 128], [9, 192, 192, 192], [30, 255, 127, 0], [250, 51, 51, 51]];
  function nearestAci(rgb) { var best = 7, bd = 1e9; ACI.forEach(function (c) { var d = Math.pow(c[1] - rgb[0], 2) + Math.pow(c[2] - rgb[1], 2) + Math.pow(c[3] - rgb[2], 2); if (d < bd) { bd = d; best = c[0]; } }); return best; }

  /* ----- tiny view container ----- */
  function View(name, title) { this.name = name; this.title = title; this.ents = []; this.dims = []; this.min = [1e18, 1e18]; this.max = [-1e18, -1e18]; }
  View.prototype.grow = function (p) { for (var i = 0; i < 2; i++) { this.min[i] = Math.min(this.min[i], p[i]); this.max[i] = Math.max(this.max[i], p[i]); } };
  View.prototype.line = function (a, b, layer) { this.ents.push({ t: 'line', a: a, b: b, layer: layer }); this.grow(a); this.grow(b); };
  View.prototype.poly = function (pts, closed, layer) { this.ents.push({ t: 'poly', pts: pts, closed: !!closed, layer: layer }); pts.forEach(this.grow, this); };
  View.prototype.circle = function (c, r, layer) { this.ents.push({ t: 'circle', c: c, r: r, layer: layer }); this.grow([c[0] - r, c[1] - r]); this.grow([c[0] + r, c[1] + r]); };
  View.prototype.text = function (p, s, size, layer, o) { o = o || {}; this.ents.push({ t: 'text', p: p, s: s, size: size, layer: layer || 'TEXT', rot: o.rot || 0, mid: !!o.mid, rel: !!o.rel }); this.grow(p); };
  /** aligned linear dimension: a,b measured points, off = signed offset (mm) of the dimension line, left of a->b positive */
  View.prototype.dim = function (a, b, off, text, kind) { this.dims.push({ a: a, b: b, off: off, text: text, kind: kind || 'calc' }); var n = norm2(sub2(b, a)), l = [-n[1], n[0]]; this.grow(a); this.grow(b); this.grow([a[0] + l[0] * off, a[1] + l[1] * off]); this.grow([b[0] + l[0] * off, b[1] + l[1] * off]); };
  function sub2(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function norm2(a) { var l = Math.sqrt(a[0] * a[0] + a[1] * a[1]) || 1; return [a[0] / l, a[1] / l]; }
  /** Expand a dimension into primitives for a given text height h (view units). */
  function expandDim(d, h) {
    var out = [], u = norm2(sub2(d.b, d.a)), l = [-u[1], u[0]], layer = DIMLAYER[d.kind] || 'DIM_CALC', gap = h * 0.5, ext = h * 0.8, ar = h * 1.0;
    var A = [d.a[0] + l[0] * d.off, d.a[1] + l[1] * d.off], B = [d.b[0] + l[0] * d.off, d.b[1] + l[1] * d.off], sg = d.off >= 0 ? 1 : -1;
    out.push({ t: 'line', a: [d.a[0] + l[0] * gap * sg, d.a[1] + l[1] * gap * sg], b: [A[0] + l[0] * ext * sg, A[1] + l[1] * ext * sg], layer: layer });
    out.push({ t: 'line', a: [d.b[0] + l[0] * gap * sg, d.b[1] + l[1] * gap * sg], b: [B[0] + l[0] * ext * sg, B[1] + l[1] * ext * sg], layer: layer });
    out.push({ t: 'line', a: A, b: B, layer: layer });
    var len = Math.sqrt(Math.pow(B[0] - A[0], 2) + Math.pow(B[1] - A[1], 2));
    if (len > ar * 2.2) {
      [[A, u], [B, [-u[0], -u[1]]]].forEach(function (e) { var P = e[0], v = e[1], n = [-v[1], v[0]]; out.push({ t: 'solid', p: [P, [P[0] + v[0] * ar + n[0] * ar * 0.17, P[1] + v[1] * ar + n[1] * ar * 0.17], [P[0] + v[0] * ar - n[0] * ar * 0.17, P[1] + v[1] * ar - n[1] * ar * 0.17]], layer: layer }); });
    }
    var rot = Math.atan2(u[1], u[0]) * 180 / Math.PI; if (rot > 90) rot -= 180; if (rot <= -90) rot += 180;
    var uu = rot === Math.atan2(u[1], u[0]) * 180 / Math.PI ? u : [-u[0], -u[1]], nn = [-uu[1], uu[0]];
    var M = [(A[0] + B[0]) / 2 + nn[0] * h * 0.35, (A[1] + B[1]) / 2 + nn[1] * h * 0.35];
    out.push({ t: 'text', p: M, s: d.text, size: h, layer: layer, rot: rot, mid: true });
    return out;
  }

  /* ----- helpers on the scene ----- */
  function shMap(sts) { var cum = [0], i; for (i = 1; i < sts.length; i++) cum.push(cum[i - 1] + Math.hypot(sts[i].p[0] - sts[i - 1].p[0], sts[i].p[1] - sts[i - 1].p[1])); return { cum: cum, at: function (s) { var k = 0; while (k < sts.length - 2 && sts[k + 1].s < s) k++; var a = sts[k], b = sts[k + 1], t = b.s > a.s ? Math.max(0, Math.min(1, (s - a.s) / (b.s - a.s))) : 0; return cum[k] + (cum[k + 1] - cum[k]) * t; } }; }
  function offsetPts(sts, off) { return sts.map(function (st) { return [(st.p[0] + st.l[0] * off) * MM, (st.p[1] + st.l[1] * off) * MM]; }); }
  function rect(c, t, l, a0, a1, b0, b1) { function P(a, b) { return [(c[0] + t[0] * a + l[0] * b) * MM, (c[1] + t[1] * a + l[1] * b) * MM]; } return [P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1)]; }

  /* ===================================================== build */
  function build(inp, meta) {
    meta = meta || {};
    var sc = V3.buildScene(Object.assign({}, inp, { detail: true })), desc = V3.describe(inp), M = { sc: sc, desc: desc, inp: inp, meta: meta, views: [], notes: sc.notes.slice(), ok: !!(sc.stations && sc.stations.length > 1) };
    if (!M.ok) { M.notes.push('No route has been calculated yet - add the route/layout data to generate a drawing.'); return M; }
    var sts = sc.stations, hw = sc.hw, thk = sc.thk, W = hw * 2, details = (inp.path && inp.path.details) || [], prod = inp.prod || {};
    var wEntered = inp.widthNote ? inp.widthNote === 'entered width' : pos(inp.beltWidthM);
    var wKind = wEntered ? 'entered' : 'ind', wTxt = 'Belt width ' + mmTxt(W) + (wEntered ? '' : ' (not entered)');
    var fS = sts[0], fE = sts[sts.length - 1];

    /* ---------- PLAN ---------- */
    var P = new View('plan', 'PLAN VIEW'), i;
    var L1 = offsetPts(sts, hw), R1 = offsetPts(sts, -hw), L2 = offsetPts(sts, hw + thk), R2 = offsetPts(sts, -hw - thk);
    P.poly(L1, false, 'OUTLINE'); P.poly(R1, false, 'OUTLINE');
    P.line(L1[0], R1[0], 'OUTLINE'); P.line(L1[L1.length - 1], R1[R1.length - 1], 'OUTLINE');
    P.poly(L2, false, 'FRAME_IND'); P.poly(R2, false, 'FRAME_IND');
    P.poly(sts.map(function (s) { return [s.p[0] * MM, s.p[1] * MM]; }), false, 'CENTRE');
    sc.legs.forEach(function (g) { [1, -1].forEach(function (sg) { var c = [g.x + g.l[0] * g.off * sg, g.y + g.l[1] * g.off * sg]; P.poly(rect(c, g.t, g.l, -g.sec, g.sec, -g.sec, g.sec), true, 'SUPPORT_IND'); }); });
    [fS, fE].forEach(function (f) { P.poly(rect(f.p, f.t, f.l, -sc.rollerR, sc.rollerR, -hw - 0.01, hw + 0.01), true, 'DRIVE_IND'); });
    var mb = sc.motorBox; if (mb) P.poly(rect(mb.p, mb.t, mb.l, mb.rt[0], mb.rt[1], mb.rl[0], mb.rl[1]), true, 'DRIVE_IND');
    var ph = (pos(prod.alongMm) && pos(prod.acrossMm)) ? { a: prod.alongMm / MM, b: prod.acrossMm / MM, h: pos(prod.heightMm) ? prod.heightMm / MM : null } : null;
    if (ph) { var s0 = Math.min(0.15 + ph.a / 2, sc.track.length / 2), pt = sc.track.at(s0), tH = [pt.tx, pt.ty], lH = [-tH[1], tH[0]]; P.poly(rect([pt.x, pt.y], tH, lH, -ph.a / 2, ph.a / 2, -ph.b / 2, ph.b / 2), true, 'PRODUCT'); P.text([pt.x * MM, (pt.y + ph.b / 2) * MM + 0], 'Product ' + Math.round(ph.a * MM) + ' x ' + Math.round(ph.b * MM) + ' mm', 0, 'PRODUCT', { rel: true }); }
    P.text([fS.p[0] * MM, fS.p[1] * MM], 'IN', 0, 'TITLE', { rel: true, mid: true }); P.text([fE.p[0] * MM, fE.p[1] * MM], 'OUT', 0, 'TITLE', { rel: true, mid: true });

    /* drive motor, sensors and other equipment entered by the user (plan) */
    function eqLayer(e) { return e.sizeEntered.len && e.sizeEntered.wid && e.sizeEntered.h ? 'EQUIP' : 'EQUIP_IND'; }
    function eqSign(e) { return e.side === 'right' ? -1 : 1; }
    function eqText(e) { return 'E' + e.n + ' ' + (e.name || e.label); }
    var p0t = sc.track.at(0);
    (sc.equip || []).forEach(function (e, i) {
      var t2 = norm2([e.t[0], e.t[1]]), l2 = [-t2[1], t2[0]], c2 = [e.c[0], e.c[1]], sgn = eqSign(e), cam = e.side === 'over belt';
      P.poly(rect(c2, t2, l2, -e.len / 2, e.len / 2, -e.wid / 2, e.wid / 2), true, eqLayer(e));
      if (e.type === 'photoeye') { var lat = sgn * (hw + thk + 0.02 + e.wid / 2), base = [c2[0] - l2[0] * lat, c2[1] - l2[1] * lat], R2 = hw + thk + 0.02; P.line([(base[0] + l2[0] * R2) * MM, (base[1] + l2[1] * R2) * MM], [(base[0] - l2[0] * R2) * MM, (base[1] - l2[1] * R2) * MM], 'EQUIP_IND'); }
      var out = cam ? 0.5 : sgn * (e.wid / 2 + 0.06), al = 0.7 * ((i % 3) - 1); P.text([(c2[0] + l2[0] * out + t2[0] * al) * MM, (c2[1] + l2[1] * out + t2[1] * al) * MM], eqText(e), 0, eqLayer(e), { rel: true, mid: true });
      if (e.posEntered && e.sM > 0.001) {   // distance from the inlet, only when the stretch up to the item is straight (dimension then equals the route distance)
        var pt = sc.track.at(e.sM), chord3 = Math.hypot(pt.x - p0t.x, pt.y - p0t.y, pt.z - p0t.z), plan = Math.hypot(pt.x - p0t.x, pt.y - p0t.y);
        if (Math.abs(chord3 - e.sM) <= 0.005 * Math.max(1, e.sM) + 0.002) P.dim([p0t.x * MM, p0t.y * MM], [pt.x * MM, pt.y * MM], -(hw * MM + 650 + 300 * (i % 4)), eqText(e) + ' ' + mmTxt(plan) + ' from inlet' + (Math.abs(plan - e.sM) > 0.001 ? ' (route ' + mmTxt(e.sM) + ')' : ''), 'entered');
      }
    });
    // belt width dim at the inlet end (placed behind the inlet)
    var wa = L1[0], wb = R1[0], bk = fS.t;
    var up = { a: wb, b: wa }; var sgn0 = (-bk[0] * (-(wa[1] - wb[1])) + -bk[1] * (wa[0] - wb[0])) >= 0 ? 1 : -1;
    P.dim(wb, wa, sgn0 * 380, wTxt, wKind);
    // segment dims
    details.forEach(function (d, k) {
      var a = sts.reduce(function (best, s) { return best; }, null), pa = sc.stations.filter(function () { return true; });
      var ia = null, ib = null, bi = Infinity; // find stations nearest to track positions of segment ends
      var cumS = 0, sS = 0; for (var q = 0; q < details.length; q++) { if (q === k) break; sS += details[q].length; }
      var sE = sS + d.length, tr = sc.track;
      // plan points for segment end-points (centre-line)
      var qa = tr.at(sS), qb = tr.at(sE), A = [qa.x * MM, qa.y * MM], B = [qb.x * MM, qb.y * MM];
      var label = 'S' + (k + 1) + ' ';
      if (d.type === 'straight') { P.dim(A, B, 480 + (k % 3) * 300, label + 'Straight ' + mmTxt(d.length), 'calc'); }
      else if (d.type === 'curve') {
        var mid = tr.at((sS + sE) / 2), sgn = d.direction === 'right' ? -1 : 1, tt = [qa.tx, qa.ty], cen = [(qa.x + sgn * d.radius * -tt[1]) * MM, (qa.y + sgn * d.radius * tt[0]) * MM];
        P.line(cen, [mid.x * MM, mid.y * MM], 'DIM_CALC'); P.circle(cen, 25, 'DIM_CALC');
        P.text([cen[0] + sgn * 0, cen[1] - 380], label + 'Curve ' + (d.direction === 'right' ? 'R' : 'L') + ' R' + Math.round(d.radius * MM) + ' x ' + ang(d.angle) + ' (arc ' + mmTxt(d.length) + ')', 0, 'DIM_CALC', { rel: true, mid: true });
      } else { P.dim(A, B, 480 + (k % 3) * 300, label + 'Incline ' + mmTxt(d.horizontal) + ' run / ' + mmTxt(Math.abs(d.rise)) + ' rise / ' + ang(Math.abs(d.angle)), 'calc'); }
    });
    M.views.push(P);
    var FV = null;
    if (sc.floor) {
      FV = new View('floor', 'FLOOR LAYOUT'); var fx = sc.floor.x1 * MM, fy = sc.floor.y1 * MM, dd0 = Math.max(300, fx * 0.08);
      FV.poly([[0, 0], [fx, 0], [fx, fy], [0, fy]], true, 'FLOOR');
      FV.dim([0, 0], [fx, 0], -dd0, 'Floor length ' + mmTxt(sc.floor.x1), 'entered'); FV.dim([fx, 0], [fx, fy], -dd0, 'Floor width ' + mmTxt(sc.floor.y1), 'entered');
      sc.obstacles.forEach(function (b) { FV.poly([[b.x * MM, b.y * MM], [(b.x + b.w) * MM, b.y * MM], [(b.x + b.w) * MM, (b.y + b.d) * MM], [b.x * MM, (b.y + b.d) * MM]], true, 'OBSTACLE'); FV.text([(b.x + b.w / 2) * MM, (b.y + b.d / 2) * MM], b.name + ' ' + mmTxt(b.w) + ' x ' + mmTxt(b.d), 0, 'OBSTACLE', { mid: true, rel: true }); });
      FV.poly(L1, false, 'OUTLINE'); FV.poly(R1, false, 'OUTLINE'); FV.line(L1[0], R1[0], 'OUTLINE'); FV.line(L1[L1.length - 1], R1[R1.length - 1], 'OUTLINE');
      FV.poly(sts.map(function (st) { return [st.p[0] * MM, st.p[1] * MM]; }), false, 'CENTRE');
      FV.text([fS.p[0] * MM, fS.p[1] * MM], 'IN', 0, 'TITLE', { rel: true }); FV.text([fE.p[0] * MM, fE.p[1] * MM], 'OUT', 0, 'TITLE', { rel: true });
    } else M.notes.push('Floor size not entered - floor layout view omitted.');

    /* ---------- DEVELOPED SIDE ELEVATION (x = horizontal route distance, y = height) ---------- */
    var sh = shMap(sts), E = new View('side', 'SIDE ELEVATION (developed along route)'), fd = sc.fd, top = sts.map(function (s, k) { return [sh.cum[k] * MM, s.p[2] * MM]; });
    var totalH = sh.cum[sh.cum.length - 1] * MM;
    E.line([-300, 0], [totalH + 300, 0], 'FLOOR');
    E.poly(top, false, 'OUTLINE'); E.poly(top.map(function (p) { return [p[0], p[1] - 12]; }), false, 'OUTLINE');
    E.poly(top.map(function (p) { return [p[0], p[1] - fd * MM]; }), false, 'FRAME_IND');
    E.poly(top.map(function (p) { return [p[0], p[1] + 15 + sc.guideH * MM]; }), false, 'GUIDE_IND');
    sc.legs.forEach(function (g) { var x = sh.at(g.s) * MM, s = g.sec * MM; E.poly([[x - s, 0], [x + s, 0], [x + s, g.zb * MM], [x - s, g.zb * MM]], true, 'SUPPORT_IND'); });
    var R = sc.rollerR * MM; [fS, fE].forEach(function (f, k) { E.circle([(k ? totalH : 0), f.p[2] * MM - 12 - R], R, 'DRIVE_IND'); });
    if (ph && ph.h) { var xs = Math.min(0.15 + ph.a / 2, totalH / MM / 2) * MM, zs = sts[0].p[2] * MM, w = ph.a * MM; E.poly([[xs - w / 2, zs], [xs + w / 2, zs], [xs + w / 2, zs + ph.h * MM], [xs - w / 2, zs + ph.h * MM]], true, 'PRODUCT'); }

    (sc.equip || []).forEach(function (e, i) {
      var x = sh.at(Math.max(0, Math.min(sc.track.length, e.sM))) * MM, zc = (e.beltTopZ + e.mountM) * MM, hl = e.len * MM / 2, hh = e.h * MM / 2;
      E.poly([[x - hl, zc - hh], [x + hl, zc - hh], [x + hl, zc + hh], [x - hl, zc + hh]], true, eqLayer(e));
      E.text([x + 900 * ((i % 3) - 1), zc + hh + 40], eqText(e), 0, eqLayer(e), { rel: true, mid: true });
      var yb = -260 - 330 * (i % 4);   // dimensions below the floor line
      if (e.posEntered && x > 1) E.dim([0, yb], [x, yb], -120, eqText(e) + ' ' + Math.round(x) + ' mm from inlet (horizontal)' + (Math.abs(x - e.sM * MM) > 1 ? ' | route ' + Math.round(e.sM * MM) + ' mm' : ''), 'entered');
      if (e.mountEntered && Math.abs(e.mountM) > 0.02) E.dim([x + hl + 60, e.beltTopZ * MM], [x + hl + 60, zc], 90, eqText(e) + ' ' + (e.mountM >= 0 ? '+' : '') + Math.round(e.mountM * MM) + ' from belt top', 'entered');
    });
    var zmax = Math.max.apply(null, top.map(function (p) { return p[1]; })), dimY = Math.max(zmax, (desc.elevations.topOfProductM || 0) * MM) + 500;
    E.dim([0, 0], [0, fS.p[2] * MM], 320, 'Inlet height ' + mmTxt(fS.p[2]) + (desc.elevations.basis === 'illustrative' ? ' (illustrative)' : ''), desc.elevations.basis === 'illustrative' ? 'ind' : 'entered');
    if (Math.abs(fE.p[2] - fS.p[2]) > 0.02) E.dim([totalH, 0], [totalH, fE.p[2] * MM], -320, 'Discharge height ' + mmTxt(fE.p[2]), 'calc');
    var xa = 0, runs = [];
    details.forEach(function (d, k) {
      var x1 = xa + d.horizontal * MM, za = sts[0].p[2] * MM; var iz = (function () { var s0 = 0; for (var q = 0; q < k; q++) s0 += details[q].length; return [sc.track.at(s0).z * MM, sc.track.at(s0 + d.length).z * MM]; })();
      E.line([xa, iz[0] - fd * MM - 120], [xa, dimY + 100], 'CENTRE');
      E.dim([xa, dimY - 150], [x1, dimY - 150], 150 + (k % 2) * 330, 'S' + (k + 1) + ' ' + (d.type === 'incline' ? 'incline run ' + mmTxt(d.horizontal) + ' | slope ' + mmTxt(Math.hypot(d.horizontal, d.rise)) + ' | rise ' + Math.round(Math.abs(d.rise) * MM) + ' | ' + ang(Math.abs(d.angle)) : d.type + ' ' + mmTxt(d.length)), 'calc');
      xa = x1;
    });
    E.line([xa, 0], [xa, dimY + 100], 'CENTRE');
    E.dim([0, dimY + 900], [totalH, dimY + 900], 150, 'Overall (horizontal) ' + mmTxt(totalH / MM) + ' - belt route length ' + mmTxt(sc.track.length), 'calc');
    M.views.push(E);

    /* ---------- END SECTION (across the belt) ---------- */
    var S = new View('end', 'END VIEW (section across belt)'), zb = fS.p[2] * MM, hwm = hw * MM, tk = thk * MM, gH = sc.guideH * MM;
    S.line([-hwm - 600, 0], [hwm + 600, 0], 'FLOOR');
    S.poly([[-hwm, zb - 12], [hwm, zb - 12], [hwm, zb], [-hwm, zb]], true, 'OUTLINE');
    [1, -1].forEach(function (sg) {
      S.poly([[sg * hwm, zb - fd * MM], [sg * (hwm + tk), zb - fd * MM], [sg * (hwm + tk), zb + 15], [sg * hwm, zb + 15]], true, 'FRAME_IND');
      S.poly([[sg * hwm, zb + 15], [sg * (hwm + 12), zb + 15], [sg * (hwm + 12), zb + 15 + gH], [sg * hwm, zb + 15 + gH]], true, 'GUIDE_IND');
      var lx = sg * (hwm + tk / 2), s = 20; S.poly([[lx - s, 0], [lx + s, 0], [lx + s, zb - fd * MM], [lx - s, zb - fd * MM]], true, 'SUPPORT_IND');
    });
    var topY = zb + 15 + gH, pTop = ph && ph.h ? zb + ph.h * MM : zb;
    if (ph) { var pw = ph.b * MM; if (ph.h) S.poly([[-pw / 2, zb], [pw / 2, zb], [pw / 2, zb + ph.h * MM], [-pw / 2, zb + ph.h * MM]], true, 'PRODUCT'); S.dim([-pw / 2, pTop], [pw / 2, pTop], 90, 'Prod. ' + Math.round(pw) + (ph.h ? ' x ' + Math.round(ph.h * MM) : '') + ' mm', 'entered'); }
    S.dim([-hwm, Math.max(topY, pTop)], [hwm, Math.max(topY, pTop)], 420, wTxt, wKind);
    S.dim([-hwm - tk, 0], [hwm + tk, 0], -300, 'Overall over frame ' + mmTxt(W + 2 * thk) + ' (indicative)', 'ind');
    S.dim([hwm + tk, 0], [hwm + tk, zb], -700, 'Belt top height ' + mmTxt(fS.p[2]), desc.elevations.basis === 'illustrative' ? 'ind' : 'entered');

    (sc.equip || []).forEach(function (e, i) {
      var sgn = eqSign(e), cam = e.side === 'over belt', lat = cam ? 0 : sgn * (hw + thk + 0.02 + e.wid / 2) * MM, zc = zb + e.mountM * MM, hwid = e.wid * MM / 2, hh = e.h * MM / 2;
      S.poly([[lat - hwid, zc - hh], [lat + hwid, zc - hh], [lat + hwid, zc + hh], [lat - hwid, zc + hh]], true, eqLayer(e));
      S.text([lat + 150 * ((i % 3) - 1), zc + hh + 30], 'E' + e.n, 0, eqLayer(e), { rel: true, mid: true });
      if (e.sizeEntered.wid) S.dim([lat - hwid, zc - hh], [lat + hwid, zc - hh], -60 - 60 * (i % 3), 'E' + e.n + ' W ' + Math.round(e.wid * MM), 'entered');
      if (e.sizeEntered.h) S.dim([lat + hwid, zc - hh], [lat + hwid, zc + hh], 60 + 60 * (i % 3), 'E' + e.n + ' H ' + Math.round(e.h * MM), 'entered');
    });
    M.views.push(S); if (FV) M.views.push(FV);

    /* ---------- 3-D faces ---------- */
    M.faces = sc.polys.filter(function (q) { return q.tag !== 'prod'; });
    M.notes.push('Frame, guide rails, legs, rollers and motor are INDICATIVE (not Ultraplast engineering data).');
    M.notes.push('Dimensions are drawn as lines and text (not associative AutoCAD DIMENSION objects).');
    return M;
  }

  /* ===================================================== helpers for writers */
  function viewSize(v) { return [v.max[0] - v.min[0], v.max[1] - v.min[1]]; }
  function textSize(v) { var s = viewSize(v); return Math.max(40, Math.round(Math.max(s[0], s[1]) / 95 / 10) * 10); }
  /** Resolve a view into primitives in view units, with text heights. */
  function prims(v, h) {
    var out = [];
    v.ents.forEach(function (e) {
      if (e.t === 'text') out.push({ t: 'text', p: e.p, s: e.s, size: e.rel ? h * (e.layer === 'TITLE' ? 1.3 : 1) : e.size || h, layer: e.layer, rot: e.rot, mid: e.mid, off: e.rel ? [0, h * (e.layer === 'TITLE' ? 2.0 : 0.6)] : null });
      else out.push(e);
    });
    v.dims.forEach(function (d) { expandDim(d, h).forEach(function (p) { out.push(p); }); });
    return out;
  }
  function pad(n) { return n; }

  /* ===================================================== DXF R12 */
  function DXF() { this.o = []; this.layers = {}; }
  DXF.prototype.g = function (c, v) { this.o.push(String(c)); this.o.push(String(v)); };
  function f(n) { return (Math.round(n * 1000) / 1000).toString(); }
  function ascii(s) { return String(s).replace(/°/g, '%%d').replace(/×/g, 'x').replace(/±/g, '%%p').replace(/[^\x20-\x7e]/g, '?'); }
  DXF.prototype.use = function (layer) { this.layers[layer] = 1; return layer; };
  DXF.prototype.line = function (a, b, layer, z0, z1) { this.g(0, 'LINE'); this.g(8, this.use(layer)); this.g(10, f(a[0])); this.g(20, f(a[1])); this.g(30, f(z0 || (a[2] || 0))); this.g(11, f(b[0])); this.g(21, f(b[1])); this.g(31, f(z1 || (b[2] || 0))); };
  DXF.prototype.poly = function (pts, closed, layer) { var me = this; this.g(0, 'POLYLINE'); this.g(8, this.use(layer)); this.g(66, 1); this.g(70, closed ? 1 : 0); this.g(10, 0); this.g(20, 0); this.g(30, 0); pts.forEach(function (p) { me.g(0, 'VERTEX'); me.g(8, layer); me.g(10, f(p[0])); me.g(20, f(p[1])); me.g(30, 0); }); this.g(0, 'SEQEND'); this.g(8, layer); };
  DXF.prototype.poly3 = function (pts, layer) { var me = this; this.g(0, 'POLYLINE'); this.g(8, this.use(layer)); this.g(66, 1); this.g(70, 8); this.g(10, 0); this.g(20, 0); this.g(30, 0); pts.forEach(function (p) { me.g(0, 'VERTEX'); me.g(8, layer); me.g(10, f(p[0])); me.g(20, f(p[1])); me.g(30, f(p[2])); me.g(70, 32); }); this.g(0, 'SEQEND'); this.g(8, layer); };
  DXF.prototype.circle = function (c, r, layer) { this.g(0, 'CIRCLE'); this.g(8, this.use(layer)); this.g(10, f(c[0])); this.g(20, f(c[1])); this.g(30, 0); this.g(40, f(r)); };
  DXF.prototype.text = function (p, s, h, layer, rot, mid) { this.g(0, 'TEXT'); this.g(8, this.use(layer)); this.g(10, f(p[0])); this.g(20, f(p[1])); this.g(30, 0); this.g(40, f(h)); this.g(1, ascii(s)); if (rot) this.g(50, f(rot)); if (mid) { this.g(72, 1); this.g(11, f(p[0])); this.g(21, f(p[1])); this.g(31, 0); } };
  DXF.prototype.solid = function (p, layer) { this.g(0, 'SOLID'); this.g(8, this.use(layer)); this.g(10, f(p[0][0])); this.g(20, f(p[0][1])); this.g(30, 0); this.g(11, f(p[1][0])); this.g(21, f(p[1][1])); this.g(31, 0); this.g(12, f(p[2][0])); this.g(22, f(p[2][1])); this.g(32, 0); this.g(13, f(p[2][0])); this.g(23, f(p[2][1])); this.g(33, 0); };
  DXF.prototype.face = function (q, layer, color) { var p = q.length === 3 ? [q[0], q[1], q[2], q[2]] : q; this.g(0, '3DFACE'); this.g(8, this.use(layer)); if (color) this.g(62, color); for (var i = 0; i < 4; i++) { this.g(10 + i, f(p[i][0])); this.g(20 + i, f(p[i][1])); this.g(30 + i, f(p[i][2])); } };
  DXF.prototype.finish = function (ext, title) {
    var h = [], me = this, names = Object.keys(this.layers);
    function g(c, v) { h.push(String(c)); h.push(String(v)); }
    g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009'); g(9, '$EXTMIN'); g(10, f(ext[0][0])); g(20, f(ext[0][1])); g(30, f(ext[0][2] || 0)); g(9, '$EXTMAX'); g(10, f(ext[1][0])); g(20, f(ext[1][1])); g(30, f(ext[1][2] || 0)); g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'TABLES');
    g(0, 'TABLE'); g(2, 'LTYPE'); g(70, 3);
    g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, 0); g(3, 'Solid line'); g(72, 65); g(73, 0); g(40, 0);
    var sc = Math.max(1, ext[1][0] - ext[0][0]) / 400;
    g(0, 'LTYPE'); g(2, 'DASHED'); g(70, 0); g(3, 'Dashed'); g(72, 65); g(73, 2); g(40, f(12 * sc)); g(49, f(8 * sc)); g(49, f(-4 * sc));
    g(0, 'LTYPE'); g(2, 'CENTER'); g(70, 0); g(3, 'Centre'); g(72, 65); g(73, 4); g(40, f(30 * sc)); g(49, f(18 * sc)); g(49, f(-4 * sc)); g(49, f(4 * sc)); g(49, f(-4 * sc));
    g(0, 'ENDTAB');
    g(0, 'TABLE'); g(2, 'LAYER'); g(70, names.length);
    names.forEach(function (n) { var L = LAYERS[n] || [7, 'CONTINUOUS']; g(0, 'LAYER'); g(2, n); g(70, 0); g(62, L[0]); g(6, L[1]); });
    g(0, 'ENDTAB');
    g(0, 'TABLE'); g(2, 'STYLE'); g(70, 1); g(0, 'STYLE'); g(2, 'STANDARD'); g(70, 0); g(40, 0); g(41, 1); g(50, 0); g(71, 0); g(42, 2.5); g(3, 'txt'); g(4, ''); g(0, 'ENDTAB');
    g(0, 'ENDSEC'); g(0, 'SECTION'); g(2, 'ENTITIES');
    return h.join('\n') + '\n' + this.o.join('\n') + '\n0\nENDSEC\n0\nEOF\n';
  };
  function emitPrims(d, list, dx, dy) {
    list.forEach(function (e) {
      function T(p) { return [p[0] + dx, p[1] + dy]; }
      if (e.t === 'line') d.line(T(e.a), T(e.b), e.layer);
      else if (e.t === 'poly') d.poly(e.pts.map(T), e.closed, e.layer);
      else if (e.t === 'circle') d.circle(T(e.c), e.r, e.layer);
      else if (e.t === 'solid') d.solid(e.p.map(T), e.layer);
      else if (e.t === 'text') { var p = T(e.p); if (e.off) p = [p[0] + e.off[0], p[1] + e.off[1]]; d.text(p, e.s, e.size, e.layer, e.rot, e.mid); }
    });
  }
  /** Lay the 2-D views out in model space (full size, mm). Returns the extents used. */
  function layout2D(d, M) {
    var v = M.views, gap = 2500, pl = v[0], sd = v[1], en = v[2], fl = v[3], hP = textSize(pl), hS = textSize(sd), hE = textSize(en);
    var pW = viewSize(pl)[0], pH = viewSize(pl)[1], sW = viewSize(sd)[0], sH = viewSize(sd)[1];
    // plan: lower-left at (0,0). Floor layout: right of the plan, tops aligned. Side + end view: below, tops aligned.
    var topSide = -(pH + gap);
    emitPrims(d, prims(pl, hP), -pl.min[0], -pl.min[1]);
    d.text([0, pH + hP * 3], M.meta.title || 'ULTRAPLAST CONVEYOR - GA DRAWING (indicative, from entered data)', hP * 1.6, 'TITLE');
    d.text([0, pH + hP * 1.2], 'PLAN VIEW  (full size, mm)', hP * 1.1, 'TITLE');
    if (fl) { var hF = textSize(fl), fx = pW + gap; emitPrims(d, prims(fl, hF), fx - fl.min[0], pH - fl.max[1]); d.text([fx, pH + hF * 1.2], 'FLOOR LAYOUT (full size, mm)', hF * 1.1, 'TITLE'); }
    emitPrims(d, prims(sd, hS), -sd.min[0], topSide - sd.max[1]);
    d.text([0, topSide + hS * 1.5], 'SIDE ELEVATION (developed along route, mm)', hS * 1.1, 'TITLE');
    var ex = sW + gap; emitPrims(d, prims(en, hE), ex - en.min[0], topSide - en.max[1]);
    d.text([ex, topSide + hE * 1.5], 'END VIEW (mm)', hE * 1.1, 'TITLE');
    var yb = topSide - sH - 3 * hS;
    ['Entered data = black dimensions, calculated = red, indicative = grey (layers DIM_ENTERED / DIM_CALC / DIM_IND).', 'Layers ending _IND (frame, guides, legs, rollers, motor) are indicative drawing aids, NOT manufacturing details.', 'Dimensions are lines + text, not associative DIMENSION objects. Generated ' + (M.meta.date || '') + ' - for engineering review.'].concat(M.notes.filter(function (n) { return !/INDICATIVE|associative/.test(n); })).forEach(function (t, i) { d.text([0, yb - i * hS * 1.6], t, hS * 0.9, 'TEXT'); });
    var right = Math.max(pW + (fl ? gap + viewSize(fl)[0] : 0), ex + viewSize(en)[0]);
    var nNotes = 3 + M.notes.filter(function (n) { return !/INDICATIVE|associative/.test(n); }).length;
    return { gap: gap, right: right, top: pH + 6 * hP, bottom: yb - nNotes * hS * 1.6, hS: hS, hP: hP };
  }
  /** 2-D DXF: full size, millimetres. Plan at the origin, side elevation below it, end view to the right of the side view. */
  function toDXF2D(M) { var d = new DXF(), L = layout2D(d, M); return d.finish([[-L.gap, L.bottom - 8 * L.hS], [L.right, L.top]]); }

  /* ----- schedules (tables) : equipment placed by the user, and the route segments ----- */
  function mmS(m) { return String(Math.round(m * MM)); }
  function equipSchedule(M) {
    var rows = (M.sc.equip || []).map(function (e) {
      var sz = [e.len, e.wid, e.h].map(mmS).join(' x ') + (e.sizeEntered.len && e.sizeEntered.wid && e.sizeEntered.h ? '' : ' *');
      return ['E' + e.n, e.label, e.name || '-', e.rating || '-', e.side, e.posEntered ? mmS(e.sM) : 'not entered *', (e.mountEntered ? (e.mountM >= 0 ? '+' : '') + mmS(e.mountM) : 'default *'), sz, mmS(e.beltTopZ + e.mountM), e.note || ''];
    });
    return { title: 'EQUIPMENT SCHEDULE (drive motor, sensors, other) - values as entered; * = indicative placeholder, not entered', head: ['Tag', 'Type', 'Name', 'Rating / spec (as entered)', 'Side', 'From inlet (mm, along route)', 'Height above belt top (mm)', 'L x W x H (mm)', 'Centre above floor (mm)', 'Note'], rows: rows };
  }
  function segSchedule(M) {
    var det = (M.inp.path && M.inp.path.details) || [], rows = det.map(function (d, k) {
      return ['S' + (k + 1), d.type, mmS(d.length), d.type === 'curve' ? mmS(d.radius) : '-', d.type === 'curve' ? ang(d.angle) + ' ' + (d.direction === 'right' ? 'R' : 'L') : (d.type === 'incline' ? ang(Math.abs(d.angle)) : '-'), mmS(d.horizontal), d.type === 'incline' ? mmS(Math.abs(d.rise)) : '-'];
    });
    var e = M.desc.elevations;
    return { title: 'ROUTE SCHEDULE (calculated from entered data)', head: ['Seg', 'Type', 'Length (mm)', 'Radius (mm)', 'Angle', 'Horizontal run (mm)', 'Rise (mm)'], rows: rows, foot: 'Belt width ' + mmS(M.sc.geom.widthM) + ' mm | route length ' + mmS(M.sc.geom.totalM) + ' mm | inlet height ' + mmS(e.inletM) + ' mm | discharge height ' + mmS(e.dischargeM) + ' mm' };
  }
  /** Draw a table with grid lines. x0,y0 = top-left. Returns the y of the bottom. */
  function dxfTable(d, x0, y0, T, h) {
    var cols = T.head.length, w = [], i, j, rowH = h * 2.0, cw = h * 0.72;
    for (j = 0; j < cols; j++) { var m = String(T.head[j]).length; T.rows.forEach(function (r) { m = Math.max(m, String(r[j]).length); }); w.push(Math.min(60, m) * cw + h); }
    var tw = w.reduce(function (a, b) { return a + b; }, 0), y = y0;
    d.text([x0, y + h * 0.6], T.title, h * 1.1, 'TITLE');
    function row(cells, bold) { for (var j2 = 0, x = x0; j2 < cols; j2++) { d.text([x + h * 0.4, y - rowH * 0.68], String(cells[j2] === undefined ? '' : cells[j2]).slice(0, 60), h * (bold ? 0.9 : 0.85), 'TEXT'); x += w[j2]; } y -= rowH; d.line([x0, y, 0], [x0 + tw, y, 0], 'TEXT'); }
    d.line([x0, y, 0], [x0 + tw, y, 0], 'TEXT'); row(T.head, true);
    if (!T.rows.length) { d.text([x0 + h * 0.4, y - rowH * 0.68], 'None entered', h * 0.85, 'TEXT'); y -= rowH; d.line([x0, y, 0], [x0 + tw, y, 0], 'TEXT'); }
    T.rows.forEach(function (r) { row(r, false); });
    for (j = 0, i = x0; j <= cols; j++) { d.line([i, y0, 0], [i, y, 0], 'TEXT'); i += w[j] || 0; }
    if (T.foot) { d.text([x0, y - rowH * 0.9], T.foot, h * 0.9, 'TEXT'); y -= rowH * 1.4; }
    return y;
  }
  /** ONE DXF with everything: all 2-D views, floor layout, schedules, title block and the 3-D model (placed to the right). */
  function toDXFAll(M) {
    var d = new DXF(), L = layout2D(d, M), h = Math.max(40, L.hS), y = L.bottom - 4 * h;
    var mtitle = (M.meta.title || 'Conveyor general arrangement');
    // tables
    var yy = dxfTable(d, 0, y, equipSchedule(M), h); yy = dxfTable(d, 0, yy - 4 * h, segSchedule(M), h);
    // title block
    var tb = yy - 5 * h, tx = 0, tw = 90 * h, lines = ['ULTRAPLAST CHAINBELTS PVT. LTD.', mtitle + (M.meta.ref ? '   Ref: ' + M.meta.ref : ''), 'Date ' + (M.meta.date || '') + '    Units: mm    Scale: 1:1 (full size, model space)', 'INDICATIVE drawing - for engineering review, not for manufacture.', 'Contents: plan, floor layout, side elevation, end view, equipment + route schedules, 3-D model (to the right).', 'Dimension colours: black = entered, red = calculated, grey = indicative.'];
    d.line([tx, tb + 2 * h, 0], [tx + tw, tb + 2 * h, 0], 'TITLE'); d.line([tx + tw, tb + 2 * h, 0], [tx + tw, tb - lines.length * h * 1.7, 0], 'TITLE'); d.line([tx + tw, tb - lines.length * h * 1.7, 0], [tx, tb - lines.length * h * 1.7, 0], 'TITLE'); d.line([tx, tb - lines.length * h * 1.7, 0], [tx, tb + 2 * h, 0], 'TITLE');
    lines.forEach(function (t, i) { d.text([tx + h, tb - i * h * 1.7 + h * 0.2], t, i === 0 ? h * 1.2 : h * 0.95, i === 3 ? 'DIM_CALC' : 'TITLE'); });
    var bottom = tb - lines.length * h * 1.7 - 2 * h;
    // 3-D model placed to the right of the 2-D layout
    var sc = M.sc, belt = nearestAci(sc.beltRgb), lay = { belt: 'BELT3D', frame: 'FRAME3D_IND', support: 'SUPPORT3D_IND', drive: 'DRIVE3D_IND', floor: 'FLOOR3D', obst: 'OBSTACLE3D', equip: 'EQUIP3D' };
    var lo = [1e18, 1e18, 1e18], hi = [-1e18, -1e18, -1e18], src = [1e18, 1e18, 1e18];
    sc.polys.forEach(function (q) { if (q.tag === 'prod') return; q.p.forEach(function (p) { for (var i = 0; i < 3; i++) src[i] = Math.min(src[i], p[i] * MM); }); });
    var ox = L.right + 6000 - src[0], oy = L.top - 1000 - (function () { var m = -1e18; sc.polys.forEach(function (q) { if (q.tag !== 'prod') q.p.forEach(function (p) { m = Math.max(m, p[1] * MM); }); }); return m; })();
    function P3(p) { var q = [p[0] * MM + ox, p[1] * MM + oy, p[2] * MM]; for (var i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], q[i]); hi[i] = Math.max(hi[i], q[i]); } return q; }
    sc.polys.forEach(function (q) { if (q.tag === 'prod') return; if (q.tag === 'floor' && q.n[2] < 0.9) return; d.face(q.p.map(P3), lay[q.tag] || 'MODEL3D', q.tag === 'belt' ? belt : (q.tag === 'equip' ? nearestAci(q.c) : 0)); });
    d.poly3(sc.stations.map(function (s) { return P3(s.p); }), 'CENTRE');
    var h3 = Math.max(60, Math.round(Math.max(hi[0] - lo[0], hi[1] - lo[1]) / 120 / 10) * 10);
    sc.dims.forEach(function (m) { var a = P3(m.a), b = P3(m.b); d.line(a, b, DIMLAYER[m.kind] || 'DIM_CALC'); var mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], dx = b[0] - a[0], dy = b[1] - a[1], rot = Math.atan2(dy, dx) * 180 / Math.PI; if (rot > 90) rot -= 180; if (rot <= -90) rot += 180; d.g(0, 'TEXT'); d.g(8, d.use(DIMLAYER[m.kind] || 'DIM_CALC')); d.g(10, f(mid[0])); d.g(20, f(mid[1])); d.g(30, f(mid[2])); d.g(40, f(h3)); d.g(1, ascii(m.text)); if (Math.abs(dx) + Math.abs(dy) > 1e-6) d.g(50, f(rot)); });
    sc.tags.forEach(function (t) { if (!/^E\d/.test(t.text)) return; var p = P3(t.p); d.g(0, 'TEXT'); d.g(8, d.use('EQUIP3D')); d.g(10, f(p[0])); d.g(20, f(p[1])); d.g(30, f(p[2])); d.g(40, f(h3)); d.g(1, ascii(t.text)); });
    d.text([lo[0], hi[1] + h3 * 3], '3-D MODEL (full size, mm) - ' + mtitle, h3 * 1.4, 'TITLE');
    return d.finish([[Math.min(-L.gap, lo[0]), Math.min(bottom, lo[1]), Math.min(0, lo[2])], [Math.max(L.right, hi[0]), Math.max(L.top, hi[1]), Math.max(0, hi[2])]]);
  }
  /** 3-D DXF: 3DFACE model (layers by part), centre-line, belt-colour on BELT3D, plus dimension annotations. */
  function toDXF3D(M, opt) {
    opt = opt || {}; var d = new DXF(), sc = M.sc, belt = nearestAci(sc.beltRgb), lay = { belt: 'BELT3D', frame: 'FRAME3D_IND', support: 'SUPPORT3D_IND', drive: 'DRIVE3D_IND', floor: 'FLOOR3D', obst: 'OBSTACLE3D', equip: 'EQUIP3D' };
    var lo = [1e18, 1e18, 1e18], hi = [-1e18, -1e18, -1e18];
    function P(p) { var q = [p[0] * MM, p[1] * MM, p[2] * MM]; for (var i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], q[i]); hi[i] = Math.max(hi[i], q[i]); } return q; }
    sc.polys.forEach(function (q) { if (q.tag === 'prod') return; if (q.tag === 'floor' && q.n[2] < 0.9) return; d.face(q.p.map(P), lay[q.tag] || 'MODEL3D', q.tag === 'belt' ? belt : (q.tag === 'equip' ? nearestAci(q.c) : 0)); });
    d.poly3(sc.stations.map(function (s) { return P(s.p); }), 'CENTRE');
    var h = Math.max(60, Math.round(Math.max(hi[0] - lo[0], hi[1] - lo[1]) / 120 / 10) * 10);
    sc.dims.forEach(function (m) { var a = P(m.a), b = P(m.b); d.line(a, b, DIMLAYER[m.kind] || 'DIM_CALC'); var mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], dx = b[0] - a[0], dy = b[1] - a[1], rot = Math.atan2(dy, dx) * 180 / Math.PI; if (rot > 90) rot -= 180; if (rot <= -90) rot += 180; d.g(0, 'TEXT'); d.g(8, d.use(DIMLAYER[m.kind] || 'DIM_CALC')); d.g(10, f(mid[0])); d.g(20, f(mid[1])); d.g(30, f(mid[2])); d.g(40, f(h)); d.g(1, ascii(m.text)); if (Math.abs(dx) + Math.abs(dy) > 1e-6) d.g(50, f(rot)); });
    return d.finish([lo, hi]);
  }

  /* ===================================================== SVG sheet (A3 landscape, mm) */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var STD = [1, 2, 2.5, 5, 10, 20, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
  function pickScale(w, h, bw, bh) { var need = Math.max(w / bw, h / bh); for (var i = 0; i < STD.length; i++) if (STD[i] >= need) return STD[i]; return Math.ceil(need); }
  function svgPrims(list, k, ox, oy, minx, maxy) {
    function X(x) { return r1(ox + (x - minx) * k * 1) / 1; } function Y(y) { return r1(oy + (maxy - y) * k); }
    var s = '';
    list.forEach(function (e) {
      var L = LAYERS[e.layer] || LAYERS.TEXT, st = 'stroke="' + L[2] + '" stroke-width="' + L[3] + '" fill="none"' + (L[1] === 'DASHED' ? ' stroke-dasharray="2 1.2"' : L[1] === 'CENTER' ? ' stroke-dasharray="6 1.2 1 1.2"' : '');
      if (e.t === 'line') s += '<line x1="' + X(e.a[0]) + '" y1="' + Y(e.a[1]) + '" x2="' + X(e.b[0]) + '" y2="' + Y(e.b[1]) + '" ' + st + '/>';
      else if (e.t === 'poly') s += '<polyline points="' + e.pts.concat(e.closed ? [e.pts[0]] : []).map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' ') + '" ' + st + '/>';
      else if (e.t === 'circle') s += '<circle cx="' + X(e.c[0]) + '" cy="' + Y(e.c[1]) + '" r="' + r1(e.r * k) + '" ' + st + '/>';
      else if (e.t === 'solid') s += '<polygon points="' + e.p.map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' ') + '" fill="' + L[2] + '"/>';
      else if (e.t === 'text') { var p = e.off ? [e.p[0] + e.off[0], e.p[1] + e.off[1]] : e.p, sz = e.size * k; s += '<text x="' + X(p[0]) + '" y="' + Y(p[1]) + '" font-size="' + r1(sz) + '" font-family="Arial,Helvetica,sans-serif" fill="' + L[2] + '"' + (e.mid ? ' text-anchor="middle"' : '') + (e.rot ? ' transform="rotate(' + (-e.rot) + ' ' + X(p[0]) + ' ' + Y(p[1]) + ')"' : '') + '>' + esc(e.s) + '</text>'; }
    });
    return s;
  }
  function isoFaces(M, azDeg, elDeg) {
    var az = azDeg * Math.PI / 180, el = elDeg * Math.PI / 180, fw = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), -Math.sin(el)];
    var rt = (function () { var c = [fw[1] * 1 - 0, -fw[0], 0], l = Math.hypot(c[0], c[1]) || 1; return [c[0] / l, c[1] / l, 0]; })(), up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
    var light = [-0.4, -0.5, 0.75], ll = Math.hypot(light[0], light[1], light[2]); light = light.map(function (v) { return v / ll; });
    var out = [];
    M.sc.polys.forEach(function (q) { if (q.tag === 'prod') return; if (q.tag === 'floor') return; var nd = q.n[0] * fw[0] + q.n[1] * fw[1] + q.n[2] * fw[2]; if (q.tag !== 'floor' && nd > 0.0001) return;
      var pts = q.p.map(function (p) { return [p[0] * rt[0] + p[1] * rt[1] + p[2] * rt[2], p[0] * up[0] + p[1] * up[1] + p[2] * up[2]]; }), depth = 0; q.p.forEach(function (p) { depth += (p[0] * fw[0] + p[1] * fw[1] + p[2] * fw[2]) / q.p.length; });
      var lam = Math.max(0, q.n[0] * light[0] + q.n[1] * light[1] + q.n[2] * light[2]), sh = 0.55 + 0.45 * lam, rgb = q.c.map(function (c) { return Math.round(Math.min(255, c * sh)); });
      out.push({ pts: pts, depth: q.tag === 'floor' ? 1e9 : depth, rgb: rgb, a: q.a, tag: q.tag }); });
    out.sort(function (a, b) { return b.depth - a.depth; }); return out;
  }
  function toSVG(M) {
    var W = 420, H = 297, s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + 'mm" height="' + H + 'mm" font-family="Arial,Helvetica,sans-serif"><rect width="' + W + '" height="' + H + '" fill="#fff"/>';
    s += '<rect x="8" y="8" width="' + (W - 16) + '" height="' + (H - 16) + '" fill="none" stroke="#000" stroke-width="0.7"/>';
    if (!M.ok) return s + '<text x="20" y="40" font-size="5">' + esc(M.notes[M.notes.length - 1] || 'No drawing data') + '</text></svg>';
    var v = M.views, pl = v[0], sd = v[1], en = v[2];
    var boxes = { plan: [14, 14, 262, 150], side: [14, 168, 262, 116], end: [282, 168, 124, 80], iso: [282, 14, 124, 96], floor: [282, 114, 124, 50] };
    function place(view, box, label) {
      var sz = viewSize(view), ext = Math.max(sz[0], sz[1]) * 0.18, w = sz[0] + ext, h = sz[1] + ext, aw = box[2] - 6, ah = box[3] - 12, n = pickScale(w, h, aw, ah), k = 1 / n, h2 = 2.5 / k;
      var drawn = svgPrims(prims(view, h2), k, box[0] + (aw - sz[0] * k) / 2 + 3, box[1] + 9 + (ah - sz[1] * k) / 2, view.min[0], view.max[1]);
      return '<g><rect x="' + box[0] + '" y="' + box[1] + '" width="' + box[2] + '" height="' + box[3] + '" fill="none" stroke="#999" stroke-width="0.2"/><text x="' + (box[0] + 2) + '" y="' + (box[1] + 5) + '" font-size="3.6" font-weight="bold">' + esc(label) + '  -  SCALE 1:' + n + '</text>' + drawn + '</g>';
    }
    s += place(pl, boxes.plan, 'PLAN VIEW') + place(sd, boxes.side, 'SIDE ELEVATION (developed along route)') + place(en, boxes.end, 'END VIEW') + (v[3] ? place(v[3], boxes.floor, 'FLOOR LAYOUT') : '<text x="286" y="140" font-size="3" fill="#777">Floor size not entered - no floor layout</text>');
    var b = boxes.iso, faces = isoFaces(M, M.sc.axisTheta + 35, 28), lo = [1e18, 1e18], hi = [-1e18, -1e18];
    faces.forEach(function (q) { q.pts.forEach(function (p) { lo[0] = Math.min(lo[0], p[0]); lo[1] = Math.min(lo[1], p[1]); hi[0] = Math.max(hi[0], p[0]); hi[1] = Math.max(hi[1], p[1]); }); });
    var kk = Math.min((b[2] - 8) / (hi[0] - lo[0] || 1), (b[3] - 16) / (hi[1] - lo[1] || 1));
    s += '<g><rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" fill="none" stroke="#999" stroke-width="0.2"/><text x="' + (b[0] + 2) + '" y="' + (b[1] + 5) + '" font-size="3.6" font-weight="bold">3D VIEW (isometric, not to scale)</text>';
    faces.forEach(function (q) { s += '<polygon points="' + q.pts.map(function (p) { return r1(b[0] + 4 + (p[0] - lo[0]) * kk) + ',' + r1(b[1] + 10 + (hi[1] - p[1]) * kk); }).join(' ') + '" fill="rgb(' + q.rgb.join(',') + ')" fill-opacity="' + (q.tag === 'floor' ? 0.5 : q.a) + '" stroke="#333" stroke-width="0.08" stroke-linejoin="round"/>'; });
    s += '</g>';
    // title block
    var tb = [282, 251, 124, 34], m = M.meta, e = M.desc.elevations;
    s += '<rect x="' + tb[0] + '" y="' + tb[1] + '" width="' + tb[2] + '" height="' + tb[3] + '" fill="none" stroke="#000" stroke-width="0.5"/><line x1="282" y1="259" x2="406" y2="259" stroke="#000" stroke-width="0.3"/>';
    s += '<text x="285" y="257" font-size="4.2" font-weight="bold">ULTRAPLAST CHAINBELTS PVT. LTD.</text>';
    [(m.title || 'Conveyor general arrangement') + (m.ref ? '  Ref: ' + m.ref : ''), 'Belt width ' + mmTxt(M.sc.geom.widthM) + ' | route ' + mmTxt(M.sc.geom.totalM) + ' | inlet ' + mmTxt(e.inletM) + ' | discharge ' + mmTxt(e.dischargeM), 'Date ' + (m.date || '') + '  Units: mm  Layout from entered data only', 'INDICATIVE drawing - for engineering review, not for manufacture.', 'Black = entered, red = calculated, grey = indicative.' + ((M.sc.equip || []).length ? ' E1-E' + M.sc.equip.length + ': see sheet 2.' : '')].forEach(function (t, i) { s += '<text x="285" y="' + (263 + i * 4.3) + '" font-size="2.7"' + (i === 3 ? ' fill="#a33" font-weight="bold"' : '') + '>' + esc(t) + '</text>'; });
    return s + '</svg>';
  }


  /** Sheet 2 (A3): equipment schedule, route schedule and notes. Returns SVG text for one sheet, drawn at the given y offset. */
  function sheet2(M, oy) {
    var W = 420, H = 297, s = '<g transform="translate(0,' + oy + ')"><rect width="' + W + '" height="' + H + '" fill="#fff"/><rect x="8" y="8" width="' + (W - 16) + '" height="' + (H - 16) + '" fill="none" stroke="#000" stroke-width="0.7"/>';
    s += '<text x="14" y="20" font-size="6" font-weight="bold">ULTRAPLAST CHAINBELTS PVT. LTD. - SCHEDULES</text><text x="14" y="27" font-size="3.2">' + esc((M.meta.title || 'Conveyor general arrangement') + '   Date ' + (M.meta.date || '')) + '</text>';
    function table(T, y, widths) {
      var x0 = 14, rowH = 6.2, x = x0, i, j;
      s += '<text x="' + x0 + '" y="' + y + '" font-size="3.8" font-weight="bold">' + esc(T.title) + '</text>'; y += 3;
      var tw = widths.reduce(function (a, b) { return a + b; }, 0), rows = [T.head].concat(T.rows.length ? T.rows : [['None entered']]);
      rows.forEach(function (r, k) {
        s += '<rect x="' + x0 + '" y="' + y + '" width="' + tw + '" height="' + rowH + '" fill="' + (k === 0 ? '#e9ecef' : 'none') + '" stroke="#555" stroke-width="0.2"/>';
        for (j = 0, x = x0; j < r.length; j++) { s += '<text x="' + (x + 1.2) + '" y="' + (y + 4.2) + '" font-size="2.7"' + (k === 0 ? ' font-weight="bold"' : '') + '>' + esc(String(r[j]).slice(0, Math.max(6, Math.floor(widths[j] / 1.55)))) + '</text>'; x += widths[j]; if (j) s += '<line x1="' + (x - widths[j]) + '" y1="' + y + '" x2="' + (x - widths[j]) + '" y2="' + (y + rowH) + '" stroke="#555" stroke-width="0.2"/>'; }
        y += rowH;
      });
      if (T.foot) { s += '<text x="' + x0 + '" y="' + (y + 5) + '" font-size="2.9">' + esc(T.foot) + '</text>'; y += 7; }
      return y + 10;
    }
    var y = table(equipSchedule(M), 38, [12, 32, 24, 52, 16, 44, 42, 38, 36, 70]);
    y = table(segSchedule(M), y, [14, 28, 34, 34, 34, 44, 34]);
    var notes = ['INDICATIVE drawing - for engineering review, not for manufacture.', 'Dimension colours: black = entered, red = calculated, grey = indicative (frame, legs, placeholder sizes marked *).', 'Dimensions in the DXF are lines and text, not associative AutoCAD DIMENSION objects; they were checked against the geometry they describe.', 'Motor, sensor ratings are shown exactly as typed. This tool does not select or size any motor, sensor, belt, chain or structure.'].concat(M.notes.filter(function (n) { return !/INDICATIVE|associative/.test(n); }));
    s += '<text x="14" y="' + y + '" font-size="3.8" font-weight="bold">NOTES</text>';
    notes.forEach(function (t, i) { s += '<text x="14" y="' + (y + 6 + i * 5) + '" font-size="2.9"' + (i === 0 ? ' fill="#a33" font-weight="bold"' : '') + '>' + esc(t) + '</text>'; });
    return s + '</g>';
  }
  function toSVGSheet2(M) { var W = 420, H = 297; return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + 'mm" height="' + H + 'mm" font-family="Arial,Helvetica,sans-serif">' + sheet2(M, 0) + '</svg>'; }
  /** Both sheets in one SVG file (sheet 1 above sheet 2). */
  function toSVGAll(M) {
    var one = toSVG(M); if (!M.ok) return one;
    var inner = one.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 614" width="420mm" height="614mm" font-family="Arial,Helvetica,sans-serif"><g>' + inner + '</g>' + sheet2(M, 317) + '</svg>';
  }

  return { build: build, toDXF2D: toDXF2D, toDXF3D: toDXF3D, toDXFAll: toDXFAll, toSVGSheet2: toSVGSheet2, toSVGAll: toSVGAll, equipSchedule: equipSchedule, segSchedule: segSchedule, toSVG: toSVG, nearestAci: nearestAci, LAYERS: LAYERS, ascii: ascii };
});
