/* ============================================================
   nodes.js — everything about a node:
   creation, the DOM factory, and interactions (drag with snap,
   8-handle resize, double-click rename) plus the node commands
   (duplicate, delete, lock, group, z-order).

   Rendering is coordinated by canvas.js; this module builds and
   updates individual node elements and mutates the store.
   ============================================================ */
import { store, makeNode } from './core/state.js';
import { getComponent, nodeIcon } from './catalog.js';
import { viewport } from './viewport.js';
import { round, clone, uid, el } from './core/utils.js';
import * as canvas from './canvas.js';

const MIN_W = 96;
const MIN_H = 52;

/* ---------------- creation ---------------- */
export function createNode(compId, x, y, { select = true, commit = true } = {}) {
  const comp = getComponent(compId);
  const node = makeNode(comp, Math.round(x), Math.round(y));
  store.addNode(node, { commit });
  if (select) store.setSelection([node.id]);
  return node;
}

/* ---------------- DOM factory ---------------- */
export function buildNodeEl(node) {
  const elm = el('div', { class: 'node', 'data-id': node.id });
  elm.innerHTML = `
    <div class="node-accent-bar"></div>
    <div class="node-body">
      <div class="node-ico">${nodeIcon(node.type)}</div>
      <div class="node-text">
        <div class="node-title" spellcheck="false">${escape(node.label)}</div>
        <div class="node-sub"></div>
      </div>
    </div>
    <span class="node-badge" hidden></span>
    <span class="node-lock" hidden><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>
    <span class="port n" data-port="n"></span><span class="port s" data-port="s"></span>
    <span class="port e" data-port="e"></span><span class="port w" data-port="w"></span>
    <span class="rh nw" data-dir="nw"></span><span class="rh ne" data-dir="ne"></span>
    <span class="rh sw" data-dir="sw"></span><span class="rh se" data-dir="se"></span>
    <span class="rh n" data-dir="n"></span><span class="rh s" data-dir="s"></span>
    <span class="rh w" data-dir="w"></span><span class="rh e" data-dir="e"></span>`;

  wireNodeEvents(elm, node.id);
  applyNodeEl(elm, node, store.selection.has(node.id));
  return elm;
}

const escape = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/** Sync a node element with its data (called on create, refresh, live drag). */
export function applyNodeEl(elm, node, selected) {
  elm.style.transform = `translate(${node.x}px, ${node.y}px)`;
  elm.style.width = node.w + 'px';
  elm.style.height = node.h + 'px';
  elm.style.zIndex = String(node.z || 1);
  elm.style.setProperty('--node-accent', node.color || 'var(--accent)');
  elm.style.setProperty('--node-bg', node.bg || 'var(--panel-2)');
  elm.style.setProperty('--node-border', node.border || 'color-mix(in srgb,' + (node.color || '#7C3AED') + ' 45%, var(--border-2))');
  elm.classList.toggle('selected', selected);
  elm.classList.toggle('locked', !!node.locked);
  elm.classList.toggle('grouped', !!node.groupId);

  const title = elm.querySelector('.node-title');
  if (title.textContent !== node.label && title.getAttribute('contenteditable') !== 'true') {
    title.textContent = node.label;
  }
  elm.querySelector('.node-sub').textContent = node.tech || '';

  const badge = elm.querySelector('.node-badge');
  if (node.instances > 1) { badge.hidden = false; badge.textContent = '×' + node.instances; }
  else badge.hidden = true;

  elm.querySelector('.node-lock').hidden = !node.locked;
}

/* ---------------- event wiring ---------------- */
function wireNodeEvents(elm, id) {
  elm.addEventListener('pointerdown', (e) => onNodePointerDown(e, id));
  elm.querySelector('.node-title').addEventListener('dblclick', (e) => {
    e.stopPropagation();
    startRename(id);
  });
  // ports -> start a connection (handled in edges.js via dynamic import to avoid cycles)
  elm.querySelectorAll('.port').forEach((p) => {
    p.addEventListener('pointerdown', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const { beginConnect } = await import('./edges.js');
      beginConnect(id, p.dataset.port, e);
    });
  });
  // resize handles
  elm.querySelectorAll('.rh').forEach((h) => {
    h.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      beginResize(e, id, h.dataset.dir);
    });
  });
}

