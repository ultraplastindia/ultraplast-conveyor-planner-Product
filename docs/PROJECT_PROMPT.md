# Project prompt - Ultraplast Smart Conveyor Planner & Estimator

Copy everything below the line into an AI coding assistant (e.g. Claude Code) to rebuild or extend this project.
*(This is a consolidated prompt written from the project as built; the original wording was shorter and grew over several steps.)*

---

## ROLE
You are a senior full-stack engineer and industrial-automation consultant. Build the **"Ultraplast Smart Conveyor Planner & Estimator"** for **Ultraplast Chainbelts Pvt. Ltd.** (India; website ultraplastindia.com): a customer-facing, mobile-friendly web tool that turns a customer's answers into a **preliminary** conveyor recommendation, drawings, report and enquiry.

## TECHNOLOGY
- Static site: HTML + CSS + vanilla JavaScript only (classic `<script>` tags, no frameworks, no build step, no runtime dependencies, no CDN). Hosted on **GitHub Pages**. Works offline once loaded.
- Pure logic in UMD modules usable in both browser and Node so it can be unit-tested.
- Metric internally; metric/imperial display toggle. Indian business context (IST, INR only if prices are ever configured).

## FILES
`index.html, styles.css, config.js, products.js (editable product/engineering data), sheetconfig.js, calculations.js, costing.js, report.js, enquiry.js, schematic.js, simulation.js, physics.js, conveyor3d.js, cad.js, app.js`, `google-sheets/` (Apps Script), `examples/` (sample JSON), `tests/`, `docs/`, `README.md`.

## HARD RULES (never break)
1. **No invented prices, specs, capacities, motor sizes or standards.** Anything not in `products.js` or entered by the customer is shown as **"Engineering review required"**.
2. Never claim a final design can be computed from floor size alone. Floor area is not conveyor length.
3. Never show "Enquiry sent successfully" unless a real service confirmed it. Without a configured service, say it was **not** sent and offer an email draft.
4. No customer data in localStorage (only the optional staff rate card, labelled). No secrets or API keys in frontend code.
5. Do not fabricate test results; say what was and was not tested (no real Google, AutoCAD or phone available).
6. Every output is **preliminary / indicative**; drawings carry "INDICATIVE drawing - for engineering review, not for manufacture."
7. Colour code everywhere: **black = entered by customer, red = calculated, grey = indicative**.

## INPUT WIZARD (4 steps + results)
- **Step 1 Factory space** - project name, industry, floor length/width (OPTIONAL), working height, inlet/discharge height, start/end points (optional), obstacles (name, x, y, w, d), layout (straight / L / U / S / inclined / curved / multi-segment / custom), drawing available.
- **Step 2 Product** - handling type, length/width/height, weight (with unit), spacing, temperature, wet/oily/dusty conditions, **product colour picker** (for the 3D view).
- **Step 3 Production** - required throughput, speed, hours/shifts, continuous/intermittent, feeding/discharge, upstream/downstream machines, electrical supply.
- **Step 4 Conveyor** - category (auto recommend or pick), belt/chain material, width, **belt colour picker**, optional belt-to-product **friction μ**, lanes, transfers, route (straight length, or segments: straight / curve with radius+angle+direction / incline with run+rise), washdown, guarding.
- **Only the conveyor length is required** (straight layout). Floor, product and throughput are optional: with only a length the tool still produces 3D, drawings, DXF, PDF and JSON, lists the missing items for engineering review, and does **not** claim a floor fit.
- Live preview panel (3D) updates while typing; build-progress checklist; inline validation (negative/NaN rejected); errors update quietly as the user types.

## CALCULATION ENGINE (calculations.js)
- Normalise units; validate; route geometry: straight, curve arc = R·θ, incline length = √(H²+rise²), heading 0° = +X, left turn positive; auto-placement/rotation to fit floor; obstacle collision test; end-point check.
- Throughput → product pitch, required speed, lanes; belt width envelope (never invented); belt/chain length; minimum radius checks from published limits in `products.js`.
- Recommendation of conveyor type with reasons/alternatives; equipment checklist (not a BOM); issues/warnings; missing inputs; assumptions; exclusions; next steps; status tags (Customer-provided / Calculated / Config-dependent / Engineering review required).

