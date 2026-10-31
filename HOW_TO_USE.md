
## Quick fill (industry + weight)

On Step 2, after choosing an industry, pick a typical product from the **Quick fill** box, or just type the product weight (and unit). The tool fills size, handling type, gap, rate, fragility and conditions from the `presets` list in `products.js`.

- These values are TYPICAL EXAMPLES, not Ultraplast specifications and not customer data. Every filled field is marked "Suggested - check" and appears in the results as an assumption.
- Change any value: the badge becomes "Edited", and the running 3D conveyor and the "Suggested Ultraplast product" panel update live.
- Typed sizes are never overwritten. The suggested product comes from the Ultraplast catalogue; roller conveyors are not in it, so the panel says engineering will advise.
- To change the examples, edit `presets` in `products.js`.


## Frozen header and Costing button
The top bar stays in view while you scroll, on every page. The yellow **Costing** button asks for one-time approval; the owner approves or revokes it in the CostingAccess tab of the Google Sheet (see docs/COSTING.md). On the BOM and Catalogue pages the Costing link takes you to the planner and opens the same approval.

## Drive motor and sensors in the 3D view and drawings
Step 4 has a section **Drive motor and sensors**. Press **+ Add motor**, **+ Add photo-eye sensor**, **+ Add proximity sensor** or **+ Add other equipment**, then type what you know:
- Name or tag, and the rating exactly as you know it (e.g. `0.37 kW, 1440 rpm`).
- Position from the inlet (mm along the belt route), side (left or right of travel) and height above the belt top.
- Length, width and height of the body.

The live 3D view, the results 3D view and every drawing show the item at that place with a label and the values. Anything left blank is drawn as a grey placeholder and marked with `*` in the schedule. A motor left without a position is drawn at the discharge end. The tool never selects or sizes a motor or sensor.

## Drawings: export everything together
On the results page the drawing card has **Download ALL drawings together (DXF for AutoCAD)**. One file holds the plan, floor layout, side elevation, end view, the equipment and route schedules, the title block and the 3D model (to the right of the 2D layout). Everything is full size in millimetres. **Download all sheets (SVG)** gives the same as two A3 sheets. Dimensions are lines and text (not editable AutoCAD dimension objects); the tests check that every dimension's length equals the number printed on it.
