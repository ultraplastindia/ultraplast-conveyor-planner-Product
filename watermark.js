/*
 * watermark.js - diagonal DOUBLE-LAYER company name + logo watermark for everything that is printed
 * (browser Print / Save as PDF). It is invisible on screen and appears on every printed page.
 * Layer 1: company name + logo, rotated, grey.  Layer 2: the same, offset, in brand red - so the page
 * looks stamped twice, crosswise. Light enough that the text underneath stays readable.
 * The PDF report and the SVG drawing sheets carry their own copy of the same watermark.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var P = window.UCPProducts && window.UCPProducts.company ? window.UCPProducts.company : {};
  var NAME = String(P.name || 'Ultraplast Chainbelts Private Limited').toUpperCase(), LOGO = P.logoUrl || '';
  function build() {
    if (document.getElementById('wmPrint')) return;
    var wrap = document.createElement('div'); wrap.id = 'wmPrint'; wrap.setAttribute('aria-hidden', 'true');
    ['wml1', 'wml2'].forEach(function (cls) {
      var layer = document.createElement('div'); layer.className = 'wml ' + cls;
      for (var i = 0; i < 110; i++) {
        var t = document.createElement('span'); t.className = 'wmt';
        if (LOGO) { var lg = document.createElement('span'); lg.className = 'wmlogo'; lg.style.backgroundImage = 'url("' + LOGO.replace(/"/g, '') + '")'; t.appendChild(lg); }
        var b = document.createElement('b'); b.textContent = NAME; t.appendChild(b); layer.appendChild(t);
      }
      wrap.appendChild(layer);
    });
    document.body.appendChild(wrap);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
