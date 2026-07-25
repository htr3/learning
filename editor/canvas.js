/* ============================================================
   canvas.js — the render + interaction orchestrator.

   Owns the node/edge DOM registries and reconciles them with the
   store. Handles empty-canvas gestures (marquee select, pan hand-
   off), selection styling, and the right-click context menu.
   Individual node/edge behaviour lives in nodes.js / edges.js.
   ============================================================ */
import { store } from './core/state.js';
import { bus, EVT } from './core/bus.js';
import { viewport } from './viewport.js';
import { rectsIntersect, nodeRect } from './core/utils.js';
import {
  buildNodeEl, applyNodeEl, startRename,
  deleteSelection, duplicateSelection, toggleLockSelection,
  bringForward, sendBackward, groupSelection, ungroupSelection,
  copySelection, cutSelection, pasteClipboard,
} from './nodes.js';
import { buildEdgeEl, updateEdgeEl, ensureDefs } from './edges.js';
import { openMenu } from './core/ui.js';

/** @type {Map<string, HTMLElement>} */
const nodeEls = new Map();
/** @type {Map<string, SVGGElement>} */
const edgeEls = new Map();

let viewportEl, worldEl, nodeLayer, edgeGroup, marqueeEl, wrap;
let lastClient = { x: 0, y: 0 };

export function initCanvas() {
  viewportEl = document.getElementById('viewport');
  worldEl = document.getElementById('world');
  nodeLayer = document.getElementById('node-layer');
  edgeGroup = document.getElementById('edge-group');
  marqueeEl = document.getElementById('marquee');
  wrap = document.getElementById('ed-canvas-wrap');

  viewport.init({ wrap: viewportEl, world: worldEl });
  ensureDefs();

  viewportEl.addEventListener('pointerdown', onCanvasPointerDown);
  wrap.addEventListener('contextmenu', onContextMenu);
  wrap.addEventListener('pointermove', (e) => { lastClient = { x: e.clientX, y: e.clientY }; });
  // double-click empty canvas -> quick zoom-to-fit toggle feels nice
  viewportEl.addEventListener('dblclick', (e) => {
    if (e.target === viewportEl) viewport.fit();
  });

  bus.on(EVT.DOC_CHANGE, render);
  bus.on(EVT.DOC_LOADED, render);
  bus.on(EVT.DOC_LIVE, render);
  bus.on(EVT.SELECTION, applySelectionStyles);

  render();
}

/* ---------------- registry access (used by nodes.js) ---------------- */
export const getNodeEl = (id) => nodeEls.get(id);
export const getEdgeEl = (id) => edgeEls.get(id);

export function refreshNodeEl(id) {
  const el = nodeEls.get(id);
  const node = store.getNode(id);
  if (el && node) applyNodeEl(el, node, store.selection.has(id));
}

export function refreshEdgesForNodes(idSet) {
  for (const e of store.edges) {
    if (idSet.has(e.from) || idSet.has(e.to)) {
      const g = edgeEls.get(e.id);
      if (g) updateEdgeEl(g, e);
    }
  }
}

/* ---------------- full reconcile render ---------------- */
export function render() {
  // nodes
  const liveNodeIds = new Set(store.nodes.map((n) => n.id));
  for (const [id, el] of nodeEls) {
    if (!liveNodeIds.has(id)) { el.remove(); nodeEls.delete(id); }
  }
  for (const node of store.nodes) {
    let el = nodeEls.get(node.id);
    if (!el) { el = buildNodeEl(node); nodeEls.set(node.id, el); nodeLayer.appendChild(el); }
    else applyNodeEl(el, node, store.selection.has(node.id));
  }

  // edges
  const liveEdgeIds = new Set(store.edges.map((e) => e.id));
  for (const [id, g] of edgeEls) {
    if (!liveEdgeIds.has(id)) { g.remove(); edgeEls.delete(id); }
  }
  for (const edge of store.edges) {
    let g = edgeEls.get(edge.id);
    if (!g) { g = buildEdgeEl(edge); edgeEls.set(edge.id, g); edgeGroup.appendChild(g); }
    else updateEdgeEl(g, edge);
  }

  document.body.classList.toggle('has-nodes', store.nodes.length > 0);
  updateStatus();
}

function applySelectionStyles() {
  for (const [id, el] of nodeEls) el.classList.toggle('selected', store.selection.has(id));
  for (const e of store.edges) { const g = edgeEls.get(e.id); if (g) updateEdgeEl(g, e); }
  updateStatus();
}

function updateStatus() {
  const n = store.nodes.length;
  const e = store.edges.length;
  const sel = store.selection.size + store.edgeSelection.size;
  setText('st-nodes', `${n} node${n === 1 ? '' : 's'}`);
  setText('st-edges', `${e} edge${e === 1 ? '' : 's'}`);
  setText('st-selection', sel ? `${sel} selected` : 'No selection');
}
const setText = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };

/* ---------------- empty-canvas pointer (pan / marquee) ---------------- */
function onCanvasPointerDown(e) {
  if (e.button === 2) return;
  if (viewport.spaceDown || e.button === 1) { viewport.beginPan(e); return; }
  if (e.button !== 0) return;

  const additive = e.shiftKey || e.metaKey || e.ctrlKey;
  if (!additive) store.clearSelection();
  beginMarquee(e, additive);
}

