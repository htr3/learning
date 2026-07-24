/*
 * Injects the shared GA4 loader (<script src=".../assets/analytics.js">) into
 * every .html file, right before </head>, using the correct relative depth.
 *
 * Idempotent: running it again will not add duplicate tags.
 *
 * Usage:  node scripts/add-analytics.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MARKER = "assets/analytics.js";

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) out.push(full);
  }
  return out;
}

const files = walk(ROOT, []);
let added = 0, skipped = 0, missing = 0;

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");

  if (html.includes(MARKER)) { skipped++; continue; }

  // Relative path from this file's folder back to <root>/assets/analytics.js
  const rel = path
    .relative(path.dirname(file), path.join(ROOT, "assets", "analytics.js"))
    .split(path.sep)
    .join("/");

  const tag = `<script src="${rel}"></script>\n`;

  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, tag + "</head>");
  } else if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, tag + "</body>");
  } else {
    console.warn("  ! no </head> or </body>:", path.relative(ROOT, file));
    missing++;
    continue;
  }

  fs.writeFileSync(file, html, "utf8");
  console.log("  + " + path.relative(ROOT, file) + "  ->  " + rel);
  added++;
}

console.log(`\nDone. added=${added} skipped=${skipped} missing=${missing} total=${files.length}`);
