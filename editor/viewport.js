/* ============================================================
   viewport.js — the infinite canvas: pan, zoom, grid and the
   screen<->world coordinate math every other module relies on.

   The transform lives in store.doc.viewport {x, y, zoom} where a
   world point (wx,wy) maps to a screen point (within the viewport
   element) as:  sx = wx*zoom + x ,  sy = wy*zoom + y.
   ============================================================ */
import { store } from './core/state.js';
import { bus, EVT } from './core/bus.js';
import { clamp, isEditingText, boundsOf } from './core/utils.js';

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3;
const GRID_WORLD = 36; // grid cell size in world units

export const viewport = {
  wrap: null,     // #viewport (also shows the grid + captures wheel)
  world: null,    // #world (the transformed layer)
  spaceDown: false,
  _rect: null,

  init({ wrap, world }) {
    this.wrap = wrap;
    this.world = world;
    this._cacheRect();

    // wheel zoom-to-cursor (plain wheel = zoom, like Figma/Excalidraw zoom mode);
    // shift+wheel pans horizontally for convenience.
    wrap.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });

    // spacebar readiness for pan
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !isEditingText() && !this.spaceDown) {
        this.spaceDown = true;
        this.wrap.classList.add('space-ready');
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.spaceDown = false;
        this.wrap.classList.remove('space-ready');
      }
    });
    window.addEventListener('blur', () => {
      this.spaceDown = false;
      this.wrap.classList.remove('space-ready');
    });
    window.addEventListener('resize', () => { this._cacheRect(); this.apply(); });

    bus.on(EVT.SETTINGS, ({ key }) => { if (key === 'grid') this.apply(); });
    bus.on(EVT.VIEWPORT, () => this.apply());

    this.apply();
  },

  _cacheRect() { this._rect = this.wrap.getBoundingClientRect(); },
  rect() { return this._rect || (this._rect = this.wrap.getBoundingClientRect()); },

  get vp() { return store.doc.viewport; },

  /* ---------------- coordinate transforms ---------------- */
  screenToWorld(clientX, clientY) {
    const r = this.rect();
    const { x, y, zoom } = this.vp;
    return {
      x: (clientX - r.left - x) / zoom,
      y: (clientY - r.top - y) / zoom,
    };
  },
  worldToScreen(wx, wy) {
    const r = this.rect();
    const { x, y, zoom } = this.vp;
    return { x: wx * zoom + x + r.left, y: wy * zoom + y + r.top };
  },

  /* ---------------- apply transform + grid ---------------- */
  apply() {
    const { x, y, zoom } = this.vp;
    this.world.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
    const cell = GRID_WORLD * zoom;
    this.wrap.classList.toggle('grid-on', !!store.settings.grid);
    this.wrap.style.backgroundSize = `${cell}px ${cell}px, ${cell}px ${cell}px`;
    this.wrap.style.backgroundPosition = `${x}px ${y}px, ${x}px ${y}px`;
    const pct = Math.round(zoom * 100) + '%';
    const zl = document.getElementById('zoom-reset');
    const zs = document.getElementById('st-zoom');
    if (zl) zl.textContent = pct;
    if (zs) zs.textContent = pct;
  },

  /* ---------------- zoom ---------------- */
  _onWheel(e) {
    e.preventDefault();
    if (e.shiftKey && !e.ctrlKey) {
      this.panBy(-e.deltaY, 0);
      return;
    }
    const factor = Math.exp(-e.deltaY * 0.0015);
    this.zoomAt(e.clientX, e.clientY, this.vp.zoom * factor);
  },

  zoomAt(clientX, clientY, targetZoom) {
    const r = this.rect();
    const z = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
    const lx = clientX - r.left;
    const ly = clientY - r.top;
    const { x, y, zoom } = this.vp;
    // world point under cursor stays fixed
    const wx = (lx - x) / zoom;
    const wy = (ly - y) / zoom;
    store.setViewport({ zoom: z, x: lx - wx * z, y: ly - wy * z });
  },

  zoomBy(mult) {
    const r = this.rect();
    this.zoomAt(r.left + r.width / 2, r.top + r.height / 2, this.vp.zoom * mult);
  },
  zoomIn() { this.zoomBy(1.2); },
  zoomOut() { this.zoomBy(1 / 1.2); },
  resetZoom() {
    const r = this.rect();
    this.zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1);
  },

  /* ---------------- pan ---------------- */
  panBy(dx, dy) {
    store.setViewport({ x: this.vp.x + dx, y: this.vp.y + dy });
  },

  /** Begin a pan gesture from a pointerdown event (space+drag / middle mouse). */
  beginPan(e) {
    this._cacheRect();
    const start = { x: e.clientX, y: e.clientY };
    const origin = { x: this.vp.x, y: this.vp.y };
    this.wrap.classList.add('panning');
    const move = (ev) => {
      store.setViewport({ x: origin.x + (ev.clientX - start.x), y: origin.y + (ev.clientY - start.y) });
    };
    const up = () => {
      this.wrap.classList.remove('panning');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  },

  /* ---------------- fit to content ---------------- */
  fit(padding = 90) {
    this._cacheRect();
    const r = this.rect();
    const b = boundsOf(store.doc.nodes);
    if (!b || b.w === 0 || b.h === 0) {
      store.setViewport({ x: r.width / 2, y: r.height / 2, zoom: 1 });
      return;
    }
    const zoom = clamp(
      Math.min((r.width - padding * 2) / b.w, (r.height - padding * 2) / b.h),
      MIN_ZOOM, 1.5,
    );
    const x = (r.width - b.w * zoom) / 2 - b.x * zoom;
    const y = (r.height - b.h * zoom) / 2 - b.y * zoom;
    store.setViewport({ x, y, zoom });
  },

  /** Center the view on world origin at a comfortable default zoom. */
  center() {
    const r = this.rect();
    store.setViewport({ x: r.width / 2 - 300, y: r.height / 2 - 180, zoom: 1 });
  },
};
