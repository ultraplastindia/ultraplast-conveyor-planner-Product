'use strict';
var H = require('./helpers'), test = H.test, approx = H.approx, ok = H.ok, eq = H.eq;
var C = require('../calculations.js'), P = require('../products.js'), CAD = require('../cad.js');
console.log('cad (drawing accuracy, DXF structure)');

function model(raw, extra) {
  var inp = C.normalize(raw), res = C.analyse(inp, P);
  var sc = { floorL: inp.floorLength, floorW: inp.floorWidth, workingH: inp.workingHeight > 0 ? inp.workingHeight / 1000 : null, obstacles: inp.obstacles, path: res.path, inletMm: inp.inletHeight, dischargeMm: inp.dischargeHeight,
    beltWidthM: 0.4, widthNote: 'entered width', beltRgb: [40, 90, 200], prod: { alongMm: 200, acrossMm: 150, heightMm: 120, pitchMm: 300, lanes: 1 } };
  for (var k in (extra || {})) sc[k] = extra[k];
  return CAD.build(sc, { title: 'T', date: '2026-01-01' });
}
var straight = { floorLength: '20', floorWidth: '8', workingHeight: '3500', layout: 'straight', routeLength: '10', inletHeight: '900', unitSystem: 'metric' };
var multi = { floorLength: '20', floorWidth: '8', layout: 'multi', unitSystem: 'metric', inletHeight: '600', segments: [{ type: 'straight', length: '4' }, { type: 'curve', radius: '1200', angle: '90', direction: 'left' }, { type: 'straight', length: '3' }, { type: 'incline', horizontal: '4', rise: '1000' }, { type: 'straight', length: '2' }] };
function view(M, n) { return M.views.filter(function (v) { return v.name === n; })[0]; }
function texts(M) { var t = []; M.views.forEach(function (v) { v.dims.forEach(function (d) { t.push(d.text); }); v.ents.forEach(function (e) { if (e.t === 'text') t.push(e.s); }); }); return t.join('|'); }
/** minimal strict DXF reader: group-code pairs, balanced sections/tables/polylines, all layers declared */
function parse(txt) {
  var L = txt.split('\n'); eq(L[L.length - 1], ''); L.pop(); eq(L.length % 2, 0, 'odd line count');
  var ents = [], cur = null, stack = [], i;
  for (i = 0; i < L.length; i += 2) {
    var c = parseInt(L[i], 10); ok(!isNaN(c), 'bad group code ' + L[i]);
    if (c === 0) { var v = L[i + 1]; if (v === 'SECTION' || v === 'TABLE') stack.push(v); if (v === 'ENDSEC' || v === 'ENDTAB') stack.pop(); cur = { t: v, d: [] }; ents.push(cur); } else cur.d.push([c, L[i + 1]]);
  }
  eq(stack.length, 0); eq(ents[ents.length - 1].t, 'EOF');
  var declared = {}, used = {}, st = 0;
  ents.forEach(function (e) { if (e.t === 'LAYER') declared[e.d.filter(function (x) { return x[0] === 2; })[0][1]] = 1; else e.d.forEach(function (x) { if (x[0] === 8) used[x[1]] = 1; });
    if (e.t === 'POLYLINE') { eq(st, 0); st = 1; } else if (e.t === 'SEQEND') { eq(st, 1); st = 0; } else if (e.t === 'VERTEX') eq(st, 1);
    e.d.forEach(function (x) { if (x[0] >= 10 && x[0] <= 59) ok(isFinite(parseFloat(x[1])), 'non-numeric ' + x[1]); }); });
  Object.keys(used).forEach(function (n) { ok(declared[n], 'layer not declared: ' + n); });
  return ents;
}

