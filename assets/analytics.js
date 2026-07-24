/*
 * Google Analytics 4 loader (shared across every page).
 *
 * >>> SET YOUR MEASUREMENT ID BELOW <<<
 * 1. Go to https://analytics.google.com  ->  Admin  ->  Create property.
 * 2. Add a "Web" data stream for your GitHub Pages URL
 *    (e.g. https://<username>.github.io/<repo>/).
 * 3. Copy the Measurement ID -- it looks like  G-XXXXXXXXXX
 * 4. Paste it into MEASUREMENT_ID below and commit/push.
 *
 * Until a real ID is set, this file does nothing (no network calls, no errors),
 * so it is safe to ship as-is.
 */
(function () {
  "use strict";

  var MEASUREMENT_ID = "G-1L1YNB06SE"; // <-- replace with your GA4 Measurement ID

  // Not configured yet -> stay completely inert.
  if (!MEASUREMENT_ID || MEASUREMENT_ID === "G-XXXXXXXXXX") return;

  // Respect the browser's "Do Not Track" setting.
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", MEASUREMENT_ID);
})();