## 3D CONVEYOR (conveyor3d.js, no libraries)
- Canvas-2D engine with own perspective/orthographic projection, painter's algorithm, back-face culling, shading, orbit / pan / zoom (mouse, wheel, pinch, keyboard), Isometric / Top / Front / Side / Fit buttons.
- Drawn to scale from entered data: floor, obstacles, route (straights, curves, inclines), heights, belt width, product size and spacing, **selected belt and product colours**. Indicative: frame, guide rails, legs, rollers, motor.
- Dimension labels (entered/calculated/indicative colours), station tags S1..Sn, **Dimension schedule** table and PDF section.
- Running conveyor: moving belt slats/arrows, products released at product pitch, delivered count.

## PRODUCT BEHAVIOUR (physics.js) - illustrative, honest
- Belt type friction values and CoG ratio as **generic, unverified placeholders** in `products.js` (`behaviour.verified:false`); user can override μ.
- Checks: curve slide √(μgR) and tip limit; incline slip when tanθ>μ; infeed tip; stop-belt slide/tip; discharge flight range. First failing check gives the product's fate; products slide off, fall, land, scatter and (optionally) pile on the floor.
- Viewer has typed **belt speed**, **Stop belt (test)**, friction/CoG inputs, safe-speed readout, fell/on-belt counters. Raising speed above the safe value makes products fall.
- Not modelled: collisions between products, vibration, belt sag, real transfers.

## ENGINEERING DRAWINGS (cad.js)
- A3 sheet (SVG): plan view, developed side elevation, end view, floor layout (only if floor given), isometric 3D, title block, per-view scale, dimensions (length, width, radius, angle, rise, heights).
- **2D DXF** (R12/AC1009, full-size mm, layers, linetypes, dimensions as lines+text) and **3D DXF** (3DFACE solids by layer, belt colour mapped to nearest ACI, 3D centre-line, dimension annotations). Valid ASCII with `%%d` for degrees.
- State clearly: dimensions are not associative AutoCAD DIMENSION objects; `_IND` layers are indicative; not for manufacture (see `docs/MANUFACTURING_READINESS.md`).

## COSTING (costing.js) - internal only
Flexible rate-card engine (per metre, per module, per leg, drive, fixed items, markup, tax) shown only with `?costing=1`, **ships with no prices**, never sent to customers, import/export JSON, optional "remember on this device".

## OUTPUTS
Results page with all calculations and flags; **PDF report** (own PDF writer, schematic, tables, dimension schedule, missing inputs); **JSON summary** (schema `ultraplast-conveyor-planner/project/1`, importable); CAD downloads; enquiry form (name, company, email, mobile, city, state, timeline, budget, comments, consent) with validation; submit via configurable endpoint (Google Apps Script / Google Sheet) with honest success/failure states, timeout handling, email-draft fallback; WhatsApp button disabled until a verified number is configured; file-upload field with type/size limits.

## GOOGLE SHEETS / APPS SCRIPT
Apps Script web app that receives the enquiry, appends rows, optionally saves uploaded file to Drive and emails Ultraplast; also serves editable product/rate data. Setup guide in `docs/GOOGLE_SHEETS_SETUP.md`. Frontend must degrade gracefully if the service is unreachable.

## QUALITY
- Accessible (labels, focus, aria, keyboard), mobile-first, prefers-reduced-motion respected, `[hidden]` always hides.
- Tests (Node, no dependencies): calculations, report/PDF, simulation, conveyor3d geometry accuracy, physics, cad (DXF structure, 3DFACE, SVG), costing, sheets/enquiry. Browser tests with Playwright + Chromium: wizard, 3D interaction, downloads, behaviour/falls, colour swatches, length-only flow, costing, sheet integration. Report exactly what passed.
- Docs: README, HOW_TO_USE, GOOGLE_SHEETS_SETUP, COSTING, VERIFICATION_CHECKLIST, MANUFACTURING_READINESS, example JSON files.

## DELIVERY
Deliver the project folder as a zip that can be uploaded to GitHub Pages as-is (`index.html` at the top level). End with a plain list of what was **not** verified (real AutoCAD, live GitHub Pages, real phone, real Google account) and what Ultraplast must supply (real friction values, standard parts, engineering calculations, sign-off) before any drawing is used for manufacture.
