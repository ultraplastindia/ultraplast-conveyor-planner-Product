/*
 * config.js — DEPLOYMENT SETTINGS (safe to commit: contains NO secrets)
 * ---------------------------------------------------------------------------
 * GitHub Pages is static hosting. Anything that stores customer data must go to a
 * separate, secure service. Put ONLY public endpoint URLs here - never API keys,
 * passwords or tokens that grant access to private data.
 */
window.UCP_CONFIG = {
  enquiry: {
    // Public form-endpoint URL, e.g. a Formspree / Web3Forms / Google Apps Script web-app /
    // your own server URL that accepts JSON via POST. Leave '' until configured.
    // While '' the app NEVER claims an enquiry was sent; it offers an email draft instead.
    endpoint: '',
    timeoutMs: 15000,
    // 'json'  = normal JSON request (Formspree, own server).
    // 'text'  = JSON sent as text/plain - REQUIRED for a Google Apps Script web app (avoids a blocked CORS pre-flight).
    sendAs: 'json',
    // Optional: name of a boolean/"success" field the service returns in its JSON body.
    // Leave '' to treat any HTTP 2xx as success (Formspree, Web3Forms and most services work this way).
    // For the Google Sheet script in google-sheets/Code.gs use: sendAs 'text' and successField 'ok'.
    successField: ''
  },
  // Optional: read product data from a Google Sheet "Published to the web" as CSV (one link per tab).
  // Leave '' to use the built-in values in products.js. See docs/GOOGLE_SHEETS_SETUP.md.
  sheets: {
    engineeringCsv: '',
    familiesCsv: '',
    companyCsv: '',
    timeoutMs: 6000
  },
  upload: {
    // Public upload endpoint for floor plans / drawings (must be a secure third-party or own service).
    // Leave '' to disable uploading; users are told to email the drawing instead.
    endpoint: '',
    maxMB: 10,
    allowed: ['pdf', 'png', 'jpg', 'jpeg', 'dwg', 'dxf']
  },
  // Internal costing panel (rate card entered by staff; the tool ships with NO prices).
  // The "Costing" button in the header asks for ONE-TIME approval. Requests go to the same Google Apps Script as
  // enquiries (enquiry.endpoint); you approve or revoke in the "CostingAccess" tab of your Google Sheet.
  // While no endpoint is set, Costing stays LOCKED. enabled:true shows Costing to everyone (private copies only).
  // recheckMs = how often an open page re-checks that access was not revoked.
  costing: { enabled: false, recheckMs: 120000 },
  // Show the "Load project JSON" button.
  allowImport: true
};
