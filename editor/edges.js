/* ============================================================
   edges.js — connectors between nodes.

   Handles routing (straight / curved / orthogonal), arrowheads,
   animated flow, editable labels, click-to-select and the
   port-drag gesture used to create a new connection.
   ============================================================ */
import { store } from './core/state.js';
import { bus, EVT } from './core/bus.js';
import { viewport } from './viewport.js';
import { borderPoint, uid, svg as svgEl } from './core/utils.js';

/** Protocol label presets surfaced in the properties panel. */
export const PROTOCOLS = ['REST', 'HTTP', 'HTTPS', 'gRPC', 'Kafka', 'TCP', 'UDP', 'WebSocket'];

/* ---------------- defs (arrow markers) ---------------- */
export function ensureDefs() {
  const defs = document.getElementById('edge-defs');
  if (!defs || defs.childElementCount) return;
  defs.innerHTML = `
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#8b8b93"></path>
    </marker>
    <marker id="arrow-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#7C3AED"></path>
    </marker>`;
}

/* ---------------- geometry ---------------- */
function anchors(edge) {
  const a = store.getNode(edge.from);
  const b = store.getNode(edge.to);
  if (!a || !b) return null;
  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  return { p1: borderPoint(a, bc.x, bc.y), p2: borderPoint(b, ac.x, ac.y) };
}

export function pathD(kind, p1, p2) {
  if (kind === 'straight') {
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  }
  if (kind === 'orthogonal') {
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);
    if (dx >= dy) {
      const mx = (p1.x + p2.x) / 2;
      return `M ${p1.x} ${p1.y} L ${mx} ${p1.y} L ${mx} ${p2.y} L ${p2.x} ${p2.y}`;
    }
    const my = (p1.y + p2.y) / 2;
    return `M ${p1.x} ${p1.y} L ${p1.x} ${my} L ${p2.x} ${my} L ${p2.x} ${p2.y}`;
  }
  // curved (default)
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const off = Math.max(40, Math.abs(dx) * 0.5);
    return `M ${p1.x} ${p1.y} C ${p1.x + off} ${p1.y}, ${p2.x - off} ${p2.y}, ${p2.x} ${p2.y}`;
  }
  const off = Math.max(40, Math.abs(dy) * 0.5);
  return `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + off}, ${p2.x} ${p2.y - off}, ${p2.x} ${p2.y}`;
}

/* ---------------- DOM factory ---------------- */
export function buildEdgeEl(edge) {
  const g = svgEl('g', { class: 'edge', 'data-id': edge.id });
  const hit = svgEl('path', { class: 'edge-hit' });
  const path = svgEl('path', { class: 'edge-path' });
  const labelG = svgEl('g', { class: 'edge-label-group' });
  const bg = svgEl('rect', { class: 'edge-label-bg', rx: 6, ry: 6 });
  const text = svgEl('text', { class: 'edge-label' });
  labelG.append(bg, text);
  g.append(hit, path, labelG);

  const select = (e) => {
    e.stopPropagation();
    store.selectEdge(edge.id, e.shiftKey);
  };
  hit.addEventListener('pointerdown', select);
  path.addEventListener('pointerdown', select);
  g.addEventListener('dblclick', (e) => { e.stopPropagation(); editEdgeLabel(edge.id); });

  updateEdgeEl(g, edge);
  return g;
}

