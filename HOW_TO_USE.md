
## Quick fill (industry + weight)

On Step 2, after choosing an industry, pick a typical product from the **Quick fill** box, or just type the product weight (and unit). The tool fills size, handling type, gap, rate, fragility and conditions from the `presets` list in `products.js`.

- These values are TYPICAL EXAMPLES, not Ultraplast specifications and not customer data. Every filled field is marked "Suggested - check" and appears in the results as an assumption.
- Change any value: the badge becomes "Edited", and the running 3D conveyor and the "Suggested Ultraplast product" panel update live.
- Typed sizes are never overwritten. The suggested product comes from the Ultraplast catalogue; roller conveyors are not in it, so the panel says engineering will advise.
- To change the examples, edit `presets` in `products.js`.


## Frozen header and Costing button
The top bar stays in view while you scroll, on every page. The yellow **Costing** button asks for one-time approval; the owner approves or revokes it in the CostingAccess tab of the Google Sheet (see docs/COSTING.md). On the BOM and Catalogue pages the Costing link takes you to the planner and opens the same approval.
