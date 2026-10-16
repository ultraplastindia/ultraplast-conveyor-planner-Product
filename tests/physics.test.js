'use strict';
var H = require('./helpers'), test = H.test, approx = H.approx, ok = H.ok, eq = H.eq, PH = require('../physics.js'), P = require('../products.js'), C = require('../calculations.js'), SIM = require('../simulation.js');
console.log('physics (product behaviour)');
function mk(raw, v, over) {
  var inp = C.normalize(raw), res = C.analyse(inp, P), tr = SIM.buildTrack(res.path.points.map(function (p) { return { x: p.x, y: p.y, z: p.z }; })), o = { v: v / 60, track: tr, details: res.path.details, W: 0.3, zEnd: 0.9, prod: { along: 0.1, across: 0.08, height: 0.25, lanes: 1 }, mu: 0.3, cogRatio: 0.5, margin: 0.8, stopTimeS: 0.5 };
  for (var k in (over || {})) o[k] = over[k]; return { o: o, pl: PH.plan(o), res: res };
}
var L = { floorLength: '20', floorWidth: '6', layout: 'multi', unitSystem: 'metric', inletHeight: '900', segments: [{ type: 'straight', length: '3' }, { type: 'curve', angle: '90', radius: '1000', direction: 'left' }, { type: 'straight', length: '3' }] };
test('curve limits follow sqrt(mu g R) and sqrt(g R across/(2 hcog))', function () {
  var m = mk(L, 10), c = m.pl.checks.filter(function (x) { return x.id === 'curve1'; })[0], vs = Math.sqrt(0.3 * 9.81 * 1.0), vt = Math.sqrt(9.81 * 1.0 * 0.08 / (2 * 0.125));
  approx(c.vcrit, Math.min(vs, vt), 1e-9); eq(c.mode, vs <= vt ? 'slide' : 'tip');
});
test('slow belt is OK, fast belt FAILS on the curve (speed makes products fall)', function () {
  eq(mk(L, 30).pl.checks.filter(function (x) { return x.id === 'curve1'; })[0].status, 'ok');
  eq(mk(L, 300).pl.checks.filter(function (x) { return x.id === 'curve1'; })[0].status, 'fail'); eq(mk(L, 300).pl.fate.kind === 'curve-slide' || mk(L, 300).pl.fate.kind === 'curve-tip', true);
});
test('near-limit speed is flagged "near" (0.8 x critical)', function () { var vc = mk(L, 10).pl.vmax * 60; eq(mk(L, vc * 0.9).pl.checks.filter(function (x) { return x.id === 'curve1'; })[0].status, 'near'); });
test('higher friction makes a tall narrow product TIP instead of slide; low friction makes it slide', function () {
  eq(mk(L, 10, { mu: 0.9 }).pl.events[0].mode, 'tip'); eq(mk(L, 10, { mu: 0.1 }).pl.events[0].mode, 'slide');
});
test('tighter curve lowers the safe speed', function () { var a = JSON.parse(JSON.stringify(L)); a.segments[1].radius = '400'; ok(mk(a, 10).pl.vmax < mk(L, 10).pl.vmax); });
test('lanes: the inner lane (smaller radius) governs', function () { ok(mk(L, 10, { prod: { along: 0.1, across: 0.08, height: 0.25, lanes: 3 } }).pl.vmax < mk(L, 10).pl.vmax); });
test('incline slips when tan(slope) > mu, independent of speed', function () {
  var I = { floorLength: '20', floorWidth: '6', layout: 'multi', unitSystem: 'metric', inletHeight: '600', segments: [{ type: 'straight', length: '2' }, { type: 'incline', horizontal: '2', rise: '1000' }] }; // 26.6 deg, tan 0.5
  eq(mk(I, 5, { mu: 0.3 }).pl.checks.filter(function (x) { return /incline/.test(x.id); })[0].status, 'fail'); eq(mk(I, 50, { mu: 0.3 }).pl.fate.kind, 'incline-slip');
  eq(mk(I, 5, { mu: 0.7 }).pl.checks.filter(function (x) { return /incline/.test(x.id); })[0].status, 'ok');
});
test('infeed tip when mu > along/(2 hcog)', function () { eq(mk(L, 10, { mu: 0.9, prod: { along: 0.05, across: 0.2, height: 0.3, lanes: 1 } }).pl.checks.filter(function (x) { return x.id === 'infeed'; })[0].status, 'fail'); });
test('stopping: a fast belt stopped quickly slides products; very fast tips them', function () {
  var slow = mk({ floorLength: '20', floorWidth: '6', layout: 'straight', routeLength: '5', unitSystem: 'metric', inletHeight: '900' }, 5), fast = mk({ floorLength: '20', floorWidth: '6', layout: 'straight', routeLength: '5', unitSystem: 'metric', inletHeight: '900' }, 120);
  var s1 = slow.pl.checks.filter(function (x) { return x.id === 'stop'; })[0], s2 = fast.pl.checks.filter(function (x) { return x.id === 'stop'; })[0];
  eq(s1.slides, false); eq(s2.slides, true); ok(s2.extraSlideM > 0);
});
test('discharge range = v sqrt(2 z / g)', function () { var d = mk(L, 30).pl.checks.filter(function (x) { return x.id === 'discharge'; })[0]; approx(d.range, 0.5 * Math.sqrt(2 * 0.9 / 9.81), 1e-9); });
test('wet / oily reduce friction; entered value overrides; belt type mapping', function () {
  var B = P.behaviour; eq(PH.muFor(B, 'pp', ['dry']).mu, 0.3); approx(PH.muFor(B, 'pp', ['wet']).mu, 0.18); approx(PH.muFor(B, 'pp', ['oily']).mu, 0.12); eq(PH.muFor(B, 'pp', [], 0.77).mu, 0.77);
  eq(PH.beltTypeOf({ material: 'pu_pvc' }, 'x'), 'pu'); eq(PH.beltTypeOf({ material: 'unknown' }, 'thermoplastic_slat'), 'slat'); eq(PH.beltTypeOf({}, 'powered_roller'), 'other');
});
test('motion: ok product moves at belt speed; curve-failing product leaves the belt and goes airborne', function () {
  var ok1 = mk(L, 20).pl; approx(PH.motion(ok1, 3, 0).s, 1.0, 1e-9);
  var f = mk(L, 300).pl, m0 = PH.motion(f, 0.5 * (3 / (300 / 60)), 0); eq(m0.phase, 'belt'); var late = PH.motion(f, 3 / (300 / 60) + 5, 0); eq(late.phase, 'air'); ok(late.t > 0 && late.sExit >= 3);
});
test('motion: incline slip-back keeps the product near the foot of the incline (never reaches the top)', function () {
  var I = { floorLength: '20', floorWidth: '6', layout: 'multi', unitSystem: 'metric', inletHeight: '600', segments: [{ type: 'straight', length: '2' }, { type: 'incline', horizontal: '2', rise: '1000' }, { type: 'straight', length: '2' }] };
  var m = mk(I, 6, { mu: 0.1 }), e = m.pl.fate.ev; for (var t = 0; t < 60; t += 0.37) { var mo = PH.motion(m.pl, t, 0); ok(mo.s <= e.sEnd + 1e-6 || t < 0, 'never past top'); ok(mo.s >= 0); }
});
test('curve-tip motion rotates to ~ 0.95 rad then goes airborne', function () { var f = mk(L, 300, { mu: 0.9 }).pl; eq(f.fate.kind, 'curve-tip'); var tF = 3 / 5, a = PH.motion(f, tF + 0.05, 0); ok(Math.abs(a.roll) > 0 && a.pivot === 'outer'); eq(PH.motion(f, tF + 5, 0).phase, 'air'); });
process.exit(H.summary() ? 1 : 0);
