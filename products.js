/*
 * products.js — EDITABLE PRODUCT CONFIGURATION
 * ---------------------------------------------------------------------------
 * Ultraplast Smart Conveyor Planner & Estimator
 *
 * This is the ONLY file an authorised developer needs to edit to change product
 * options, published specifications, or company contact details.
 *
 * RULES
 *  - Every technical value carries { verified: false } until an Ultraplast
 *    engineer has confirmed it. The app labels unverified values as
 *    "Configuration-dependent" and never presents them as design data.
 *  - Use `null` for anything not known. The calculator then says
 *    "Engineering review required" instead of guessing.
 *  - Do NOT add prices here. Pricing is intentionally not part of this app.
 *
 * Values below were read from the public Ultraplast pages listed in `sources`
 * on 2026-10-13. They are REFERENCE INFORMATION ONLY and must be re-verified
 * (see docs/VERIFICATION_CHECKLIST.md).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.UCPProducts = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SRC_CAT = 'Ultraplast Product Range catalogue';
  var SRC_MODULAR = 'https://www.ultraplastindia.com/straight-run-and-modular-conveyor-belts/';
  var SRC_SYSTEM = 'https://www.ultraplastindia.com/conveyor-systems/';
  var SRC_BELTS = 'https://www.ultraplastindia.com/conveyor-belts-and-chains/';

  function spec(value, unit, source, note) {
    return { value: value, unit: unit || null, source: source || null, verified: false, note: note || null };
  }

  return {
    meta: {
      configVersion: '0.1.0',
      publishedSpecsReadOn: '2026-10-13',
      verifiedBy: null,          // e.g. 'A. Sharma, Design Dept.'
      verifiedOn: null,          // e.g. '2026-11-02'
      sources: [SRC_SYSTEM, SRC_BELTS, SRC_MODULAR]
    },

    company: {
      name: 'Ultraplast Chainbelts Private Limited',
      shortName: 'Ultraplast',
      website: 'https://www.ultraplastindia.com/',
      logoUrl: 'https://www.ultraplastindia.com/wp-content/uploads/2024/10/Ultra-Plast-Logo-For-Website.png',
      // Published on the Ultraplast "conveyor-system" page (2026-10-13). Re-verify before launch.
      enquiryEmail: 'info@ultraplastindia.in',
      salesEmail: 'sales@ultraplastindia.in', // printed on the catalogue back cover
      websiteIn: 'https://www.ultraplastindia.in/', // catalogue also prints www.ultraplastindia.in
      phones: ['+91-129-4010031', '+91-9810060473', '+91-9205246473'],
      address: 'Works Plot-627, Sector-69, IMT, Faridabad-121004, Haryana, India',
      hours: 'Monday-Saturday, 9 AM-6 PM',
      // WhatsApp: shown on the website home page as +91 9205246473 (read 2026-10-22). Re-verify before launch.
      whatsappNumber: '919205246473',
      whatsappVerified: true,
      social: {
        facebook: 'https://www.facebook.com/ultraplastindia',
        instagram: 'https://www.instagram.com/ultraplastindia',
        linkedin: 'https://www.linkedin.com/company/ultraplastindia/',
        youtube: 'https://www.youtube.com/@ultraplastindia'
      },
      // Website pages (read 2026-10-22): useful for links and the enquiry e-mail.
      pages: {
        conveyorSystems: 'https://www.ultraplastindia.com/conveyor-systems/',
        beltsAndChains: 'https://www.ultraplastindia.com/conveyor-belts-and-chains/',
        components: 'https://www.ultraplastindia.com/conveyor-components/',
        download: 'https://www.ultraplastindia.com/download/',
        contact: 'https://www.ultraplastindia.com/contact/'
      }
    },

    /* Conveyor types and sub-types exactly as listed on ultraplastindia.com (read 2026-10-22). Names only: the website publishes
       NO numeric limits (width, speed, load, incline angle, radius) for these - those stay "Engineering review required". */
    websiteCatalogue: {
      readOn: '2026-10-22',
      conveyorSystems: {
        'Curve conveyor': ['Slat chain curve', 'Modular belt curve', 'Zero tangent radius curve'],
        'Inclined conveyor': ['Rubber top', 'Slat chain', 'Cleated modular belt', 'Cleated PVC belt'],
        'Roller conveyor': ['Gravity roller', 'Powerised roller', 'Powerised roller curved'],
        'Straight running conveyor': ['Slat chain', 'Modular belt', 'PVC / PU'],
        'Truck loading conveyor': ['Portable / mobile', 'Inclined / Z-type']
      },
      beltsAndChains: ['Plastic modular belts', 'Thermoplastic chains (low friction grade polyacetal; straight running and side flexing; tab and magnetflex)', 'Stainless steel slat chains (double hinge; rubber top for inclines)'],
      components: ['UHMWPE wearstrips and side guides', 'Corner tracks', 'Connecting joint', 'Side guide bracket', 'Conveyor clamp', 'Support base', 'Adjustable conveyor leg pads', 'Handles', 'Hinges', 'Return rollers', 'Sprockets'],
      statedRanges: ['Curve conveyors: turns of 45 to 180 degrees', 'Products: a few grams up to a couple of tons (no per-type figures)']
    },

    industries: [
      { id: 'beverages', label: 'Beverages and bottling' },
      { id: 'dairy', label: 'Dairy' },
      { id: 'food', label: 'Food processing' },
      { id: 'bakery', label: 'Bakery and snacks' },
      { id: 'meat', label: 'Meat and seafood' },
      { id: 'fmcg', label: 'FMCG and packaging' },
      { id: 'pharma', label: 'Pharmaceuticals' },
      { id: 'warehouse', label: 'Warehousing and logistics' },
      { id: 'engineering', label: 'Automotive, tyres and general engineering' },
      { id: 'other', label: 'Other' }
    ],

    // How the product is presented to the conveyor (drives the recommendation logic).
    handlingTypes: [
      { id: 'bottles', label: 'Bottles, cans, jars, containers' },
      { id: 'cartons', label: 'Cartons, boxes, totes (rigid flat base)' },
      { id: 'bags', label: 'Bags, pouches, soft packs' },
      { id: 'trays', label: 'Trays, tubs, cups' },
      { id: 'loose_food', label: 'Unpacked food items' },
      { id: 'small_parts', label: 'Small parts / components' },
      { id: 'heavy', label: 'Heavy items (tyres, castings, drums)' },
      { id: 'other', label: 'Other / not sure' }
    ],

    materials: [
      { id: 'unknown', label: 'Not sure - recommend' },
      { id: 'pp_modular', label: 'Polypropylene (PP) modular belt' },
      { id: 'plastic_other', label: 'Other thermoplastic (acetal / POM etc.)' },
      { id: 'ss304', label: 'Stainless steel SS 304 slat chain' },
      { id: 'pu_pvc', label: 'PU / PVC food-grade belt' },
      { id: 'steel_roller', label: 'Steel / zinc-plated rollers' }
    ],

    /*
     * Published belt / chain families. `null` = not published.
     * widthMm / pitchMm / minRadius are reference values only.
     */
    families: {
      /* Values below come from the Ultraplast Product Range catalogue (page numbers in the notes). They are the company's own
         published figures, kept "verified: false" until engineering signs them off (verifiedBy / verifiedOn in meta). */
      plastic_modular: {
        label: 'PP plastic modular belt (UMB 25 / UMB 50 / UMB 50HD)',
        widthMm: { min: spec(150, 'mm', SRC_CAT, 'UMB 25: 150-1500 mm; UMB 50 and 50HD: 150-2500 mm (catalogue pp.5-7). Exact widths on request.'), max: spec(2500, 'mm', SRC_CAT) },
        pitchOptionsMm: spec([25, 50], 'mm', SRC_CAT, 'Catalogue lists UMB 25 (25 mm pitch), UMB 50 and UMB 50HD (50 mm). The older 28/38 mm website text is not in the catalogue.'),
        sprocketTeeth: spec(8, null, SRC_CAT, 'UMB 50: 8, 10 or 12 teeth; UMB 25: 12, 16 or 20 teeth.'),
        pinDiameterMm: spec(8, 'mm', SRC_CAT, 'UMB 50 / 50HD 8 mm; UMB 25 5 mm.'),
        tensileLoadKg: spec({ min: 600, max: 1200 }, 'kg', SRC_CAT, 'PP max tensile load: UMB 25 600 kg, UMB 50 900 kg, UMB 50HD 1200 kg. Basis / safety factor not stated.'),
        minSideFlexRadius: null,
        moduleLengthMm: null
      },
      side_flex_plastic: {
        label: 'Side-flex plastic modular belt (USF 25 / USF 50)',
        widthMm: { min: spec(100, 'mm', SRC_CAT), max: spec(900, 'mm', SRC_CAT, 'USF 25: 100-600 mm; USF 50: 100-900 mm (catalogue p.8).') },
        pitchOptionsMm: spec([25, 50], 'mm', SRC_CAT),
        sprocketTeeth: spec(8, null, SRC_CAT, 'USF 50: 8, 10 or 12 teeth; USF 25: 12, 16 or 20 teeth.'),
        pinDiameterMm: spec(6, 'mm', SRC_CAT, 'USF 50 6 mm SS 304; USF 25 5 mm nylon / acetal.'),
        // Catalogue: "Approx. turning radius (innermost)": USF 25 = 2.2 x width, USF 50 = 2.6 x width.
        // 2.6 (the larger) is used. The app converts the innermost radius to the equivalent centre-line radius (+ half the width).
        minSideFlexRadius: { factorOfWidth: spec(2.6, 'x width (innermost)', SRC_CAT, 'Innermost turning radius (catalogue p.8).'), reference: 'inner', fixedMm: null },
        moduleLengthMm: null
      },
      ss_tab_flex: {
        label: 'Stainless steel tab-flex / magnet-flex side-flexing chain (USS 8811T / 881M)',
        widthMm: { min: spec(82.5, 'mm', SRC_CAT, '3.25 inch'), max: spec(190.5, 'mm', SRC_CAT, '7.5 inch (K750)') },
        pitchOptionsMm: spec([38.1], 'mm', SRC_CAT, '1.5 inch'),
        sprocketTeeth: spec(19, null, SRC_CAT, '19, 21 or 25 teeth'),
        pinDiameterMm: null,
        minSideFlexRadius: { factorOfWidth: null, fixedMm: spec(500, 'mm', SRC_CAT, 'Minimum side-flex radius R = 500 mm (catalogue p.14). Reference not stated.') },
        moduleLengthMm: null
      },
      ss_slat: {
        label: 'Stainless steel SS 304 slat chain (USS 812 single hinge / USS 802 double hinge)',
        widthMm: { min: spec(82.5, 'mm', SRC_CAT, '3.25 inch'), max: spec(190.5, 'mm', SRC_CAT, '7.5 inch') },
        pitchOptionsMm: spec([38.1], 'mm', SRC_CAT, '1.5 inch'),
        sprocketTeeth: spec(19, null, SRC_CAT, '19, 21 or 25 teeth (802: 21 or 25)'),
        pinDiameterMm: null,
        minSideFlexRadius: null,
        moduleLengthMm: null
      },
      thermoplastic_slat: {
        label: 'Thermoplastic slat chain (ULF 820 single hinge / ULF 821 double hinge)',
        widthMm: { min: spec(82.5, 'mm', SRC_CAT, '3.25 inch'), max: spec(304.8, 'mm', SRC_CAT, '12 inch (ULF 821-K1200)') },
        pitchOptionsMm: spec([38.1], 'mm', SRC_CAT, '1.5 inch'),
        sprocketTeeth: spec(19, null, SRC_CAT, '19, 21 or 25 teeth (821: 21 or 25)'),
        pinDiameterMm: null,
        minSideFlexRadius: null,
        moduleLengthMm: null
      },
      thermoplastic_tab_flex: {
        label: 'Thermoplastic tab-flex / magnet-flex side-flexing chain (ULF 880T / 880M)',
        widthMm: { min: spec(82.5, 'mm', SRC_CAT, '3.25 inch'), max: spec(114.3, 'mm', SRC_CAT, '4.5 inch (880T-K450)') },
        pitchOptionsMm: spec([38.1], 'mm', SRC_CAT, '1.5 inch'),
        sprocketTeeth: spec(10, null, SRC_CAT, '10, 11 or 12 teeth'),
        pinDiameterMm: null,
        minSideFlexRadius: { factorOfWidth: null, fixedMm: spec(500, 'mm', SRC_CAT, 'Minimum side-flex radius R = 500 mm (catalogue p.11).') },
        moduleLengthMm: null
      },
      multiflex: {
        label: 'Multiflex polyacetal chain (ULF 1702) for cartons and crates',
        widthMm: { min: spec(53.2, 'mm', SRC_CAT), max: spec(53.2, 'mm', SRC_CAT) },
        pitchOptionsMm: spec([50], 'mm', SRC_CAT),
        sprocketTeeth: spec(8, null, SRC_CAT, '8, 10 or 12 teeth'),
        pinDiameterMm: null,
        minSideFlexRadius: { factorOfWidth: null, fixedMm: spec(150, 'mm', SRC_CAT, 'Minimum side-flex radius R = 150 mm (catalogue p.21).') },
        moduleLengthMm: null
      }
    },

    /*
     * Conveyor categories requested by Ultraplast.
     * supportsCurves / supportsIncline: true | false | null (null = unknown -> review).
     * These flags describe the NATURE of the category (e.g. a curved conveyor curves)
     * and are not a capability claim for any particular model.
     */
    categories: [
      {
        id: 'straight_modular', name: 'Straight-running modular belt conveyor', kind: 'belt', powered: true,
        families: ['plastic_modular'], supportsCurves: false, supportsIncline: null,
        summary: 'Flat plastic modular belt running in a straight line between drive and idler ends.'
      },
      {
        id: 'thermoplastic_slat', name: 'Thermoplastic slat chain conveyor', kind: 'chain', powered: true,
        families: ['thermoplastic_slat'], supportsCurves: false, supportsIncline: null,
        summary: 'Slat-chain conveyor, commonly used for bottles, cans and containers (low friction polyacetal chain, ULF 820 / 821).'
      },
      {
        id: 'food_pu_pvc', name: 'Food-grade PU/PVC belt conveyor', kind: 'belt', powered: true,
        families: [], supportsCurves: false, supportsIncline: null,
        summary: 'Smooth-surface food-grade belt conveyor for hygienic applications. No technical data is configured yet.'
      },
      {
        id: 'side_flex', name: 'Side-flexing chain conveyor', kind: 'chain', powered: true,
        families: ['side_flex_plastic', 'ss_tab_flex', 'thermoplastic_tab_flex', 'multiflex'], supportsCurves: true, supportsIncline: null,
        summary: 'Chain or belt that bends sideways so one conveyor can follow curves and turns.'
      },
      {
        id: 'curved', name: 'Curved conveyor', kind: 'belt', powered: true,
        families: [], supportsCurves: true, supportsIncline: null,
        summary: 'Powered conveyor section that turns the product through an angle (for example 45, 90 or 180 degrees).'
      },
      {
        id: 'inclined', name: 'Inclined conveyor', kind: 'belt', powered: true,
        families: [], supportsCurves: null, supportsIncline: true,
        summary: 'Conveyor that raises or lowers product between two heights. Surface profile / cleats depend on the product.'
      },
      {
        id: 'gravity_roller', name: 'Gravity roller conveyor', kind: 'roller', powered: false,
        families: [], supportsCurves: null, supportsIncline: null,
        summary: 'Unpowered roller conveyor; product moves by hand push or a slight downward slope.'
      },
      {
        id: 'powered_roller', name: 'Powered roller conveyor', kind: 'roller', powered: true,
        families: [], supportsCurves: false, supportsIncline: null,
        summary: 'Driven rollers for cartons, totes and other rigid flat-base loads.'
      },
      {
        id: 'powered_curved_roller', name: 'Powered curved roller conveyor', kind: 'roller', powered: true,
        families: [], supportsCurves: true, supportsIncline: null,
        summary: 'Driven tapered-roller curve for rigid flat-base loads.'
      },
      {
        id: 'custom', name: 'Custom conveyor / integrated production line', kind: 'system', powered: true,
        families: [], supportsCurves: true, supportsIncline: true,
        summary: 'Engineered combination of conveyors, transfers and accessories to suit a full production line.'
      }
    ],

    /*
     * PRODUCT BEHAVIOUR (used only by the 3D animation and the "Product behaviour check").
     * These are GENERIC reference values for an illustrative simulation - NOT Ultraplast data and not verified.
     * Replace them with measured values for your belts and products (docs/VERIFICATION_CHECKLIST.md).
     *   mu              coefficient of friction between product and belt surface, per belt type (dry)
     *   wetFactor/oilyFactor   multiply mu when the "wet" / "oily" condition is ticked
     *   cogRatio        height of the product centre of gravity as a fraction of product height
     *   stopTimeS       time the belt takes to stop (used by the "Stop belt" test)
     *   marginRatio     speed / critical speed above which the check says "close to the limit"
     */
    behaviour: {
      verified: false,
      note: 'Generic textbook-range friction values for illustration. Verify with real belt and product tests.',
      mu: { pp: 0.30, slat: 0.22, ss: 0.25, pu: 0.50, other: 0.30 },
      muLabels: { pp: 'PP modular belt', slat: 'Thermoplastic slat chain', ss: 'Stainless steel slat / chain', pu: 'PU / PVC food belt', other: 'Other / not specified' },
      wetFactor: 0.6, oilyFactor: 0.4, cogRatio: 0.5, stopTimeS: 0.5, marginRatio: 0.8
    },

    /*
     * BILL OF MATERIALS and MOTOR / DRIVE catalogue - shown on bom.html (the "BOM & Motor" button).
     * LEFT EMPTY ON PURPOSE: add only parts and motors that Ultraplast has verified. Empty = the page says
     * "Engineering review required". Nothing here is ever invented by the tool.
     *
     * parts row:  { category:'Frame', item:'Frame module', partNo:'XXX', appliesTo:['family-id'] (or null = all),
     *               qtyBasis:'perMetre' | 'perCurve' | 'perLeg' | 'fixed', qtyFactor:1, unit:'nos', note:'' }
     *   perMetre = qtyFactor x total route length (m);  perCurve = qtyFactor x number of curves;
     *   perLeg   = qtyFactor x legs (needs engineering.legSpacingMm);  fixed = qtyFactor as given.
     * motors row: { id:'M1', name:'Geared motor', powerKw:0.37, voltage:'415 V 3-ph', outputRpm:30,
     *               minTorqueNm:null, maxPullN:null, note:'' }   (maxPullN / minTorqueNm are used only for display)
     */
    bom: { verified: false, note: 'No verified Ultraplast parts or motors entered yet.', parts: [], motors: [] },

    /*
     * TYPICAL EXAMPLE PRODUCTS used by the "Quick fill" on the Product step (industry + weight -> suggested size, gap, throughput).
     * These are generic, rounded EXAMPLE sizes for starting the form. They are NOT Ultraplast specifications and NOT customer data:
     * the form marks every pre-filled value "Suggested" until the customer edits it, and the results list them as assumptions.
     * Edit / add rows freely (sizes in mm, weight in kg, rate in products per minute).
     */
    presets: [
      { id: 'bev-pet500', industry: ['beverages'], name: '500 ml PET bottle (filled)', handling: 'bottles', l: 65, w: 65, h: 205, kg: 0.53, gap: 50, rate: 60, fragility: 'low', cond: ['wet'] },
      { id: 'bev-pet1l', industry: ['beverages'], name: '1 litre PET bottle (filled)', handling: 'bottles', l: 80, w: 80, h: 290, kg: 1.05, gap: 60, rate: 40, fragility: 'low', cond: ['wet'] },
      { id: 'bev-pet2l', industry: ['beverages'], name: '2 litre PET bottle (filled)', handling: 'bottles', l: 105, w: 105, h: 320, kg: 2.05, gap: 70, rate: 30, fragility: 'low', cond: ['wet'] },
      { id: 'bev-can330', industry: ['beverages'], name: '330 ml aluminium can (filled)', handling: 'bottles', l: 66, w: 66, h: 115, kg: 0.36, gap: 40, rate: 120, fragility: 'low', cond: ['wet'] },
      { id: 'bev-glass750', industry: ['beverages'], name: '750 ml glass bottle (filled)', handling: 'bottles', l: 80, w: 80, h: 300, kg: 1.3, gap: 60, rate: 30, fragility: 'medium', cond: ['wet'] },
      { id: 'bev-carton6', industry: ['beverages', 'fmcg'], name: 'Carton of 6 x 1 litre bottles', handling: 'cartons', l: 250, w: 170, h: 300, kg: 6.5, gap: 100, rate: 8, fragility: 'low', cond: ['dry'] },
      { id: 'dai-pouch1l', industry: ['dairy'], name: '1 litre milk pouch', handling: 'bags', l: 190, w: 120, h: 40, kg: 1.03, gap: 60, rate: 60, fragility: 'medium', cond: ['wet'] },
      { id: 'dai-cup500', industry: ['dairy'], name: '500 g curd cup', handling: 'trays', l: 100, w: 100, h: 75, kg: 0.55, gap: 50, rate: 60, fragility: 'medium', cond: ['wet'] },
      { id: 'dai-tetra1l', industry: ['dairy', 'beverages'], name: '1 litre carton pack (tetra type)', handling: 'cartons', l: 70, w: 70, h: 190, kg: 1.05, gap: 50, rate: 60, fragility: 'low', cond: ['dry'] },
      { id: 'dai-crate', industry: ['dairy'], name: 'Crate of 12 milk pouches', handling: 'cartons', l: 500, w: 350, h: 300, kg: 13, gap: 150, rate: 4, fragility: 'low', cond: ['wet'] },
      { id: 'fod-jar400', industry: ['food'], name: '400 g food jar', handling: 'bottles', l: 80, w: 80, h: 110, kg: 0.55, gap: 50, rate: 60, fragility: 'medium', cond: ['dry'] },
      { id: 'fod-tray', industry: ['food', 'meat'], name: 'Ready-meal tray', handling: 'trays', l: 200, w: 150, h: 40, kg: 0.4, gap: 50, rate: 30, fragility: 'medium', cond: ['oily'] },
      { id: 'fod-carton', industry: ['food', 'fmcg', 'bakery'], name: 'Packed food carton', handling: 'cartons', l: 300, w: 200, h: 150, kg: 3, gap: 100, rate: 12, fragility: 'low', cond: ['dry'] },
      { id: 'bak-loaf', industry: ['bakery'], name: 'Packed bread loaf', handling: 'bags', l: 300, w: 120, h: 120, kg: 0.45, gap: 80, rate: 30, fragility: 'high', cond: ['dry'] },
      { id: 'bak-biscuit', industry: ['bakery'], name: 'Biscuit carton', handling: 'cartons', l: 300, w: 200, h: 150, kg: 4, gap: 100, rate: 12, fragility: 'low', cond: ['dry'] },
      { id: 'mea-vac', industry: ['meat'], name: 'Vacuum-packed meat / fish pack', handling: 'trays', l: 250, w: 150, h: 50, kg: 1, gap: 60, rate: 30, fragility: 'low', cond: ['wet'] },
      { id: 'mea-tray', industry: ['meat'], name: 'Meat tray', handling: 'trays', l: 300, w: 200, h: 60, kg: 1.5, gap: 60, rate: 20, fragility: 'low', cond: ['wet'] },
      { id: 'fmc-bottle200', industry: ['fmcg'], name: '200 ml personal-care bottle', handling: 'bottles', l: 50, w: 35, h: 150, kg: 0.25, gap: 40, rate: 80, fragility: 'low', cond: ['dry'] },
      { id: 'fmc-pouch1kg', industry: ['fmcg'], name: '1 kg detergent pouch', handling: 'bags', l: 220, w: 150, h: 60, kg: 1, gap: 60, rate: 40, fragility: 'low', cond: ['dry'] },
      { id: 'fmc-carton', industry: ['fmcg', 'warehouse'], name: 'Shipping carton (medium)', handling: 'cartons', l: 400, w: 300, h: 250, kg: 6, gap: 150, rate: 8, fragility: 'low', cond: ['dry'] },
      { id: 'pha-bottle100', industry: ['pharma'], name: '100 ml pharmaceutical bottle', handling: 'bottles', l: 45, w: 45, h: 95, kg: 0.15, gap: 40, rate: 100, fragility: 'medium', cond: ['dry'] },
      { id: 'pha-carton', industry: ['pharma'], name: 'Medicine carton', handling: 'cartons', l: 150, w: 80, h: 50, kg: 0.1, gap: 40, rate: 120, fragility: 'low', cond: ['dry'] },
      { id: 'war-carton', industry: ['warehouse'], name: 'Large carton', handling: 'cartons', l: 500, w: 400, h: 300, kg: 10, gap: 200, rate: 6, fragility: 'low', cond: ['dry'] },
      { id: 'war-tote', industry: ['warehouse'], name: 'Plastic tote', handling: 'cartons', l: 600, w: 400, h: 300, kg: 15, gap: 200, rate: 5, fragility: 'low', cond: ['dry'] },
      { id: 'eng-part', industry: ['engineering'], name: 'Small machined / moulded component', handling: 'small_parts', l: 200, w: 150, h: 100, kg: 3, gap: 80, rate: 20, fragility: 'low', cond: ['oily'] },
      { id: 'eng-casting', industry: ['engineering'], name: 'Metal casting', handling: 'heavy', l: 250, w: 200, h: 150, kg: 8, gap: 150, rate: 6, fragility: 'low', cond: ['oily'] }
    ],

    beltColours: [
      ['#2f6fb5', 'Blue'], ['#f2f2f0', 'White'], ['#8a9099', 'Grey'], ['#25282c', 'Black'], ['#3f8f55', 'Green'], ['#d8cfae', 'Natural'], ['#b9bfc6', 'Stainless steel'], ['#8b5a2b', 'Brown']
    ],
    productColours: [
      ['#c8102e', 'Red'], ['#2f6fb5', 'Blue'], ['#3f8f55', 'Green'], ['#f0c419', 'Yellow'], ['#ef8a17', 'Orange'], ['#f2f2f0', 'White'], ['#25282c', 'Black'], ['#b98a54', 'Cardboard brown'], ['#9fd3e6', 'Glass / clear blue']
    ],

    /*
     * Items that need data from Ultraplast engineering. Set a number to let the app
     * compute the matching quantity; leave null to keep it "to be engineered".
     */
    engineering: {
      moduleLengthMm: null,           // standard frame module length
      legSpacingMm: null,             // support-leg spacing
      widthAllowancePerSideMm: null,  // clearance + guide allowance added each side of product envelope
      maxInclineDeg: null,            // max incline per product / surface
      maxSpeedMPerMin: null           // max speed per product
    }
  };
});
