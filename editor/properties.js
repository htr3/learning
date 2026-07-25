/* ============================================================
   properties.js — the right panel.

   Reflects the current selection and edits it live:
   - single node -> full editable form (name, tech, desc, colour,
     background, border, port, instances, notes)
   - multiple nodes -> bulk summary + shared actions
   - single edge -> connector style, label presets, animation
   ============================================================ */
import { store } from './core/state.js';
import { bus, EVT } from './core/bus.js';
import { el } from './core/utils.js';
import { getComponent, nodeIcon } from './catalog.js';
import { PROTOCOLS } from './edges.js';
import { deleteSelection, duplicateSelection, toggleLockSelection, bringForward, sendBackward } from './nodes.js';

const SWATCHES = ['#7C3AED', '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#f472b6', '#22d3ee', '#a78bfa', '#fb923c', '#94a3b8'];
let host = null;

export function initProperties() {
  host = document.getElementById('properties');
  bus.on(EVT.SELECTION, render);
  bus.on(EVT.DOC_LOADED, render);
  bus.on(EVT.DOC_CHANGE, render);
  render();
}

function render() {
  const nodes = store.selectedNodes();
  const edges = store.selectedEdges();
  host.innerHTML = '';

  if (!nodes.length && !edges.length) { host.appendChild(emptyState()); return; }
  if (edges.length && !nodes.length) {
    if (edges.length === 1) host.appendChild(edgeForm(edges[0]));
    else host.appendChild(multi(`${edges.length} connectors`, true));
    return;
  }
  if (nodes.length === 1) { host.appendChild(nodeForm(nodes[0])); return; }
  host.appendChild(multi(`${nodes.length} nodes selected`, false));
}

/* ---------------- states ---------------- */
function emptyState() {
  return el('div', {
    class: 'prop-empty',
    html: `<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
           <p>Select a component to edit its properties, or double-click to rename it.</p>`,
  });
}

function multi(labelText, isEdge) {
  const wrap = el('div');
  wrap.appendChild(el('div', { class: 'prop-multi', html: `<b>${labelText}</b><br>Edits apply to the whole selection.` }));
  const actions = el('div', { class: 'prop-actions', style: { marginTop: '14px' } });
  if (!isEdge) {
    actions.appendChild(actionBtn('Duplicate', iconDup, () => duplicateSelection()));
    actions.appendChild(actionBtn('Lock', iconLock, () => toggleLockSelection()));
  }
  actions.appendChild(actionBtn('Delete', iconDel, () => deleteSelection(), true));
  wrap.appendChild(actions);
  return wrap;
}

/* ---------------- node form ---------------- */
function nodeForm(node) {
  const comp = getComponent(node.type);
  const wrap = el('div');

  wrap.appendChild(el('div', {
    class: 'prop-node-head',
    html: `<div class="prop-node-ico" style="--comp-color:${node.color}">${nodeIcon(node.type, 22)}</div>
           <div><div class="pnh-type">${comp.label}</div><div class="pnh-name">${escapeHtml(node.label)}</div></div>`,
  }));

  wrap.appendChild(textField('Name', node.label, (v, commit) => update(node.id, { label: v }, commit)));
  wrap.appendChild(textField('Technology', node.tech, (v, commit) => update(node.id, { tech: v }, commit), 'e.g. Spring Boot, Nginx'));
  wrap.appendChild(textArea('Description', node.desc, (v, commit) => update(node.id, { desc: v }, commit)));

  wrap.appendChild(sectionTitle('Appearance'));
  wrap.appendChild(colorField('Color', node.color, (v) => update(node.id, { color: v }, true)));
  const row = el('div', { class: 'field-row' });
  row.appendChild(colorField('Background', node.bg || '#202024', (v) => update(node.id, { bg: v }, true), true));
  row.appendChild(colorField('Border', node.border || node.color, (v) => update(node.id, { border: v }, true), true));
  wrap.appendChild(row);

  wrap.appendChild(sectionTitle('Details'));
  const row2 = el('div', { class: 'field-row' });
  row2.appendChild(textField('Port', node.port, (v, commit) => update(node.id, { port: v }, commit), '8080'));
  row2.appendChild(numberField('Instances', node.instances, (v, commit) => update(node.id, { instances: Math.max(1, v) }, commit)));
  wrap.appendChild(row2);
  wrap.appendChild(textArea('Notes', node.notes, (v, commit) => update(node.id, { notes: v }, commit), 'Anything worth remembering…'));

  const actions = el('div', { class: 'prop-actions' });
  actions.appendChild(actionBtn('Duplicate', iconDup, () => duplicateSelection()));
  actions.appendChild(actionBtn(node.locked ? 'Unlock' : 'Lock', iconLock, () => toggleLockSelection()));
  actions.appendChild(actionBtn('Forward', iconFwd, () => bringForward()));
  actions.appendChild(actionBtn('Backward', iconBack, () => sendBackward()));
  actions.appendChild(actionBtn('Delete', iconDel, () => deleteSelection(), true));
  wrap.appendChild(actions);
  return wrap;
}

