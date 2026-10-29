# Are the drawings usable for manufacturing?

**No - not as generated.** Every drawing sheet and DXF says *"INDICATIVE drawing - for engineering review, not for manufacture."* That line is deliberate. Do not remove it and do not send these drawings to the shop floor until the steps at the end of this page are done.

## What the drawings ARE good for
- Quotation discussions and customer conversations
- Checking the route: lengths, curve radius and angle, incline rise and run, heights, belt width, product size
- Checking the layout against the floor (when the floor size is given)
- A correct starting point that Ultraplast engineers can take into AutoCAD and complete

## Why they are NOT manufacturing drawings
1. **Indicative parts.** Frame section, side guides, legs, rollers, motor and belt thickness are placeholder sizes (`IND` in `conveyor3d.js`) drawn so the picture reads like a conveyor. They are not Ultraplast designs. In the DXF their layers end in `_IND`, and their dimensions are grey.
2. **Missing engineering.** There is no motor power, shaft / sprocket / pulley sizing, belt tension, or structural check of frame and legs. No weld details, fasteners, tolerances, materials or surface finish. No bill of materials. The tool lists these as "Engineering review required" instead of guessing.
3. **Dimensions are not AutoCAD dimension objects.** They are lines and text, so they do not update when geometry is edited.
4. **Garbage in, garbage out.** The geometry is only as exact as what the customer typed. A manufacturing drawing needs site measurements checked by Ultraplast.
5. **Illustrative defaults.** Inlet height or belt width not entered are drawn at stated illustrative values and labelled "not entered".
6. **Not verified in real AutoCAD.** The DXF files were checked with a strict structure parser and rendered images only.
7. **Behaviour model.** Product slide / tip / fall is illustrative; friction values are generic and unverified (`products.js` -> `behaviour`).

## What is needed to make them usable for manufacturing
1. **Ultraplast supplies the real standard parts**, per conveyor type (start with one, e.g. plastic modular belt): frame profiles, leg and bracket designs, side-guide design, drive / motor options, bearing, shaft, sprocket and idler details. These are added to `products.js` and the drawing uses them instead of placeholders.
2. **Add a real bill of materials and standard detail views** (frame section, drive-end and idler-end details, leg / foot detail).
3. **Engineering calculations** done and recorded by Ultraplast engineers (power, tension, structure).
4. **Sign-off step**: an Ultraplast engineer reviews and approves each drawing. Only then may a "released for manufacture" version exist (to be built as a sign-off step in the tool, not a text change).
5. **Test in real AutoCAD** and fix anything that looks wrong.

## Rule for staff
Output of this tool = **preliminary / indicative**. Manufacturing drawings = made and approved by Ultraplast engineering.

## Website data check (2026-10-22)
The company page, conveyor-systems page and belts-and-chains page of ultraplastindia.com were re-read. Updated from them: WhatsApp number (+91 9205246473, now shown on the site, so the WhatsApp button is enabled), social links, website page links, and the conveyor type / sub-type names (`websiteCatalogue` in `products.js`). The website publishes **no numeric specifications** (width, pitch, radius, speed, load, incline) for these types, so none were added; they remain "Engineering review required". Please re-verify the WhatsApp number before launch.

## Catalogue data added (2026-10-23)
The Ultraplast Product Range catalogue (46 pages) has been transcribed into `catalogue.js` and used for the belt / chain families in `products.js`, the catalogue page, the results-page parts card and the BOM sheet. This supplies real standard part numbers, widths, pitches, sprocket and idler sizes and corner-track data (step 1 of "what is needed" above, for those parts). **Still missing for manufacturing:** frame profiles and leg design, drive and motor options (the catalogue has none), conveyor lengths and chain loop quantities, calculations, and engineer sign-off. The catalogue was read from a scanned PDF by eye: please have a second person check `catalogue.js` against the printed pages before relying on any number.
Known catalogue/website differences: the old website text listed a 28 or 38 mm modular pitch; the catalogue lists 25 and 50 mm only, which is what the tool now uses. Plastic side-flex radius is given as the INNERMOST radius (2.2 x width for USF 25, 2.6 x for USF 50); the tool adds half the belt width to compare it with the route centre-line radius.
