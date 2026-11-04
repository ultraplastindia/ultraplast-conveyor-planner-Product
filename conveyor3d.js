/*
 * conveyor3d.js — INTERACTIVE 3-D CONVEYOR (no libraries, canvas 2-D with its own 3-D maths)
 * ---------------------------------------------------------------------------
 * buildScene(input)  -> solids + dimension annotations, in metres, Z up (pure geometry, testable in Node)
 * describe(input)    -> dimension schedule (segments, elevations, belt, product) for tables / reports
 * create(host, opts) -> drag-to-rotate / zoom / pan viewer with a running conveyor (browser)
 *
 * DRAWN TO SCALE FROM YOUR ENTRIES: floor, obstacles (footprint), route length, curve radius and
 * angle, incline rise and run, elevations, belt width, product length / width / height, product spacing.
 * INDICATIVE ONLY (not yet specified by Ultraplast engineering): side-frame section, guide rails,
 * support legs, rollers, motor, belt thickness.  They are drawn so the picture reads like a conveyor
 * and are always labelled "indicative".  Nothing here is a structural or mechanical design.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./simulation.js'), require('./physics.js'));
  else root.UCP3D = factory(root.UCPSim, root.UCPPhysics);
})(typeof self !== 'undefined' ? self : this, function (SIM, PH) {
  'use strict';
  var W = typeof window !== 'undefined' ? window : {};

  /* Indicative drawing constants (metres) - NOT specifications. */
  var IND = { beltThk: 0.012, frameDepth: 0.08, frameThk: 0.025, guideH: 0.06, guideThk: 0.012, legSec: 0.04, legSpacing: 1.5, rollerDia: 0.08, slat: 0.05, obstacleH: 1.0, defaultElevation: 0.9, defaultWidth: 0.3 };
  var COL = {
    belt: [52, 58, 68], frame: [176, 182, 190], guide: [214, 217, 222], leg: [150, 156, 164], roller: [120, 126, 132], motor: [196, 30, 45],
    floor: [236, 238, 241], obst: [196, 70, 70], prodA: [226, 164, 72], prodB: [212, 146, 56]
  };
  /* Placeholder body sizes (metres) for drive and sensors when the user has not typed a size. NOT specifications. mount = centre height above the belt top. */
  var EQ = {
    motor: { len: 0.26, wid: 0.16, h: 0.16, mount: -0.12, rgb: [196, 30, 45], name: 'Drive motor' }, photoeye: { len: 0.05, wid: 0.04, h: 0.04, mount: 0.10, rgb: [30, 110, 210], name: 'Photo-eye sensor' },
    proximity: { len: 0.04, wid: 0.04, h: 0.06, mount: 0.08, rgb: [20, 150, 150], name: 'Proximity sensor' }, limit: { len: 0.06, wid: 0.04, h: 0.05, mount: 0.05, rgb: [150, 80, 200], name: 'Limit switch' },
    encoder: { len: 0.06, wid: 0.06, h: 0.06, mount: -0.12, rgb: [210, 120, 40], name: 'Encoder' }, camera: { len: 0.10, wid: 0.08, h: 0.08, mount: 0.45, rgb: [60, 62, 72], name: 'Camera / vision' },
    panel: { len: 0.30, wid: 0.15, h: 0.40, mount: -0.30, rgb: [232, 188, 56], name: 'Control panel' }, other: { len: 0.10, wid: 0.10, h: 0.10, mount: 0.10, rgb: [120, 130, 140], name: 'Equipment' }
  };

  function hexToRgb(h) { var m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) return null; var n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  var num = function (v) { return typeof v === 'number' && isFinite(v); };
  var pos = function (v) { return num(v) && v > 0; };
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function norm(a) { var l = len(a); return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [1, 0, 0]; }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function frameFrom(p, t) { var l = norm([-t[1], t[0], 0]); return { p: p, t: t, l: l, u: norm(cross(t, l)) }; }
  function at3(fr, a, b, c) { return [fr.p[0] + fr.t[0] * a + fr.l[0] * b + fr.u[0] * c, fr.p[1] + fr.t[1] * a + fr.l[1] * b + fr.u[1] * c, fr.p[2] + fr.t[2] * a + fr.l[2] * b + fr.u[2] * c]; }
  function centroid(ps) { var c = [0, 0, 0]; ps.forEach(function (p) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }); return mul(c, 1 / ps.length); }
  function poly(ps, n, color, o) { o = o || {}; return { p: ps, n: n, c: color, a: o.a === undefined ? 1 : o.a, two: !!o.two, tag: o.tag || 'belt', layer: o.layer || 0, cen: centroid(ps), top: null }; }

  /** Oriented box: corners p + t*a + l*b + u*c for a in rt, b in rl, c in ru. Returns 6 outward-facing polys. */
  function obox(p, t, l, u, rt, rl, ru, color, o) {
    function C(a, b, c) { return [p[0] + t[0] * a + l[0] * b + u[0] * c, p[1] + t[1] * a + l[1] * b + u[1] * c, p[2] + t[2] * a + l[2] * b + u[2] * c]; }
    var out = [], skipBottom = o && o.skipBottom;
    out.push(poly([C(rt[1], rl[0], ru[0]), C(rt[1], rl[1], ru[0]), C(rt[1], rl[1], ru[1]), C(rt[1], rl[0], ru[1])], t, color, o));
    out.push(poly([C(rt[0], rl[1], ru[0]), C(rt[0], rl[0], ru[0]), C(rt[0], rl[0], ru[1]), C(rt[0], rl[1], ru[1])], mul(t, -1), color, o));
    out.push(poly([C(rt[0], rl[1], ru[0]), C(rt[0], rl[1], ru[1]), C(rt[1], rl[1], ru[1]), C(rt[1], rl[1], ru[0])], l, color, o));
    out.push(poly([C(rt[0], rl[0], ru[0]), C(rt[1], rl[0], ru[0]), C(rt[1], rl[0], ru[1]), C(rt[0], rl[0], ru[1])], mul(l, -1), color, o));
    out.push(poly([C(rt[0], rl[0], ru[1]), C(rt[1], rl[0], ru[1]), C(rt[1], rl[1], ru[1]), C(rt[0], rl[1], ru[1])], u, color, o));
    if (!skipBottom) out.push(poly([C(rt[0], rl[0], ru[0]), C(rt[0], rl[1], ru[0]), C(rt[1], rl[1], ru[0]), C(rt[1], rl[0], ru[0])], mul(u, -1), color, o));
    return out;
  }

  /** Sweep a 2-D section [[l,u],...] along a list of station frames. Returns {sides:[[polys per edge]...], caps:[]}. */
  function extrude(sts, sec, color, o) {
    var n = sec.length, cl = 0, cu = 0, sides = [], caps = [], k, e;
    sec.forEach(function (q) { cl += q[0] / n; cu += q[1] / n; });
    for (k = 0; k < sts.length - 1; k++) {
      var A = sts[k], B = sts[k + 1], mid = mul(add(at3(A, 0, cl, cu), at3(B, 0, cl, cu)), 0.5), row = [];
      for (e = 0; e < n; e++) {
        var e1 = (e + 1) % n, q = [at3(A, 0, sec[e][0], sec[e][1]), at3(A, 0, sec[e1][0], sec[e1][1]), at3(B, 0, sec[e1][0], sec[e1][1]), at3(B, 0, sec[e][0], sec[e][1])];
        var nn = norm(cross(sub(q[1], q[0]), sub(q[3], q[0]))), cen = centroid(q);
        if (dot(nn, sub(cen, mid)) < 0) nn = mul(nn, -1);
        row.push(poly(q, nn, color, o));
      }
      sides.push(row);
    }
    var f0 = sts[0], f1 = sts[sts.length - 1];
    caps.push(poly(sec.map(function (q) { return at3(f0, 0, q[0], q[1]); }), mul(f0.t, -1), color, o));
    caps.push(poly(sec.map(function (q) { return at3(f1, 0, q[0], q[1]); }), f1.t, color, o));
    return { sides: sides, caps: caps };
  }

  /** Cylinder with axis = fr.l, centre fr.p, radius R, spanning l in [l0,l1]. */
  function cylinder(fr, R, l0, l1, color, o) {
    var N = 14, out = [], i, ringA = [], ringB = [];
    for (i = 0; i < N; i++) {
      var ph = i / N * 2 * Math.PI, d = [fr.t[0] * Math.cos(ph) + fr.u[0] * Math.sin(ph), fr.t[1] * Math.cos(ph) + fr.u[1] * Math.sin(ph), fr.t[2] * Math.cos(ph) + fr.u[2] * Math.sin(ph)];
      ringA.push(add(add(fr.p, mul(d, R)), mul(fr.l, l0))); ringB.push(add(add(fr.p, mul(d, R)), mul(fr.l, l1)));
    }
    for (i = 0; i < N; i++) {
      var j = (i + 1) % N, pm = (i + 0.5) / N * 2 * Math.PI;
      var nn = [fr.t[0] * Math.cos(pm) + fr.u[0] * Math.sin(pm), fr.t[1] * Math.cos(pm) + fr.u[1] * Math.sin(pm), fr.t[2] * Math.cos(pm) + fr.u[2] * Math.sin(pm)];
      out.push(poly([ringA[i], ringA[j], ringB[j], ringB[i]], nn, color, o));
    }
    out.push(poly(ringA.slice().reverse(), mul(fr.l, -1), color, o)); out.push(poly(ringB, fr.l, color, o));
    return out;
  }

  /* --------------------------------------------------------- shared inputs */
  function baseElevation(inp) {
    var path = inp.path, pts = path && path.points, lastZ = pts && pts.length ? (pts[pts.length - 1].z || 0) : 0;
    if (num(inp.inletMm)) return { z: inp.inletMm / 1000, basis: 'entered' };
    if (num(inp.dischargeMm)) return { z: inp.dischargeMm / 1000 - lastZ, basis: 'from discharge height' };
    return { z: IND.defaultElevation, basis: 'illustrative' };
  }
  function beltWidthOf(inp) { return pos(inp.beltWidthM) ? inp.beltWidthM : IND.defaultWidth; }

  /** Dimension schedule - every number is taken from the calculated route / your entries. */
  function describe(inp) {
    var path = inp.path, base = baseElevation(inp), W_ = beltWidthOf(inp), fmt = inp.fmt || function (m) { return m.toFixed(2) + ' m'; };
    var out = { segments: [], elevations: null, belt: { widthM: W_, note: inp.widthNote ? inp.widthNote.replace(/^entered width$/, 'entered') : (pos(inp.beltWidthM) ? 'entered' : 'illustrative') }, product: null, overall: null, notes: [] };
    if (!path || !path.points || path.points.length < 2) return out;
    var pts = path.points, zs = pts.map(function (p) { return base.z + (p.z || 0); });
    (path.details || []).forEach(function (d, i) {
      var r = { no: i + 1, type: d.type, lengthM: d.length, horizontalM: d.horizontal, startZ: zs[d.p0], endZ: zs[d.p1] };
      if (d.type === 'curve') { r.radiusM = d.radius; r.angleDeg = d.angle; r.direction = d.direction; }
      if (d.type === 'incline') { r.riseM = d.rise; r.slopeDeg = d.angle; }
      out.segments.push(r);
    });
    var zmin = Math.min.apply(null, zs), zmax = Math.max.apply(null, zs), ph = inp.prod && pos(inp.prod.heightMm) ? inp.prod.heightMm / 1000 : null;
    out.elevations = { inletM: zs[0], dischargeM: zs[zs.length - 1], minM: zmin, maxM: zmax, basis: base.basis, topOfProductM: ph !== null ? zmax + ph : null };
    if (base.basis === 'illustrative') out.notes.push('Inlet height was not entered, so the conveyor is drawn at an illustrative ' + Math.round(IND.defaultElevation * 1000) + ' mm.');
    if (zmin < -1e-6) out.notes.push('Part of the route is below floor level (lowest ' + Math.round(zmin * 1000) + ' mm). Check inlet height and the incline / decline segments.');
    if (num(inp.workingH) && out.elevations.topOfProductM !== null && out.elevations.topOfProductM > inp.workingH + 1e-6) out.notes.push('Highest product surface exceeds the working height you entered.');
    var bb = path.bbox;
    out.overall = { pathM: path.total, planLengthM: bb.maxX - bb.minX + W_, planWidthM: bb.maxY - bb.minY + W_, complete: !!path.complete };
    if (inp.prod && pos(inp.prod.alongMm) && pos(inp.prod.acrossMm)) out.product = { alongMm: inp.prod.alongMm, acrossMm: inp.prod.acrossMm, heightMm: pos(inp.prod.heightMm) ? inp.prod.heightMm : null, pitchMm: inp.prod.pitchMm || null, lanes: inp.prod.lanes || 1 };
    return out;
  }

  /* ------------------------------------------------------------ the scene */
  function buildScene(inp) {
    var fmt = inp.fmt || function (m) { return m.toFixed(2) + ' m'; }, fmtMm = inp.fmtMm || function (mm) { return Math.round(mm) + ' mm'; };
    var detail = inp.detail !== false;
    var sc = { polys: [], dims: [], tags: [], arrows: [], notes: [], grid: null, floor: null, ceiling: null, stations: [], track: null, belt: null, conv: null, all: null, slat: IND.slat, empty: true };
    var FL = pos(inp.floorL) ? inp.floorL : null, FW = pos(inp.floorW) ? inp.floorW : null, hasFloor = FL !== null && FW !== null;
    var path = inp.path, hasPath = !!(path && path.points && path.points.length > 1);
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], clo = [1e9, 1e9, 1e9], chi = [-1e9, -1e9, -1e9];
    function grow(a, b, p) { for (var i = 0; i < 3; i++) { a[i] = Math.min(a[i], p[i]); b[i] = Math.max(b[i], p[i]); } }
    function dim(a, b, text, kind, o) { sc.dims.push({ a: a, b: b, text: text, kind: kind || 'calc', dashed: !!(o && o.dashed), off: (o && o.off) || [0, -9] }); }
    function tag(p, text, kind, short) { sc.tags.push({ p: p, text: text, kind: kind || 'calc', short: short || null }); }

    /* floor, grid, obstacles, ceiling */
    if (hasFloor) {
      sc.floor = { x0: 0, y0: 0, x1: FL, y1: FW };
      obox([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0, FL], [0, FW], [-0.04, 0], COL.floor, { tag: 'floor', layer: 0, skipBottom: false }).forEach(function (q) { sc.polys.push(q); });
      grow(lo, hi, [0, 0, -0.04]); grow(lo, hi, [FL, FW, 0]);
      var off = Math.max(0.35, Math.max(FL, FW) * 0.04);
      dim([0, -off, 0], [FL, -off, 0], 'Floor length ' + fmt(FL), 'entered', { off: [0, 12] });
      dim([FL + off, 0, 0], [FL + off, FW, 0], 'Floor width ' + fmt(FW), 'entered', { off: [0, 12] });
      grow(lo, hi, [-off, -off, 0]); grow(lo, hi, [FL + off, FW + off, 0]);
      if (pos(inp.workingH)) {
        var wh = inp.workingH;
        sc.ceiling = { z: wh, x1: FL, y1: FW };
        dim([0, 0, 0], [0, 0, wh], 'Working height ' + fmtMm(wh * 1000), 'entered', { off: [-4, 0] });
        grow(lo, hi, [0, 0, wh]);
      }
    }
    (inp.obstacles || []).forEach(function (b, i) {
      if (!pos(b.w) || !pos(b.d) || !num(b.x) || !num(b.y)) return;
      var h = IND.obstacleH;
      obox([b.x, b.y, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0, b.w], [0, b.d], [0, h], COL.obst, { tag: 'obst', a: 0.4 }).forEach(function (q) { sc.polys.push(q); });
      tag([b.x + b.w / 2, b.y + b.d / 2, h], (b.name || 'Obstacle ' + (i + 1)) + ' ' + fmt(b.w) + ' × ' + fmt(b.d), 'obst');
      grow(lo, hi, [b.x, b.y, 0]); grow(lo, hi, [b.x + b.w, b.y + b.d, h]);
    });
    if (!sc.obstacleNote && (inp.obstacles || []).some(function (b) { return pos(b.w) && pos(b.d); })) sc.notes.push('Obstacle height was not entered; blocks are drawn at an illustrative ' + fmtMm(IND.obstacleH * 1000) + ' (footprint is to scale).');

    if (!hasPath) {
      sc.all = hasFloor ? { min: lo, max: hi } : { min: [0, 0, 0], max: [4, 3, 2] }; sc.conv = sc.all;
      if (hasFloor) sc.grid = gridFor(0, 0, FL, FW); else sc.grid = gridFor(0, 0, 4, 3);
      return sc;
    }
    sc.empty = false;

    /* conveyor geometry */
    var base = baseElevation(inp), W_ = beltWidthOf(inp), hw = W_ / 2;
    var pts3 = path.points.map(function (p) { return [p.x, p.y, base.z + (p.z || 0)]; });
    var track = SIM.buildTrack(pts3.map(function (p) { return { x: p[0], y: p[1], z: p[2] }; }));
    sc.track = track;
    var total = track.length, details = path.details || [], R = pos(inp.pulleyDiaMm) ? inp.pulleyDiaMm / 2000 : IND.rollerDia / 2;
    var fd = Math.max(IND.frameDepth, 2 * R + IND.beltThk + 0.02), thk = IND.frameThk, bt = IND.beltThk;
    var wEntered = inp.widthNote ? inp.widthNote === 'entered width' : pos(inp.beltWidthM);
    if (!wEntered) sc.notes.push('Belt width was not entered; ' + fmtMm(W_ * 1000) + ' is drawn (' + (inp.widthNote || 'illustrative') + ').');
    if (base.basis === 'illustrative') sc.notes.push('Inlet height was not entered; the conveyor is drawn at an illustrative ' + fmtMm(IND.defaultElevation * 1000) + ' above the floor.');
    if (path.complete === false) sc.notes.push('The route is incomplete; only the completed segments are drawn.');

    /* stations (decimated, always keeping segment ends) */
    var keep = {}; keep[0] = 1; keep[pts3.length - 1] = 1; details.forEach(function (d) { keep[d.p0] = 1; keep[d.p1] = 1; });
    var ds = Math.max(0.1, total / 300), idx = [0], lastS = 0, i;
    for (i = 1; i < pts3.length; i++) if (keep[i] || track.cum[i] - lastS >= ds) { idx.push(i); lastS = track.cum[i]; }
    var sts = idx.map(function (pi, k) {
      var prev = k > 0 ? pts3[idx[k - 1]] : null, nxt = k < idx.length - 1 ? pts3[idx[k + 1]] : null, here = pts3[pi], t;
      var dIn = prev ? norm(sub(here, prev)) : null, dOut = nxt ? norm(sub(nxt, here)) : null;
      t = dIn && dOut ? norm(add(dIn, dOut)) : (dIn || dOut);
      var fr = frameFrom(here, t); fr.s = track.cum[pi]; return fr;
    });
    sc.stations = sts;

    // belt slab (top strips carry the moving slat lines and direction arrows)
    sc.beltRgb = inp.beltRgb && inp.beltRgb.length === 3 ? inp.beltRgb : COL.belt;
    var belt = extrude(sts, [[-hw, -bt], [hw, -bt], [hw, 0], [-hw, 0]], sc.beltRgb, { tag: 'belt' });
    belt.sides.forEach(function (row, k) {
      row.forEach(function (q, e) { sc.polys.push(q); });
      var A = sts[k], B = sts[k + 1], q = row[2];
      q.top = { s0: A.s, s1: B.s, aL: at3(A, 0, hw, 0), aR: at3(A, 0, -hw, 0), bL: at3(B, 0, hw, 0), bR: at3(B, 0, -hw, 0) };
      q.p = [q.top.aL, q.top.aR, q.top.bR, q.top.bL]; q.cen = centroid(q.p);
    });
    belt.caps.forEach(function (q) { sc.polys.push(q); });
    sc.slat = pos(inp.pitchMm) ? inp.pitchMm / 1000 : IND.slat;
    if (total / sc.slat > 500) sc.slat = total / 500;
    var nArrows = Math.max(1, Math.min(8, Math.round(total / 1.5)));
    for (i = 0; i < nArrows; i++) sc.arrows.push({ s: total * (i + 0.5) / nArrows, size: Math.max(0.03, Math.min(0.15, W_ * 0.22)) });

    // side frame + guide rails (indicative)
    var prodH = inp.prod && pos(inp.prod.heightMm) ? inp.prod.heightMm / 1000 : null, gH = prodH !== null ? Math.min(IND.guideH, prodH * 0.5) : IND.guideH;
    [1, -1].forEach(function (sg) {
      var sec = sg > 0 ? [[hw, -fd], [hw + thk, -fd], [hw + thk, 0.015], [hw, 0.015]] : [[-hw - thk, -fd], [-hw, -fd], [-hw, 0.015], [-hw - thk, 0.015]];
      var pl = extrude(sts, sec, COL.frame, { tag: 'frame' }); pl.sides.forEach(function (r) { r.forEach(function (q) { sc.polys.push(q); }); }); pl.caps.forEach(function (q) { sc.polys.push(q); });
      var g0 = sg > 0 ? hw : -hw - IND.guideThk, gsec = [[g0, 0.015], [g0 + IND.guideThk, 0.015], [g0 + IND.guideThk, 0.015 + gH], [g0, 0.015 + gH]];
      var gr = extrude(sts, gsec, COL.guide, { tag: 'frame' }); gr.sides.forEach(function (r) { r.forEach(function (q) { sc.polys.push(q); }); }); gr.caps.forEach(function (q) { sc.polys.push(q); });
    });

    // end rollers (idler at the inlet, drive at the discharge) + motor (indicative)
    var fS = sts[0], fE = sts[sts.length - 1];
    [fS, fE].forEach(function (fr) {
      var c = frameFrom(add(fr.p, mul(fr.u, -(bt + R))), fr.t); c.l = fr.l; c.u = fr.u;
      cylinder(c, R, -hw - 0.01, hw + 0.01, COL.roller, { tag: 'drive' }).forEach(function (q) { sc.polys.push(q); });
    });
    var equipIn = (inp.equip || []).filter(function (e) { return e && EQ[e.type]; }), userMotor = equipIn.some(function (e) { return e.type === 'motor'; });
    if (!userMotor) obox(fE.p, fE.t, fE.l, fE.u, [-0.30, -0.04], [hw + thk + 0.02, hw + thk + 0.18], [-0.20, -0.04], COL.motor, { tag: 'drive' }).forEach(function (q) { sc.polys.push(q); });

    // support legs (indicative spacing unless configured)
    var spacing = pos(inp.legSpacingMm) ? inp.legSpacingMm / 1000 : IND.legSpacing, legPos = [];
    if (total < 0.6) legPos = [total / 2]; else { var nSeg = Math.max(1, Math.ceil((total - 0.5) / spacing)); for (i = 0; i <= nSeg; i++) legPos.push(0.25 + (total - 0.5) * i / nSeg); }
    sc.legCount = 0; sc.legs = []; sc.rollerR = R; sc.hw = hw; sc.thk = thk; sc.fd = fd; sc.guideH = gH;
    sc.motorBox = userMotor ? null : { p: fE.p, t: fE.t, l: fE.l, u: fE.u, rt: [-0.30, -0.04], rl: [hw + thk + 0.02, hw + thk + 0.18], ru: [-0.20, -0.04] };
    sc.obstacles = (inp.obstacles || []).filter(function (b) { return pos(b.w) && pos(b.d) && num(b.x) && num(b.y); }).map(function (b, i) { return { x: b.x, y: b.y, w: b.w, d: b.d, h: IND.obstacleH, name: b.name || 'Obstacle ' + (i + 1) }; });
    var hydSeg = details.filter(function (d) { return d.type === 'incline' && d.hyd && pos(Math.abs(d.rise)); }), hydRanges = hydSeg.map(function (d) { return [track.cum[d.p0], track.cum[d.p1]]; });
    legPos.forEach(function (s) {
      if (hydRanges.some(function (r) { return s > r[0] + 0.15 && s < r[1] - 0.15; })) return;   // the hydraulic stands carry this stretch
      var pt = track.at(s), tH = norm([pt.tx, pt.ty, 0]), lH = norm([-tH[1], tH[0], 0]), uu = [0, 0, 1], slopeCos = Math.sqrt(Math.max(0, 1 - pt.tz * pt.tz));
      var zb = pt.z - fd * slopeCos; if (zb < 0.06) return;
      var P0 = [pt.x, pt.y, 0], off = hw + thk / 2, sec = IND.legSec / 2;
      sc.legCount++; sc.legs.push({ s: s, x: pt.x, y: pt.y, zb: zb, t: tH, l: lH, off: off, sec: sec });
      [1, -1].forEach(function (sg) {
        var pp = add(P0, mul(lH, off * sg));
        obox(pp, tH, lH, uu, [-sec, sec], [-sec, sec], [0, zb], COL.leg, { tag: 'support', skipBottom: true }).forEach(function (q) { sc.polys.push(q); });
        obox(pp, tH, lH, uu, [-0.07, 0.07], [-0.07, 0.07], [0, 0.01], COL.leg, { tag: 'support', skipBottom: true }).forEach(function (q) { sc.polys.push(q); });
      });
      obox(P0, tH, lH, uu, [-0.015, 0.015], [-off, off], [zb - 0.05, zb - 0.02], COL.leg, { tag: 'support' }).forEach(function (q) { sc.polys.push(q); });
    });

    /* ----- hydraulic adjustable stands under incline / decline segments (indicative; sizes are placeholders, never a selection) ----- */
    sc.hyd = []; sc.hydPump = []; sc.hydPivots = []; sc.hydK = { plate: 0.11, tubeR: 0.042, rodR: 0.026, pumpHL: 0.13, pumpHW: 0.09, guide: 0.11, sleeve: 0.025, colR: 0.018 };
    (function () {
      if (!hydSeg.length) return;
      var HY = { tube: [28, 78, 142], collar: [20, 52, 100], rod: [214, 218, 224], base: [44, 48, 58], steel: [150, 156, 164], sleeve: [92, 100, 114], lock: [238, 196, 38], knob: [200, 30, 40], hose: [26, 26, 30], hose2: [38, 70, 128], pump: [226, 122, 32], tank: [58, 66, 80], motor: [28, 84, 176], dark: [30, 30, 34], tubeR: 0.042, rodR: 0.026, tubeLen: 0.30, guide: 0.11, sl: 0.025, col: 0.018 };
      var push = function (q) { sc.polys.push(q); }, O = { tag: 'hyd' }, OS = { tag: 'hyd', skipBottom: true }, no = 0, off = hw + thk / 2, UP = [0, 0, 1];
      function bar(a, b, r, color) { var dv = sub(b, a), Ln = len(dv); if (Ln < 1e-6) return; var t = norm(dv), up = Math.abs(t[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1], l = norm(cross(up, t)), u = cross(t, l); obox(a, t, l, u, [0, Ln], [-r, r], [-r, r], color, O).forEach(push); }
      function vcyl(x, y, z0, z1, R, color) { if (z1 - z0 < 1e-4) return; cylinder({ p: [x, y, 0], t: [1, 0, 0], l: [0, 0, 1], u: [0, 1, 0] }, R, z0, z1, color, O).forEach(push); }
      function bx(p, tH, lH, rt, rl, ru, color, skipBottom) { obox(p, tH, lH, UP, rt, rl, ru, color, skipBottom ? OS : O).forEach(push); }
      sc.hydMobile = [];
      function mobDims(d) {   // millimetre sizes of the mobile stand; anything not entered is an indicative placeholder
        var Hr = Math.abs(d.horizontal || 0), ent = { baseL: !!d.hydBaseLmm, baseW: !!d.hydBaseWmm, castorH: !!d.hydCastorHmm };
        var baseL = d.hydBaseLmm ? d.hydBaseLmm / 1000 : Math.max(1.0, Math.round((0.6 * Hr + 0.55) * 100) / 100), baseW = d.hydBaseWmm ? d.hydBaseWmm / 1000 : Math.round(2 * (hw + thk / 2 + 0.25) * 100) / 100, castorH = d.hydCastorHmm ? d.hydCastorHmm / 1000 : 0.15;
        return { baseL: baseL, baseW: baseW, castorH: castorH, tube: 0.06, wheelR: Math.min(0.06, castorH * 0.4), back: 0.25, sleeve: 0.07, handleH: 0.45, colFrac: 0.6, railH: 0.5, entered: ent, Hr: Hr };
      }
      function mobileStand(d, segNo, s0, s1, lowStart, pivot, electric) {
        var m = mobDims(d), sP = lowStart ? s0 + (s1 - s0) * m.colFrac : s1 - (s1 - s0) * m.colFrac, pt = track.at(sP);
        var zb = pt.z - fd * Math.sqrt(Math.max(0, 1 - pt.tz * pt.tz)), H = zb - 0.05, zf = m.castorH + m.tube;
        var tl = norm([pivot.tx, pivot.ty, 0]), D = lowStart ? tl : [-tl[0], -tl[1], 0], L = [-D[1], D[0], 0], Ox = pivot.x, Oy = pivot.y;
        if (H < zf + 0.2) { sc.notes.push('The mobile lift stand on segment ' + segNo + ' is too low to draw (the belt frame is less than ' + fmtMm((zf + 0.25) * 1000) + ' above the floor at the lift column).'); return false; }
        var P = function (a, l) { return [Ox + D[0] * a + L[0] * l, Oy + D[1] * a + L[1] * l, 0]; };
        var tb = m.tube, tt = tb / 2, colA = m.colFrac * m.Hr, a0 = -m.back, a1 = m.baseL - m.back, w2 = m.baseW / 2;
        var box = function (a, l, ra, rl, z0, z1, color, sb) { bx(P(a, l), D, L, ra, rl, [z0, z1], color, sb); };
        // base frame: two side rails, cross members
        [1, -1].forEach(function (sg) { box((a0 + a1) / 2, sg * (w2 - tt), [-(a1 - a0) / 2, (a1 - a0) / 2], [-tt, tt], m.castorH, zf, HY.base); });
        var nx = Math.max(2, Math.round((a1 - a0) / 0.9)), xs = []; for (var q = 0; q <= nx; q++) xs.push(a0 + tt + (a1 - a0 - tb) * q / nx);
        xs.forEach(function (a) { box(a, 0, [-tt, tt], [-w2 + tb, w2 - tb], m.castorH, zf, HY.base); });
        // four castors (red wheel, steel fork and mounting plate)
        [[a0 + 0.1, 1], [a0 + 0.1, -1], [a1 - 0.1, 1], [a1 - 0.1, -1]].forEach(function (c) {
          var lp = c[1] * (w2 - 0.04), wp = P(c[0], lp);
          box(c[0], lp, [-0.045, 0.045], [-0.045, 0.045], m.castorH - 0.012, m.castorH, HY.steel, true);
          [1, -1].forEach(function (e) { box(c[0], lp + e * 0.028, [-0.02, 0.02], [-0.004, 0.004], m.wheelR, m.castorH - 0.012, HY.steel, true); });
          cylinder({ p: [wp[0], wp[1], m.wheelR], t: D, l: [0, 0, 1], u: L }, m.wheelR, -0.02, 0.02, [200, 30, 40], O).forEach(push);   // red wheel (axis across the frame)
          cylinder({ p: [wp[0], wp[1], m.wheelR], t: D, l: [0, 0, 1], u: L }, 0.012, -0.034, 0.034, HY.steel, O).forEach(push);
        });
        // handle loop (rectangular tube) along one side of the frame, for pulling / pushing the conveyor
        var hA = a0 + 0.35 * (a1 - a0), hB = a0 + 0.65 * (a1 - a0), hl = w2 - 0.07;
        [hA, hB].forEach(function (a) { box(a, hl, [-0.012, 0.012], [-0.012, 0.012], zf, zf + m.handleH, HY.base); });
        bar([P(hA, hl)[0], P(hA, hl)[1], zf + m.handleH], [P(hB, hl)[0], P(hB, hl)[1], zf + m.handleH], 0.014, HY.base);
        // yellow hand rails along both sides of the incline (posts on the side channel, rail 500 mm above the belt)
        (function () {
          var sA = s0 + 0.3, sB = s1 - 0.3, n = Math.max(1, Math.round((sB - sA) / 1.2)), rr = hw + thk + 0.03, YL = [244, 196, 22];
          [1, -1].forEach(function (sg) { var prev = null; for (var q = 0; q <= n; q++) { var qq = track.at(sA + (sB - sA) * q / n), tq = norm([qq.tx, qq.ty, 0]), lq = [-tq[1], tq[0], 0], bx0 = qq.x + lq[0] * rr * sg, by0 = qq.y + lq[1] * rr * sg, top = [bx0, by0, qq.z + m.railH];
            bar([bx0, by0, qq.z - 0.08], top, 0.012, YL); if (prev) bar(prev, top, 0.014, YL); prev = top; } });
        })();
        // power pack on the frame near the low end
        var pa = a0 + 0.6;
        if (!electric) {
          box(pa, 0, [-0.12, 0.12], [-0.09, 0.09], zf, zf + 0.2, HY.pump); box(pa, 0, [-0.13, 0.13], [-0.10, 0.10], zf + 0.2, zf + 0.22, HY.base);
          var hb = P(pa + 0.06, 0); bar([hb[0], hb[1], zf + 0.22], [hb[0] + L[0] * 0.24, hb[1] + L[1] * 0.24, zf + 0.5], 0.011, HY.base);
        } else {
          box(pa, 0, [-0.17, 0.17], [-0.11, 0.11], zf, zf + 0.2, HY.tank);
          var pm = P(pa, 0); cylinder({ p: [pm[0], pm[1], zf + 0.265], t: L, l: D, u: UP }, 0.06, -0.15, 0.15, HY.motor, O).forEach(push);
        }
        // vertical lift column: outer sleeve on the frame, sliding inner column up to the saddle under the belt frame
        var sleeveTop = Math.min(zf + 0.55, H - 0.12), sl = m.sleeve, ci = sl - 0.012;
        box(colA, 0, [-sl - 0.05, sl + 0.05], [-sl - 0.05, sl + 0.05], zf, zf + 0.012, HY.base, true);
        box(colA, 0, [-sl, sl], [-sl, sl], zf + 0.012, sleeveTop, HY.sleeve);
        box(colA, 0, [-sl - 0.006, sl + 0.006], [-sl - 0.006, sl + 0.006], sleeveTop - 0.025, sleeveTop, HY.base);
        box(colA, 0, [-ci, ci], [-ci, ci], sleeveTop - 0.15, H - 0.016, HY.steel);
        box(colA, 0, [-0.06, 0.06], [-off - 0.04, off + 0.04], H - 0.016, H + 0.04, HY.base);                                     // saddle cross-beam under the belt frame
        var nt = Math.min(8, Math.floor((sleeveTop - zf - 0.05) / 0.05)); for (var k = 0; k < nt; k++) box(colA, sl, [-0.014, 0.014], [0, 0.004], zf + 0.04 + k * 0.05, zf + 0.044 + k * 0.05, HY.dark);
        // lift cylinder beside the column (barrel, chrome rod to the saddle, lock collar, hoses to the power pack)
        var cl = sl + 0.075, cp = P(colA, cl), tubeTop = Math.min(zf + 0.5, H - 0.1), rodTop = H - 0.03;
        vcyl(cp[0], cp[1], zf, tubeTop, 0.036, HY.tube); vcyl(cp[0], cp[1], tubeTop - 0.04, tubeTop, 0.043, HY.collar);
        vcyl(cp[0], cp[1], tubeTop, rodTop, 0.02, HY.rod);
        if (rodTop - tubeTop > 0.1) vcyl(cp[0], cp[1], tubeTop + 0.012, tubeTop + 0.03, 0.036, HY.lock);
        box(colA, cl, [-0.03, 0.03], [-0.03, 0.03], rodTop, H - 0.016, HY.steel);
        box(colA, sl + 0.03, [-0.012, 0.012], [-0.02, cl], H - 0.04, H - 0.016, HY.base);                                      // arm joining the rod end to the column saddle
        var hp = P(pa, 0), hc = P(colA, cl);
        bar([hp[0], hp[1], zf + 0.03], [hc[0] + D[0] * -0.0, hc[1], zf + 0.03], 0.01, HY.hose); bar([hc[0], hc[1], zf + 0.03], [hc[0], hc[1], tubeTop - 0.03], 0.009, HY.hose2);
        // diagonal gussets from the column foot to the frame cross members
        [1, -1].forEach(function (sg) { var g0 = P(Math.max(a0 + tb, colA - 0.5), sg * (w2 - tb)), g1 = P(colA, sg * (sl + 0.02)); bar([g0[0], g0[1], zf], [g1[0], g1[1], zf + 0.3], 0.012, HY.base); });
        var rec = { n: 0, seg: segNo, s: sP, x: pt.x, y: pt.y, zb: zb, heightM: H, tubeTopM: tubeTop, rodM: Math.max(0, rodTop - tubeTop), offM: off, t: D, l: L, strokeMm: d.hydStrokeMm || null, rating: d.hydRating || '', count: 1, decline: !lowStart, posFrac: m.colFrac, beltZ: pt.z, pump: electric ? 'electric' : 'hand', guideM: 0, sleeveTopM: sleeveTop, style: 'mobile' };
        var mob = { seg: segNo, ox: Ox, oy: Oy, d: D, l: L, a0: a0, a1: a1, w: m.baseW, colA: colA, castorH: m.castorH, tube: tb, zf: zf, wheelR: m.wheelR, handleH: m.handleH, hA: hA, hB: hB, hl: hl, railH: m.railH, sleeve: sl, sleeveTop: sleeveTop, tubeTop: tubeTop, rodTop: rodTop, H: H, pa: pa, electric: electric, baseL: m.baseL, entered: m.entered, off: off, pivotZ: null, lowStart: lowStart, horizontal: m.Hr, stroke: d.hydStrokeMm || null, rating: d.hydRating || '' };
        return { rec: rec, mob: mob, m: m };
      }
      hydSeg.forEach(function (d) {
        var s0 = track.cum[d.p0], s1 = track.cum[d.p1], lowStart = d.rise >= 0, cnt = d.hydCount || 1, fr = cnt === 1 ? [0.85] : cnt === 2 ? [0.9, 0.5] : [0.9, 0.62, 0.34], pumpDone = false, segNo = details.indexOf(d) + 1, ports = [], electric = d.hydPump === 'electric';
        var sLow = lowStart ? s0 : s1, pivot = track.at(sLow);
        // pivot (hinge) at the low end: pin through two brackets, so the section turns when the stands raise or lower the high end
        (function () {
          var tH = norm([pivot.tx, pivot.ty, 0]), lH = [-tH[1], tH[0], 0], zp = pivot.z - fd * Math.sqrt(Math.max(0, 1 - pivot.tz * pivot.tz)) * 0.5;
          if (zp < 0.05) return;
          sc.hydPivots.push({ seg: segNo, s: sLow, x: pivot.x, y: pivot.y, z: zp, mobile: d.hydStyle === 'mobile' });
          if (d.hydStyle === 'mobile') {   // mobile stand: the hinge sits on two posts rising from the castor frame
            var zt0 = mobDims(d).castorH + mobDims(d).tube;   // the belt hinges on posts rising from the front of the wheeled base frame
            if (zp < zt0 + 0.03) sc.notes.push('Segment ' + segNo + ': the castor base frame is as high as the low end of the belt, so the hinge posts are very short. Check the inlet height or the castor height.');
            cylinder({ p: [pivot.x, pivot.y, zp], t: tH, l: lH, u: UP }, 0.014, -off - 0.045, off + 0.045, HY.rod, O).forEach(push);
            [1, -1].forEach(function (sg) { var pp = [pivot.x + lH[0] * off * sg, pivot.y + lH[1] * off * sg, 0]; bx(pp, tH, lH, [-0.04, 0.04], [-0.008, 0.008], [Math.min(zt0, zp), zp + 0.07], HY.base); vcyl(pp[0] + lH[0] * sg * 0.02, pp[1] + lH[1] * sg * 0.02, zp - 0.012, zp + 0.012, 0.02, HY.steel); });
            return;
          }
          cylinder({ p: [pivot.x, pivot.y, zp], t: tH, l: lH, u: UP }, 0.014, -off - 0.045, off + 0.045, HY.rod, O).forEach(push);
          [1, -1].forEach(function (sg) {
            var pp = [pivot.x + lH[0] * off * sg, pivot.y + lH[1] * off * sg, 0];
            bx(pp, tH, lH, [-0.04, 0.04], [-0.008, 0.008], [Math.max(0, zp - 0.07), zp + 0.07], HY.base);
            bx(pp, tH, lH, [-0.09, 0.09], [-0.07, 0.07], [0, 0.01], HY.base, true);
            vcyl(pp[0] + lH[0] * sg * 0.02, pp[1] + lH[1] * sg * 0.02, zp - 0.012, zp + 0.012, 0.02, HY.steel);                  // pin retaining washer
          });
        })();
        if (d.hydStyle === 'mobile') {
          var mr = mobileStand(d, segNo, s0, s1, lowStart, pivot, electric);
          if (mr) {
            no++; mr.rec.n = no; mr.rec.id = 'H' + no; mr.mob.id = 'H' + no; mr.mob.sLow = sLow; mr.mob.riseM = Math.abs(d.rise); mr.mob.pivotZ = (sc.hydPivots.filter(function (q) { return q.seg === segNo; })[0] || {}).z || null; sc.hyd.push(mr.rec); sc.hydMobile.push(mr.mob);
            var cpt = track.at(mr.rec.s), lat = mr.rec.l;
            tag([cpt.x + lat[0] * (off + 0.35), cpt.y + lat[1] * (off + 0.35), mr.rec.heightM * 0.6], 'H' + no + ' Mobile lift stand (castor base)' + (d.hydRating ? ' · ' + d.hydRating : ''), d.hydRating ? 'entered' : 'ind', 'H' + no);
            if (detail) dim([cpt.x + lat[0] * (off + 0.2), cpt.y + lat[1] * (off + 0.2), 0], [cpt.x + lat[0] * (off + 0.2), cpt.y + lat[1] * (off + 0.2), mr.rec.heightM], 'H' + no + ' height ' + fmtMm(mr.rec.heightM * 1000), 'calc', { off: [8, 0] });
            var mb = mr.mob, ca = [mb.ox + mb.d[0] * mb.a0, mb.oy + mb.d[1] * mb.a0], cb = [mb.ox + mb.d[0] * mb.a1, mb.oy + mb.d[1] * mb.a1];
            [ca, cb].forEach(function (c) { grow(clo, chi, [c[0] - mb.w, c[1] - mb.w, 0]); grow(clo, chi, [c[0] + mb.w, c[1] + mb.w, mr.rec.heightM + 0.3]); grow(lo, hi, [c[0] - mb.w, c[1] - mb.w, 0]); grow(lo, hi, [c[0] + mb.w, c[1] + mb.w, mr.rec.heightM + 0.3]); });
          }
          return;
        }
        fr.forEach(function (u, j) {
          var sP = lowStart ? s0 + (s1 - s0) * u : s1 - (s1 - s0) * u, pt = track.at(sP), tH = norm([pt.tx, pt.ty, 0]), lH = [-tH[1], tH[0], 0], P0 = [pt.x, pt.y, 0];
          var zb = pt.z - fd * Math.sqrt(Math.max(0, 1 - pt.tz * pt.tz)), H = zb - 0.05;
          if (H < 0.12) { sc.notes.push('A hydraulic stand on segment ' + segNo + ' is too low to draw (under ' + fmtMm(120) + ' to the frame).'); return; }
          no++;
          var tubeTop = Math.min(0.012 + HY.tubeLen, H - 0.05), rodTop = H - 0.016, rodLen = Math.max(0, rodTop - tubeTop), sleeveTop = Math.max(0.1, Math.min(tubeTop * 0.92, H - 0.12));
          bx(P0, tH, lH, [-0.05, 0.05], [-off - HY.guide - 0.03, off + HY.guide + 0.03], [zb - 0.05, zb - 0.02], HY.base);   // saddle cross-beam under the frame (spans both guide pillars)
          [1, -1].forEach(function (sg) {
            var cx = pt.x + lH[0] * off * sg, cy = pt.y + lH[1] * off * sg, pp = [cx, cy, 0], gx = cx + lH[0] * sg * HY.guide, gy = cy + lH[1] * sg * HY.guide, pg = [gx, gy, 0];
            bx(pp, tH, lH, [-0.11, 0.11], [-0.11, 0.11], [0, 0.012], HY.base, true);                                                                 // base plate
            [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (q) { bx(pp, tH, lH, [q[0] * 0.082 - 0.011, q[0] * 0.082 + 0.011], [q[1] * 0.082 - 0.011, q[1] * 0.082 + 0.011], [0.012, 0.024], HY.steel, true); });   // anchor bolts
            [-1, 1].forEach(function (e) { bx(pp, tH, lH, [-0.034, 0.034], [e * (HY.tubeR + 0.012) - 0.006, e * (HY.tubeR + 0.012) + 0.006], [0.012, 0.078], HY.base); });   // foot clevis plates
            cylinder({ p: [cx, cy, 0.046], t: tH, l: lH, u: UP }, 0.009, -(HY.tubeR + 0.026), HY.tubeR + 0.026, HY.steel, O).forEach(push);          // foot pivot pin
            vcyl(cx, cy, 0.012, 0.05, HY.tubeR + 0.012, HY.base);                                                                                    // cylinder foot / cap end
            vcyl(cx, cy, 0.05, tubeTop, HY.tubeR, HY.tube);                                                                                          // barrel
            [0.13, 0.2].forEach(function (zr) { if (zr < tubeTop - 0.06) vcyl(cx, cy, zr, zr + 0.012, HY.tubeR + 0.003, HY.collar); });             // tie-rod bands
            vcyl(cx, cy, tubeTop - 0.075, tubeTop - 0.05, HY.tubeR + 0.02, HY.steel);                                                                // head flange
            [0, 1, 2, 3].forEach(function (q) { var a = q * Math.PI / 2 + Math.PI / 4, px = cx + (tH[0] * Math.cos(a) + lH[0] * Math.sin(a)) * (HY.tubeR + 0.012), py = cy + (tH[1] * Math.cos(a) + lH[1] * Math.sin(a)) * (HY.tubeR + 0.012); vcyl(px, py, tubeTop - 0.082, tubeTop - 0.075, 0.007, HY.dark); });   // flange bolts
            vcyl(cx, cy, tubeTop - 0.05, tubeTop, HY.tubeR + 0.007, HY.collar);                                                                      // gland / head
            vcyl(cx, cy, tubeTop, rodTop, HY.rodR, HY.rod);                                                                                          // chrome piston rod
            var nb = Math.min(10, Math.floor(rodLen / 0.05)); for (var q = 0; q < nb; q++) vcyl(cx, cy, tubeTop + 0.03 + q * 0.05, tubeTop + 0.038 + q * 0.05, HY.rodR + 0.0015, HY.dark);   // extension scale bands on the rod
            if (rodLen > 0.1) { vcyl(cx, cy, tubeTop + 0.012, tubeTop + 0.03, HY.rodR + 0.016, HY.lock); [1, -1].forEach(function (e) { bx([cx + tH[0] * e * (HY.rodR + 0.024), cy + tH[1] * e * (HY.rodR + 0.024), 0], tH, lH, [-0.008, 0.008], [-0.008, 0.008], [tubeTop + 0.015, tubeTop + 0.028], HY.knob); }); }   // safety lock collar + two lock knobs
            bx([cx, cy, 0], tH, lH, [-0.032, 0.032], [-0.02, 0.02], [rodTop - 0.034, rodTop + 0.002], HY.steel);                                      // rod-end eye
            cylinder({ p: [cx, cy, rodTop - 0.016], t: tH, l: lH, u: UP }, 0.008, -0.044, 0.044, HY.dark, O).forEach(push);                           // rod-end pin
            bx(pp, tH, lH, [-0.07, 0.07], [-0.055, 0.055], [rodTop, H], HY.base);                                                                    // rod-end saddle
            bx([cx + lH[0] * sg * (HY.tubeR + 0.022), cy + lH[1] * sg * (HY.tubeR + 0.022), 0], tH, lH, [-0.016, 0.016], [-0.016, 0.016], [0.04, 0.08], HY.hose);        // cap-end port
            bx([cx + lH[0] * sg * (HY.tubeR + 0.022), cy + lH[1] * sg * (HY.tubeR + 0.022), 0], tH, lH, [-0.014, 0.014], [-0.014, 0.014], [tubeTop - 0.052, tubeTop - 0.02], HY.hose2);   // rod-end port
            /* telescopic guide pillar beside each cylinder: holds the section square and stops it twisting; scale ticks show the lift */
            bx(pg, tH, lH, [-0.06, 0.06], [-0.06, 0.06], [0, 0.012], HY.base, true);
            bx(pg, tH, lH, [-HY.sl, HY.sl], [-HY.sl, HY.sl], [0.012, sleeveTop], HY.sleeve);                                                         // outer sleeve
            bx(pg, tH, lH, [-HY.sl - 0.006, HY.sl + 0.006], [-HY.sl - 0.006, HY.sl + 0.006], [sleeveTop - 0.025, sleeveTop], HY.base);               // sleeve cap
            bx(pg, tH, lH, [-HY.col, HY.col], [-HY.col, HY.col], [sleeveTop - 0.12, H - 0.016], HY.steel);                                           // inner sliding column
            bx(pg, tH, lH, [-0.05, 0.05], [-0.05, 0.05], [H - 0.016, H], HY.base);                                                                   // column top plate
            var nt = Math.min(8, Math.floor((sleeveTop - 0.06) / 0.05)); for (var qq = 0; qq < nt; qq++) bx(pg, tH, lH, [-0.014, 0.014], sg > 0 ? [HY.sl, HY.sl + 0.004] : [-HY.sl - 0.004, -HY.sl], [0.05 + qq * 0.05, 0.054 + qq * 0.05], HY.dark);   // scale ticks every 50 mm
            bx(pp, tH, lH, [-0.012, 0.012], sg > 0 ? [HY.tubeR, HY.guide - HY.sl] : [-(HY.guide - HY.sl), -HY.tubeR], [0.14, 0.16], HY.base);       // brace plate cylinder to sleeve
            // rod-end hose rising up the outside of the cylinder, with clamps
            var hxr = cx + lH[0] * sg * (HY.tubeR + 0.034), hyr = cy + lH[1] * sg * (HY.tubeR + 0.034);
            bar([hxr, hyr, 0.04], [hxr, hyr, tubeTop - 0.036], 0.008, HY.hose2);
            [0.1, 0.22].forEach(function (zc) { if (zc < tubeTop - 0.07) vcyl(hxr, hyr, zc, zc + 0.012, 0.015, HY.steel); });
          });
          bx(P0, tH, lH, [-0.012, 0.012], [-off + HY.tubeR, off - HY.tubeR], [tubeTop * 0.45 - 0.012, tubeTop * 0.45 + 0.012], HY.base);              // cross brace between the cylinders
          var sgP = 1, ofx = HY.tubeR + 0.034;
          ports.push({ p: [pt.x + lH[0] * (off + ofx), pt.y + lH[1] * (off + ofx), 0.06], far: [pt.x - lH[0] * (off + ofx), pt.y - lH[1] * (off + ofx), 0.06] });
          var rec = { n: no, id: 'H' + no, seg: segNo, s: sP, x: pt.x, y: pt.y, zb: zb, heightM: H, tubeTopM: tubeTop, rodM: rodLen, offM: off, t: tH, l: lH, strokeMm: d.hydStrokeMm || null, rating: d.hydRating || '', count: cnt, decline: !lowStart, posFrac: u, beltZ: pt.z, pump: electric ? 'electric' : 'hand', guideM: HY.guide, sleeveTopM: sleeveTop };
          sc.hyd.push(rec);
          tag([pt.x + lH[0] * (off + 0.3), pt.y + lH[1] * (off + 0.3), H * (0.62 - 0.22 * j)], 'H' + no + ' Hydraulic stand' + (d.hydRating ? ' · ' + d.hydRating : '') + (d.hydStrokeMm ? ' · stroke ' + fmtMm(d.hydStrokeMm) : ''), d.hydRating || d.hydStrokeMm ? 'entered' : 'ind', 'H' + no);
          if (detail) dim([pt.x + lH[0] * (off + 0.18), pt.y + lH[1] * (off + 0.18), 0], [pt.x + lH[0] * (off + 0.18), pt.y + lH[1] * (off + 0.18), H], 'H' + no + ' height ' + fmtMm(H * 1000), 'calc', { off: [8, 0] });
          grow(clo, chi, [pt.x - 0.35, pt.y - 0.35, 0]); grow(clo, chi, [pt.x + 0.35, pt.y + 0.35, H]); grow(lo, hi, [pt.x - 0.35, pt.y - 0.35, 0]); grow(lo, hi, [pt.x + 0.35, pt.y + 0.35, H]);
          if (!pumpDone) {   // pump unit beside the first stand of the segment: hand pump, or electric power pack with an up / down pendant
            pumpDone = true;
            var pc = [pt.x + lH[0] * (off + 0.62), pt.y + lH[1] * (off + 0.62), 0], phl = electric ? 0.17 : 0.13, phw = electric ? 0.11 : 0.09;
            bx(pc, tH, lH, [-phl - 0.01, phl + 0.01], [-phw - 0.01, phw + 0.01], [0, 0.012], HY.base, true);
            if (!electric) {
              bx(pc, tH, lH, [-0.13, 0.13], [-0.09, 0.09], [0.012, 0.2], HY.pump);                                                                    // reservoir
              bx(pc, tH, lH, [-0.14, 0.14], [-0.10, 0.10], [0.2, 0.22], HY.base);
              cylinder({ p: [pc[0], pc[1], 0.15], t: lH, l: tH, u: UP }, 0.034, 0.13, 0.15, [240, 240, 236], O).forEach(push);                       // pressure gauge
              var hb = [pc[0] + tH[0] * 0.07, pc[1] + tH[1] * 0.07, 0.22];
              bar(hb, [hb[0] + lH[0] * 0.26, hb[1] + lH[1] * 0.26, 0.5], 0.011, HY.base);                                                           // pump handle
              bar([hb[0] + lH[0] * 0.26 - tH[0] * 0.09, hb[1] + lH[1] * 0.26 - tH[1] * 0.09, 0.5], [hb[0] + lH[0] * 0.26 + tH[0] * 0.09, hb[1] + lH[1] * 0.26 + tH[1] * 0.09, 0.5], 0.016, HY.hose);   // grip
              bx([pc[0] - tH[0] * 0.07, pc[1] - tH[1] * 0.07, 0], tH, lH, [-0.035, 0.035], [-0.03, 0.03], [0.22, 0.26], HY.steel);                  // valve block
              vcyl(pc[0] - tH[0] * 0.07, pc[1] - tH[1] * 0.07, 0.26, 0.3, 0.012, HY.knob);                                                           // lowering (release) valve knob
              vcyl(pc[0] + tH[0] * 0.1, pc[1] + tH[1] * 0.1, 0.22, 0.27, 0.01, HY.steel);                                                            // relief valve
            } else {
              bx(pc, tH, lH, [-0.17, 0.17], [-0.11, 0.11], [0.012, 0.2], HY.tank);                                                                    // oil tank
              cylinder({ p: [pc[0], pc[1], 0.265], t: lH, l: tH, u: UP }, 0.06, -0.15, 0.15, HY.motor, O).forEach(push);                           // electric motor (indicative, not selected)
              cylinder({ p: [pc[0], pc[1], 0.265], t: lH, l: tH, u: UP }, 0.052, 0.15, 0.19, HY.dark, O).forEach(push);                            // fan cover
              bx([pc[0] - tH[0] * 0.02, pc[1] - tH[1] * 0.02, 0], tH, lH, [-0.04, 0.04], [-0.035, 0.035], [0.325, 0.375], HY.dark);                 // terminal box
              bx([pc[0] + tH[0] * 0.19, pc[1] + tH[1] * 0.19, 0], tH, lH, [-0.03, 0.03], [-0.05, 0.05], [0.04, 0.17], HY.steel);                   // valve block
              cylinder({ p: [pc[0], pc[1], 0.14], t: lH, l: tH, u: UP }, 0.034, -0.19, -0.17, [240, 240, 236], O).forEach(push);                    // pressure gauge
              var pend = [pc[0] - lH[0] * 0.42, pc[1] - lH[1] * 0.42, 0];
              bar([pc[0] - tH[0] * 0.02, pc[1] - tH[1] * 0.02, 0.375], [pend[0], pend[1], 0.95], 0.007, HY.hose);                                    // control cable
              bx(pend, tH, lH, [-0.05, 0.05], [-0.035, 0.035], [0.8, 0.95], HY.steel);                                                               // up / down pendant
              bx([pend[0] - tH[0] * 0.052, pend[1] - tH[1] * 0.052, 0], tH, lH, [-0.004, 0.004], [-0.02, 0.02], [0.88, 0.92], [40, 160, 70]);          // UP button
              bx([pend[0] - tH[0] * 0.052, pend[1] - tH[1] * 0.052, 0], tH, lH, [-0.004, 0.004], [-0.02, 0.02], [0.82, 0.86], HY.knob);                // DOWN button
            }
            sc.hydPump.push({ seg: segNo, x: pc[0], y: pc[1], t: tH, l: lH, type: electric ? 'electric' : 'hand', hl: phl, hw: phw });
            ports.pump = [pc[0] - lH[0] * (phw + 0.01), pc[1] - lH[1] * (phw + 0.01), 0.07];
            tag([pc[0], pc[1], electric ? 0.5 : 0.42], electric ? 'Electric power pack + pendant (indicative)' : 'Hand pump (indicative)', 'ind', 'HP');
            grow(clo, chi, [pc[0] - 0.5, pc[1] - 0.5, 0]); grow(clo, chi, [pc[0] + 0.5, pc[1] + 0.5, 1.0]); grow(lo, hi, [pc[0] - 0.5, pc[1] - 0.5, 0]); grow(lo, hi, [pc[0] + 0.5, pc[1] + 0.5, 1.0]);
          }
        });
        // hoses: two circuits (cap end and rod end) from the pump to every stand, then across to the far cylinder, at floor level with clamps
        if (ports.pump) ports.forEach(function (pr, qi) {
          bar(ports.pump, pr.p, 0.012, HY.hose); bar([ports.pump[0], ports.pump[1], 0.1], [pr.p[0], pr.p[1], 0.1], 0.009, HY.hose2);
          bar(pr.p, pr.far, 0.012, HY.hose); bar([pr.p[0], pr.p[1], 0.1], [pr.far[0], pr.far[1], 0.1], 0.009, HY.hose2);
        });
      });
      if (hydSeg.some(function (d) { return d.hydStyle === 'mobile'; })) sc.notes.push('Mobile lift stand: a wheeled base frame on four castors sits under the belt, the belt hinges on it at the low end, and a vertical lift column with a lift cylinder and power pack raises the high end. Yellow hand rails run along both sides. Frame, castor, column, cylinder and pack sizes are placeholders unless you entered them; this tool does not select or size the frame, castors, cylinder, pump, motor or load capacity.');
      if (hydSeg.some(function (d) { return d.hydStyle !== 'mobile'; })) sc.notes.push('Hydraulic stands are drawn as a pair of cylinders with a guide pillar each, base plates, a safety lock collar, hoses and a pump (hand pump or electric power pack). Positions and all cylinder, rod, guide, pump and motor sizes are placeholders: this tool does not select or size cylinders, pumps, motors, load capacity or locking. Stand height is calculated from the route.');
    })();

    /* ----- drive motor, sensors and other equipment placed by the user ----- */
    sc.equip = [];
    var eqNotes = {};
    equipIn.forEach(function (e, i) {
      var D = EQ[e.type], mm = function (v) { return pos(v) ? v / 1000 : null; };
      var len = mm(e.lenMm), wid = mm(e.widMm), bh = mm(e.bodyHMm), sizeEntered = { len: len !== null, wid: wid !== null, h: bh !== null };
      len = len === null ? D.len : len; wid = wid === null ? D.wid : wid; bh = bh === null ? D.h : bh;
      var posEntered = num(e.posMm) && e.posMm >= 0, onRoute = !(posEntered && e.posMm / 1000 > total + 0.0005);
      var sM = posEntered && onRoute ? e.posMm / 1000 : (e.type === 'motor' || e.type === 'encoder' ? total : total / 2);
      var dAlong = !posEntered && (e.type === 'motor') ? -0.17 : 0;
      var mountEntered = num(e.mountMm), mount = mountEntered ? e.mountMm / 1000 : D.mount;
      var pt = track.at(Math.max(0, Math.min(total, sM))), tv = norm([pt.tx, pt.ty, pt.tz]), fr = frameFrom([pt.x, pt.y, pt.z], tv), sg = e.side === 'right' ? -1 : 1, camera = e.type === 'camera';
      var lat = camera ? 0 : sg * (hw + thk + 0.02 + wid / 2), rgb = D.rgb, n = i + 1;
      var cen = add(add(add(fr.p, mul(fr.t, dAlong)), mul(fr.l, lat)), mul(fr.u, mount));
      obox(cen, fr.t, fr.l, fr.u, [-len / 2, len / 2], [-wid / 2, wid / 2], [-bh / 2, bh / 2], rgb, { tag: 'equip' }).forEach(function (q) { sc.polys.push(q); });
      if (camera) {   // simple pole + arm so the camera is not floating
        var tH = norm([pt.tx, pt.ty, 0]), lH = [-tH[1], tH[0], 0], px = sg * (hw + thk + 0.06), zc = cen[2];
        obox([pt.x, pt.y, 0], tH, lH, [0, 0, 1], [-0.015, 0.015], [px - 0.015, px + 0.015], [0, zc], COL.leg, { tag: 'equip', skipBottom: true }).forEach(function (q) { sc.polys.push(q); });
        obox([pt.x, pt.y, zc - 0.015], tH, lH, [0, 0, 1], [-0.015, 0.015], [Math.min(px, 0), Math.max(px, 0)], [0, 0.03], COL.leg, { tag: 'equip' }).forEach(function (q) { sc.polys.push(q); });
      }
      if (e.type === 'photoeye') {   // beam across the belt + receiver / reflector on the other side
        var oppLat = -sg * (hw + thk + 0.02 + 0.015), oc = add(add(fr.p, mul(fr.l, oppLat)), mul(fr.u, mount));
        obox(oc, fr.t, fr.l, fr.u, [-0.015, 0.015], [-0.015, 0.015], [-0.02, 0.02], rgb, { tag: 'equip' }).forEach(function (q) { sc.polys.push(q); });
        var bc = add(fr.p, mul(fr.u, mount));
        obox(bc, fr.t, fr.l, fr.u, [-0.004, 0.004], [-(hw + thk + 0.02), hw + thk + 0.02], [-0.004, 0.004], [235, 40, 40], { tag: 'equip', a: 0.9 }).forEach(function (q) { sc.polys.push(q); });
      }
      var szTxt = [sizeEntered.len ? 'L' + Math.round(len * 1000) : null, sizeEntered.wid ? 'W' + Math.round(wid * 1000) : null, sizeEntered.h ? 'H' + Math.round(bh * 1000) : null].filter(Boolean).join(' ');
      var txt = 'E' + n + ' ' + (e.name || D.name) + (e.rating ? ' · ' + e.rating : '') + (szTxt ? ' · ' + szTxt + ' mm' : '') + (posEntered && onRoute ? ' · @ ' + fmtMm(e.posMm) : '');
      tag(add(cen, [0, 0, bh / 2 + 0.06]), txt + (posEntered && onRoute ? '' : ' · position indicative'), (posEntered && onRoute) || e.rating || e.name || sizeEntered.len || sizeEntered.wid || sizeEntered.h ? 'entered' : 'ind', 'E' + n);
      if (detail && posEntered && onRoute && e.posMm > 1) {   // distance from the inlet, along the route (only drawn when that stretch is straight so the line equals the route distance)
        var p0 = track.at(0), chord = Math.hypot(pt.x - p0.x, pt.y - p0.y, pt.z - p0.z);
        if (Math.abs(chord - sM) <= 0.005 * Math.max(1, sM) + 0.002) {
          var oo = sg * (hw + thk + 0.55 + 0.12 * (i % 3)), a0 = [p0.x + (-p0.ty) * oo, p0.y + p0.tx * oo, p0.z], b0 = [pt.x + (-pt.ty) * oo, pt.y + pt.tx * oo, pt.z];
          dim(a0, b0, 'E' + n + ' ' + fmtMm(e.posMm) + ' from inlet', 'entered', { off: [0, 12 + 12 * (i % 3)] });
        }
      }
      if (detail && mountEntered && Math.abs(mount) > 0.005) {   // mounting height of the body centre above (or below) the belt top
        var zt = [cen[0], cen[1], pt.z], zb2 = [cen[0], cen[1], cen[2]];
        dim(zt, zb2, 'E' + n + ' ' + (mount >= 0 ? '+' : '') + fmtMm(mount * 1000) + ' from belt top', 'entered', { off: [8, 0] });
      }
      if (!sizeEntered.len && !sizeEntered.wid && !sizeEntered.h) eqNotes[D.name] = 1;
      sc.equip.push({ n: n, type: e.type, label: D.name, name: e.name || '', rating: e.rating || '', side: camera ? 'over belt' : (sg > 0 ? 'left' : 'right'), sM: sM, posEntered: posEntered && onRoute, onRoute: onRoute, mountM: mount, mountEntered: mountEntered, len: len, wid: wid, h: bh, sizeEntered: sizeEntered, c: cen, t: fr.t, l: fr.l, u: fr.u, beltTopZ: pt.z, note: e.note || '' });
      grow(clo, chi, [cen[0] - len - wid, cen[1] - len - wid, 0]); grow(clo, chi, [cen[0] + len + wid, cen[1] + len + wid, cen[2] + bh]);
      grow(lo, hi, [cen[0] - len - wid, cen[1] - len - wid, 0]); grow(lo, hi, [cen[0] + len + wid, cen[1] + len + wid, cen[2] + bh]);
    });
    if (sc.equip.length) {
      sc.notes.push('Motor and sensors are drawn at the position and size you entered; anything left blank uses an indicative placeholder (labels in grey). The tool does not select or size any motor or sensor.');
      if (sc.equip.some(function (e) { return !e.posEntered; })) sc.notes.push('Equipment without a position along the conveyor is placed at the discharge end (motor) or mid-route (others) for illustration only.');
    }

    /* bounds */
    sts.forEach(function (st) {
      [-1, 1].forEach(function (sg) { var q = at3(st, 0, sg * (hw + thk + 0.2), 0); grow(clo, chi, q); grow(lo, hi, q); });
      grow(clo, chi, [st.p[0], st.p[1], 0]); grow(clo, chi, [st.p[0], st.p[1], st.p[2] + (prodH || 0.1) + 0.2]);
      grow(lo, hi, [st.p[0], st.p[1], 0]); grow(lo, hi, [st.p[0], st.p[1], st.p[2] + (prodH || 0.1) + 0.2]);
    });

    /* floor grid fallback + shadows are drawn by the viewer */
    if (hasFloor) sc.grid = gridFor(0, 0, FL, FW);
    else { sc.grid = gridFor(Math.floor(clo[0] - 1), Math.floor(clo[1] - 1), Math.ceil(chi[0] + 1), Math.ceil(chi[1] + 1)); grow(lo, hi, [sc.grid.x0, sc.grid.y0, 0]); grow(lo, hi, [sc.grid.x1, sc.grid.y1, 0]); }

    /* ----- annotations ----- */
    var upv = [0, 0, 1];
    dim(add(at3(fS, -0.3, hw, 0), [0, 0, 0.002]), add(at3(fS, -0.3, -hw, 0), [0, 0, 0.002]), 'Belt width ' + fmtMm(W_ * 1000) + (wEntered ? '' : ' (not entered)'), wEntered ? 'entered' : 'ind', { off: [0, -10] });
    tag(add(at3(fS, -0.45, 0, 0.12), [0, 0, 0]), 'IN', 'io'); tag(add(at3(fE, 0.45, 0, 0.12), [0, 0, 0]), 'OUT', 'io');
    if (detail) {
      tag(add(at3(fE, 0, hw + thk + 0.1, -0.12), [0, 0, 0]), userMotor ? 'Drive end (indicative)' : 'Drive end + motor (indicative)', 'ind');
      tag(add(at3(fS, 0, -hw - thk - 0.05, -0.12), [0, 0, 0]), 'Idler end (indicative)', 'ind');
      var zS = fS.p[2], zE = fE.p[2], offW = hw + thk + 0.35, lS = fS.l, lE = fE.l;
      if (zS > 0.15) dim([fS.p[0] + lS[0] * offW, fS.p[1] + lS[1] * offW, 0], [fS.p[0] + lS[0] * offW, fS.p[1] + lS[1] * offW, zS], 'Inlet ' + fmtMm(zS * 1000) + (base.basis === 'illustrative' ? ' (illustrative)' : ''), base.basis === 'illustrative' ? 'ind' : 'entered', { off: [-4, 0] });
      if (zE > 0.15 && Math.abs(zE - zS) > 0.02) dim([fE.p[0] + lE[0] * offW, fE.p[1] + lE[1] * offW, 0], [fE.p[0] + lE[0] * offW, fE.p[1] + lE[1] * offW, zE], 'Discharge ' + fmtMm(zE * 1000), 'calc', { off: [-4, 0] });
    }
    details.forEach(function (d, k) {
      var n = k + 1, m = Math.round((d.p0 + d.p1) / 2), pm = pts3[m], txt = 'S' + n;
      if (detail && details.length <= 10) {
        if (d.type === 'straight') txt += ' Straight ' + fmt(d.length);
        else if (d.type === 'curve') txt += ' Curve ' + (d.direction === 'right' ? 'right' : 'left') + ' R ' + fmtMm(d.radius * 1000) + ' × ' + Math.round(d.angle * 10) / 10 + '° (arc ' + fmt(d.length) + ')';
        else txt += ' Incline ' + fmt(d.length) + ' · rise ' + fmtMm(Math.abs(d.rise) * 1000) + ' · ' + Math.round(Math.abs(d.angle) * 10) / 10 + '°';
      }
      tag([pm[0], pm[1], pm[2] + 0.3 + (prodH || 0)], txt, 'seg', 'S' + n);
      if (!detail) return;
      var a = pts3[d.p0], b = pts3[d.p1];
      if (d.type === 'curve' && pos(d.radius)) {
        var tt = norm(sub(pts3[Math.min(d.p0 + 1, pts3.length - 1)], a)); tt[2] = 0; tt = norm(tt);
        var sg = d.direction === 'right' ? -1 : 1, cen = [a[0] + sg * d.radius * (-tt[1]), a[1] + sg * d.radius * tt[0], a[2]];
        dim(cen, [pm[0], pm[1], a[2]], 'R ' + fmtMm(d.radius * 1000), 'calc', { dashed: true, off: [0, -8] });
      }
      if (d.type === 'incline') {
        var th = norm([b[0] - a[0], b[1] - a[1], 0]), lh = [-th[1], th[0], 0], o2 = hw + thk + 0.3, zLo = Math.min(a[2], b[2]);
        var pa = [a[0] + lh[0] * o2, a[1] + lh[1] * o2, zLo], pb = [b[0] + lh[0] * o2, b[1] + lh[1] * o2, zLo], pc = [pb[0], pb[1], Math.max(a[2], b[2])];
        dim(pa, pb, 'Run ' + fmt(d.horizontal), 'calc', { dashed: true, off: [0, 12] });
        dim(pb, pc, 'Rise ' + fmtMm(Math.abs(d.rise) * 1000), 'calc', { off: [6, 0] });
      }
    });
    if (!(sc.floor)) { sc.floorUnknown = true; }
    sc.all = { min: lo, max: hi }; sc.conv = { min: clo, max: chi };
    var d0 = pts3[0], d1 = pts3[pts3.length - 1], hd = Math.atan2(d1[1] - d0[1], d1[0] - d0[0]); if (Math.abs(d1[0] - d0[0]) + Math.abs(d1[1] - d0[1]) < 1e-6) hd = Math.atan2(sts[0].t[1], sts[0].t[0]);
    sc.axisTheta = Math.round(hd / (Math.PI / 2)) * 90;
    sc.geom = { widthM: W_, baseZ: base.z, baseBasis: base.basis, totalM: total, frameDepth: fd, prodH: prodH, upv: upv };
    return sc;
  }

  function gridFor(x0, y0, x1, y1) {
    var span = Math.max(x1 - x0, y1 - y0), steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100], step = steps[steps.length - 1], i;
    for (i = 0; i < steps.length; i++) if (span / steps[i] <= 30) { step = steps[i]; break; }
    return { x0: x0, y0: y0, x1: x1, y1: y1, step: step };
  }

  /* ============================================================= viewer */
  var FOV = 32 * Math.PI / 180, NEAR = 0.05, LIGHT = norm([-0.45, -0.35, 0.82]);

  function create(host, opts) {
    var doc = host.ownerDocument, compact = !!opts.compact;
    var sc = buildScene(opts.scene), desc = describe(opts.scene);
    var vS = opts.speedMPerMin > 0 ? opts.speedMPerMin / 60 : 0, beh = { mu: (opts.behaviour && opts.behaviour.mu) || 0.3, cogRatio: (opts.behaviour && opts.behaviour.cogRatio) || 0.5, margin: (opts.behaviour && opts.behaviour.margin) || 0.8, stopTimeS: (opts.behaviour && opts.behaviour.stopTimeS) || 0.5 }, pitch = opts.pitchMm > 0 ? opts.pitchMm / 1000 : 0, lanes = Math.max(1, opts.lanes || 1);
    var prod = opts.scene.prod, along = prod && pos(prod.alongMm) ? prod.alongMm / 1000 : 0, across = prod && pos(prod.acrossMm) ? prod.acrossMm / 1000 : 0, ph = prod && pos(prod.heightMm) ? prod.heightMm / 1000 : 0;
    var canRun = !sc.empty && pitch > 0 && along > 0 && across > 0 && ph > 0 && !!sc.track && sc.track.length > 0 && !!PH;
    var prodRgb = opts.productRgb || null, shadeA = prodRgb || COL.prodA, shadeB = prodRgb ? prodRgb.map(function (c) { return Math.round(c * 0.88); }) : COL.prodB;
    var bl = sc.beltRgb ? 0.299 * sc.beltRgb[0] + 0.587 * sc.beltRgb[1] + 0.114 * sc.beltRgb[2] : 60, slatCol = bl > 140 ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.22)';
    var fmt = opts.scene.fmt || function (m) { return m.toFixed(2) + ' m'; };
    var show = { dims: !compact, prods: true, frame: true, floor: true, equip: true, hyd: true };
    var cam = { yaw: -0.9, pitch: 0.5, dist: 10, target: [0, 0, 0], ortho: false }, fitMode = 'conveyor';
    if (sc.empty) fitMode = 'floor';
    if (opts.view) { if (typeof opts.view.yaw === 'number') cam.yaw = opts.view.yaw; if (typeof opts.view.pitch === 'number') cam.pitch = opts.view.pitch; cam.ortho = !!opts.view.ortho; }
    var time = opts.startTime || 0, bt = time, stopped = false, stopOv = {}, collect = true, pl = null, playing = false, last = null, raf = null, scale = 1, auto = false, destroyed = false, reduce = false;
    try { reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
    var transit = canRun && vS > 0 ? sc.track.length / vS : 0, scales = [1, 2, 5, 10, 20, 50];
    if (canRun && vS > 0) scale = scales.reduce(function (b, c) { return Math.abs(c - transit / 18) < Math.abs(b - transit / 18) ? c : b; }, 1);

    /* ---- DOM ---- */
    var root = doc.createElement('div'); root.className = 'v3d' + (compact ? ' compact' : '');
    var views = [['iso', 'Isometric'], ['top', 'Top'], ['front', 'Front'], ['back', 'Back'], ['inlet', 'Inlet end'], ['outlet', 'Outlet end']];
    if (compact) views = views.slice(0, 3);
    var spdTxt = vS > 0 ? String(Math.round(vS * 600) / 10) : '';
    root.innerHTML = '<div class="v3d-bar" role="toolbar" aria-label="3D view controls">' + views.map(function (v) { return '<button type="button" class="btn sm" data-v="' + v[0] + '">' + v[1] + '</button>'; }).join('') +
      '<button type="button" class="btn sm" data-a="fit">Fit conveyor</button>' + (compact ? '' : '<button type="button" class="btn sm" data-a="floor">Whole floor</button>' +
      '<button type="button" class="btn sm" data-a="ortho" aria-pressed="false">Orthographic</button><button type="button" class="btn sm" data-a="auto" aria-pressed="false">Auto-rotate</button>') +
      (compact ? '' : '<button type="button" class="btn sm" data-a="full">Full screen</button><button type="button" class="btn sm" data-a="png">Save image</button>') + '</div>' +
      '<div class="v3d-stage"><canvas tabindex="0" role="img" aria-label="Interactive 3D model of the conveyor. Drag to rotate, scroll to zoom, shift-drag to pan."></canvas>' +
      '<div class="v3d-hint">Drag to rotate · Shift+drag or right-drag to pan · Scroll or pinch to zoom · Double-click to refit</div></div>' +
      '<div class="v3d-bar v3d-opts">' + (canRun ? '<button type="button" class="btn sm primary" data-a="play">Play</button><button type="button" class="btn sm" data-a="restart">Restart</button>' + (compact ? '' : '<button type="button" class="btn sm" data-a="stop" aria-pressed="false">Stop belt (test)</button>') + '<label class="sim-speed">Playback <select data-a="scale">' + scales.map(function (x) { return '<option value="' + x + '"' + (x === scale ? ' selected' : '') + '>' + x + '×</option>'; }).join('') + '</select></label>' +
        (compact ? '' : '<label class="sim-speed">Belt speed (m/min) <input type="number" min="0.5" step="0.5" inputmode="decimal" data-a="speed" value="' + spdTxt + '" style="width:90px"></label>') : '') +
      '<label class="chk"><input type="checkbox" data-t="dims"' + (show.dims ? ' checked' : '') + '> Dimensions</label><label class="chk"><input type="checkbox" data-t="prods" checked> Products</label>' +
      '<label class="chk"><input type="checkbox" data-t="frame" checked> Frame, supports, drive (indicative)</label><label class="chk"><input type="checkbox" data-t="equip" checked> Motor and sensors</label>' + (sc.hyd && sc.hyd.length ? '<label class="chk"><input type="checkbox" data-t="hyd" checked> Hydraulic stands</label>' : '') + '<label class="chk"><input type="checkbox" data-t="floor" checked> Floor and obstacles</label></div>' +
      (compact || !canRun ? '' : '<p class="note" data-o="stopmsg" role="status"></p><div class="behave"><h4>Product behaviour check <span class="note">(illustrative - generic friction values, see notes)</span></h4><p data-o="vmax" class="vmax"></p><ul class="checks" data-o="checks"></ul>' +
        '<div class="v3d-bar"><label class="sim-speed">Belt-product friction μ <input type="number" min="0.05" max="1.5" step="0.01" data-b="mu" style="width:80px" value="' + beh.mu + '"></label>' +
        '<label class="sim-speed">Centre of gravity height (% of product) <input type="number" min="10" max="95" step="1" data-b="cog" style="width:80px" value="' + Math.round(beh.cogRatio * 100) + '"></label>' +
        '<label class="sim-speed">Belt stop time (s) <input type="number" min="0.05" max="5" step="0.05" data-b="stop" style="width:80px" value="' + beh.stopTimeS + '"></label>' +
        '<label class="chk"><input type="checkbox" data-t="collect" checked> A receiving conveyor / collection point takes products at the end</label></div><p class="note" data-o="muBasis"></p></div>') +
      (compact ? '' : '<dl class="sim-stats">' + (canRun ? '<div><dt>Belt speed</dt><dd data-o="spd">' + (vS * 60).toFixed(2) + ' m/min</dd></div><div><dt>Product spacing</dt><dd>' + pitch * 1000 + ' mm</dd></div><div><dt>Simulated time</dt><dd data-o="time">0 s</dd></div><div><dt>On conveyor</dt><dd data-o="on">0</dd></div><div><dt>Delivered</dt><dd data-o="del">0</dd></div><div><dt>Fell off / failed</dt><dd data-o="fell">0</dd></div><div><dt>Measured output</dt><dd data-o="out">-</dd></div>' : '') + '</dl>');
    var noteTxt = sc.notes.concat(desc.notes.filter(function (n) { return sc.notes.indexOf(n) < 0 && !/Inlet height was not entered/.test(n); }));
    if (canRun) noteTxt.push('Products are drawn at their entered length, width and height.');
    if (!compact) noteTxt.push('Drawn to scale from your entries: floor, route, curve radii, inclines, elevations, belt width, product size. Frame, guides, supports, rollers and motor are indicative only; no structural or drive design is implied.');
    var noteEl = doc.createElement('p'); noteEl.className = 'note'; noteEl.setAttribute('data-o', 'note'); noteEl.textContent = noteTxt.join(' ');
    host.innerHTML = ''; host.appendChild(root); if (!compact || noteTxt.length) root.appendChild(noteEl);
    var canvas = root.querySelector('canvas'), stage = root.querySelector('.v3d-stage'), ctx = canvas.getContext('2d'), cw = 600, chh = 400, dpr = 1;
    var o = function (k) { return root.querySelector('[data-o="' + k + '"]') || { textContent: '' }; };

    /* ---- camera ---- */
    function bounds(mode) { return mode === 'floor' ? sc.all : sc.conv; }
    function fit(mode) {
      fitMode = mode || fitMode; var b = bounds(fitMode) || sc.all, c = mul(add(b.min, b.max), 0.5), r = Math.max(0.3, len(sub(b.max, b.min)) / 2 + 0.3);
      var aspect = cw / chh, fv = FOV, fh = 2 * Math.atan(Math.tan(FOV / 2) * aspect), f = Math.min(fv, fh);
      cam.target = c; cam.dist = r / Math.sin(f / 2) * 1.05; need();
    }
    function setView(name) {
      var th = (sc.axisTheta || 0) * Math.PI / 180, p = { iso: [th - 0.85, 0.5, false], top: [-Math.PI / 2, 1.5607, true], front: [th - Math.PI / 2, 0, true], back: [th + Math.PI / 2, 0, true], inlet: [th + Math.PI, 0, true], outlet: [th, 0, true] }[name]; if (!p) return;
      cam.yaw = p[0]; cam.pitch = p[1]; cam.ortho = p[2]; syncBtns(); fit();
    }
    function syncBtns() { var b = root.querySelector('[data-a="ortho"]'); if (b) b.setAttribute('aria-pressed', cam.ortho ? 'true' : 'false'); var a = root.querySelector('[data-a="auto"]'); if (a) a.setAttribute('aria-pressed', auto ? 'true' : 'false'); }
    var cp, camPos, fv3, rv, uv, F, Sx;
    function setupCam() {
      cp = [Math.cos(cam.pitch) * Math.cos(cam.yaw), Math.cos(cam.pitch) * Math.sin(cam.yaw), Math.sin(cam.pitch)];
      camPos = add(cam.target, mul(cp, cam.dist)); fv3 = mul(cp, -1); rv = norm(cross(fv3, [0, 0, 1])); uv = cross(rv, fv3);
      F = (chh / 2) / Math.tan(FOV / 2); Sx = F / cam.dist;
    }
    function toCam(p) { var v = sub(p, camPos); return [dot(v, rv), dot(v, uv), dot(v, fv3)]; }
    function scr(c) { return cam.ortho ? [cw / 2 + c[0] * Sx, chh / 2 - c[1] * Sx] : [cw / 2 + c[0] / c[2] * F, chh / 2 - c[1] / c[2] * F]; }
    function clipPoly(cs) {
      if (cam.ortho) return cs; var out = [], i, n = cs.length;
      for (i = 0; i < n; i++) {
        var a = cs[i], b = cs[(i + 1) % n], ain = a[2] >= NEAR, bin = b[2] >= NEAR;
        if (ain) out.push(a);
        if (ain !== bin) { var t = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]); }
      }
      return out;
    }
    function visible(q) { if (q.two) return true; return cam.ortho ? dot(q.n, fv3) < 0 : dot(q.n, sub(camPos, q.cen)) > 0; }
    function shade(q, c) {
      var d = dot(q.n, LIGHT); if (q.two) d = Math.abs(d); else d = Math.max(0, d);
      var k = 0.52 + 0.48 * d, hl = dot(q.n, mul(fv3, -1)); k = Math.min(1.08, k + 0.1 * Math.max(0, hl));
      return 'rgb(' + Math.min(255, Math.round(c[0] * k)) + ',' + Math.min(255, Math.round(c[1] * k)) + ',' + Math.min(255, Math.round(c[2] * k)) + ')';
    }

    /* ---- behaviour plan + products (positions from physics.motion) ---- */
    var maxProd = 320, maxLanded = 120;
    function hash(k, n) { var x = Math.sin(k * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); }
    function rebuildPlan() {
      pl = null; if (!canRun || !(vS > 0)) return;
      var st = sc.stations[sc.stations.length - 1];
      pl = PH.plan({ v: vS, track: sc.track, details: (opts.scene.path && opts.scene.path.details) || [], W: sc.geom.widthM, zEnd: st.p[2], prod: { along: along, across: across, height: ph, lanes: lanes }, mu: beh.mu, cogRatio: beh.cogRatio, margin: beh.margin, stopTimeS: beh.stopTimeS });
      renderChecks();
    }
    function renderChecks() {
      var ul = root.querySelector('[data-o="checks"]'), vm = root.querySelector('[data-o="vmax"]'), mb = root.querySelector('[data-o="muBasis"]'); if (!ul || !pl) return;
      var icon = { ok: '✓', near: '!', fail: '✗', info: 'i' }, lab = { ok: 'OK', near: 'Close to limit', fail: 'Fails', info: 'Info' };
      ul.innerHTML = pl.checks.map(function (c) { return '<li class="chk-' + c.status + '"><span class="ic" aria-hidden="true">' + icon[c.status] + '</span><span><b>' + c.label + '</b> <em>' + lab[c.status] + '</em><br>' + c.text + '</span></li>'; }).join('');
      if (vm) vm.innerHTML = pl.vmax ? 'Highest belt speed before products leave the belt: <b>' + Math.round(pl.vmax * 600) / 10 + ' m/min</b> (limited by ' + pl.vmaxWhere + '). ' + (pl.v > pl.vmax ? '<b class="bad">Your current speed is above it - products fall.</b>' : 'Your current speed is within it.') : 'No speed limit found from curves or stopping for this route. Inclines and infeed depend on friction, not speed.';
      if (mb) mb.textContent = (opts.behaviour && opts.behaviour.basis ? 'Friction basis: ' + opts.behaviour.basis + '. ' : '') + 'Defaults are generic values, not Ultraplast data; type measured values to test your own belt and product.';
    }
    function boxFromPose(base, t, l, u, roll, pitchA, piv, col) {
      var cs = [], i, A = [-along / 2, along / 2], B = [-across / 2, across / 2], C = [0, ph], cr = Math.cos(roll), sr = Math.sin(roll), cp = Math.cos(pitchA), sp = Math.sin(pitchA);
      for (i = 0; i < 8; i++) {
        var a = A[i & 1], b = B[(i >> 1) & 1], c = C[(i >> 2) & 1];
        var b1 = piv.b + (b - piv.b) * cr - (c - piv.c) * sr, c1 = piv.c + (b - piv.b) * sr + (c - piv.c) * cr, a2 = piv.a + (a - piv.a) * cp - (c1 - piv.c) * sp, c2 = piv.c + (a - piv.a) * sp + (c1 - piv.c) * cp;
        cs.push([base[0] + t[0] * a2 + l[0] * b1 + u[0] * c2, base[1] + t[1] * a2 + l[1] * b1 + u[1] * c2, base[2] + t[2] * a2 + l[2] * b1 + u[2] * c2]);
      }
      var cen = centroid(cs), F = [[1, 3, 7, 5], [0, 4, 6, 2], [2, 6, 7, 3], [0, 1, 5, 4], [4, 5, 7, 6], [0, 2, 3, 1]], out = [];
      F.forEach(function (f, n) {
        var q = [cs[f[0]], cs[f[1]], cs[f[2]], cs[f[3]]], nn = norm(cross(sub(q[1], q[0]), sub(q[3], q[0]))); if (dot(nn, sub(centroid(q), cen)) < 0) nn = mul(nn, -1);
        if (n === 5 && !(piv.keepBottom)) return; out.push(poly(q, nn, col, { tag: 'prod' }));
      });
      return out;
    }
    /** Walk every visible product; cb(poly[]). Returns counts. */
    function eachProduct(cb) {
      var tr = sc.track, L = tr.length, g = PH.G, kHi = Math.floor(bt * vS / pitch + 1e-9), k, lane, landed = 0, drawn = 0, W_ = sc.geom.widthM;
      for (k = kHi; k >= 0; k--) {
        var tau = bt - k * pitch / vS, mo = PH.motion(pl, tau, k), ov = stopOv[k], col = (k % 2) ? shadeA : shadeB;
        var air = mo.phase === 'air', s = air ? null : mo.s;
        if (!air && s >= L) {
          if (collect || pl.fate.kind !== 'ok') { if (collect) break; }
          if (!collect) mo = { phase: 'air', sExit: L, latExit: 0, dir: 0, vLat: 0, vFwd: vS, t: (s - L) / vS, roll0: 0, rollRate: 0 }; air = true;
        }
        if (!air && ov) { var pr = Math.min(1, (time - ov.t0) / 0.4); s = Math.min(L, s + ov.extra * pr); }
        for (lane = 0; lane < lanes; lane++) {
          var lo_ = lanes === 1 ? 0 : -W_ / 2 + (lane + 0.5) * W_ / lanes, polys;
          if (!air) {
            var pt = tr.at(Math.max(0, Math.min(L, s))), fr = frameFrom([pt.x, pt.y, pt.z], norm([pt.tx, pt.ty, pt.tz])), base = add(fr.p, mul(fr.l, mo.lat + lo_)), roll = mo.roll, pit = mo.pitch, piv = { a: 0, b: 0, c: ph / 2 };
            if (mo.pivot === 'outer') piv = { a: 0, b: mo.pivotDir * across / 2, c: 0 }; else if (mo.pivot === 'rear') piv = { a: -along / 2, b: 0, c: 0 };
            if (ov && ov.tip) { var p2 = Math.min(1, (time - ov.t0) / 0.4); pit = -(Math.PI / 2) * p2; piv = { a: along / 2, b: 0, c: 0 }; }
            if (roll === 0 && pit === 0) piv = { a: 0, b: 0, c: 0 };
            polys = boxFromPose(base, fr.t, fr.l, fr.u, roll, pit, piv, col);
          } else {
            var pe = tr.at(Math.max(0, Math.min(L, mo.sExit))), tH = norm([pe.tx, pe.ty, 0]), lH = [-tH[1], tH[0], 0], z0 = pe.z, tL = Math.sqrt(2 * Math.max(0, z0) / g), tA = mo.t, isLanded = tA >= tL, tt = Math.min(tA, tL);
            var latv = lo_ + mo.dir * (mo.latExit + mo.vLat * tt), bz = z0 - 0.5 * g * tt * tt, px = pe.x + tH[0] * mo.vFwd * tt + lH[0] * latv, py = pe.y + tH[1] * mo.vFwd * tt + lH[1] * latv, rl = mo.roll0 + mo.rollRate * tt, yaw = 0;
            if (isLanded) {
              var snap = Math.round(rl / (Math.PI / 2)) * (Math.PI / 2), ease = Math.min(1, (tA - tL) / 0.25); rl = rl + (snap - rl) * ease; bz = 0; yaw = (hash(k, 3) - 0.5) * 2.2;
              px += (hash(k, 1) - 0.5) * 0.5 * tH[0] + (hash(k, 2) - 0.5) * 0.5 * lH[0]; py += (hash(k, 1) - 0.5) * 0.5 * tH[1] + (hash(k, 2) - 0.5) * 0.5 * lH[1]; landed++;
            }
            var cy = Math.cos(yaw), sy = Math.sin(yaw), t2 = [tH[0] * cy + lH[0] * sy, tH[1] * cy + lH[1] * sy, 0], l2 = [-t2[1], t2[0], 0];
            polys = boxFromPose([px, py, Math.max(0, bz)], t2, l2, [0, 0, 1], rl, 0, { a: 0, b: 0, c: ph / 2 }, col);
          }
          cb(polys); drawn++;
        }
        if (drawn >= maxProd || landed >= maxLanded) break;
      }
      return drawn;
    }
    function productPolys() {
      if (!canRun || !show.prods || !pl) return [];
      var out = []; sc.shown = eachProduct(function (ps) { for (var i = 0; i < ps.length; i++) out.push(ps[i]); }); return out;
    }
    function census() {
      var L = sc.track.length, rel = bt >= 0 ? Math.floor(bt * vS / pitch + 1e-9) + 1 : 0, ex = PH.exitTau(pl), fell = 0, del = 0;
      if (pl.fate.kind === 'curve-slide' || pl.fate.kind === 'curve-tip') { fell = ex !== null && bt >= ex ? Math.floor((bt - ex) * vS / pitch + 1e-9) + 1 : 0; fell = Math.min(fell, rel); }
      else del = SIM.delivered(bt, vS, pitch, L) * (ex !== null && pl.fate.kind === 'incline-slip' ? 0 : 1), del = Math.min(del, rel);
      return { released: rel * lanes, fell: fell * lanes, delivered: del * lanes, onBelt: Math.max(0, rel - fell - del) * lanes };
    }

    /* ---- drawing ---- */
    function draw() {
      if (destroyed) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cw, chh);
      var g = ctx.createLinearGradient(0, 0, 0, chh); g.addColorStop(0, '#f7f8fa'); g.addColorStop(1, '#e4e7ec'); ctx.fillStyle = g; ctx.fillRect(0, 0, cw, chh);
      setupCam();
      var below = camPos[2] < 0, items = [], hid = { floor: !show.floor, obst: !show.floor, frame: !show.frame, support: !show.frame, drive: !show.frame, equip: !show.equip, hyd: !show.hyd };
      var all = sc.polys.concat(productPolys()), k;
      for (k = 0; k < all.length; k++) {
        var q = all[k]; if (hid[q.tag]) continue;
        var layer = q.tag === 'floor' ? (below ? 2 : 0) : 1;
        if (q.tag === 'floor' && !below && !visible(q)) continue;
        if (q.tag !== 'floor' && !visible(q)) continue;
        var cs = q.p.map(toCam); if (!cam.ortho) { var anyBehind = cs.some(function (c) { return c[2] < NEAR; }); if (anyBehind) { cs = clipPoly(cs); if (cs.length < 3) continue; } }
        items.push({ q: q, cs: cs, d: toCam(q.cen)[2], layer: layer });
      }
      items.sort(function (a, b) { return a.layer - b.layer || b.d - a.d; });
      var gridDrawn = false;
      function drawGrid() {
        if (gridDrawn || !show.floor || !sc.grid) return; gridDrawn = true;
        var gr = sc.grid, x, y, a, b, s0, s1;
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(120,130,145,.35)'; ctx.beginPath();
        for (x = Math.ceil(gr.x0 / gr.step - 1e-9) * gr.step; x <= gr.x1 + 1e-9; x += gr.step) { a = toCam([x, gr.y0, 0]); b = toCam([x, gr.y1, 0]); seg(a, b); }
        for (y = Math.ceil(gr.y0 / gr.step - 1e-9) * gr.step; y <= gr.y1 + 1e-9; y += gr.step) { a = toCam([gr.x0, y, 0]); b = toCam([gr.x1, y, 0]); seg(a, b); }
        ctx.stroke();
        if (sc.ceiling) {
          ctx.strokeStyle = 'rgba(30,30,30,.45)'; ctx.setLineDash([6, 4]); ctx.beginPath(); var z = sc.ceiling.z, cr = [[0, 0, z], [sc.ceiling.x1, 0, z], [sc.ceiling.x1, sc.ceiling.y1, z], [0, sc.ceiling.y1, z]];
          for (x = 0; x < 4; x++) seg(toCam(cr[x]), toCam(cr[(x + 1) % 4])); ctx.stroke(); ctx.setLineDash([]);
        }
        // conveyor footprint shadow on the floor
        if (sc.stations.length > 1 && !sc.empty) {
          ctx.fillStyle = 'rgba(20,24,32,.13)';
          for (var m = 0; m < sc.stations.length - 1; m++) {
            var A = sc.stations[m], B = sc.stations[m + 1], hw = sc.geom.widthM / 2 + IND.frameThk, w = [[A.p[0] + A.l[0] * hw, A.p[1] + A.l[1] * hw, 0], [A.p[0] - A.l[0] * hw, A.p[1] - A.l[1] * hw, 0], [B.p[0] - B.l[0] * hw, B.p[1] - B.l[1] * hw, 0], [B.p[0] + B.l[0] * hw, B.p[1] + B.l[1] * hw, 0]];
            var cs = clipPoly(w.map(toCam)); if (cs.length < 3) continue; pathOf(cs); ctx.fill();
          }
        }
      }
      function seg(a, b) {
        if (!cam.ortho) { if (a[2] < NEAR && b[2] < NEAR) return; if (a[2] < NEAR) { var t = (NEAR - a[2]) / (b[2] - a[2]); a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]; } else if (b[2] < NEAR) { var t2 = (NEAR - b[2]) / (a[2] - b[2]); b = [b[0] + (a[0] - b[0]) * t2, b[1] + (a[1] - b[1]) * t2, NEAR]; } }
        var p = scr(a), r = scr(b); ctx.moveTo(p[0], p[1]); ctx.lineTo(r[0], r[1]);
      }
      function pathOf(cs) { ctx.beginPath(); for (var i = 0; i < cs.length; i++) { var p = scr(cs[i]); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } ctx.closePath(); }

      var slat = sc.slat, phase = canRun ? (vS * bt) % slat : 0, i;
      for (i = 0; i < items.length; i++) {
        var it = items[i], q = it.q;
        if (it.layer === 1) drawGrid();
        pathOf(it.cs);
        var rgb = shade(q, q.c);
        if (q.tag === 'floor' && below) { ctx.globalAlpha = 0.3; ctx.fillStyle = rgb; ctx.fill(); ctx.globalAlpha = 1; }
        else if (q.a < 1) { ctx.globalAlpha = q.a; ctx.fillStyle = rgb; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(90,30,30,.7)'; ctx.lineWidth = 1; ctx.stroke(); }
        else { ctx.fillStyle = rgb; ctx.fill(); ctx.strokeStyle = q.tag === 'floor' ? 'rgba(60,70,85,.5)' : 'rgba(15,20,30,.38)'; ctx.lineWidth = q.tag === 'prod' ? 0.8 : 0.5; ctx.stroke(); }
        if (q.top) detailsOnStrip(q.top, slat, phase);
        if (it.layer === 2 && q.tag === 'floor') { /* underside floor drawn last */ }
      }
      drawGrid();
      if (show.dims) overlay();
      hud();
    }
    function detailsOnStrip(t, slat, phase) {
      var span = t.s1 - t.s0; if (span <= 0) return;
      var j0 = Math.ceil((t.s0 - phase) / slat - 1e-9), j1 = Math.floor((t.s1 - phase) / slat - 1e-9), j;
      if (j1 - j0 < 60) {
        ctx.strokeStyle = slatCol; ctx.lineWidth = 1; ctx.beginPath();
        for (j = j0; j <= j1; j++) { var f = (j * slat + phase - t.s0) / span, a = lerp(t.aL, t.bL, f), b = lerp(t.aR, t.bR, f), ca = toCam(a), cb = toCam(b); if (ca[2] < NEAR && !cam.ortho) continue; if (cb[2] < NEAR && !cam.ortho) continue; var pa = scr(ca), pb = scr(cb); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); }
        ctx.stroke();
      }
      sc.arrows.forEach(function (ar) {
        if (ar.s < t.s0 || ar.s >= t.s1) return;
        var f = (ar.s - t.s0) / span, cA = mul(add(t.aL, t.aR), 0.5), cB = mul(add(t.bL, t.bR), 0.5), c = lerp(cA, cB, f), dir = norm(sub(cB, cA)), lat = norm(sub(t.aL, t.aR)), z = [0, 0, 0.0015], sz = ar.size;
        var tri = [add(add(c, mul(dir, sz)), z), add(add(add(c, mul(dir, -sz * 0.6)), mul(lat, sz * 0.7)), z), add(add(add(c, mul(dir, -sz * 0.6)), mul(lat, -sz * 0.7)), z)].map(toCam);
        if (!cam.ortho && tri.some(function (p) { return p[2] < NEAR; })) return;
        ctx.beginPath(); tri.forEach(function (p, n) { var s = scr(p); if (n) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]); }); ctx.closePath(); ctx.fillStyle = 'rgba(214,40,57,.95)'; ctx.fill();
      });
    }
    var placed = [];
    function label(x, y, text, kind) {
      ctx.font = (kind === 'seg' ? '600 ' : '500 ') + '11.5px system-ui,-apple-system,Segoe UI,Roboto,sans-serif'; var w = ctx.measureText(text).width + 10, h = 17, tries = [0, -18, 18, -36, 36, -54, 54], i, j, bx, by, free;
      x = Math.max(w / 2 + 2, Math.min(cw - w / 2 - 2, x));
      for (i = 0; i < tries.length; i++) {
        by = Math.max(h, Math.min(chh - 4, y + tries[i])); bx = x; free = true;
        for (j = 0; j < placed.length; j++) { var r = placed[j]; if (bx - w / 2 < r[2] && bx + w / 2 > r[0] && by - h + 4 < r[3] && by + 4 > r[1]) { free = false; break; } }
        if (free) break;
      }
      y = by; placed.push([x - w / 2, y - h + 4, x + w / 2, y + 4]);
      ctx.fillStyle = kind === 'seg' ? 'rgba(214,40,57,.95)' : kind === 'io' ? 'rgba(20,24,32,.92)' : 'rgba(255,255,255,.93)';
      roundRect(x - w / 2, y - h + 4, w, h, 4); ctx.fill();
      ctx.strokeStyle = kind === 'entered' ? '#222' : kind === 'obst' ? '#a33' : kind === 'ind' ? '#7b828b' : '#c4182a'; ctx.lineWidth = 1; if (kind !== 'seg' && kind !== 'io') ctx.stroke();
      ctx.fillStyle = kind === 'seg' || kind === 'io' ? '#fff' : kind === 'ind' ? '#555' : '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(text, x, y);
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function overlay() {
      var queue = []; placed = [];
      sc.dims.forEach(function (d) {
        var a = toCam(d.a), b = toCam(d.b); if (!cam.ortho && (a[2] < NEAR || b[2] < NEAR)) return;
        var pa = scr(a), pb = scr(b), col = d.kind === 'entered' ? '#111' : d.kind === 'ind' ? '#7b828b' : '#c4182a';
        ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.setLineDash(d.dashed ? [5, 4] : []); ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke(); ctx.setLineDash([]);
        var dx = pb[0] - pa[0], dy = pb[1] - pa[1], dl = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / dl * 5, ny = dx / dl * 5;
        ctx.beginPath(); ctx.moveTo(pa[0] - nx, pa[1] - ny); ctx.lineTo(pa[0] + nx, pa[1] + ny); ctx.moveTo(pb[0] - nx, pb[1] - ny); ctx.lineTo(pb[0] + nx, pb[1] + ny); ctx.stroke();
        if (dl >= 14) queue.push([(pa[0] + pb[0]) / 2 + d.off[0], (pa[1] + pb[1]) / 2 + d.off[1], d.text, d.kind, d.kind === 'entered' ? 1 : 2]);
      });
      sc.tags.forEach(function (t) { var narrow = cw < 520; if (narrow && t.kind === 'ind') return; var c = toCam(t.p); if (!cam.ortho && c[2] < NEAR) return; var p = scr(c); queue.push([p[0], p[1], narrow && t.short ? t.short : t.text, t.kind, t.kind === 'seg' ? 0 : t.kind === 'io' ? 0 : t.kind === 'ind' ? 3 : 2]); });
      queue.sort(function (a, b) { return a[4] - b[4]; }).forEach(function (q) { label(q[0], q[1], q[2], q[3]); });
    }
    function hud() {
      var ox = 38, oy = chh - 34, ax = [[[1, 0, 0], '#d6283a', 'X'], [[0, 1, 0], '#2a9d54', 'Y'], [[0, 0, 1], '#2b6fd6', 'Z']];
      ctx.lineWidth = 2; ctx.font = '700 11px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ax.forEach(function (a) { var dx = dot(a[0], rv) * 24, dy = -dot(a[0], uv) * 24; ctx.strokeStyle = a[1]; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + dx, oy + dy); ctx.stroke(); ctx.fillStyle = a[1]; ctx.fillText(a[2], ox + dx * 1.3, oy + dy * 1.3); });
      if (sc.grid && show.floor) { ctx.fillStyle = '#555'; ctx.font = '500 11px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText('Floor grid: ' + fmt(sc.grid.step) + (cam.ortho ? ' · orthographic' : ''), 78, chh - 10); }
    }

    /* ---- loop ---- */
    function need() { if (!raf && !destroyed) raf = W.requestAnimationFrame(tick); }
    function tick(ts) {
      raf = null; if (destroyed) return;
      var dt = last === null ? 0 : Math.min(0.1, (ts - last) / 1000); last = ts;
      if (playing) { time += dt * scale; if (!stopped) bt += dt * scale; } if (auto) cam.yaw += dt * 0.35;
      draw(); if (playing) stats();
      if (playing || auto) need(); else last = null;
    }
    function stats() {
      if (!canRun || !pl) return; var c = census();
      o('time').textContent = time < 120 ? time.toFixed(1) + ' s' : (time / 60).toFixed(1) + ' min'; o('on').textContent = String(c.onBelt); o('del').textContent = String(c.delivered); o('fell').textContent = String(c.fell);
      var L = sc.track.length, steady = L / vS; if (bt > steady + 2 * pitch / vS && pl.fate.kind !== 'incline-slip') { var win = 10 * pitch / vS, t0 = Math.max(0, bt - win); o('out').textContent = ((SIM.delivered(bt, vS, pitch, L) - SIM.delivered(t0, vS, pitch, L)) * lanes * (c.fell ? 0 : 1) / ((bt - t0) / 60)).toFixed(1) + ' products/min'; } else o('out').textContent = '-';
    }
    function restart() { time = 0; bt = 0; stopOv = {}; stopped = false; var sb = root.querySelector('[data-a="stop"]'); if (sb) { sb.textContent = 'Stop belt (test)'; sb.setAttribute('aria-pressed', 'false'); } need(); }
    function toggleStop() {
      if (!pl) return; var sb = root.querySelector('[data-a="stop"]');
      if (!stopped) {
        stopped = true; var eff = PH.stopEffect(pl), L = sc.track.length, kHi = Math.floor(bt * vS / pitch + 1e-9), k, n = 0;
        if (pl.fate.kind === 'ok' && (eff.slides || eff.tips)) for (k = kHi; k >= 0; k--) { var m = PH.motion(pl, bt - k * pitch / vS, k); if (m.phase !== 'belt' || m.s >= L) break; stopOv[k] = { extra: eff.slides ? eff.extraM : 0, tip: eff.tips, t0: time }; n++; }
        stopMsg = !eff.slides && !eff.tips ? 'Belt stopped: at this speed the products stayed in place.' : 'Belt stopped: ' + (eff.tips ? 'products tipped forwards' : 'products slid about ' + Math.round(eff.extraM * 1000) + ' mm further');
        if (sb) { sb.textContent = 'Start belt'; sb.setAttribute('aria-pressed', 'true'); }
      } else { stopped = false; stopMsg = ''; if (sb) { sb.textContent = 'Stop belt (test)'; sb.setAttribute('aria-pressed', 'false'); } }
      var ne = root.querySelector('[data-o="stopmsg"]'); if (ne) ne.textContent = stopMsg; need();
    }
    var stopMsg = '';
    function play() { if (playing || !canRun || !pl) return; playing = true; var b = root.querySelector('[data-a="play"]'); if (b) b.textContent = 'Pause'; need(); }
    function pause() { playing = false; var b = root.querySelector('[data-a="play"]'); if (b) b.textContent = 'Play'; }

    /* ---- sizing ---- */
    function resize() {
      var w = stage.clientWidth || 600, h = compact ? Math.round(Math.min(300, w * 0.75)) : w < 520 ? Math.round(Math.min(520, w * 1.1)) : (doc.fullscreenElement === stage ? (W.innerHeight || 700) : Math.round(Math.max(340, Math.min(640, w * 0.62))));
      dpr = Math.min(2, W.devicePixelRatio || 1); cw = w; chh = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; need();
    }
    var ro = null; try { if (W.ResizeObserver) { ro = new W.ResizeObserver(function () { if (Math.abs(stage.clientWidth - cw) > 1) { var d0 = cam.dist; resize(); } }); ro.observe(stage); } } catch (e) { }
    W.addEventListener && W.addEventListener('resize', resize);
    var onFs = function () { resize(); fit(); }; doc.addEventListener('fullscreenchange', onFs);

    /* ---- input ---- */
    var ptr = {}, pinch0 = null;
    function panBy(dx, dy) { var wpp = 2 * cam.dist * Math.tan(FOV / 2) / chh; cam.target = add(cam.target, add(mul(rv, -dx * wpp), mul(uv, dy * wpp))); }
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('pointerdown', function (e) { try { canvas.setPointerCapture(e.pointerId); } catch (er) { } ptr[e.pointerId] = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 1 || e.button === 2 }; pinch0 = null; canvas.focus && canvas.focus(); });
    canvas.addEventListener('pointermove', function (e) {
      var p = ptr[e.pointerId]; if (!p) return; var ids = Object.keys(ptr);
      if (ids.length === 1) {
        var dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        if (p.pan) panBy(dx, dy); else { cam.yaw -= dx * 0.008; cam.pitch = Math.max(-1.55, Math.min(1.5607, cam.pitch + dy * 0.008)); }
        if (cam.ortho && !p.pan && (Math.abs(dx) + Math.abs(dy)) > 0) { cam.ortho = false; syncBtns(); }
      } else if (ids.length === 2) {
        p.x = e.clientX; p.y = e.clientY; var a = ptr[ids[0]], b = ptr[ids[1]], d = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (pinch0) { cam.dist = Math.max(0.3, Math.min(500, cam.dist * pinch0.d / d)); panBy(mx - pinch0.mx, my - pinch0.my); }
        pinch0 = { d: d, mx: mx, my: my };
      }
      need();
    });
    function up(e) { delete ptr[e.pointerId]; pinch0 = null; }
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); cam.dist = Math.max(0.3, Math.min(500, cam.dist * Math.exp(e.deltaY * 0.0015))); need(); }, { passive: false });
    canvas.addEventListener('dblclick', function () { fit(); });
    canvas.addEventListener('keydown', function (e) {
      var k = e.key, used = true;
      if (k === 'ArrowLeft') cam.yaw += 0.1; else if (k === 'ArrowRight') cam.yaw -= 0.1; else if (k === 'ArrowUp') cam.pitch = Math.min(1.5607, cam.pitch + 0.08); else if (k === 'ArrowDown') cam.pitch = Math.max(-1.55, cam.pitch - 0.08);
      else if (k === '+' || k === '=') cam.dist *= 0.88; else if (k === '-') cam.dist *= 1.14; else if (k === '0') fit(); else used = false;
      if (used) { e.preventDefault(); need(); }
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      var v = b.getAttribute('data-v'), a = b.getAttribute('data-a');
      if (v) setView(v);
      else if (a === 'fit') fit('conveyor'); else if (a === 'floor') fit('floor');
      else if (a === 'ortho') { cam.ortho = !cam.ortho; syncBtns(); need(); }
      else if (a === 'auto') { auto = !auto; syncBtns(); need(); }
      else if (a === 'play') (playing ? pause : play)();
      else if (a === 'restart') { restart(); if (!playing) play(); }
      else if (a === 'stop') toggleStop();
      else if (a === 'full') { try { if (doc.fullscreenElement) doc.exitFullscreen(); else if (stage.requestFullscreen) stage.requestFullscreen(); } catch (er) { } }
      else if (a === 'png') { try { draw(); var link = doc.createElement('a'); link.download = 'Ultraplast-conveyor-3d.png'; link.href = canvas.toDataURL('image/png'); doc.body.appendChild(link); link.click(); doc.body.removeChild(link); } catch (er) { } }
    });
    root.addEventListener('change', function (e) {
      var t = e.target.getAttribute('data-t'), a = e.target.getAttribute('data-a');
      var bn = e.target.getAttribute('data-b');
      if (t === 'collect') { collect = e.target.checked; need(); } else if (t) { show[t] = e.target.checked; need(); } else if (a === 'scale') scale = +e.target.value;
      else if (a === 'speed') { var nv = parseFloat(e.target.value); if (nv > 0) { vS = nv / 60; var sd = root.querySelector('[data-o="spd"]'); if (sd) sd.textContent = nv.toFixed(2) + ' m/min'; rebuildPlan(); restart(); } }
      else if (bn) { var x = parseFloat(e.target.value); if (x > 0) { if (bn === 'mu') beh.mu = x; else if (bn === 'cog') beh.cogRatio = Math.max(0.1, Math.min(0.95, x / 100)); else if (bn === 'stop') beh.stopTimeS = x; rebuildPlan(); restart(); } }
    });

    rebuildPlan(); resize(); syncBtns();
    if (opts.view && typeof opts.view.yaw === 'number') fit('conveyor'); else setView('iso');
    draw(); stats(); if (canRun && !reduce && opts.autoplay !== false) play();
    return {
      destroy: function () { destroyed = true; playing = false; if (raf) W.cancelAnimationFrame(raf); if (ro) ro.disconnect(); W.removeEventListener && W.removeEventListener('resize', resize); doc.removeEventListener('fullscreenchange', onFs); },
      pause: pause, play: play, setView: setView, fit: fit, render: draw, scene: sc, description: desc, plan: function () { return pl; }, setSpeed: function (mpm) { vS = mpm / 60; rebuildPlan(); restart(); }, setCollect: function (b) { collect = !!b; need(); }, toggleStop: toggleStop, census: function () { return pl ? census() : null; },
      state: function () { return { time: time, beltTime: bt, stopped: stopped, playing: playing, scale: scale, yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, ortho: cam.ortho, canRun: canRun, shown: sc.shown || 0 }; },
      view: function () { return { yaw: cam.yaw, pitch: cam.pitch, ortho: cam.ortho }; },
      setTime: function (t) { time = t; bt = t; draw(); stats(); }, setCamera: function (c) { for (var k in c) cam[k] = c[k]; need(); }
    };
  }

  return { hexToRgb: hexToRgb, IND: IND, buildScene: buildScene, describe: describe, baseElevation: baseElevation, create: create, extrude: extrude, obox: obox };
});
