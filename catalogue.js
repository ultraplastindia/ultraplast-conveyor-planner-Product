/*
 * catalogue.js - Ultraplast PRODUCT RANGE catalogue data (belts, chains, sprockets, idlers, wearstrips, corner tracks,
 * rollers, brackets, clamps, legs, supports, handles) transcribed from the company's catalogue (46 pages).
 * Every number here is as printed in the catalogue (page given in `page`). Nothing is added or estimated.
 * Used by catalogue.html (browse / recommend), the results-page "Catalogue parts" card and bom.html.
 * Matching rules (which sprocket fits which chain) are exactly the "Application" lines printed in the catalogue.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.UCPCatalogue = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var SOURCE = 'Ultraplast Product Range catalogue (Modular Belts, Slat Chains, Conveyor Components)';
  function W(part, inch, mm) { return { part: part, inch: inch, mm: mm }; }

  /* ---------------------------------------------------------------- plastic modular belts (pp. 4-8) */
  var belts = [
    { id: 'umb25', name: 'UMB 25', group: 'Straight running belt', page: 5, pitchMm: 25, drive: 'Hinge driven',
      use: 'General purpose light duty belt: straight line and inclined conveying, washing, drying and drainage.',
      tops: ['CT (closed top)', '18OA (perforated)'], materials: [{ m: 'PP', tMin: 1, tMax: 105, tensileKg: 600 }, { m: 'HDPE', tMin: -40, tMax: 80, tensileKg: 500 }, { m: 'Acetal', tMin: -25, tMax: 95, tensileKg: 1000 }],
      pinMm: '5 mm nylon / acetal', widthMm: [150, 1500], flightsMm: [5, 10, 15, 25, 50, 75], sidewallsMm: [50, 75],
      sprockets: [{ teeth: 12, od: 96, bore: '25 round or 40x40 SQ' }, { teeth: 16, od: 130, bore: '25 round or 40x40 SQ' }, { teeth: 20, od: 162, bore: '25 round or 40x40 SQ' }] },
    { id: 'umb50', name: 'UMB 50', group: 'Straight running belt', page: 6, pitchMm: 50, drive: 'Centre driven',
      use: 'General purpose heavy duty belt: straight and inclined conveying, washing lines, warmers and cooling tunnels.',
      tops: ['CT - normal conveying', 'RR - warmers and coolers', '22OA - washing and drainage', '18OA - fine mesh for small articles'],
      materials: [{ m: 'PP', tMin: 1, tMax: 105, tensileKg: 900 }, { m: 'HDPE', tMin: -40, tMax: 80, tensileKg: 700 }, { m: 'Acetal', tMin: -25, tMax: 95, tensileKg: 1400 }],
      pinMm: '8 mm nylon / acetal', widthMm: [150, 2500], flightsMm: [25, 38, 50, 75, 100], sidewallsMm: [75, 100],
      sprockets: [{ teeth: 8, od: 130, bore: '25 round or 40x40 SQ' }, { teeth: 10, od: 162, bore: '40x40 or 65x65 SQ' }, { teeth: 12, od: 196, bore: '40x40 or 65x65 SQ' }] },
    { id: 'umb50hd', name: 'UMB 50HD', group: 'Straight running belt', page: 7, pitchMm: 50, drive: 'Hinge + centre driven',
      use: 'Heavy duty, impact resistant belt: food and vegetable processing, meat / fish / poultry, crates, cartons, jars, packaging machines, inspection tables and accumulators.',
      tops: ['CT (closed top)', '150A (perforated)'], materials: [{ m: 'PP', tMin: 1, tMax: 105, tensileKg: 1200 }, { m: 'HDPE', tMin: -40, tMax: 80, tensileKg: 1000 }, { m: 'Acetal', tMin: -25, tMax: 95, tensileKg: 1800 }],
      pinMm: '8 mm nylon / acetal', widthMm: [150, 2500], flightsMm: [25, 50, 75, 100], sidewallsMm: [75, 100],
      sprockets: [{ teeth: 8, od: 130, bore: '25 round or 40x40 SQ' }, { teeth: 10, od: 162, bore: '40x40 or 65x65 SQ' }, { teeth: 12, od: 196, bore: '40x40 or 65x65 SQ' }] },
    { id: 'usf25', name: 'USF 25', group: 'Side flex belt', page: 8, pitchMm: 25, drive: null,
      use: 'Side flex modular belt that bends in all directions; straight and curved sections in one conveyor.',
      tops: [], materials: [{ m: 'Acetal', tMin: -25, tMax: 95, tensileKg: 400 }, { m: 'PP', tMin: 1, tMax: 105, tensileKg: 250 }],
      pinMm: '5 mm nylon / acetal', widthMm: [100, 600], turnFactor: 2.2, turnRef: 'innermost',
      sprockets: [{ teeth: 12, od: 97, bore: '25 round or 40x40 SQ' }, { teeth: 16, od: 130, bore: '25 round or 40x40 SQ' }, { teeth: 20, od: 160, bore: '40x40 or 65x65 SQ' }] },
    { id: 'usf50', name: 'USF 50', group: 'Side flex belt', page: 8, pitchMm: 50, drive: null,
      use: 'Side flex modular belt that bends in all directions; straight and curved sections in one conveyor.',
      tops: [], materials: [{ m: 'Acetal', tMin: -25, tMax: 95, tensileKg: 600 }, { m: 'PP', tMin: 1, tMax: 105, tensileKg: 300 }],
      pinMm: '6 mm SS 304', widthMm: [100, 900], turnFactor: 2.6, turnRef: 'innermost',
      sprockets: [{ teeth: 8, od: 130, bore: '25 round or 40x40 SQ' }, { teeth: 10, od: 161, bore: '40x40 or 65x65 SQ' }, { teeth: 12, od: 196, bore: '40x40 or 65x65 SQ' }] }
  ];

  /* ---------------------------------------------------------------- slat chains (pp. 9-14, 21) */
  var chains = [
    { id: 'ulf820', series: '820', name: 'Thermoplastic single hinge', family: 'Thermoplastic slat chain', type: 'straight', page: 10, pitchMm: 38.1, plateMm: 4, minRadiusMm: null, material: 'Links: low friction polyacetal; pins SS 304',
      widths: [W('ULF 820-K325', '3.25"', 82.5), W('ULF 820-K450', '4.50"', 114.3), W('ULF 820-K600', '6.00"', 152.4), W('ULF 820-K750', '7.50"', 190.5)] },
    { id: 'ulf821', series: '821', name: 'Thermoplastic double hinge', family: 'Thermoplastic slat chain', type: 'straight', page: 10, pitchMm: 38.1, plateMm: 4.8, minRadiusMm: null, material: 'Links: low friction polyacetal; pins SS 304',
      widths: [W('ULF 821-K750', '7.50"', 190.5), W('ULF 821-K1000', '10.00"', 254.0), W('ULF 821-K1200', '12.00"', 304.8)] },
    { id: 'ulf880t', series: '880T', name: 'Thermoplastic tab flex', family: 'Thermoplastic slat chain', type: 'sideflex', page: 11, pitchMm: 38.1, plateMm: 4, minRadiusMm: 500, material: 'Links: low friction polyacetal; pins SS 304',
      widths: [W('ULF 880T-K325', '3.25"', 82.5), W('ULF 880T-K450', '4.50"', 114.3)] },
    { id: 'ulf880m', series: '880M', name: 'Thermoplastic magnet flex', family: 'Thermoplastic slat chain', type: 'sideflex', page: 11, pitchMm: 38.1, plateMm: 4, minRadiusMm: 500, material: 'Links: low friction polyacetal; pins SS 304',
      widths: [W('ULF 880M-K325', '3.25"', 82.5)] },
    { id: 'ulf1702', series: '1702', name: 'Multiflex polyacetal chain (cartons and crates)', family: 'Thermoplastic slat chain', type: 'sideflex', page: 21, pitchMm: 50, plateMm: null, minRadiusMm: 150, material: 'Low friction polyacetal; pins SS 304',
      widths: [W('ULF 1702', '', 53.2)] },
    { id: 'uss812', series: '812', name: 'Stainless steel single hinge', family: 'Stainless steel slat chain', type: 'straight', page: 13, pitchMm: 38.1, plateMm: 3, minRadiusMm: null, material: 'Wear resistant stainless steel (links and pins)',
      widths: [W('USS 812-K325', '3.25"', 82.5), W('USS 812-K450', '4.50"', 114.3), W('USS 812-K600', '6.00"', 152.4), W('USS 812-K750', '7.50"', 190.5)] },
    { id: 'uss802', series: '802', name: 'Stainless steel double hinge', family: 'Stainless steel slat chain', type: 'straight', page: 13, pitchMm: 38.1, plateMm: 3, minRadiusMm: null, material: 'Wear resistant stainless steel (links and pins)',
      widths: [W('USS 802-K750', '7.50"', 190.5)] },
    { id: 'uss8811t', series: '8811T', name: 'Stainless steel tab flex', family: 'Stainless steel slat chain', type: 'sideflex', page: 14, pitchMm: 38.1, plateMm: 3, minRadiusMm: 500, material: 'Wear resistant stainless steel (links and pins)',
      widths: [W('USS 8811T-K325', '3.25"', 82.5), W('USS 8811T-K450', '4.50"', 114.3), W('USS 8811T-K750', '7.50"', 190.5)] },
    { id: 'uss881m', series: '881M', name: 'Stainless steel magnet flex', family: 'Stainless steel slat chain', type: 'sideflex', page: 14, pitchMm: 38.1, plateMm: 3, minRadiusMm: 500, material: 'Wear resistant stainless steel (links and pins)',
      widths: [W('USS 881M-K325', '3.25"', 82.5), W('USS 881M-K450', '4.50"', 114.3), W('USS 881M-K750', '7.50"', 190.5)] }
  ];
  var CHAIN_NOTE = 'Standard packing: 10 feet (3.048 m). Rubber top and double hinge stainless chains are mentioned for inclines / extra load; no part data is printed for rubber top.';

  /* ---------------------------------------------------------------- sprockets and idlers (pp. 16-25) */
  var TEETH = { 8: [132, 130], 10: [122.5, 123.3], 11: [135.0, 135.5], 12: [147.0, 147.3], 19: [117.0, 117.3], 21: [129.2, 130.0], 25: [153.2, 154.2] };
  function sprocketSet(code, chainSeries, teeth, hasMoulded, hasMachined, page, note) {
    var rows = [];
    teeth.forEach(function (n) {
      var t = TEETH[n];
      if (hasMoulded) rows.push({ part: 'URZ ' + n + '-' + code, teeth: n, odMm: t[0], pdMm: t[1], boreMm: '25-40', make: 'Moulded - glass fibre reinforced polyamide' });
      if (hasMachined) rows.push({ part: 'UMZ ' + n + '-' + code, teeth: n, odMm: t[0], pdMm: t[1], boreMm: '25-50', make: 'Machined - cast polyamide / UHMWPE' });
    });
    return { code: code, chainSeries: chainSeries, page: page, rows: rows, hardware: 'SS 304', note: note || '' };
  }
  var sprockets = [
    sprocketSet('812/881M', ['812', '815', '881M'], [19, 21, 25], true, true, 16),
    sprocketSet('802', ['802'], [21, 25], false, true, 17),
    sprocketSet('8811T', ['8811T'], [19, 21, 25], true, true, 17),
    sprocketSet('820', ['820'], [19, 21, 25], true, true, 18),
    sprocketSet('821', ['821'], [21, 25], false, true, 19),
    sprocketSet('880T/M', ['880T', '880M'], [10, 11, 12], true, true, 20)
  ];
  /* Multiflex sprockets have their own dimensions (catalogue p.21) */
  sprockets.push({ code: '1702', chainSeries: ['1702'], page: 21, hardware: '', note: 'Polyamide / UHMWPE', rows: [
    { part: 'UMZ 8-1702', teeth: 8, odMm: 132, pdMm: 130, boreMm: '25-50', make: 'Machined' }, { part: 'UMZ 10-1702', teeth: 10, odMm: 165, pdMm: 162, boreMm: '25-50', make: 'Machined' }, { part: 'UMZ 12-1702', teeth: 12, odMm: 196, pdMm: 192, boreMm: '25-50', make: 'Machined' }] });

  function idlerSet(code, chainSeries, teeth, bore, page) {
    var ODS = { 10: 122.5, 11: 135, 12: 147, 19: 117, 21: 130, 25: 154 };
    return { code: code, chainSeries: chainSeries, page: page, material: 'Polyamide (moulded) / UHMWPE (machined)', rows: teeth.map(function (n) { return { part: 'UWZ ' + n + '-' + code, teeth: n, odMm: ODS[n], boreMm: bore }; }) };
  }
  var idlers = [
    idlerSet('812', ['812', '815'], [19, 21, 25], '25-40', 22), idlerSet('802', ['802'], [21, 25], '25-50', 22),
    idlerSet('8811T', ['8811T'], [19, 21, 25], '25-40', 23), idlerSet('881M', ['881M'], [19, 21, 25], '25-40', 23),
    idlerSet('820', ['820'], [19, 21, 25], '25-40', 24), idlerSet('821', ['821'], [21, 25], '25-50', 24),
    idlerSet('880T', ['880T'], [10, 11, 12], '25-40', 25), idlerSet('880M', ['880M'], [19, 21, 25], '25-40', 25)
  ];

  /* ---------------------------------------------------------------- wearstrips and guides (pp. 26-27) */
  var wearstrips = { page: 27, material: 'UHMWPE (ultra high molecular weight polyethylene): low friction wear surface; standard shapes ex-stock, other sizes to order.',
    profiles: ['UZ-2003', 'UZ-2304', 'UL-2003', 'UW1-4003', 'UW4-41363', 'UW7-45414', 'UC1-41314', 'UC2-45413', 'UC4-60513', 'UC7-50413', 'UC8-50428', 'UD6-80406', 'USD-2016', 'UI-20114', 'UI-30115', 'UK-4520', 'UNG-3212', 'USD-87606', 'UB1-2003', 'UB1-2503', 'UB1-4003', 'UB2-2003', 'UB2-2503'] };

  /* ---------------------------------------------------------------- corner tracks (pp. 28-31) */
  var cornerTracks = {
    tab: { page: 29, name: 'Corner tracks - tab type', chainWidthMm: 82.5, trackPitchMm: 85, angleDeg: 90, straightMm: 100, hMm: 25, material: 'UHMWPE',
      rows: [[500, [100, 190, 280, 370], 'UCT325500'], [650, [100, 190, 280, 370], 'UCT325650'], [1000, [100, 190, 280, 370], 'UCT3251000']].reduce(function (a, g) {
        g[1].forEach(function (A, i) { a.push({ part: g[2].replace(/(\d+)$/, '$1') + '0' + (i + 1), crMm: g[0], tracks: i + 1, aMm: A, hMm: 25 }); }); return a; }, []) },
    magnetic: { page: 31, name: 'Corner tracks - magnetic', chainWidthMm: 82.5, trackPitchMm: 85, angleDeg: 90, straightMm: 100, material: 'UHMWPE; magnet flex chain can be lifted straight out of the top groove (quicker maintenance, less downtime)',
      rows: [{ part: 'UMT3255001', crMm: [500], tracks: 1, widthMm: 110, h: '27 + 55' }, { part: 'UMT3255002', crMm: [500, 585], tracks: 2, widthMm: 196, h: '25 + 63' },
             { part: 'UMT3255003', crMm: [500, 585, 670], tracks: 3, widthMm: 280, h: '25 + 63' }, { part: 'UMT3255004', crMm: [500, 585, 670, 755], tracks: 4, widthMm: 365, h: '25 + 63' }] }
  };
  /* part numbers exactly as printed: UCT3255001..4 (R500), UCT3256501..4 (R650), UCT32510001..4 (R1000) */
  cornerTracks.tab.rows = [];
  [[500, 'UCT32550'], [650, 'UCT32565'], [1000, 'UCT325100']].forEach(function (g) { [100, 190, 280, 370].forEach(function (A, i) { cornerTracks.tab.rows.push({ part: g[1] + '0' + (i + 1), crMm: g[0], tracks: i + 1, aMm: A, hMm: 25 }); }); });

  /* ---------------------------------------------------------------- other components (pp. 32-45) */
  var components = [
    { id: 'return_rollers', name: 'Return rollers', page: 33, material: 'Polyamide (moulded) / UHMWPE (machined)', items: [
      { part: 'URR-5127', note: 'Inside dia 20.5 mm; dia 42.5 / 51 (flange); length 27.5 mm' }, { part: '5051', note: 'Inside dia 20.5 mm; dia 50; length 51 mm (printed as "5051")' },
      { part: 'URR-6043', note: 'Inside dia 16.5 mm; dia 60 (flange); length 43 mm' }, { part: 'URR-6083', note: 'Inside dia 20.5 mm; dia 60; length 83 mm' }, { part: 'URR-60114', note: 'Inside dia 20.5 mm; dia 60; length 114 mm' }] },
    { id: 'side_brackets', name: 'Side brackets', page: 35, material: 'Reinforced polyamide (moulded)', items: [
      { part: 'USB-KB 240', note: 'Overall height 244 mm' }, { part: 'USB-ST 250', note: 'Overall height 254 mm' }, { part: 'USB-AB 210', note: 'Overall height 212 mm' }] },
    { id: 'guide_rail_clamps', name: 'Guide rail clamps', page: 37, material: 'Reinforced polyamide (moulded)', items: [
      { part: 'USRC-5835', note: 'Guide rail clamp for single rod (dia 10, 12 mm)' }, { part: 'UDRC-9160', note: 'Guide rail clamp for double rods (dia 12 mm)' },
      { part: 'UDRC-6560', note: 'Guide rail clamp for double rods (dia 10 mm)' }, { part: 'USRC-9764', note: 'Side rail guide clamp for profile' }] },
    { id: 'connecting_clamps', name: 'Connecting clamps', page: 39, material: 'Reinforced polyamide (moulded); hardware SS 304', items: [
      { part: 'UTC-5630', note: 'T-clamp for rod dia 12 mm' }, { part: 'UCC-5220', note: 'Cross clamp for rod dia 12 mm' }, { part: 'USC-5830', note: 'Sensor clamp for rod dia 12 mm' }] },
    { id: 'tripod_bipod_legs', name: 'Tripod, bipod and leg pads', page: 41, material: 'Base: reinforced polyamide (moulded); stud: SS 304 / electroplated MS', items: [
      { part: 'USBT-348', note: 'Tripod support base, bore 48.5 mm round' }, { part: 'USBB-248', note: 'Bipod support base, bore 48.5 mm round, cross beam dia 42 mm' },
      { part: 'UALP-1275', note: 'Adjustable leg pad: base dia 75 mm, stud M12, length 100 mm' }, { part: 'UALP-16100', note: 'Adjustable leg pad: base dia 100 mm, stud M16, length 100 mm' }, { part: 'UALP-16125', note: 'Adjustable leg pad: base dia 125 mm, stud M16, length 100 mm' }] },
    { id: 'frame_support', name: 'Frame support components', page: 43, material: 'Reinforced polyamide (moulded); hardware SS 304', items: [
      { part: 'UMB-5664', note: 'Side mounting bracket, bore 48.5 mm' }, { part: 'USH-9595', note: 'Support head, bore 48.5 mm' }, { part: 'UCJ-1284', note: 'Connecting joint, bore 48.5 mm, cross beam dia 42 mm' }] },
    { id: 'handles_hinges', name: 'Handles and hinges', page: 45, material: 'Reinforced polyamide (moulded); hardware SS 304', items: [
      { part: 'UH-1190', note: 'Handle: total length 110 mm, centre distance 90 mm' }, { part: 'UH-1412', note: 'Handle: total length 140 mm, centre distance 120 mm' },
      { part: 'UH-1715', note: 'Handle: total length 170 mm, centre distance 150 mm' }, { part: 'UH-5070', note: 'Hinge 70 x 50 mm' }] }
  ];


  /* ---------------------------------------------------------------- catalogue photographs (cropped from the printed catalogue pages) */
  var IMGDIR = 'assets/catalogue/';
  var IMG = {
    belts: { umb25: ['umb25'], umb50: ['umb50'], umb50hd: ['umb50hd'], usf25: ['usf'], usf50: ['usf'] },
    chains: { ulf820: ['ulf820'], ulf821: ['ulf821'], ulf880t: ['ulf880t'], ulf880m: ['ulf880m'], ulf1702: ['ulf1702'], uss812: ['uss812'], uss802: ['uss802'], uss8811t: ['uss8811t'], uss881m: ['uss881m'] },
    sprockets: { '812/881M': ['spr-812', 'spr-812m'], '802': ['spr-802'], '8811T': ['spr-8811t'], '820': ['spr-820'], '821': ['spr-821'], '880T/M': ['spr-880'], '1702': ['spr-1702'] },
    idlers: { '812': ['idl-812'], '802': ['idl-802'], '8811T': ['idl-8811t'], '881M': ['idl-881m'], '820': ['idl-820'], '821': ['idl-821'], '880T': ['idl-880t'], '880M': ['idl-881m'] },
    components: { return_rollers: ['rollers'], side_brackets: ['brackets'], guide_rail_clamps: ['clamps-rail'], connecting_clamps: [], tripod_bipod_legs: ['tripod', 'bipod', 'legpad'], frame_support: ['frame'], handles_hinges: ['handles', 'hinge', 'handle'] },
    families: { 'Thermoplastic slat chain': ['tp-hero'], 'Stainless steel slat chain': ['ss-hero'] }
  };
  function path(n) { return IMGDIR + n + '.jpg'; }
  belts.forEach(function (b) { b.images = (IMG.belts[b.id] || []).map(path); });
  chains.forEach(function (c) { c.images = (IMG.chains[c.id] || []).map(path); });
  sprockets.forEach(function (s) { s.images = (IMG.sprockets[s.code] || []).map(path); });
  idlers.forEach(function (s) { s.images = (IMG.idlers[s.code] || []).map(path); });
  components.forEach(function (g) { g.images = (IMG.components[g.id] || []).map(path); });
  wearstrips.images = [path('wear-hero')]; wearstrips.profileSheet = path('wear-profiles');
  cornerTracks.tab.images = [path('ct-tab'), path('tp-corner-tab')]; cornerTracks.magnetic.images = [path('ct-mag'), path('tp-corner-mag')];
  var familyImages = {}; Object.keys(IMG.families).forEach(function (k) { familyImages[k] = IMG.families[k].map(path); });

  var company = { name: 'Ultraplast Chainbelts Pvt. Ltd.', address: 'Plot No. 627, Sector-69, IMT Faridabad - 121004, Haryana', tel: '+91 129 4010031', mobile: ['9810060473', '9205246473'], emails: ['info@ultraplastindia.in', 'sales@ultraplastindia.in'], web: 'www.ultraplastindia.in' };

  /* ================================================================ helpers */
  function chainById(id) { return chains.filter(function (c) { return c.id === id; })[0] || null; }
  function beltById(id) { return belts.filter(function (b) { return b.id === id; })[0] || null; }
  function forSeries(list, series) { return list.filter(function (s) { return s.chainSeries.indexOf(series) >= 0; }); }
  function nearestWidth(chain, needMm) {
    var ok = chain.widths.filter(function (w) { return w.mm >= needMm; }).sort(function (a, b) { return a.mm - b.mm; });
    return ok[0] || null;
  }
  /* materials usable at a temperature (deg C); null temperature = room conditions, all listed */
  function materialsFor(belt, tempC) {
    if (tempC === null || tempC === undefined || isNaN(tempC)) return belt.materials.slice();
    return belt.materials.filter(function (m) { return tempC >= m.tMin && tempC <= m.tMax; });
  }
  /* centre-line radius needed by a side-flex belt: catalogue gives the INNERMOST turning radius = factor x belt width */
  function sideFlexBeltCentreRadiusMm(belt, widthMm) { return belt.turnFactor * widthMm + widthMm / 2; }
  function cornerTracksFor(radiusMm, lanes, magnetic) {
    var ct = magnetic ? cornerTracks.magnetic : cornerTracks.tab, out = [];
    ct.rows.forEach(function (r) {
      var crs = [].concat(r.crMm);
      if (r.tracks === lanes && (magnetic ? crs.indexOf(radiusMm) >= 0 || crs[0] === radiusMm : r.crMm === radiusMm)) out.push(r);
    });
    return out;
  }

  /*
   * recommend(ctx): ctx = { kind: 'belt'|'chain'|..., categoryId, handling, material, conditions:[], tempC, envelopeWidthMm,
   *   beltWidthMm, lanes, curves:[{radiusMm, angleDeg}], hasIncline, industry }
   * Returns { primary: [{type, id, title, why, page}], parts: [{group, part, desc, qty, qtyBasis, page}], notes: [] }
   * Only facts printed in the catalogue are used for the "why" text. Quantities are given only where the catalogue makes them certain
   * (corner tracks: one set per matching 90-degree curve). Everything else: qty null = "engineering to confirm".
   */
  function recommend(ctx) {
    ctx = ctx || {};
    var res = { primary: [], parts: [], notes: [] }, cat = ctx.categoryId || '', h = ctx.handling || '';
    var wet = (ctx.conditions || []).indexOf('wet') >= 0 || (ctx.conditions || []).indexOf('oily') >= 0;
    var need = ctx.envelopeWidthMm || null;
    var curves = ctx.curves || [], hasCurve = curves.length > 0, lanes = Math.max(1, Math.min(4, ctx.lanes || 1));
    var selChains = [], selBelts = [];
    function addChain(id, why) { var c = chainById(id); if (c) { selChains.push(c); res.primary.push({ type: 'chain', id: id, title: c.family + ' - ' + c.name + ' (series ' + c.series + ')', why: why, page: c.page, image: (c.images || [])[0] || null }); } }
    function addBelt(id, why) { var b = beltById(id); if (b) { selBelts.push(b); res.primary.push({ type: 'belt', id: id, title: b.name + ' modular belt', why: why, page: b.page, image: (b.images || [])[0] || null }); } }
    var stainless = ctx.material === 'ss304' || h === 'glass';
    var food = ['dairy', 'food', 'bakery', 'meat', 'beverages'].indexOf(ctx.industry) >= 0;

    if (cat === 'side_flex' || cat === 'curved' || (hasCurve && ['thermoplastic_slat', 'straight_modular'].indexOf(cat) >= 0)) {
      if (ctx.material === 'ss304') { addChain('uss8811t', 'Stainless steel side-flexing tab-type chain: bends round curves (min side-flex radius 500 mm).'); addChain('uss881m', 'Stainless steel magnet flex alternative.'); }
      else if (h === 'cartons' || h === 'trays' || h === 'bags') { addChain('ulf1702', 'Multiflex chain is printed in the catalogue for cartons and crates; min side-flex radius 150 mm.'); addChain('ulf880t', 'Thermoplastic tab flex for bottles, cans, cartons, crates (min radius 500 mm).'); }
      else { addChain('ulf880t', 'Thermoplastic side-flexing tab-type chain (min side-flex radius 500 mm).'); addChain('ulf880m', 'Magnet flex: chain lifts out of the corner track for quicker maintenance.'); }
      addBelt('usf50', 'Side flex modular belt option (turning radius 2.6 x belt width, innermost).');
    } else if (cat === 'straight_modular' || cat === 'food_pu_pvc' || cat === 'inclined' || ctx.material === 'pp_modular') {
      if (wet) addBelt('umb50', 'UMB 50 22OA top is printed for washing and drainage.');
      if (h === 'small_parts') addBelt('umb50', 'UMB 50 18OA fine mesh is printed for small articles.');
      if (h === 'cartons' || h === 'heavy' || h === 'trays') addBelt('umb50hd', 'UMB 50HD is printed for crates, cartons, jars and heavy duty / impact.');
      if (!selBelts.length) { addBelt('umb50', 'UMB 50: general purpose heavy duty belt (straight, inclined, washing, warmers / coolers).'); addBelt('umb25', 'UMB 25: general purpose light duty belt.'); addBelt('umb50hd', 'UMB 50HD: heavy duty and impact resistant.'); }
      selBelts = selBelts.filter(function (b, i, a) { return a.indexOf(b) === i; }); res.primary = res.primary.filter(function (p, i, a) { return a.findIndex(function (q) { return q.id === p.id; }) === i; });
    } else if (cat === 'thermoplastic_slat' || (!cat && !stainless)) {
      var dbl = need && need > 190.5;
      addChain(dbl ? 'ulf821' : 'ulf820', 'Thermoplastic slat chains suit PET / HDPE bottles, aluminium cans, cartons and crates in dairy, food, beverage and pharma.');
      if (!dbl) addChain('ulf821', 'Double hinge: wider widths (190.5 to 304.8 mm).');
    }
    if (stainless && !selChains.length) { addChain('uss812', 'Stainless steel slat chains suit glass bottles, crates, cartons and almost anything.'); addChain('uss802', 'Double hinge stainless chain for extra load capacity.'); }

    /* belt notes */
    selBelts.forEach(function (b) {
      var mats = materialsFor(b, ctx.tempC);
      if (!mats.length) res.notes.push(b.name + ': no catalogue material covers ' + ctx.tempC + ' deg C (PP +1 to +105, HDPE -40 to +80, Acetal -25 to +95). Engineering review.');
      var bw = ctx.beltWidthMm || need;
      if (bw && (bw < b.widthMm[0] || bw > b.widthMm[1])) res.notes.push(b.name + ': width ' + Math.round(bw) + ' mm is outside the catalogue range ' + b.widthMm[0] + '-' + b.widthMm[1] + ' mm.');
      b.sprockets.forEach(function (s) { res.parts.push({ group: 'Drive sprocket', part: b.name + ' sprocket ' + s.teeth + ' teeth', desc: 'OD ' + s.od + ' mm, bore ' + s.bore, qty: null, page: b.page }); });
      if (b.turnFactor && hasCurve) curves.forEach(function (c) {
        var bw2 = ctx.beltWidthMm || need; if (!bw2) return; var r = sideFlexBeltCentreRadiusMm(b, bw2);
        res.notes.push(b.name + ' curve ' + Math.round(c.radiusMm) + ' mm centre-line: catalogue turning radius is innermost = ' + b.turnFactor + ' x width; needs about ' + Math.round(r) + ' mm centre-line at ' + Math.round(bw2) + ' mm width' + (c.radiusMm >= r ? ' (OK on paper).' : ' (TOO TIGHT).'));
      });
    });
    /* chain parts */
    selChains.forEach(function (c) {
      var w = need ? nearestWidth(c, need) : null;
      if (need && !w) res.notes.push(c.name + ': product needs about ' + Math.round(need) + ' mm; widest standard chain is ' + c.widths[c.widths.length - 1].mm + ' mm.');
      if (w) res.parts.push({ group: 'Chain', part: w.part, desc: c.name + ', width K ' + w.mm + ' mm' + (w.inch ? ' (' + w.inch + ')' : '') + ', pitch ' + c.pitchMm + ' mm', qty: null, qtyBasis: 'Length from the chain loop (engineering); packed in 10 ft (3.048 m) lengths', page: c.page });
      else c.widths.forEach(function (x) { res.parts.push({ group: 'Chain', part: x.part, desc: c.name + ', width K ' + x.mm + ' mm, pitch ' + c.pitchMm + ' mm', qty: null, page: c.page }); });
      if (c.minRadiusMm && hasCurve) curves.forEach(function (cv) { if (cv.radiusMm < c.minRadiusMm) res.notes.push(c.name + ': curve radius ' + Math.round(cv.radiusMm) + ' mm is below the printed minimum side-flex radius ' + c.minRadiusMm + ' mm.'); });
      forSeries(sprockets, c.series).forEach(function (s) { s.rows.forEach(function (r) { res.parts.push({ group: 'Drive sprocket', part: r.part, desc: r.teeth + ' teeth, OD ' + r.odMm + ' mm, bore ' + r.boreMm + ' mm (' + r.make + ')', qty: null, page: s.page }); }); });
      forSeries(idlers, c.series).forEach(function (s) { s.rows.forEach(function (r) { res.parts.push({ group: 'Idler wheel', part: r.part, desc: r.teeth + ' teeth, OD ' + r.odMm + ' mm, bore ' + r.boreMm + ' mm', qty: null, page: s.page }); }); });
      /* corner tracks */
      if (c.type === 'sideflex' && hasCurve && Math.abs((c.widths[0].mm) - 82.5) < 0.1) {
        var mag = c.series === '880M' || c.series === '881M';
        curves.forEach(function (cv) {
          var ang90 = Math.abs(cv.angleDeg - 90) < 1;
          var m = ang90 ? cornerTracksFor(Math.round(cv.radiusMm), lanes, mag) : [];
          if (m.length) m.forEach(function (r) { res.parts.push({ group: 'Corner track', part: r.part, desc: (mag ? 'Magnetic' : 'Tab type') + ' corner track, 90 deg, radius ' + Math.round(cv.radiusMm) + ' mm, ' + lanes + ' track(s), for 3.25" (82.5 mm) chain', qty: 1, qtyBasis: 'One per matching 90-degree curve', page: mag ? 31 : 29 }); });
          else res.notes.push(c.name + ', curve ' + Math.round(cv.radiusMm) + ' mm / ' + Math.round(cv.angleDeg) + ' deg: no standard corner track listed (catalogue: 90 deg, radius ' + (mag ? '500 / 585 / 670 / 755' : '500 / 650 / 1000') + ' mm, 1-4 tracks, 82.5 mm chain). Engineering review.');
        });
      }
    });
    /* common */
    res.parts.push({ group: 'Wear strips / guides', part: 'UHMWPE profiles (see list)', desc: 'Chain guide profiles and wearstrips - profile chosen by engineer', qty: null, page: wearstrips.page });
    res.parts.push({ group: 'Return rollers', part: 'URR series', desc: 'Return rollers - size chosen by engineer', qty: null, page: 33 });
    res.parts.push({ group: 'Frame / legs', part: 'Leg pads, tripod / bipod, frame supports', desc: 'Support components - number depends on frame design', qty: null, page: 41 });
    if (!res.primary.length) res.notes.push('No belt or chain family in the catalogue is a clear match for this category (for example roller or PU/PVC belt conveyors are not in this catalogue). Engineering review.');
    return res;
  }


  /* Build the recommend() context from the planner's normalised inputs and analysis result. */
  function contextFrom(inp, res) {
    var curves = ((res && res.path && res.path.details) || []).filter(function (d) { return d.type === 'curve' && d.radius; }).map(function (d) { return { radiusMm: d.radius * 1000, angleDeg: d.angle }; });
    return { categoryId: res && res.recommendation ? res.recommendation.selectedId : '', handling: inp.handling || '', material: inp.material || '', conditions: inp.conditions || [], tempC: inp.temperature,
             envelopeWidthMm: res && res.width ? res.width.productEnvelopeMm : null, beltWidthMm: inp.beltWidth || null, lanes: inp.lanes || 1, curves: curves, industry: inp.industry || '',
             hasIncline: !!(res && res.path && res.path.inclined > 0) };
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function renderHtml(out) {
    function tbl(head, rows) { return '<div class="tablewrap"><table><thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (x) { return '<td>' + x + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'; }
    var pg = function (n) { return '<small class="note">catalogue p.' + n + '</small>'; };
    var h = '<h3>Suggested belt / chain</h3>';
    h += out.primary.length ? '<ul>' + out.primary.map(function (p) { return '<li class="withimg">' + (p.image ? '<img class="thumb" src="' + esc(p.image) + '" alt="' + esc(p.title) + ' - photo from the Ultraplast catalogue" loading="lazy">' : '') + '<span><b>' + esc(p.title) + '</b> - ' + esc(p.why) + ' ' + pg(p.page) + '</span></li>'; }).join('') + '</ul>' : '<p>No clear match in this catalogue. <span class="tag">Engineering review required</span></p>';
    if (out.notes.length) h += '<h3>Checks</h3><ul>' + out.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    h += '<h3>Matching catalogue parts</h3>' + tbl(['Group', 'Part', 'Details', 'Qty', 'Page'], out.parts.map(function (p) { return [esc(p.group), '<b>' + esc(p.part) + '</b>', esc(p.desc), p.qty != null ? esc(p.qty) + (p.qtyBasis ? '<br><small>' + esc(p.qtyBasis) + '</small>' : '') : '<span class="tag">Engineering to confirm</span>', esc(p.page)]; }));
    h += '<p class="note">Sprockets, idlers and corner tracks are matched exactly as printed in the "Application" lines of the catalogue. Quantities are given only where the catalogue makes them certain; chain length, sprocket choice, wear-strip profile and frame parts are decided by Ultraplast engineering. ' + esc(CHAIN_NOTE) + '</p>';
    return h;
  }

  /* ================================================================ search */
  function allParts() {
    var out = [];
    belts.forEach(function (b) { out.push({ cat: 'Modular belts', part: b.name, desc: b.use, page: b.page }); });
    chains.forEach(function (c) { c.widths.forEach(function (w) { out.push({ cat: c.family + ' chains', part: w.part, desc: c.name + ', K ' + w.mm + ' mm, pitch ' + c.pitchMm + ' mm', page: c.page }); }); });
    sprockets.forEach(function (s) { s.rows.forEach(function (r) { out.push({ cat: 'Sprockets', part: r.part, desc: r.teeth + ' teeth, OD ' + r.odMm + ' mm, bore ' + r.boreMm + ' mm - for series ' + s.chainSeries.join('/'), page: s.page }); }); });
    idlers.forEach(function (s) { s.rows.forEach(function (r) { out.push({ cat: 'Idler wheels', part: r.part, desc: r.teeth + ' teeth, OD ' + r.odMm + ' mm, bore ' + r.boreMm + ' mm - for series ' + s.chainSeries.join('/'), page: s.page }); }); });
    wearstrips.profiles.forEach(function (p) { out.push({ cat: 'UHMWPE wearstrips and guides', part: p, desc: 'UHMWPE profile', page: wearstrips.page }); });
    cornerTracks.tab.rows.forEach(function (r) { out.push({ cat: 'Corner tracks', part: r.part, desc: 'Tab type, 90 deg, R' + r.crMm + ' mm, ' + r.tracks + ' track(s), A ' + r.aMm + ' mm', page: 29 }); });
    cornerTracks.magnetic.rows.forEach(function (r) { out.push({ cat: 'Corner tracks', part: r.part, desc: 'Magnetic, 90 deg, R' + r.crMm.join('/') + ' mm, ' + r.tracks + ' track(s), width ' + r.widthMm + ' mm', page: 31 }); });
    components.forEach(function (g) { g.items.forEach(function (i) { out.push({ cat: g.name, part: i.part, desc: i.note, page: g.page }); }); });
    return out;
  }
  function search(q) { q = String(q || '').toLowerCase().trim(); if (!q) return allParts(); return allParts().filter(function (p) { return (p.part + ' ' + p.desc + ' ' + p.cat).toLowerCase().indexOf(q) >= 0; }); }

  return { SOURCE: SOURCE, CHAIN_NOTE: CHAIN_NOTE, belts: belts, chains: chains, sprockets: sprockets, idlers: idlers, wearstrips: wearstrips, cornerTracks: cornerTracks, components: components, company: company,
           familyImages: familyImages, recommend: recommend, contextFrom: contextFrom, renderHtml: renderHtml, search: search, allParts: allParts, chainById: chainById, beltById: beltById, nearestWidth: nearestWidth, materialsFor: materialsFor, cornerTracksFor: cornerTracksFor, sideFlexBeltCentreRadiusMm: sideFlexBeltCentreRadiusMm };
});
