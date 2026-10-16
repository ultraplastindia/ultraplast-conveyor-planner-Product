'use strict';
/* Browser test: product behaviour (falls at high speed / low grip), speed input, Stop belt, colour swatches. Playwright + Chromium. */
var path = require('path'), fs = require('fs');
var pw; try { pw = require('playwright'); } catch (e) { try { pw = require('/home/claude/.npm-global/lib/node_modules/playwright'); } catch (e2) { console.log('SKIPPED: playwright not installed'); process.exit(0); } }
var url = 'file://' + path.resolve(__dirname, '..', 'index.html'), fails = 0;
function check(n, c, extra) { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (c ? '' : '  ' + (extra || ''))); if (!c) fails++; }
(async function () {
  var browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--no-sandbox'] });
  var page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage(), errors = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  await page.goto(url); await page.waitForSelector('#stepBody input');
  function run(spd, mu, t, belt) {
    return page.evaluate(function (a) {
      var C = UCPCalc, P = UCPProducts, raw = { floorLength: '20', floorWidth: '8', layout: 'multi', unitSystem: 'metric', inletHeight: '900', segments: [{ type: 'straight', length: '6' }, { type: 'curve', angle: '90', radius: '1000', direction: 'left' }, { type: 'straight', length: '4' }], prodLength: '100', prodWidth: '80', prodHeight: '250', weight: '0.5', gap: '60', rate: '60', speed: String(a.spd), beltWidth: '300', lanes: '1' };
      var inp = C.normalize(raw), res = C.analyse(inp, P), th = res.throughput; document.querySelectorAll('.v3d-t').forEach(function (e) { e.remove(); });
      var d = document.createElement('div'); d.className = 'v3d-t'; d.style.cssText = 'position:fixed;left:0;top:0;width:1000px;background:#fff;z-index:9'; document.body.appendChild(d);
      var v = UCP3D.create(d, { scene: { floorL: 20, floorW: 8, path: res.path, inletMm: 900, beltWidthM: .3, widthNote: 'entered width', beltRgb: a.belt, prod: { alongMm: 100, acrossMm: 80, heightMm: 250, pitchMm: th.productPitchMm, lanes: 1 }, obstacles: [] }, speedMPerMin: a.spd, pitchMm: th.productPitchMm, lanes: 1, productRgb: [200, 16, 46], behaviour: { mu: a.mu, cogRatio: .5, margin: .8, stopTimeS: .5, basis: 'test' }, autoplay: false });
      v.setTime(a.t); v.render(); window.__v = v; var pl = v.plan(); return { fate: pl.fate.kind, census: v.census(), beltRgb: v.scene.beltRgb, host: !!d.querySelector('canvas') };
    }, { spd: spd, mu: mu, t: t, belt: belt || [63, 143, 85] });
  }
  var slow = await run(20, 0.3, 16), fast = await run(150, 0.3, 9), tip = await run(150, 0.9, 9);
  check('slow belt (20 m/min): products stay on the belt (fate ' + slow.fate + ', fell ' + slow.census.fell + ')', slow.fate === 'ok' && slow.census.fell === 0);
  check('fast belt (150 m/min) at the curve: products slide off and fall (fate ' + fast.fate + ', fell ' + fast.census.fell + ')', fast.fate === 'curve-slide' && fast.census.fell > 0);
  check('high-grip belt at the same speed: products TIP instead of sliding (fate ' + tip.fate + ')', tip.fate === 'curve-tip' && tip.census.fell > 0);
  check('belt colour entered is the colour drawn in the 3D scene', JSON.stringify(slow.beltRgb) === '[63,143,85]');
  var chosen = await run(20, 0.3, 4, [200, 40, 40]); check('a different belt colour changes the scene colour', JSON.stringify(chosen.beltRgb) === '[200,40,40]');
  // speed input in the viewer: raising speed makes products fall; lowering restores
  var r2 = await page.evaluate(function () { var v = window.__v; v.setSpeed(20); v.setTime(16); var ok1 = v.census().fell; v.setSpeed(150); v.setTime(9); var bad = v.census().fell; return { ok1: ok1, bad: bad, fate: v.plan().fate.kind }; });
  check('raising the belt speed in the viewer makes products fall (' + r2.ok1 + ' -> ' + r2.bad + ')', r2.ok1 === 0 && r2.bad > 0);
  // UI controls exist and respond
  var ui = await page.evaluate(function () { var h = document.querySelector('.v3d-t'); return { speed: !!h.querySelector('[data-a=speed]'), stop: !!h.querySelector('[data-a=stop]'), mu: !!h.querySelector('[data-b=mu]'), fell: !!h.querySelector('[data-o=fell]'), vmax: !!h.querySelector('[data-o=vmax]') }; });
  check('viewer has speed box, Stop belt button, friction input, fell counter and safe-speed readout', ui.speed && ui.stop && ui.mu && ui.fell && ui.vmax, JSON.stringify(ui));
  await page.evaluate(function () { var v = window.__v; v.setSpeed(120); }); await page.fill('.v3d-t [data-a=speed]', '30'); await page.keyboard.press('Tab'); await page.waitForTimeout(200);
  check('typing a speed in the viewer applies it', /30\.00 m\/min|30 m\/min/.test(await page.textContent('.v3d-t')));
  var stopOk = await page.evaluate(function () { var h = document.querySelector('.v3d-t'), b = h.querySelector('[data-a=stop]'); if (!b) return false; b.click(); return true; });
  check('Stop belt (test) button can be pressed without errors', stopOk);
  // wizard colour swatches: pick belt colour + product colour and see state follow
  await page.reload(); await page.waitForSelector('#stepBody input');
  async function fillv(vals) { for (var k in vals) { var el = await page.$('#f_' + k); if (el) { var tn = await el.evaluate(function (e) { return e.tagName; }); if (tn === 'SELECT') await el.selectOption(vals[k]); else await el.fill(String(vals[k])); } } }
  await fillv({ projectName: 'Colours', floorLength: '20', floorWidth: '6', industry: 'beverages' }); await page.click('#btnNext');
  await fillv({ handling: 'bottles', prodLength: '100', prodWidth: '100', prodHeight: '250', weight: '500', gap: '50' }); await page.selectOption('[data-name=weightUnit]', 'g');
  var psw = await page.$$('[data-swatch-for="productColor"]'); check('product colour swatches are offered (' + psw.length + ')', psw.length >= 6);
  if (psw.length > 2) { await psw[2].click(); check('clicking a product swatch selects it', await psw[2].evaluate(function (e) { return e.classList.contains('on'); })); }
  await page.click('#btnNext'); await fillv({ rate: '60', speed: '10', hoursPerDay: '16' }); await page.click('#btnNext');
  var bsw = await page.$$('[data-swatch-for="beltColor"]'); check('belt colour swatches are offered (' + bsw.length + ')', bsw.length >= 6);
  if (bsw.length > 2) { await bsw[2].click(); check('clicking a belt swatch selects it', await bsw[2].evaluate(function (e) { return e.classList.contains('on'); })); }
  check('no uncaught JS errors', errors.length === 0, errors.join(' | '));
  await browser.close(); if (fails) { console.log(fails + ' browser check(s) FAILED'); process.exit(1); } console.log('All behaviour browser checks passed');
})().catch(function (e) { console.error(e); process.exit(1); });
