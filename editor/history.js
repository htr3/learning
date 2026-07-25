/* ============================================================
   history.js — snapshot-based undo/redo.

   On every committed structural change (EVT.DOC_CHANGE) we push
   the previous document snapshot onto the undo stack. Undo/redo
   restore snapshots via store.loadDoc(..., {reason:'history'}),
   which deliberately does NOT emit DOC_CHANGE, so there's no loop.
   ============================================================ */
import { store } from './core/state.js';
import { bus, EVT } from './core/bus.js';

const CAP = 80;
let undoStack = [];
let redoStack = [];
let present = null; // serialized snapshot of the current document

export function initHistory() {
  present = snapshot();
  undoStack = [];
  redoStack = [];

  bus.on(EVT.DOC_CHANGE, ({ reason } = {}) => {
    if (reason === 'history') return;
    const next = snapshot();
    if (next === present) return; // nothing actually changed
    undoStack.push(present);
    if (undoStack.length > CAP) undoStack.shift();
    redoStack = [];
    present = next;
    emit();
  });

  emit();
}

/** Called after a fresh load/import so history restarts cleanly. */
export function resetHistory() {
  present = snapshot();
  undoStack = [];
  redoStack = [];
  emit();
}

export function undo() {
  if (!undoStack.length) return;
  redoStack.push(present);
  present = undoStack.pop();
  restore(present);
  emit();
}

export function redo() {
  if (!redoStack.length) return;
  undoStack.push(present);
  present = redoStack.pop();
  restore(present);
  emit();
}

export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;

function snapshot() { return JSON.stringify(store.serialize()); }
function restore(json) {
  store.loadDoc(JSON.parse(json), { reason: 'history', keepViewport: true });
}
function emit() { bus.emit(EVT.HISTORY, { canUndo: canUndo(), canRedo: canRedo() }); }
