# Cost estimate (internal) - how it works

The planner ships with **no prices**. Costing is a calculator that multiplies **your own rates** by quantities taken from the conveyor the customer designed.

## Turn it on (staff only)
- Press the yellow **Costing** button in the frozen header. The first time, a short form asks for name, company, mobile and email. You approve it (see below). The old `?costing=1` shortcut no longer works.
- Or set `costing: { enabled: true }` in `config.js` (then every visitor sees it - not recommended on the public site).
- This is an approval gate on the page, **not bank-grade security**. The tool ships with no prices; rates live only in the browser unless saved to a file. For a fully private tool, keep a private copy of the site for staff.

## Use it
1. Finish the wizard to the Results page, scroll to **Cost estimate (internal)**.
2. Type a **Rate** for each line (rupees per unit). The Qty shown under each box is calculated from the route; type a number in Qty to override it.
3. Change **Based on** to price a line by a different quantity (belt area, frame metres, legs, curves, fixed lot...). **Add line** for anything else; **Remove** or untick **On** to drop a line.
4. Set Wastage %, Overhead %, Margin %, Discount % and GST %.
5. **Save rate card** downloads a `.json` file; **Load rate card** reads it back next time, so you set rates once. Tick **Remember** to keep it in this browser only.
6. **Download costing CSV** opens in Excel.

## Maths
`line = rate x quantity` -> subtotal -> + wastage % -> + overhead % -> + margin % -> - discount % -> + GST % = total.
A line with no rate (or an unknown quantity) is flagged and the total says **INCOMPLETE** - it is never silently counted as zero.

## What it is not
- Not a quotation and never sent to the customer: rates are not in the PDF, the JSON summary or the enquiry.
- Quantities for legs, frame, guides and ends are indicative (from the planner, not a final design). Motor, drive, structure, controls and installation still need Ultraplast engineering; price them as lots or with manual quantities.
- If rates change often, keep one rate-card file per product family or per season and load the right one.


## Approving and revoking Costing (owner)
1. Set up the Google Sheet script (`google-sheets/Code.gs`, see GOOGLE_SHEETS_SETUP.md) and put its Web app URL in `config.js` (`enquiry.endpoint`, `sendAs: 'text'`, `successField: 'ok'`). Re-deploy the script after updating `Code.gs` (Manage deployments, edit, New version). Without this, Costing stays LOCKED for everyone.
2. A visitor presses **Costing** and sends the form. A row appears in the **CostingAccess** tab with Status **Pending**. Optional: put your email in `OWNER_EMAIL` in `Code.gs` to get a mail for each request.
3. **Approve:** set Status to `Approved`. The visitor presses Costing again and it opens. They are asked only once per device.
4. **Revoke any time:** set Status to `Revoked` (or delete the row). An open page notices within about 2 minutes (`costing.recheckMs` in `config.js`) and hides Costing; a new click shows "access withdrawn".
5. Approval belongs to one browser/device (a random code, not personal data). A new device or cleared browser data must ask again.
6. If the service cannot be reached, Costing stays locked (it never opens "by default").
