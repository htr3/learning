/* ============================================================
   state.js — the single source of truth.

   Holds a serializable document (the same shape used for JSON
   export/import and autosave) plus transient UI state (selection,
   settings, clipboard). All mutations route through methods that
   emit events on the shared bus, so rendering, history and storage
   stay decoupled from whoever triggered the change.
   ============================================================ */
import { bus, EVT } from './bus.js';
import { uid, clone } from './utils.js';

export const DOC_VERSION = 1;

/** A fresh, empty document. */
export function emptyDoc() {
  return {
    version: DOC_VERSION,
    name: 'Untitled diagram',
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [],
    edges: [],
  };
}

/** Default properties for a node created from a catalog component. */
export function makeNode(comp, x, y) {
  return {
    id: uid('n'),
    type: comp.id,
    label: comp.label,
    tech: comp.tech || '',
    desc: comp.desc || '',
    x, y,
    w: 168,
    h: 66,
    color: comp.color,       // accent (icon + border highlight)
    bg: '',                  // '' = theme default panel
    border: '',              // '' = derived from color
    port: '',
    instances: 1,
    notes: '',
    z: 1,
    locked: false,
    groupId: null,
  };
}

class Store {
  constructor() {
    this.doc = emptyDoc();
    /** @type {Set<string>} selected node ids */
    this.selection = new Set();
    /** @type {Set<string>} selected edge ids */
    this.edgeSelection = new Set();
    this.settings = {
      grid: true,
      snap: true,
      snapSize: 12,
      edgeKind: 'curved',   // straight | curved | orthogonal
      animated: true,
      theme: 'dark',        // dark | light
    };
    this.clipboard = null;   // { nodes:[], edges:[] }
    this._zTop = 1;
  }

  /* ---------------- queries ---------------- */
  getNode(id) { return this.doc.nodes.find((n) => n.id === id); }
  getEdge(id) { return this.doc.edges.find((e) => e.id === id); }
  get nodes() { return this.doc.nodes; }
  get edges() { return this.doc.edges; }

  selectedNodes() { return this.doc.nodes.filter((n) => this.selection.has(n.id)); }
  selectedEdges() { return this.doc.edges.filter((e) => this.edgeSelection.has(e.id)); }

  _nextZ() { this._zTop += 1; return this._zTop; }
  _recomputeZTop() {
    this._zTop = this.doc.nodes.reduce((m, n) => Math.max(m, n.z || 1), 1);
  }

  /* ---------------- change signalling ---------------- */
  /** Commit a structural change: triggers history snapshot + autosave. */
  commit(reason = 'edit') {
    bus.emit(EVT.DOC_CHANGE, { reason });
  }
  /** Transient change (drag/resize in progress): render only, no history. */
  live() {
    bus.emit(EVT.DOC_LIVE, {});
  }

  /* ---------------- nodes ---------------- */
  addNode(node, { commit = true } = {}) {
    node.z = this._nextZ();
    this.doc.nodes.push(node);
    bus.emit(EVT.NODE_ADD, { id: node.id });
    if (commit) this.commit('add-node');
    return node;
  }

  addNodes(nodes, { commit = true } = {}) {
    for (const n of nodes) { n.z = this._nextZ(); this.doc.nodes.push(n); bus.emit(EVT.NODE_ADD, { id: n.id }); }
    if (commit) this.commit('add-nodes');
  }

  updateNode(id, patch, { commit = true } = {}) {
    const n = this.getNode(id);
    if (!n) return;
    Object.assign(n, patch);
    commit ? this.commit('update-node') : this.live();
  }

  updateNodes(ids, patchFn, { commit = false } = {}) {
    for (const id of ids) {
      const n = this.getNode(id);
      if (n) patchFn(n);
    }
    commit ? this.commit('update-nodes') : this.live();
  }

  removeNodes(ids, { commit = true } = {}) {
    const set = new Set(ids);
    this.doc.nodes = this.doc.nodes.filter((n) => !set.has(n.id));
    // drop edges attached to removed nodes
    this.doc.edges = this.doc.edges.filter((e) => !set.has(e.from) && !set.has(e.to));
    for (const id of set) { this.selection.delete(id); bus.emit(EVT.NODE_REMOVE, { id }); }
    if (commit) this.commit('remove-nodes');
  }

  /* ---------------- edges ---------------- */
  addEdge(edge, { commit = true } = {}) {
    // avoid duplicate parallel edges in the same direction
    if (edge.from === edge.to) return null;
    const exists = this.doc.edges.some((e) => e.from === edge.from && e.to === edge.to);
    if (exists) return null;
    this.doc.edges.push(edge);
    bus.emit(EVT.EDGE_ADD, { id: edge.id });
    if (commit) this.commit('add-edge');
    return edge;
  }

  updateEdge(id, patch, { commit = true } = {}) {
    const e = this.getEdge(id);
    if (!e) return;
    Object.assign(e, patch);
    commit ? this.commit('update-edge') : this.live();
  }

  removeEdges(ids, { commit = true } = {}) {
    const set = new Set(ids);
    this.doc.edges = this.doc.edges.filter((e) => !set.has(e.id));
    for (const id of set) { this.edgeSelection.delete(id); bus.emit(EVT.EDGE_REMOVE, { id }); }
    if (commit) this.commit('remove-edges');
  }

  /* ---------------- z-order ---------------- */
  bringForward(ids) {
    for (const id of ids) { const n = this.getNode(id); if (n) n.z = this._nextZ(); }
    this.commit('z-order');
  }
  sendBackward(ids) {
    const minZ = this.doc.nodes.reduce((m, n) => Math.min(m, n.z || 1), Infinity);
    for (const id of ids) { const n = this.getNode(id); if (n) n.z = minZ - 1; }
    this.commit('z-order');
  }

