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
    // Optional: name of a boolean/"success" field the service returns in its JSON body.
    // Leave '' to treat any HTTP 2xx as success (Formspree, Web3Forms and most services work this way).
    successField: ''
  },
  upload: {
    // Public upload endpoint for floor plans / drawings (must be a secure third-party or own service).
    // Leave '' to disable uploading; users are told to email the drawing instead.
    endpoint: '',
    maxMB: 10,
    allowed: ['pdf', 'png', 'jpg', 'jpeg', 'dwg', 'dxf']
  },
  // Show the "Load project JSON" button.
  allowImport: true
};