function beginMarquee(e, additive) {
  const rect = viewportEl.getBoundingClientRect();
  const startClient = { x: e.clientX, y: e.clientY };
  const startWorld = viewport.screenToWorld(e.clientX, e.clientY);
  const base = additive ? new Set(store.selection) : new Set();
  let active = false;

  const move = (ev) => {
    const dx = ev.clientX - startClient.x;
    const dy = ev.clientY - startClient.y;
    if (!active && Math.hypot(dx, dy) < 3) return;
    active = true;
    marqueeEl.hidden = false;

    // screen-space rect for the marquee visual (relative to wrap)
    const left = Math.min(startClient.x, ev.clientX) - rect.left;
    const top = Math.min(startClient.y, ev.clientY) - rect.top;
    marqueeEl.style.left = left + 'px';
    marqueeEl.style.top = top + 'px';
    marqueeEl.style.width = Math.abs(dx) + 'px';
    marqueeEl.style.height = Math.abs(dy) + 'px';

    // world-space rect for hit testing
    const cur = viewport.screenToWorld(ev.clientX, ev.clientY);
    const wRect = {
      x: Math.min(startWorld.x, cur.x), y: Math.min(startWorld.y, cur.y),
      w: Math.abs(cur.x - startWorld.x), h: Math.abs(cur.y - startWorld.y),
    };
    const hit = store.nodes.filter((n) => rectsIntersect(nodeRect(n), wRect)).map((n) => n.id);
    const next = store.expandGroups([...base, ...hit]);
    store.setSelection([...next]);
  };
  const up = () => {
    marqueeEl.hidden = true;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

/* ---------------- context menu ---------------- */
const mi = {
  rename: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  dup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  paste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
  del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  fwd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="12" height="12" rx="2"/><path d="M3 15V5a2 2 0 0 1 2-2h10"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="12" height="12" rx="2"/><path d="M21 9v10a2 2 0 0 1-2 2H9"/></svg>',
  group: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M11 7h6a2 2 0 0 1 2 2v4"/></svg>',
  selall: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>',
  fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>',
};

function onContextMenu(e) {
  e.preventDefault();
  const nodeEl = e.target.closest?.('.node');
  const edgeEl = e.target.closest?.('.edge');

  if (nodeEl) {
    const id = nodeEl.dataset.id;
    if (!store.selection.has(id)) store.setSelection([id]);
    openNodeMenu(e.clientX, e.clientY);
  } else if (edgeEl) {
    const id = edgeEl.dataset.id;
    store.selectEdge(id);
    openEdgeMenu(e.clientX, e.clientY, id);
  } else {
    openCanvasMenu(e.clientX, e.clientY);
  }
}

function openNodeMenu(x, y) {
  const ids = [...store.selection];
  const anyLocked = ids.some((id) => store.getNode(id)?.locked);
  const many = ids.length > 1;
  openMenu([
    { label: 'Rename', icon: mi.rename, sub: 'F2', disabled: many, onClick: () => startRename(ids[0]) },
    { label: 'Duplicate', icon: mi.dup, sub: 'Ctrl+D', onClick: () => duplicateSelection() },
    { label: 'Copy', icon: mi.copy, sub: 'Ctrl+C', onClick: () => copySelection() },
    { label: 'Delete', icon: mi.del, sub: 'Del', danger: true, onClick: () => deleteSelection() },
    { sep: true },
    { label: anyLocked ? 'Unlock' : 'Lock', icon: mi.lock, onClick: () => toggleLockSelection() },
    { label: 'Bring Forward', icon: mi.fwd, onClick: () => bringForward() },
    { label: 'Send Backward', icon: mi.back, onClick: () => sendBackward() },
    { sep: true },
    { label: 'Group', icon: mi.group, disabled: ids.length < 2, onClick: () => groupSelection() },
    { label: 'Ungroup', icon: mi.group, onClick: () => ungroupSelection() },
  ], x, y);
}

function openEdgeMenu(x, y, id) {
  openMenu([
    { label: 'Edit label', icon: mi.rename, onClick: async () => (await import('./edges.js')).editEdgeLabel(id) },
    { label: 'Delete', icon: mi.del, danger: true, onClick: () => { store.removeEdges([id]); } },
  ], x, y);
}

function openCanvasMenu(x, y) {
  const world = viewport.screenToWorld(x, y);
  const hasClip = !!(store.clipboard && store.clipboard.nodes.length);
  openMenu([
    { label: 'Paste', icon: mi.paste, sub: 'Ctrl+V', disabled: !hasClip, onClick: () => pasteClipboard(world) },
    { label: 'Select all', icon: mi.selall, sub: 'Ctrl+A', onClick: () => store.selectAll() },
    { sep: true },
    { label: 'Fit to screen', icon: mi.fit, onClick: () => viewport.fit() },
    { label: store.settings.grid ? 'Hide grid' : 'Show grid', icon: mi.grid, onClick: () => store.setSetting('grid', !store.settings.grid) },
  ], x, y);
}

/** Where a keyboard paste should drop (last known cursor position). */
export function lastPointerWorld() {
  return viewport.screenToWorld(lastClient.x, lastClient.y);
}
