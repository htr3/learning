/* ============================================================
   utils.js — small, dependency-free helpers shared everywhere.
   ============================================================ */

/** Monotonic-ish unique id with a readable prefix. */
let _seq = 0;
export function uid(prefix = 'id') {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}${_seq.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const round = (v, step = 1) => Math.round(v / step) * step;

/** Trailing-edge debounce. */
export function debounce(fn, wait = 200) {
  let t = null;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
  wrapped.cancel = () => clearTimeout(t);
  wrapped.flush = (...args) => {
    clearTimeout(t);
    fn(...args);
  };
  return wrapped;
}

/** Deep clone (structuredClone with a JSON fallback). */
export function clone(obj) {
  if (typeof structuredClone === 'function') {
    try { return structuredClone(obj); } catch (_) { /* fall through */ }
  }
  return JSON.parse(JSON.stringify(obj));
}

/* ---------------- DOM helpers ---------------- */
const SVGNS = 'http://www.w3.org/2000/svg';

/** Create an HTML element: el('div', {class:'x', dataset:{id}}, [children|string]). */
export function el(tag, props = {}, children) {
  const node = document.createElement(tag);
  applyProps(node, props);
  appendChildren(node, children);
  return node;
}

/** Create an SVG element. */
export function svg(tag, props = {}, children) {
  const node = document.createElementNS(SVGNS, tag);
  for (const k in props) {
    if (props[k] == null) continue;
    node.setAttribute(k, props[k]);
  }
  appendChildren(node, children);
  return node;
}

function applyProps(node, props) {
  for (const k in props) {
    const v = props[k];
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
}

function appendChildren(node, children) {
  if (children == null) return;
  const arr = Array.isArray(children) ? children : [children];
  for (const c of arr) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------------- geometry ---------------- */

/** Axis-aligned rect of a node. */
export function nodeRect(n) {
  return { x: n.x, y: n.y, w: n.w, h: n.h, cx: n.x + n.w / 2, cy: n.y + n.h / 2 };
}

export function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/**
 * Point on the border of a node's rect along the ray from its centre
 * toward (tx,ty). Used to anchor edges neatly at node edges.
 */
export function borderPoint(n, tx, ty) {
  const cx = n.x + n.w / 2;
  const cy = n.y + n.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = n.w / 2;
  const hh = n.h / 2;
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/** Bounding box for a set of nodes. */
export function boundsOf(nodes) {
  if (!nodes.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/* ---------------- misc ---------------- */

/** Download a Blob or string as a file. */
export function download(filename, data, mime = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Is the user currently typing in an input/textarea/contenteditable? */
export function isEditingText(target = document.activeElement) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}