/** Sync an edge element with its data (geometry, animation, label, selection). */
export function updateEdgeEl(g, edge) {
  const a = anchors(edge);
  if (!a) return;
  const d = pathD(edge.kind, a.p1, a.p2);
  const path = g.querySelector('.edge-path');
  const hit = g.querySelector('.edge-hit');
  path.setAttribute('d', d);
  hit.setAttribute('d', d);

  const selected = store.edgeSelection.has(edge.id);
  path.classList.toggle('selected', selected);
  path.classList.toggle('animated', !!edge.animated);
  path.setAttribute('marker-end', `url(#${selected ? 'arrow-sel' : 'arrow'})`);

  const labelG = g.querySelector('.edge-label-group');
  const text = g.querySelector('.edge-label');
  const bg = g.querySelector('.edge-label-bg');
  if (edge.label) {
    labelG.removeAttribute('hidden');
    text.textContent = edge.label;
    let mid = { x: (a.p1.x + a.p2.x) / 2, y: (a.p1.y + a.p2.y) / 2 };
    try {
      const len = path.getTotalLength();
      if (len) mid = path.getPointAtLength(len / 2);
    } catch (_) { /* not yet in DOM */ }
    text.setAttribute('x', mid.x);
    text.setAttribute('y', mid.y);
    try {
      const tb = text.getBBox();
      bg.setAttribute('x', tb.x - 6);
      bg.setAttribute('y', tb.y - 3);
      bg.setAttribute('width', tb.width + 12);
      bg.setAttribute('height', tb.height + 6);
    } catch (_) { /* getBBox before paint */ }
  } else {
    labelG.setAttribute('hidden', '');
  }
}

/* ---------------- create connection (port drag) ---------------- */
export function beginConnect(fromId, dir, e) {
  const from = store.getNode(fromId);
  if (!from) return;
  const wrap = document.getElementById('ed-canvas-wrap');
  const temp = document.getElementById('temp-edge');
  const startPt = portPoint(from, dir);
  wrap.classList.add('connecting');
  temp.classList.add('active');

  let targetEl = null;

  const move = (ev) => {
    const w = viewport.screenToWorld(ev.clientX, ev.clientY);
    // resolve hovered node under the cursor
    const under = document.elementFromPoint(ev.clientX, ev.clientY);
    const nodeEl = under && under.closest ? under.closest('.node') : null;
    if (targetEl && targetEl !== nodeEl) targetEl.classList.remove('connect-target');
    targetEl = nodeEl && nodeEl.dataset.id !== fromId ? nodeEl : null;
    if (targetEl) targetEl.classList.add('connect-target');

    let end = w;
    if (targetEl) {
      const tn = store.getNode(targetEl.dataset.id);
      if (tn) end = borderPoint(tn, startPt.x, startPt.y);
    }
    temp.setAttribute('d', pathD(store.settings.edgeKind, startPt, end));
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    wrap.classList.remove('connecting');
    temp.classList.remove('active');
    temp.removeAttribute('d');
    if (targetEl) {
      targetEl.classList.remove('connect-target');
      const edge = store.addEdge({
        id: uid('e'),
        from: fromId,
        to: targetEl.dataset.id,
        kind: store.settings.edgeKind,
        label: '',
        animated: store.settings.animated,
      });
      if (edge) store.selectEdge(edge.id);
    }
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function portPoint(n, dir) {
  switch (dir) {
    case 'n': return { x: n.x + n.w / 2, y: n.y };
    case 's': return { x: n.x + n.w / 2, y: n.y + n.h };
    case 'w': return { x: n.x, y: n.y + n.h / 2 };
    case 'e': return { x: n.x + n.w, y: n.y + n.h / 2 };
    default: return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
  }
}

/* ---------------- inline label editing ---------------- */
export function editEdgeLabel(id) {
  const edge = store.getEdge(id);
  if (!edge) return;
  const a = anchors(edge);
  if (!a) return;
  const midWorld = { x: (a.p1.x + a.p2.x) / 2, y: (a.p1.y + a.p2.y) / 2 };
  const scr = viewport.worldToScreen(midWorld.x, midWorld.y);

  const input = document.createElement('input');
  input.className = 'edge-label-input';
  input.value = edge.label || '';
  input.placeholder = 'label…';
  input.style.left = scr.x + 'px';
  input.style.top = scr.y + 'px';
  input.style.transform = 'translate(-50%, -50%)';
  document.body.appendChild(input);
  input.focus();
  input.select();

  const finish = (keep) => {
    if (!input.parentNode) return;
    if (keep) store.updateEdge(id, { label: input.value.trim() }, { commit: true });
    input.remove();
  };
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', (ev) => {
    ev.stopPropagation();
    if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
    else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
  });
}
