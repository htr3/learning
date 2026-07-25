/* ============================================================
   toolbar.js — wires the header buttons (data-action) to
   commands: undo/redo, zoom, fit, grid, connector style, auto
   layout, templates, export/import, clear and theme.
   ============================================================ */
import { store, emptyDoc } from './core/state.js';
import { bus, EVT } from './core/bus.js';
import { viewport } from './viewport.js';
import { openMenu, confirmModal } from './core/ui.js';
import { exportPNG, exportSVG, exportJSON, importJSONDialog } from './export.js';
import { openTemplatePicker } from './templates.js';

const COL = (c) => 40 + c * 250;
const ROW = (r) => 60 + r * 120;
const EDGE_KINDS = ['curved', 'straight', 'orthogonal'];

export function initToolbar() {
  const header = document.getElementById('ed-header');
  header.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    handle(btn.dataset.action, btn);
  });

  // reflect undo/redo availability
  bus.on(EVT.HISTORY, ({ canUndo, canRedo }) => {
    setDisabled('undo', !canUndo);
    setDisabled('redo', !canRedo);
  });
  bus.on(EVT.SETTINGS, syncButtons);

  syncButtons();
}

function handle(action, btn) {
  switch (action) {
    case 'undo': cmdUndo(); break;
    case 'redo': cmdRedo(); break;
    case 'zoom-in': viewport.zoomIn(); break;
    case 'zoom-out': viewport.zoomOut(); break;
    case 'zoom-reset': viewport.resetZoom(); break;
    case 'fit': viewport.fit(); break;
    case 'toggle-grid': store.setSetting('grid', !store.settings.grid); break;
    case 'toggle-animated': cycleAnimated(); break;
    case 'edge-kind': cycleEdgeKind(); break;
    case 'auto-layout': autoLayout(); break;
    case 'templates': openTemplatePicker(btn); break;
    case 'export': openExportMenu(btn); break;
    case 'import-json': importJSONDialog(() => setTimeout(() => viewport.fit(), 30)); break;
    case 'clear': clearCanvas(); break;
    case 'theme': toggleTheme(); break;
    default: break;
  }
}

/* history is loaded lazily to avoid a hard import cycle at module load */
async function cmdUndo() { (await import('./history.js')).undo(); }
async function cmdRedo() { (await import('./history.js')).redo(); }

function cycleEdgeKind() {
  const i = EDGE_KINDS.indexOf(store.settings.edgeKind);
  const next = EDGE_KINDS[(i + 1) % EDGE_KINDS.length];
  store.setSetting('edgeKind', next);
  // apply to selected edges too, if any
  const sel = [...store.edgeSelection];
  if (sel.length) sel.forEach((id) => store.updateEdge(id, { kind: next }, { commit: false }));
  if (sel.length) store.commit('edge-kind');
}

function cycleAnimated() {
  const on = !store.settings.animated;
  store.setSetting('animated', on);
  const sel = [...store.edgeSelection];
  if (sel.length) { sel.forEach((id) => store.updateEdge(id, { animated: on }, { commit: false })); store.commit('animate'); }
}

function openExportMenu(btn) {
  const r = btn.getBoundingClientRect();
  const ic = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  openMenu([
    { title: 'Export diagram' },
    { label: 'PNG image', icon: ic('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'), onClick: () => exportPNG() },
    { label: 'SVG vector', icon: ic('<path d="M4 4h16v16H4z"/><path d="M8 12h8M12 8v8"/>'), onClick: () => exportSVG() },
    { label: 'JSON file', icon: ic('<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>'), onClick: () => exportJSON() },
  ], r.left, r.bottom + 6);
}

async function clearCanvas() {
  if (!store.nodes.length) return;
  const ok = await confirmModal({
    title: 'Clear the canvas?',
    message: 'This removes every node and connector. You can undo (Ctrl+Z) afterwards.',
    confirmText: 'Clear', danger: true,
  });
  if (ok) store.loadDoc(emptyDoc(), { reason: 'clear' });
}

function toggleTheme() {
  const light = !document.body.classList.contains('theme-light');
  document.body.classList.toggle('theme-light', light);
  store.setSetting('theme', light ? 'light' : 'dark');
  viewport.apply();
}

/* ---------------- simple layered auto-layout ---------------- */
function autoLayout() {
  const nodes = store.nodes;
  if (!nodes.length) return;
  const ids = new Set(nodes.map((n) => n.id));
  const out = new Map(nodes.map((n) => [n.id, []]));
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of store.edges) {
    if (ids.has(e.from) && ids.has(e.to)) { out.get(e.from).push(e.to); indeg.set(e.to, indeg.get(e.to) + 1); }
  }
  const level = new Map(nodes.map((n) => [n.id, 0]));
  const indegC = new Map(indeg);
  const queue = [...indeg].filter(([, d]) => d === 0).map(([id]) => id);
  const seen = new Set();
  while (queue.length) {
    const id = queue.shift();
    seen.add(id);
    for (const to of out.get(id)) {
      level.set(to, Math.max(level.get(to), level.get(id) + 1));
      indegC.set(to, indegC.get(to) - 1);
      if (indegC.get(to) === 0) queue.push(to);
    }
  }
  // nodes left in cycles: spread them onto the deepest level + 1
  let maxL = 0;
  for (const l of level.values()) maxL = Math.max(maxL, l);
  for (const n of nodes) if (!seen.has(n.id)) level.set(n.id, maxL + 1);

  const byLevel = new Map();
  for (const n of nodes) {
    const l = level.get(n.id) || 0;
    if (!byLevel.has(l)) byLevel.set(l, []);
    byLevel.get(l).push(n);
  }
  for (const [l, arr] of byLevel) {
    arr.sort((a, b) => a.y - b.y);
    arr.forEach((n, i) => { n.x = COL(l); n.y = ROW(i); });
  }
  store.commit('auto-layout');
  setTimeout(() => viewport.fit(), 20);
}

/* ---------------- button sync ---------------- */
function syncButtons() {
  toggleActive('btn-grid', store.settings.grid);
  toggleActive('btn-animated', store.settings.animated);
  toggleActive('btn-theme', store.settings.theme === 'light');
  const lbl = document.getElementById('edge-kind-label');
  if (lbl) lbl.textContent = store.settings.edgeKind[0].toUpperCase() + store.settings.edgeKind.slice(1);
}
function toggleActive(id, on) { const el = document.getElementById(id); if (el) el.classList.toggle('active', !!on); }
function setDisabled(action, disabled) {
  const el = document.querySelector(`[data-action="${action}"]`);
  if (el) el.disabled = disabled;
}
