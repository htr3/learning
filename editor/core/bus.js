/* ============================================================
   EventBus — a tiny pub/sub used to decouple business logic
   (store, history, storage) from the UI (canvas, panels).
   Future features (AI generate/review, simulation, collab,
   version history) subscribe to the same events, no rewrites.
   ============================================================ */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._map = new Map();
  }

  /** Subscribe. Returns an unsubscribe function. */
  on(event, handler) {
    if (!this._map.has(event)) this._map.set(event, new Set());
    this._map.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /** Subscribe once. */
  once(event, handler) {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off(event, handler) {
    const set = this._map.get(event);
    if (set) set.delete(handler);
  }

  emit(event, payload) {
    const set = this._map.get(event);
    if (!set) return;
    // copy to allow handlers to unsubscribe during dispatch
    for (const h of [...set]) {
      try {
        h(payload);
      } catch (err) {
        console.error(`[bus] handler for "${event}" failed:`, err);
      }
    }
  }
}

// Shared singleton bus for the whole editor.
export const bus = new EventBus();

/** Canonical event names (keep in one place to avoid typos). */
export const EVT = {
  DOC_CHANGE: 'doc:change',       // committed structural change (history + autosave)
  DOC_LIVE: 'doc:live',           // transient change during drag/resize (render only)
  DOC_LOADED: 'doc:loaded',       // whole document replaced (template/import/undo)
  SELECTION: 'selection:change',
  VIEWPORT: 'viewport:change',
  SETTINGS: 'settings:change',
  HISTORY: 'history:change',      // undo/redo availability changed
  SAVED: 'storage:saved',
  NODE_ADD: 'node:add',
  NODE_REMOVE: 'node:remove',
  EDGE_ADD: 'edge:add',
  EDGE_REMOVE: 'edge:remove',
  TOAST: 'ui:toast',
};