/* ---------------- edge form ---------------- */
function edgeForm(edge) {
  const wrap = el('div');
  wrap.appendChild(el('div', {
    class: 'prop-node-head',
    html: `<div class="prop-node-ico" style="--comp-color:var(--accent)"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 18c6 0 4-12 16-12"/></svg></div>
           <div><div class="pnh-type">Connector</div><div class="pnh-name">${edge.label ? escapeHtml(edge.label) : 'Unlabeled'}</div></div>`,
  }));

  wrap.appendChild(sectionTitle('Style'));
  const pick = el('div', { class: 'edge-kind-pick' });
  const kinds = [
    ['straight', '<path d="M2 8h22"/>'],
    ['curved', '<path d="M2 14C8 14 8 2 24 2"/>'],
    ['orthogonal', '<path d="M2 2h11v12h11"/>'],
  ];
  for (const [k, svg] of kinds) {
    const b = el('button', { class: 'ekp' + (edge.kind === k ? ' active' : ''), html: `<svg viewBox="0 0 26 16">${svg}</svg><span>${k[0].toUpperCase() + k.slice(1)}</span>` });
    b.addEventListener('click', () => store.updateEdge(edge.id, { kind: k }, { commit: true }));
    pick.appendChild(b);
  }
  wrap.appendChild(field('Routing', pick));

  wrap.appendChild(textField('Label', edge.label, (v, commit) => store.updateEdge(edge.id, { label: v }, { commit }), 'e.g. REST'));
  const presets = el('div', { class: 'label-presets' });
  for (const p of PROTOCOLS) {
    const b = el('button', { class: 'lp', text: p });
    b.addEventListener('click', () => store.updateEdge(edge.id, { label: p }, { commit: true }));
    presets.appendChild(b);
  }
  wrap.appendChild(field('Protocol presets', presets));

  wrap.appendChild(toggleField('Animated flow', edge.animated, (on) => store.updateEdge(edge.id, { animated: on }, { commit: true })));

  const actions = el('div', { class: 'prop-actions' });
  actions.appendChild(actionBtn('Delete', iconDel, () => store.removeEdges([edge.id]), true));
  wrap.appendChild(actions);
  return wrap;
}

/* ---------------- field builders ---------------- */
function update(id, patch, commit) { store.updateNode(id, patch, { commit }); }

function field(labelText, control) {
  const f = el('div', { class: 'field' });
  f.appendChild(el('label', { text: labelText }));
  f.appendChild(control);
  return f;
}

function textField(labelText, value, onChange, placeholder = '') {
  const input = el('input', { type: 'text', value: value || '', placeholder });
  input.addEventListener('input', () => onChange(input.value, false));
  input.addEventListener('change', () => onChange(input.value, true));
  input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') input.blur(); });
  return field(labelText, input);
}

function numberField(labelText, value, onChange) {
  const input = el('input', { type: 'number', min: '1', value: String(value ?? 1) });
  input.addEventListener('input', () => onChange(parseInt(input.value, 10) || 1, false));
  input.addEventListener('change', () => onChange(parseInt(input.value, 10) || 1, true));
  input.addEventListener('keydown', (e) => e.stopPropagation());
  return field(labelText, input);
}

function textArea(labelText, value, onChange, placeholder = '') {
  const ta = el('textarea', { placeholder });
  ta.value = value || '';
  ta.addEventListener('input', () => onChange(ta.value, false));
  ta.addEventListener('change', () => onChange(ta.value, true));
  ta.addEventListener('keydown', (e) => e.stopPropagation());
  return field(labelText, ta);
}

function colorField(labelText, value, onChange, includeNative = true) {
  const row = el('div', { class: 'color-row' });
  const swatches = el('div', { class: 'color-swatches' });
  for (const c of SWATCHES) {
    const s = el('div', { class: 'swatch' + (sameColor(c, value) ? ' active' : ''), style: { background: c }, title: c });
    s.addEventListener('click', () => onChange(c));
    swatches.appendChild(s);
  }
  row.appendChild(swatches);
  if (includeNative) {
    const native = el('input', { type: 'color', class: 'color-native', value: toHex(value) });
    native.addEventListener('input', () => onChange(native.value));
    row.appendChild(native);
  }
  return field(labelText, row);
}

function toggleField(labelText, checked, onChange) {
  const f = el('div', { class: 'toggle-field' });
  f.appendChild(el('label', { text: labelText }));
  const sw = el('label', { class: 'switch' });
  const input = el('input', { type: 'checkbox' });
  input.checked = !!checked;
  input.addEventListener('change', () => onChange(input.checked));
  sw.append(input, el('span', { class: 'track' }));
  f.appendChild(sw);
  return f;
}

function sectionTitle(t) { return el('div', { class: 'prop-section-title', text: t }); }

function actionBtn(labelText, icon, onClick, danger = false) {
  const b = el('button', { class: 'prop-btn' + (danger ? ' danger' : ''), html: `${icon}<span>${labelText}</span>` });
  b.addEventListener('click', onClick);
  return b;
}

/* ---------------- helpers ---------------- */
function sameColor(a, b) { return String(a).toLowerCase() === String(b).toLowerCase(); }
function toHex(c) {
  if (!c) return '#202024';
  if (/^#([0-9a-f]{6})$/i.test(c)) return c;
  if (/^#([0-9a-f]{3})$/i.test(c)) return '#' + c.slice(1).split('').map((x) => x + x).join('');
  return '#202024';
}
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* icons */
const iconDup = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const iconDel = '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>';
const iconLock = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const iconFwd = '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="12" height="12" rx="2"/><path d="M3 15V5a2 2 0 0 1 2-2h10"/></svg>';
const iconBack = '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="12" height="12" rx="2"/><path d="M21 9v10a2 2 0 0 1-2 2H9"/></svg>';