  /* ---------------- selection ---------------- */
  setSelection(nodeIds = [], edgeIds = []) {
    this.selection = new Set(nodeIds);
    this.edgeSelection = new Set(edgeIds);
    bus.emit(EVT.SELECTION, {});
  }
  clearSelection() { this.setSelection([], []); }
  addToSelection(id) { this.selection.add(id); this.edgeSelection.clear(); bus.emit(EVT.SELECTION, {}); }
  toggleNode(id) {
    this.edgeSelection.clear();
    this.selection.has(id) ? this.selection.delete(id) : this.selection.add(id);
    bus.emit(EVT.SELECTION, {});
  }
  selectEdge(id, additive = false) {
    if (!additive) { this.selection.clear(); this.edgeSelection.clear(); }
    this.edgeSelection.add(id);
    bus.emit(EVT.SELECTION, {});
  }
  selectAll() {
    this.selection = new Set(this.doc.nodes.map((n) => n.id));
    this.edgeSelection = new Set(this.doc.edges.map((e) => e.id));
    bus.emit(EVT.SELECTION, {});
  }

  /* ---------------- groups ---------------- */
  groupSelection() {
    const ids = [...this.selection];
    if (ids.length < 2) return;
    const gid = uid('g');
    for (const id of ids) { const n = this.getNode(id); if (n) n.groupId = gid; }
    this.commit('group');
  }
  ungroupSelection() {
    for (const id of this.selection) { const n = this.getNode(id); if (n) n.groupId = null; }
    this.commit('ungroup');
  }
  /** Expand a selection set to include whole groups. */
  expandGroups(ids) {
    const groupIds = new Set();
    for (const id of ids) { const n = this.getNode(id); if (n && n.groupId) groupIds.add(n.groupId); }
    if (!groupIds.size) return new Set(ids);
    const out = new Set(ids);
    for (const n of this.doc.nodes) if (n.groupId && groupIds.has(n.groupId)) out.add(n.id);
    return out;
  }

  /* ---------------- settings ---------------- */
  setSetting(key, value) {
    this.settings[key] = value;
    bus.emit(EVT.SETTINGS, { key, value });
  }

  /* ---------------- viewport ---------------- */
  setViewport(vp) {
    Object.assign(this.doc.viewport, vp);
    bus.emit(EVT.VIEWPORT, {});
  }

  /* ---------------- document load/serialize ---------------- */
  serialize() {
    return clone({
      version: DOC_VERSION,
      name: this.doc.name,
      viewport: this.doc.viewport,
      nodes: this.doc.nodes,
      edges: this.doc.edges,
    });
  }

  /**
   * Replace the whole document (template load, import, undo/redo).
   * `reason` lets history ignore its own restores.
   */
  loadDoc(doc, { reason = 'load', keepViewport = false } = {}) {
    const next = normalizeDoc(doc);
    if (keepViewport) next.viewport = clone(this.doc.viewport);
    this.doc = next;
    this.selection.clear();
    this.edgeSelection.clear();
    this._recomputeZTop();
    bus.emit(EVT.DOC_LOADED, { reason });
    bus.emit(EVT.SELECTION, {});
    bus.emit(EVT.VIEWPORT, {});
    if (reason !== 'history') bus.emit(EVT.DOC_CHANGE, { reason });
  }
}

/** Validate/repair an incoming document so the editor never crashes on bad input. */
export function normalizeDoc(doc) {
  const base = emptyDoc();
  if (!doc || typeof doc !== 'object') return base;
  base.name = typeof doc.name === 'string' ? doc.name : base.name;
  if (doc.viewport && typeof doc.viewport === 'object') {
    base.viewport = {
      x: Number(doc.viewport.x) || 0,
      y: Number(doc.viewport.y) || 0,
      zoom: clampZoom(Number(doc.viewport.zoom) || 1),
    };
  }
  const nodeIds = new Set();
  base.nodes = (Array.isArray(doc.nodes) ? doc.nodes : []).map((n) => {
    const id = typeof n.id === 'string' ? n.id : uid('n');
    nodeIds.add(id);
    return {
      id,
      type: n.type || 'service',
      label: n.label != null ? String(n.label) : 'Node',
      tech: n.tech || '',
      desc: n.desc || '',
      x: Number(n.x) || 0,
      y: Number(n.y) || 0,
      w: Math.max(80, Number(n.w) || 168),
      h: Math.max(48, Number(n.h) || 66),
      color: n.color || '#7C3AED',
      bg: n.bg || '',
      border: n.border || '',
      port: n.port || '',
      instances: Number(n.instances) || 1,
      notes: n.notes || '',
      z: Number(n.z) || 1,
      locked: !!n.locked,
      groupId: n.groupId || null,
    };
  });
  base.edges = (Array.isArray(doc.edges) ? doc.edges : [])
    .filter((e) => e && nodeIds.has(e.from) && nodeIds.has(e.to))
    .map((e) => ({
      id: typeof e.id === 'string' ? e.id : uid('e'),
      from: e.from,
      to: e.to,
      kind: ['straight', 'curved', 'orthogonal'].includes(e.kind) ? e.kind : 'curved',
      label: e.label || '',
      animated: e.animated !== false,
    }));
  return base;
}

const clampZoom = (z) => Math.max(0.1, Math.min(3, z || 1));

// Shared singleton store.
export const store = new Store();