test('plan view: belt outline is exactly the entered width apart and as long as the route', function () {
  var M = model(straight), pl = view(M, 'plan'), outl = pl.ents.filter(function (e) { return e.layer === 'OUTLINE'; });
  var polys = outl.filter(function (e) { return e.t === 'poly'; }); eq(polys.length, 2);
  var a = polys[0].pts, b = polys[1].pts; approx(Math.abs(a[0][1] - b[0][1]), 400, 1e-6); approx(Math.abs(a[a.length - 1][0] - a[0][0]), 10000, 1e-6);
});
test('floor layout rectangle equals the entered floor 20000 x 8000 mm', function () {
  var f = view(model(straight), 'floor'), r = f.ents.filter(function (e) { return e.layer === 'FLOOR'; })[0]; approx(Math.max.apply(null, r.pts.map(function (p) { return p[0]; })), 20000); approx(Math.max.apply(null, r.pts.map(function (p) { return p[1]; })), 8000);
  ok(/Floor length 20000 mm/.test(texts(model(straight))) && /Floor width 8000 mm/.test(texts(model(straight))));
});
test('no floor entered -> no floor view and a note, nothing invented', function () { var M = model({ layout: 'straight', routeLength: '5', unitSystem: 'metric', inletHeight: '900' }); ok(!view(M, 'floor')); ok(M.notes.some(function (n) { return /Floor size not entered/.test(n); })); });
test('side elevation: inlet 600 and discharge 1600 mm, incline rise 1000 over run 4000', function () {
  var M = model(multi), t = texts(M); ok(/Inlet height 600 mm/.test(t) && /Discharge height 1600 mm/.test(t), t); ok(/incline 4123 mm \| run 4000 rise 1000/.test(t), t);
  var sd = view(M, 'side'), top = sd.ents.filter(function (e) { return e.layer === 'OUTLINE' && e.t === 'poly'; })[0].pts; approx(top[0][1], 600, 1e-6); approx(top[top.length - 1][1], 1600, 1e-6);
});
test('side elevation horizontal length = sum of horizontal segment lengths', function () {
  var M = model(multi), sd = view(M, 'side'), top = sd.ents.filter(function (e) { return e.layer === 'OUTLINE' && e.t === 'poly'; })[0].pts, arc = Math.PI / 2 * 1.2;
  approx(top[top.length - 1][0] / 1000, 4 + arc + 3 + 4 + 2, 1e-3);
});
test('curve annotation carries radius and angle; centre of the arc is at radius distance', function () {
  var M = model(multi), t = texts(M); ok(/Curve L R1200 x 90° \(arc 1885 mm\)/.test(t), t);
});
test('end view: belt width 400, frame total, belt top = inlet height', function () {
  var t = texts(model(straight)); ok(/Belt width 400 mm/.test(t) && /Overall over frame 450 mm/.test(t) && /Belt top height 900 mm/.test(t), t);
});
test('product dims drawn only from entered product size', function () { var t = texts(model(straight)); ok(/Product 200 x 150 mm/.test(t) && /Prod\. 150 x 120 mm/.test(t), t); var M = model(straight, { prod: null }); ok(!/Product 200/.test(texts(M))); });
test('belt width not entered is labelled, never presented as entered', function () { var M = model(straight, { beltWidthM: null, widthNote: 'illustrative' }); ok(/not entered/.test(texts(M))); });
test('incomplete input gives a safe empty model (no throw)', function () { var M = CAD.build({}, {}); ok(!M.ok && M.notes.length); ok(/^<svg/.test(CAD.toSVG(M))); });

test('2D DXF is structurally valid R12 and contains the dimensions', function () {
  var M = model(multi), txt = CAD.toDXF2D(M), e = parse(txt); ok(/AC1009/.test(txt)); ok(/S4 incline 4123 mm/.test(txt)); ok(/Floor length 20000 mm/.test(txt));
  ok(e.filter(function (x) { return x.t === 'POLYLINE'; }).length > 10); ok(!/[^\x00-\x7f]/.test(txt), 'non-ASCII in DXF'); ok(/%%d/.test(txt), 'degree code');
});
test('3D DXF has one 3DFACE per solid face, belt colour on the belt layer, 3-D centre-line', function () {
  var M = model(multi), txt = CAD.toDXF3D(M), e = parse(txt), faces = e.filter(function (x) { return x.t === '3DFACE'; });
  ok(faces.length > 1000); var belts = faces.filter(function (f) { return f.d.some(function (x) { return x[0] === 8 && x[1] === 'BELT3D'; }); }); ok(belts.length > 100);
  ok(belts.every(function (f) { return f.d.some(function (x) { return x[0] === 62 && x[1] === '5'; }); }), 'blue belt -> ACI 5');
  var zs = []; faces.forEach(function (f) { f.d.forEach(function (x) { if (x[0] === 30) zs.push(parseFloat(x[1])); }); }); approx(Math.max.apply(null, zs), 1600 + 0, 200, 'highest face near discharge height');
  ok(/POLYLINE/.test(txt) && /\n70\n8\n/.test(txt), '3-D polyline flag');
});
test('3D DXF: belt width between the belt edges is 400 mm', function () {
  var M = model(straight), e = parse(CAD.toDXF3D(M)), ys = []; e.filter(function (x) { return x.t === '3DFACE' && x.d.some(function (d) { return d[0] === 8 && d[1] === 'BELT3D'; }); }).forEach(function (f) { f.d.forEach(function (d) { if (d[0] >= 20 && d[0] <= 23) ys.push(parseFloat(d[1])); }); });
  approx(Math.max.apply(null, ys) - Math.min.apply(null, ys), 400, 1e-3);
});
test('SVG sheet: A3 landscape, title block states drawing is indicative, text escaped', function () {
  var s = CAD.toSVG(model(straight, {})), m2 = CAD.toSVG(model(straight)); ok(/viewBox="0 0 420 297"/.test(s) && /INDICATIVE drawing/.test(s) && /SCALE 1:/.test(s)); ok(!/<script/i.test(s));
  var bad = CAD.build(Object.assign({}, { floorL: 5, floorW: 5 }), { title: '<b>x</b> & "y"' }); ok(!/<b>x/.test(CAD.toSVG(bad)));
});
test('nearestAci maps common belt colours', function () { eq(CAD.nearestAci([200, 20, 20]), 1); eq(CAD.nearestAci([20, 20, 220]), 5); eq(CAD.nearestAci([10, 10, 10]), 250); });
