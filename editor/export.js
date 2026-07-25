/* ============================================================
   export.js — export/import with zero dependencies.

   - JSON: the exact document shape used everywhere.
   - SVG : a standalone vector of the whole diagram (nodes drawn as
           rounded cards + icons, edges as routed paths + labels).
   - PNG : the SVG rasterized onto an offscreen <canvas>.
   ============================================================ */
import { store } from './core/state.js';
import { bus, EVT } from './core/bus.js';
import { download, borderPoint, boundsOf, escapeHtml } from './core/utils.js';
import { pathD } from './edges.js';
import { nodeIconInner } from './catalog.js';

const PAD = 60;

/* ---------------- JSON ---------------- */
export function exportJSON() {
  const name = safeName(store.doc.name) || 'diagram';
  download(`${name}.json`, JSON.stringify(store.serialize(), null, 2), 'application/json');
  toast('Exported JSON');
}

export function importJSONDialog(onLoaded) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const doc = JSON.parse(reader.result);
        store.loadDoc(doc, { reason: 'import' });
        toast('Imported diagram', 'ok');
        onLoaded && onLoaded();
      } catch (err) {
        console.error(err);
        toast('Invalid JSON file', 'bad');
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

/* ---------------- SVG ---------------- */
export function buildSVG() {
  const nodes = store.nodes;
  const b = boundsOf(nodes) || { x: 0, y: 0, w: 400, h: 300 };
  const W = b.w + PAD * 2;
  const H = b.h + PAD * 2;
  const ox = PAD - b.x;
  const oy = PAD - b.y;

  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter, Segoe UI, sans-serif">`);
  parts.push(`<defs>
    <marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#8b8b93"/></marker>
  </defs>`);
  parts.push(`<rect width="${W}" height="${H}" fill="#111111"/>`);
  parts.push(`<g transform="translate(${ox} ${oy})">`);

  // edges first (under nodes)
  for (const e of store.edges) {
    const a = store.getNode(e.from);
    const c = store.getNode(e.to);
    if (!a || !c) continue;
    const p1 = borderPoint(a, c.x + c.w / 2, c.y + c.h / 2);
    const p2 = borderPoint(c, a.x + a.w / 2, a.y + a.h / 2);
    const d = pathD(e.kind, p1, p2);
    parts.push(`<path d="${d}" fill="none" stroke="#8b8b93" stroke-width="2" marker-end="url(#arw)"/>`);
    if (e.label) {
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const w = e.label.length * 7 + 12;
      parts.push(`<rect x="${mx - w / 2}" y="${my - 10}" width="${w}" height="20" rx="6" fill="#202024" stroke="#3a3a42"/>`);
      parts.push(`<text x="${mx}" y="${my + 4}" fill="#f4f4f5" font-size="11" font-family="monospace" text-anchor="middle">${escapeHtml(e.label)}</text>`);
    }
  }

  // nodes (sorted by z so overlap matches the editor)
  for (const n of [...nodes].sort((a, z) => (a.z || 1) - (z.z || 1))) {
    const accent = n.color || '#7C3AED';
    const bg = n.bg || '#202024';
    const border = n.border || accent;
    parts.push(`<g transform="translate(${n.x} ${n.y})">`);
    parts.push(`<rect width="${n.w}" height="${n.h}" rx="13" fill="${bg}" stroke="${border}" stroke-width="1.5"/>`);
    parts.push(`<path d="M13 0 h${n.w - 26} a13 13 0 0 1 13 13 v-9 a4 4 0 0 0 -4 -4 h-${n.w - 8} a4 4 0 0 0 -4 4 v9 a13 13 0 0 1 13 -13 z" fill="${accent}" opacity="0.9"/>`);
    parts.push(`<rect x="0" y="0" width="${n.w}" height="4" rx="2" fill="${accent}"/>`);
    // icon chip
    const iy = n.h / 2 - 17;
    parts.push(`<rect x="11" y="${iy}" width="34" height="34" rx="9" fill="${accent}" fill-opacity="0.16" stroke="${accent}" stroke-opacity="0.34"/>`);
    parts.push(`<svg x="18" y="${iy + 7}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${nodeIconInner(n.type)}</svg>`);
    // text
    parts.push(`<text x="55" y="${n.h / 2 - 2}" fill="#f4f4f5" font-size="13" font-weight="700">${escapeHtml(clip(n.label, n.w))}</text>`);
    if (n.tech) parts.push(`<text x="55" y="${n.h / 2 + 14}" fill="#8b8b93" font-size="10.5">${escapeHtml(clip(n.tech, n.w))}</text>`);
    if (n.instances > 1) {
      parts.push(`<rect x="${n.w - 20}" y="-8" width="24" height="18" rx="9" fill="${accent}"/>`);
      parts.push(`<text x="${n.w - 8}" y="4" fill="#fff" font-size="10" font-weight="700" text-anchor="middle">×${n.instances}</text>`);
    }
    parts.push(`</g>`);
  }

  parts.push(`</g></svg>`);
  return parts.join('');
}

export function exportSVG() {
  if (!store.nodes.length) return toast('Nothing to export', 'bad');
  const name = safeName(store.doc.name) || 'diagram';
  download(`${name}.svg`, buildSVG(), 'image/svg+xml');
  toast('Exported SVG');
}

/* ---------------- PNG ---------------- */
export function exportPNG(scale = 2) {
  if (!store.nodes.length) return toast('Nothing to export', 'bad');
  const svgStr = buildSVG();
  const b = boundsOf(store.nodes);
  const W = b.w + PAD * 2;
  const H = b.h + PAD * 2;

  const img = new Image();
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(W * scale);
    canvas.height = Math.ceil(H * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((out) => {
      if (!out) return toast('PNG export failed', 'bad');
      download(`${safeName(store.doc.name) || 'diagram'}.png`, out, 'image/png');
      toast('Exported PNG');
    }, 'image/png');
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('PNG export failed', 'bad'); };
  img.src = url;
}

/* ---------------- helpers ---------------- */
function clip(text, nodeW) {
  const max = Math.max(4, Math.floor((nodeW - 60) / 7.5));
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}
function safeName(s) { return String(s || '').replace(/[^\w\-]+/g, '_').slice(0, 60); }
function toast(message, type = 'ok') { bus.emit(EVT.TOAST, { message, type }); }
