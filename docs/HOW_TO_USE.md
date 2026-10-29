# How to use the Ultraplast Smart Conveyor Planner

A short guide for customers and for the Ultraplast team.
The tool gives a **preliminary** plan only. It is not an engineering design and it shows **no prices**.

---

## 1. Before you start - keep these ready
- Free floor **length and width** (metres) where the conveyor may go
- Product **length, width, height** (mm) and **weight**
- How many products per minute or hour you need
- The **route**: straight length, and any curve angles / radii or height change
- (Optional) belt speed, conveyor width, obstacles such as pillars or machines

Tip: if you don't know a value, leave it blank. The tool lists it under **Missing engineering inputs** and Ultraplast will confirm it.

## 2. The five steps

| Step | What to do | What you see on the right |
|---|---|---|
| **1 Factory space** | Enter floor length and width, optional heights, pick a **layout**, add obstacles | The floor drawn to scale, obstacles as hatched blocks |
| **2 Product** | Enter product name, category, size, weight, gap between products | The product's top view |
| **3 Production** | Enter throughput (per minute or per hour), speed, hours, shifts | Minimum belt speed needed |
| **4 Conveyor** | Enter the route (see section 3), width, lanes, guards | The **conveyor appears and runs** |
| **5 Results** | Read results, download the report, send an enquiry | The finished conveyor running |

Fields marked with a red * are required. **Next** will not continue until they are filled.
Use **Back** or click a step in the progress bar to change an earlier answer.

## 3. Entering the route (Step 4)

| Layout | What to type |
|---|---|
| Straight | Total route length (e.g. 12 m) |
| L-shaped | 3 rows: straight, curve, straight |
| U-shaped | 5 rows: straight, curve, straight, curve, straight |
| S-shaped | 5 rows: straight, left curve, straight, right curve, straight |
| Inclined | 3 rows: straight, incline, straight |
| Curved | 3 rows: straight, curve, straight |
| Custom | Add rows with **+ Straight**, **+ Curve**, **+ Incline** |

- **Straight row:** length in metres.
- **Curve row:** angle (e.g. 90), **centre-line radius** (e.g. 800 mm), turn Left or Right.
- **Incline row:** horizontal run (m) plus either the rise (mm; negative = decline) or the angle.
- Floor area is **not** conveyor length. Only the route you enter counts.

The drawing only appears when every row is complete. A yellow note tells you which row is missing.

## 4. How the drawing is built, step by step
The **Build progress** ticks show how far along you are:
1. **Floor space** - floor length and width entered
2. **Product** - size and weight entered
3. **Throughput / speed** - rate or speed entered
4. **Route** - all route rows complete
5. **Conveyor running** - everything is known; belt and products start moving

## 5. Reading the results page
- **Your conveyor in 3D:** the finished conveyor, running at your speed and spacing.
  - **Turn it:** drag with the mouse or one finger. **Zoom:** scroll wheel or pinch. **Move it:** Shift+drag, right-drag, or two fingers. Double-click refits.
  - **Buttons:** Isometric, Top, Front, Back, Inlet end, Outlet end (front/back/ends follow the direction your conveyor runs), Fit conveyor, Whole floor, Orthographic (true-proportion flat views), Auto-rotate, Full screen, Save image (PNG).
  - **Tick boxes:** Dimensions, Products, Frame/supports/drive, Floor and obstacles. Switch Dimensions off for a cleaner picture.
  - **Colours of dimensions:** black = you entered it, red = calculated from your entries, grey = indicative (not yet specified by Ultraplast).
  - **Red tags S1, S2...** are the route segments; the **Dimension schedule** table below the picture lists each one (length, radius, sweep, rise, heights).
  - Play/Pause, Restart and playback speed run the products; counters show products on the belt and delivered.
  - The tab **Plan view (2D) and side profile** keeps the flat drawing.
- **Recommended conveyor type** and the reasons. You may choose a different type in Step 4; the tool will flag problems.
- **Checks and flags:** red = problem to fix, yellow = check, grey = note.
- **Space and route, Product and throughput, Belt/chain and width:** each value has a label:
  - *Customer-provided* - you entered it
  - *Calculated estimate* - worked out from your data
  - *Configuration-dependent* - depends on product data that Ultraplast must confirm
  - *Engineering review required* - cannot be safely calculated here
- **Equipment checklist:** suggested items only, not a bill of materials.
- **Missing inputs, assumptions, exclusions, next steps.**

## 4a. Common red problems and the fix
| Message | Fix |
|---|---|
| Route does not fit inside the floor | Shorten the route, change layout, or move the start point |
| Route passes through an obstacle | Move the start point or change layout |
| Curve radius is below the published minimum | Increase the radius |
| Capacity below required throughput | Increase speed, add lanes, or reduce the gap |
| Conveyor narrower than the product | Increase conveyor width |
| Unsupported configuration | Choose a curve-capable conveyor type (or Automatic) |

