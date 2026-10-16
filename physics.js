/*
 * physics.js — PRODUCT BEHAVIOUR CHECK AND MOTION MODEL (illustrative, no libraries)
 * ---------------------------------------------------------------------------
 * Simple rigid-body rules that decide whether a product stays on the belt at a given belt speed.
 * Every number comes from the formulas below plus the friction / centre-of-gravity assumptions in
 * products.js (behaviour) - those assumptions are GENERIC and UNVERIFIED.  This is a planning aid that
 * shows the kind of problem to expect; it is not a dynamic simulation and not a design approval.
 *
 *  curve, sliding   v_slide = sqrt(mu * g * R)                  (R = radius of the product's lane)
 *  curve, tipping   v_tip   = sqrt(g * R * across / (2 * hcog)) (across = product size across the belt)
 *  incline          slips when tan(slope) > mu                  (no cleats / textured surface assumed)
 *  infeed           tips backwards when mu > along / (2 * hcog) (product dropped on a moving belt and sliding)
 *  stopping         tips forwards when min(v / t_stop, mu*g) > g * along / (2 * hcog)
 *  discharge        lands v * sqrt(2 * z / g) beyond the belt end if nothing receives it
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.UCPPhysics = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var G = 9.81, num = function (v) { return typeof v === 'number' && isFinite(v); }, pos = function (v) { return num(v) && v > 0; };

  /** Which friction row applies to the selected conveyor / material. */
  function beltTypeOf(inp, categoryId) {
    var m = inp && inp.material;
    if (m === 'pu_pvc') return 'pu'; if (m === 'ss304') return 'ss'; if (m === 'plastic_other') return 'slat'; if (m === 'pp_modular') return 'pp';
    if (categoryId === 'food_pu_pvc') return 'pu'; if (categoryId === 'thermoplastic_slat') return 'slat'; if (categoryId === 'straight_modular' || categoryId === 'side_flex') return 'pp';
    return 'other';
  }
  /** mu for the belt type, reduced for wet / oily conditions. `override` (a number > 0) wins. */
  function muFor(B, type, conditions, override) {
    if (pos(override)) return { mu: override, basis: 'entered' };
    var mu = B.mu[type] || B.mu.other, basis = 'generic reference for ' + (B.muLabels[type] || type), c = conditions || [];
    if (c.indexOf('oily') >= 0) { mu *= B.oilyFactor; basis += ', reduced for oily'; } else if (c.indexOf('wet') >= 0) { mu *= B.wetFactor; basis += ', reduced for wet'; }
    return { mu: Math.round(mu * 1000) / 1000, basis: basis };
  }

  function status(ratio, margin) { return ratio >= 1 ? 'fail' : ratio >= margin ? 'near' : 'ok'; }
  function mpm(v) { return Math.round(v * 60 * 10) / 10; }

  /**
   * o: { v (m/s), track:{length,cum}, details, W (m), zEnd (m), prod:{along,across,height,lanes} (m),
   *      mu, cogRatio, margin, stopTimeS }
   */
  function plan(o) {
    var v = o.v, W = o.W, p = o.prod, mu = o.mu, margin = o.margin || 0.8, h = p.height * (o.cogRatio || 0.5), checks = [], events = [], vmax = null, vmaxWhere = null;
    function capSpeed(vc, where) { if (vmax === null || vc < vmax) { vmax = vc; vmaxWhere = where; } }
    var lanes = Math.max(1, p.lanes || 1), laneOff = lanes > 1 ? W / 2 - (W / lanes) / 2 : 0;
    (o.details || []).forEach(function (d, i) {
      var sS = o.track.cum[d.p0], sE = o.track.cum[d.p1], name = 'S' + (i + 1);
      if (d.type === 'curve' && pos(d.radius)) {
        var Reff = Math.max(0.05, d.radius - laneOff), vs = Math.sqrt(mu * G * Reff), vt = Math.sqrt(G * Reff * p.across / (2 * h)), vc = Math.min(vs, vt), mode = vs <= vt ? 'slide' : 'tip', ratio = v / vc, st = status(ratio, margin);
        capSpeed(vc, name + ' curve');
        events.push({ type: 'curve', index: i, sStart: sS, sEnd: sE, radius: Reff, direction: d.direction, mode: mode, vcrit: vc, status: st, aLat: v * v / Reff });
        checks.push({ id: 'curve' + i, label: name + ' curve R ' + Math.round(d.radius * 1000) + ' mm', status: st, mode: mode, vcrit: vc, ratio: ratio,
          text: 'Products ' + (mode === 'slide' ? 'start to slide outwards' : 'start to tip over outwards') + ' above about ' + mpm(vc) + ' m/min (sliding limit ' + mpm(vs) + ', tipping limit ' + mpm(vt) + '). Your speed is ' + mpm(v) + ' m/min' + (st === 'fail' ? ' - products WILL leave the belt here.' : st === 'near' ? ' - close to the limit.' : ' - within the limit.') });
      } else if (d.type === 'incline') {
        var th = Math.abs(d.angle), tn = Math.tan(th * Math.PI / 180), r2 = tn / mu, st2 = status(r2, margin), maxDeg = Math.atan(mu) * 180 / Math.PI;
        events.push({ type: 'incline', index: i, sStart: sS, sEnd: sE, mode: 'slip', status: st2, slopeDeg: th, maxDeg: maxDeg, rising: d.rise >= 0, ratio: r2 });
        checks.push({ id: 'incline' + i, label: name + ' ' + (d.rise < 0 ? 'decline' : 'incline') + ' ' + (Math.round(th * 10) / 10) + ' deg', status: st2, ratio: r2,
          text: 'A smooth belt holds this product up to about ' + (Math.round(maxDeg * 10) / 10) + ' deg (tan slope must stay below mu ' + mu + '). ' + (st2 === 'fail' ? 'At ' + (Math.round(th * 10) / 10) + ' deg products WILL slip back; use cleats, a textured surface or a lower angle. Slowing the belt does not help.' : st2 === 'near' ? 'Close to the limit.' : 'Within the limit.') });
      }
    });
    // infeed
    var rI = mu * 2 * h / p.along, stI = status(rI, margin);
    checks.push({ id: 'infeed', label: 'Infeed (product placed on the moving belt)', status: stI, ratio: rI, text: stI === 'fail' ? 'Friction (mu ' + mu + ') is high for this tall, short-footprint product: while sliding it tips backwards when placed on the moving belt. Feed it at belt speed or use a lower-friction landing zone.' : stI === 'near' ? 'Close to tipping when placed on a moving belt; feed it gently.' : 'Stable when placed on the moving belt.' });
    // stop
    var T = o.stopTimeS || 0.5, aStop = v / T, effS = Math.min(aStop, mu * G), tipThr = G * p.along / (2 * h), rS = effS / tipThr, stS = status(rS, margin), slides = aStop > mu * G, extra = slides ? Math.max(0, v * v / (2 * mu * G) - v * T / 2) : 0;
    var vStopTip = mu * G >= tipThr ? tipThr * T : null; if (vStopTip !== null) capSpeed(vStopTip, 'belt stop in ' + T + ' s');
    checks.push({ id: 'stop', label: 'Belt stop in ' + T + ' s', status: stS, ratio: rS, aStop: aStop, extraSlideM: extra, tips: rS >= 1, slides: slides,
      text: 'Deceleration ' + (Math.round(aStop * 100) / 100) + ' m/s2 vs friction limit ' + (Math.round(mu * G * 100) / 100) + ' m/s2: ' + (slides ? 'products slide about ' + (Math.round(extra * 1000)) + ' mm further than the belt. ' : 'products stay put on the belt. ') + (rS >= 1 ? 'Products tip forwards when the belt is stopped at this speed (limit about ' + (vStopTip !== null ? mpm(vStopTip) + ' m/min' : 'none') + ').' : 'No tipping when stopped.') });
    // discharge
    if (pos(o.zEnd) && v > 0) { var rng = v * Math.sqrt(2 * o.zEnd / G); checks.push({ id: 'discharge', label: 'Discharge end', status: 'info', range: rng, text: 'Products leave the belt end at ' + mpm(v) + ' m/min. With nothing to receive them they land about ' + (Math.round(rng * 1000)) + ' mm beyond the end (belt surface ' + Math.round(o.zEnd * 1000) + ' mm high).' }); }
    var worst = 'ok'; checks.forEach(function (c) { if (c.status === 'fail') worst = 'fail'; else if (c.status === 'near' && worst !== 'fail') worst = 'near'; });
    // fate used by the animation: first failing event in path order, else infeed tip
    var fate = { kind: 'ok' }, first = null;
    events.forEach(function (e) { if (e.status === 'fail' && (!first || e.sStart < first.sStart)) first = e; });
    if (first) fate = first.type === 'curve' ? { kind: first.mode === 'slide' ? 'curve-slide' : 'curve-tip', ev: first } : { kind: 'incline-slip', ev: first };
    else if (stI === 'fail') fate = { kind: 'infeed-tip' };
    var wobble = null; events.forEach(function (e) { if (e.type === 'curve' && e.status === 'near' && !wobble) wobble = e; });
    return { v: v, W: W, mu: mu, cogH: h, prod: p, checks: checks, events: events, fate: fate, wobble: wobble, worst: worst, vmax: vmax, vmaxWhere: vmaxWhere, length: o.track.length, stopTimeS: T };
  }

  /**
   * Motion of one product `tau` seconds after it was released at the start of the belt.
   * Returns { phase:'belt', s, lat, roll, pitch, pivot } or { phase:'air', sExit, latExit, dir, vLat, vFwd, t, roll0, rollRate }
   * (lat: metres to the left of the centre-line; dir: +1 left, -1 right).
   */
  function motion(pl, tau, k) {
    var v = pl.v, f = pl.fate, W = pl.W, out = { phase: 'belt', s: v * tau, lat: 0, roll: 0, pitch: 0, pivot: null };
    if (f.kind === 'ok') { if (pl.wobble && tau * v > pl.wobble.sStart && tau * v < pl.wobble.sEnd) out.roll = 0.05 * Math.sin(tau * 11 + (k || 0)); return out; }
    if (f.kind === 'infeed-tip') { var tt = 0.35, a = Math.min(1, tau / tt); out.pitch = (Math.PI / 2) * a * a; out.pivot = 'rear'; return out; }
    var e = f.ev, sF = e.sStart, tF = sF / v;
    if (f.kind === 'incline-slip') {
      var th = e.slopeDeg * Math.PI / 180, aRel = Math.max(0.2, G * (Math.sin(th) - pl.mu * Math.cos(th)));
      if (tau <= tF) return out;
      var tt2 = tau - tF, period = 2 * v / aRel, Lin = e.sEnd - e.sStart, tExit = (v - Math.sqrt(Math.max(0, v * v - 2 * aRel * Lin))) / aRel;
      if (v * v >= 2 * aRel * Lin) { if (tt2 >= tExit) { out.s = e.sEnd + v * (tt2 - tExit); return out; } out.s = sF + v * tt2 - 0.5 * aRel * tt2 * tt2; return out; }
      var m = tt2 % period; out.s = sF + v * m - 0.5 * aRel * m * m; out.slipping = true; return out;
    }
    if (tau <= tF) return out;
    var t2 = tau - tF, dir = e.direction === 'right' ? 1 : -1;               // outside of the turn: left turn -> product goes right (-1)
    if (f.kind === 'curve-slide') {
      var aEx = Math.max(0.4, e.aLat - pl.mu * G), tE = Math.sqrt(W / aEx);
      if (t2 < tE) { out.s = sF + v * t2; out.lat = dir * 0.5 * aEx * t2 * t2; out.roll = dir * (-0.04) * Math.min(1, t2 / tE); return out; }
      return { phase: 'air', sExit: sF + v * tE, latExit: W / 2, dir: dir, vLat: aEx * tE, vFwd: v, t: t2 - tE, roll0: 0, rollRate: dir * -3.5 };
    }
    // curve-tip: rotate about the outer bottom edge until it topples over the edge of the belt
    var alpha = (G / Math.max(0.02, pl.cogH)) * Math.max(0.15, e.aLat / (G * pl.prod.across / (2 * pl.cogH)) - 1) + 1.5, rc = 0.95, tc = Math.sqrt(2 * rc / alpha);
    if (t2 < tc) { out.s = sF + v * t2; out.roll = dir * -0.5 * alpha * t2 * t2; out.pivot = 'outer'; out.pivotDir = dir; return out; }
    return { phase: 'air', sExit: sF + v * tc, latExit: pl.prod.across / 2, dir: dir, vLat: alpha * tc * pl.cogH, vFwd: v, t: t2 - tc, roll0: dir * -rc, rollRate: dir * -alpha * tc };
  }

  /** Seconds after release at which a product leaves the belt (falls off the side / over the end); null if it never does. */
  function exitTau(pl) {
    var f = pl.fate, v = pl.v, L = pl.length;
    if (f.kind === 'curve-slide') { var aEx = Math.max(0.4, f.ev.aLat - pl.mu * G); return f.ev.sStart / v + Math.sqrt(pl.W / aEx); }
    if (f.kind === 'curve-tip') { var alpha = (G / Math.max(0.02, pl.cogH)) * Math.max(0.15, f.ev.aLat / (G * pl.prod.across / (2 * pl.cogH)) - 1) + 1.5; return f.ev.sStart / v + Math.sqrt(2 * 0.95 / alpha); }
    if (f.kind === 'incline-slip') { var th = f.ev.slopeDeg * Math.PI / 180, aRel = Math.max(0.2, G * (Math.sin(th) - pl.mu * Math.cos(th))), Lin = f.ev.sEnd - f.ev.sStart; return v * v >= 2 * aRel * Lin ? L / v + 1 : null; }
    return L / v;
  }

  /** What happens to a product on the belt when the belt is stopped over pl.stopTimeS: { slides, extraM, tips } */
  function stopEffect(pl) { var c = pl.checks.filter(function (x) { return x.id === 'stop'; })[0]; return { slides: c.slides, extraM: c.extraSlideM, tips: c.tips }; }

  return { G: G, beltTypeOf: beltTypeOf, muFor: muFor, plan: plan, motion: motion, stopEffect: stopEffect, exitTau: exitTau };
});
