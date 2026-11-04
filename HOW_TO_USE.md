
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

## Hydraulic stand on inclined and declined sections

1. In Step 1 choose **Inclined** (or **Custom layout** and add an **Incline / decline** segment).
2. In Step 4, on the incline / decline row, tick **Support with hydraulic stand(s)**. Choose 1, 2 or 3 stands; optionally type the adjustable stroke (mm) and the cylinder / capacity exactly as you know it.
3. The 3D view shows a real-looking stand: twin cylinders with base plates, chrome rods, saddle under the frame, a hinge at the low end and a hand pump with hoses. Plain legs under that section are replaced by the stands.
4. **Raise / lower** (under the 3D view, while the belt runs): use Lower / Raise or the slider. The angle, rise and stand extension change live. Travel is half the stroke each way (150 mm placeholder if no stroke was typed). **Reset** returns to your entered height. **Keep this height** copies it into the route so results and drawings use it.
5. The drawings (plan, side elevation, a section through the stand, 3D DXF layer HYD3D) and sheet 2 carry the stands with a **Hydraulic stand schedule**: calculated stand height, typed stroke and typed rating.

The tool does not select or size cylinders, pumps, capacity or locking. Those sizes are placeholders; engineering review is required.

## Units panel (mm, m, ft, inch)

Beside the Metric / Imperial buttons in the header is a **Units** panel. Choose **Millimetres**, **Metres**, **Feet** or **Inches** and every length, height, radius and rise (entry boxes, results, 3D labels, PDF report) uses that one unit; your typed values are converted for you. Metric (m and mm) and Imperial (ft and in) still work as before. The drawing files (DXF / SVG) always stay in millimetres, the normal AutoCAD unit.

## Wrong measurement? Fix it on the results page

Above the 3D conveyor there is a **Wrong measurement?** box with the route length, each segment's length, turn angle, radius, incline run, rise and angle, plus inlet height, discharge height and belt width. Type the corrected value and press Enter: the 3D conveyor, drawings, results and PDF are recalculated at once. On an incline, changing the angle recalculates the rise and changing the rise recalculates the angle.

## Print watermark

Anything you print (browser Print or Save as PDF) carries a light diagonal **double-layer watermark** of the company full name and logo on every page. The downloaded PDF report and the SVG drawing sheets carry the same watermark (the PDF uses the ULTRAPLAST wordmark, because the logo image cannot be embedded there).

## Hydraulic stand: advanced 3D

Each stand has twin cylinders with a trunnion foot, head flange, chrome rod with extension scale bands and a **safety lock collar**, a **telescopic guide pillar** beside each cylinder with 50 mm scale ticks, base plates and anchor bolts, two hose circuits with clamps, and a **Hand pump** (handle, gauge, release knob, relief valve) or an **Electric power pack** with motor, valve block and an up / down pendant. Choose the pump unit on the segment row. In the lift panel, **Auto up / down (demo)** moves the section by itself so you can watch the stands extend and retract. All sizes are placeholders; nothing is selected or sized.

## Drawings: export everything together
On the results page the drawing card has **Download ALL drawings together (DXF for AutoCAD)**. One file holds the plan, floor layout, side elevation, end view, the equipment and route schedules, the title block and the 3D model (to the right of the 2D layout). Everything is full size in millimetres. **Download all sheets (SVG)** gives the same as two A3 sheets. Dimensions are lines and text (not editable AutoCAD dimension objects); the tests check that every dimension's length equals the number printed on it.

## Mobile castor lift stand (like a mobile inclined belt conveyor)

On an incline row, tick **Support with hydraulic stand(s)** and set **Stand type** to **Mobile castor lift stand**. The 3D view then shows a welded base frame on four castors with a push handle, a vertical lift column, a lift cylinder and a power pack (hand pump or electric), with the belt hinged at its low end. Optional boxes: base frame length, base frame width, castor height. Anything left blank is an indicative placeholder (grey, marked *). The Raise / Lower control works as for the other stand type.

On the results page, under **Engineering drawing (CAD)**, a separate **Mobile lift stand drawing** shows plan, side and front views with all dimensions and a dimension table. Download it as **DXF (AutoCAD)** or **SVG (A3)**. Black = entered, red = calculated, grey * = indicative. It is marked "INDICATIVE drawing - for engineering review, not for manufacture" and carries the company watermark. The tool does not select or size the frame, castors, cylinder, pump, motor or capacity.

## Movable conveyor switch (results page)

Above the 3D view, **Movable conveyor (on castors)** lists every incline and decline. Tick **Movable** and that segment gets the castor lift stand in the 3D view, the drawings and the separate stand drawing. Untick it and the incline goes back to a normal frame with plain legs: no stand in 3D, none in the drawings. (A floor stand chosen earlier on the same segment is replaced when you tick Movable.)

While Movable is on, sliders roll the whole conveyor around the floor like a truck-loading conveyor: **Drive forward / back**, **Side-step**, **Turn on the spot**, plus a driving demo and **Reset position**. This is a what-if; **Keep this position** saves the new start point and direction into your entries, and the drawings follow.

Update: a movable incline has **no fixed frame or plain legs**. Only the hydraulic lift stand at the front (high) end carries the belt: a short wheeled base on four castors with the lift column, cylinder and power pack. Raise / Lower moves that stand up and down, and the low end hinges on a small two-wheel axle so the whole conveyor can be rolled by its wheels. Base length and width are optional entries; blank means an indicative placeholder.

Update (from the reference video): the movable incline is drawn like a truck-loading conveyor - a wheeled base frame on four castors under the belt, the belt hinged on its front (low) end, a vertical lift column with lift cylinder and power pack under the belt that raises the high end, a handle loop on one side, and yellow hand rails on both sides of the incline. There are no plain fixed legs under the incline. The horizontal top section is the next straight segment of your route. The separate stand drawing shows the handle loop and hand rail dimensions too. Base length and width are optional entries; blank = indicative placeholder (grey, *).