function onNodePointerDown(e, id) {
  if (e.button === 2) return;                 // right-click -> context menu (canvas)
  if (viewport.spaceDown || e.button === 1) return; // let canvas start panning
  const node = store.getNode(id);
  if (!node) return;
  e.stopPropagation();

  const additive = e.shiftKey || e.metaKey || e.ctrlKey;
  if (additive) {
    store.toggleNode(id);
  } else if (!store.selection.has(id)) {
    store.setSelection([id]);
  }
  // else: node already selected -> keep selection so the whole group can drag

  if (!node.locked && store.selection.has(id)) beginDrag(e);
}

/* ---------------- drag (with snapping) ---------------- */
function beginDrag(e) {
  const ids = [...store.expandGroups([...store.selection])].filter((id) => {
    const n = store.getNode(id); return n && !n.locked;
  });
  if (!ids.length) return;

  const start = viewport.screenToWorld(e.clientX, e.clientY);
  const origins = new Map(ids.map((id) => { const n = store.getNode(id); return [id, { x: n.x, y: n.y }]; }));
  const idSet = new Set(ids);
  let moved = false;

  ids.forEach((id) => canvas.getNodeEl(id)?.classList.add('dragging'));

  const move = (ev) => {
    const w = viewport.screenToWorld(ev.clientX, ev.clientY);
    let dx = w.x - start.x;
    let dy = w.y - start.y;
    if (!moved && Math.hypot(dx, dy) < 2) return;
    moved = true;
    const snap = store.settings.snap ? store.settings.snapSize : 0;
    for (const id of ids) {
      const o = origins.get(id);
      const n = store.getNode(id);
      n.x = snap ? round(o.x + dx, snap) : Math.round(o.x + dx);
      n.y = snap ? round(o.y + dy, snap) : Math.round(o.y + dy);
      canvas.refreshNodeEl(id);
    }
    canvas.refreshEdgesForNodes(idSet);
  };
  const up = () => {
    ids.forEach((id) => canvas.getNodeEl(id)?.classList.remove('dragging'));
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    if (moved) store.commit('move');
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

/* ---------------- resize (8 handles) ---------------- */
function beginResize(e, id, dir) {
  const node = store.getNode(id);
  if (!node || node.locked) return;
  if (!store.selection.has(id)) store.setSelection([id]);

  const start = viewport.screenToWorld(e.clientX, e.clientY);
  const o = { x: node.x, y: node.y, w: node.w, h: node.h };
  const idSet = new Set([id]);
  let changed = false;

  const move = (ev) => {
    const w = viewport.screenToWorld(ev.clientX, ev.clientY);
    const dx = w.x - start.x;
    const dy = w.y - start.y;
    changed = true;
    let { x, y, w: nw, h: nh } = o;
    if (dir.includes('e')) nw = Math.max(MIN_W, o.w + dx);
    if (dir.includes('s')) nh = Math.max(MIN_H, o.h + dy);
    if (dir.includes('w')) { nw = Math.max(MIN_W, o.w - dx); x = o.x + (o.w - nw); }
    if (dir.includes('n')) { nh = Math.max(MIN_H, o.h - dy); y = o.y + (o.h - nh); }
    Object.assign(node, { x: Math.round(x), y: Math.round(y), w: Math.round(nw), h: Math.round(nh) });
    canvas.refreshNodeEl(id);
    canvas.refreshEdgesForNodes(idSet);
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    if (changed) store.commit('resize');
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

/* ---------------- rename (inline contenteditable) ---------------- */
export function startRename(id) {
  const elm = canvas.getNodeEl(id);
  const node = store.getNode(id);
  if (!elm || !node || node.locked) return;
  const title = elm.querySelector('.node-title');
  title.setAttribute('contenteditable', 'true');
  title.focus();
  document.getSelection()?.selectAllChildren(title);

  const finish = (keep) => {
    title.removeAttribute('contenteditable');
    title.onblur = null;
    title.onkeydown = null;
    const text = title.textContent.trim();
    if (keep && text && text !== node.label) {
      store.updateNode(id, { label: text }, { commit: true });
    } else {
      title.textContent = node.label;
    }
  };
  title.onblur = () => finish(true);
  title.onkeydown = (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); title.blur(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); title.blur(); }
    ev.stopPropagation();
  };
}

/* ---------------- node commands ---------------- */
export function deleteSelection() {
  const nodeIds = [...store.selection];
  const edgeIds = [...store.edgeSelection];
  if (!nodeIds.length && !edgeIds.length) return;
  if (edgeIds.length) store.removeEdges(edgeIds, { commit: !nodeIds.length });
  if (nodeIds.length) store.removeNodes(nodeIds, { commit: true });
  store.clearSelection();
}

export function duplicateSelection(offset = 26) {
  const ids = [...store.expandGroups([...store.selection])];
  if (!ids.length) return;
  const clones = cloneNodes(ids, offset);
  store.clearSelection();
  store.setSelection(clones.newIds);
}

/** Clone a set of node ids (and their internal edges) into the doc. */
export function cloneNodes(ids, offset = 26) {
  const idMap = new Map();
  const groupMap = new Map();
  const newNodes = [];
  for (const id of ids) {
    const n = store.getNode(id);
    if (!n) continue;
    const copy = clone(n);
    copy.id = uid('n');
    copy.x += offset;
    copy.y += offset;
    if (n.groupId) {
      if (!groupMap.has(n.groupId)) groupMap.set(n.groupId, uid('g'));
      copy.groupId = groupMap.get(n.groupId);
    }
    idMap.set(id, copy.id);
    newNodes.push(copy);
  }
  store.addNodes(newNodes, { commit: false });

  const idset = new Set(ids);
  const newEdges = [];
  for (const e of store.edges) {
    if (idset.has(e.from) && idset.has(e.to)) {
      newEdges.push({ id: uid('e'), from: idMap.get(e.from), to: idMap.get(e.to), kind: e.kind, label: e.label, animated: e.animated });
    }
  }
  for (const e of newEdges) store.addEdge(e, { commit: false });
  store.commit('duplicate');
  return { newIds: newNodes.map((n) => n.id), idMap };
}

export function toggleLockSelection() {
  const ids = [...store.selection];
  if (!ids.length) return;
  const anyUnlocked = ids.some((id) => !store.getNode(id)?.locked);
  store.updateNodes(ids, (n) => { n.locked = anyUnlocked; }, { commit: true });
}

export function bringForward() { store.bringForward([...store.selection]); }
export function sendBackward() { store.sendBackward([...store.selection]); }
export function groupSelection() { store.groupSelection(); }
export function ungroupSelection() { store.ungroupSelection(); }

/* ---------------- clipboard (copy / cut / paste) ---------------- */
export function copySelection() {
  const ids = [...store.expandGroups([...store.selection])];
  if (!ids.length) return false;
  const idset = new Set(ids);
  store.clipboard = {
    nodes: ids.map((id) => clone(store.getNode(id))).filter(Boolean),
    edges: store.edges.filter((e) => idset.has(e.from) && idset.has(e.to)).map(clone),
  };
  return true;
}

export function cutSelection() {
  if (copySelection()) deleteSelection();
}

/** Paste the clipboard; if worldPt is given, centre the pasted group there. */
export function pasteClipboard(worldPt = null, offset = 30) {
  const clip = store.clipboard;
  if (!clip || !clip.nodes.length) return;

  const idMap = new Map();
  const groupMap = new Map();

  // base position -> optional recentre on the cursor
  let dx = offset, dy = offset;
  if (worldPt) {
    const minX = Math.min(...clip.nodes.map((n) => n.x));
    const minY = Math.min(...clip.nodes.map((n) => n.y));
    dx = worldPt.x - minX;
    dy = worldPt.y - minY;
  }

  const newNodes = clip.nodes.map((n) => {
    const copy = clone(n);
    copy.id = uid('n');
    copy.x = Math.round(n.x + dx);
    copy.y = Math.round(n.y + dy);
    if (n.groupId) {
      if (!groupMap.has(n.groupId)) groupMap.set(n.groupId, uid('g'));
      copy.groupId = groupMap.get(n.groupId);
    }
    idMap.set(n.id, copy.id);
    return copy;
  });
  store.addNodes(newNodes, { commit: false });

  for (const e of clip.edges) {
    if (idMap.has(e.from) && idMap.has(e.to)) {
      store.addEdge({ id: uid('e'), from: idMap.get(e.from), to: idMap.get(e.to), kind: e.kind, label: e.label, animated: e.animated }, { commit: false });
    }
  }
  store.commit('paste');
  store.setSelection(newNodes.map((n) => n.id));
}