## 6. Saving, reports and enquiry
- **Download PDF report** and **Download JSON summary** (results page).
- **Load JSON** (top right) re-opens a saved project. Nothing is saved automatically; closing the tab clears everything.
- **Metric / Imperial** switch (top right) converts your entries.
- **Advanced** switch adds engineering inputs (pitch, sprocket teeth, pulley diameter) for a belt-loop length estimate on simple straight layouts.
- **Request a quotation:** fill the form, tick consent, press **Submit**. The page only says "received" if the service really confirms. If online submission is not connected, use **Email Ultraplast (draft)** or call the numbers shown. Attach the PDF.
- **Reset / Start new project** clears everything.

## 7. Quick test (2 minutes)
Floor 20 x 6 - Layout Straight - Product 100 x 100 x 250 mm, 500 g, gap 50 - Throughput 60/min, speed 10 - Route length 12.
Expected: path 12.00 m, conveyor running at 10.00 m/min, 150 mm spacing.

## 8. For the Ultraplast team
- Edit product data only in `products.js`; settings in `config.js`.
- Verify every value in `docs/VERIFICATION_CHECKLIST.md` before public launch.
- Set the enquiry service URL in `config.js`; set the WhatsApp number only after it is confirmed.


## Colours, product movement and falling products
1. Step 2: choose a **Product colour**. Step 4: choose a **Belt colour** and (optional) the **friction μ** if you know it.
2. On the results page, in the 3D model, raise the **belt speed** box above the "highest safe speed" shown - products start sliding/tipping off the curve and fall to the floor. Lower it again and they stay on.
3. **Stop belt (test)** shows whether tall or slippery products slide or tip when the belt stops. The friction values are generic - confirm with Ultraplast engineering before relying on them.

## Engineering drawing (AutoCAD)
Results page -> **Engineering drawing (CAD)**: *Download 2D DXF*, *Download 3D DXF*, or the A3 *SVG sheet*. In AutoCAD use OPEN (or INSERT) on the .dxf file; units are millimetres.
Turn layers on/off: DIM_ENTERED (black), DIM_CALC (red) and DIM_IND (grey) show where each dimension came from. Layers ending _IND are indicative drawing aids only.


## Customer only knows the conveyor length
Leave the floor, product and throughput steps blank (just press Next) and enter the **conveyor length** in step 4. You still get the 3D view, the drawing (2D / 3D DXF, SVG sheet), PDF and JSON.
Anything not entered is shown as "not entered" and listed for engineering review - e.g. no floor outline, no fit-on-floor check, no product movement until a product size is entered. Add details later and press *Edit inputs* to refresh everything.


## Filling the form - the easy way
1. Press **Quick start** if you only know the conveyor length - type the length, press *Calculate results*.
2. Otherwise go step by step. Tags show what each box needs: **Needed** (red), **Helpful** (green), **Optional** (grey). Don't know? Leave it blank or press **Skip this step**.
3. The first card of the results, **In simple words**, explains the answer in plain language and lists what is still missing.

## BOM & Motor button

The **BOM & Motor →** button in the top bar opens `bom.html` for the current project. It shows the project inputs, what the engineer needs for the motor and drive, a BOM table and the planner's equipment checklist.

- The tool **does not select a motor** and **does not invent parts or quantities**. Until Ultraplast adds verified data, the BOM and motor tables say "Engineering review required".
- To fill them, an engineer edits the `bom` section of `products.js` (row format is described in the file's comment): `parts` (with qty rules per metre / per curve / per leg / fixed) and `motors` (reference list).
- The project is passed to the page once through the browser tab (removed as soon as it is read). Reloading the page clears it; use **Load JSON** on that page to reopen a saved project. Nothing is stored.
- **Print / Save as PDF** prints the sheet.

## Product catalogue and part recommendations

The **Catalogue** button (top bar) opens `catalogue.html`, built from the Ultraplast Product Range catalogue (46 pages): plastic modular belts (UMB 25 / 50 / 50HD, USF 25 / 50), thermoplastic and stainless steel slat chains, Multiflex chain, split sprockets, idler wheels, UHMWPE wearstrips and guides, corner tracks (tab and magnetic), return rollers, side brackets, clamps, tripod / bipod / leg pads, frame supports, handles and hinges.

- **Which parts do I need?** Answer what you know (what you convey, straight or curve, product width, curve radius, lanes, temperature, wet, stainless). It suggests belt / chain families and the matching parts.
- **Browse the catalogue:** tabs per product group, plus a search box (part number or word).
- On the **results page** a "Catalogue parts for this project" card shows the same suggestions for your route, and the **BOM & Motor** sheet lists them as the preliminary BOM.
- Matching follows the catalogue's own "Application" lines (for example series 812 chains use "URZ/UMZ ...-812/881M" sprockets). Quantities are given only where the catalogue makes them certain (one corner track per matching 90-degree curve); chain length, sprocket choice, wear-strip profile and frame parts are **Engineering to confirm**.
- Corner tracks exist only for 90 degrees, radius 500 / 650 / 1000 mm (tab) or 500 / 585 / 670 / 755 mm (magnetic), for 82.5 mm chain. Other curves are flagged for engineering review.
- To change the data, edit `catalogue.js` (each block carries its catalogue page number). Re-check against the printed catalogue after any edit.

Catalogue photographs (`assets/catalogue/`) are cropped from the printed Ultraplast catalogue pages and shown on the catalogue page, in the recommendations and in the part groups. Keep that folder next to `index.html` when uploading to GitHub.
