/* ============================================================
   storage.js — LocalStorage autosave & restore.

   Debounced saves fire on any committed change or viewport move.
   The document is persisted under one key and restored on load,
   settings under another. All access is defensive so corrupt or
   unavailable storage never breaks the editor.
   ============================================================ */
import { store } from './core/state.js';
import { bus, EVT } from './core/bus.js';
import { debounce } from './core/utils.js';

const DOC_KEY = 'arch-editor:doc';
const SETTINGS_KEY = 'arch-editor:settings';

const saveDebounced = debounce(saveNow, 700);

export function initStorage() {
  const setSaving = () => setStatus('saving');
  bus.on(EVT.DOC_CHANGE, () => { setSaving(); saveDebounced(); });
  bus.on(EVT.VIEWPORT, () => { saveDebounced(); });
  bus.on(EVT.SETTINGS, () => saveSettings());
  bus.on(EVT.DOC_LOADED, () => { setSaving(); saveDebounced(); });
  window.addEventListener('beforeunload', () => saveNow());
}

export function saveNow() {
  try {
    localStorage.setItem(DOC_KEY, JSON.stringify(store.serialize()));
    saveSettings();
    setStatus('saved');
    bus.emit(EVT.SAVED, {});
  } catch (err) {
    console.warn('[storage] save failed:', err);
    setStatus('error');
  }
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(store.settings)); } catch (_) { /* ignore */ }
}

/** Returns the stored document, or null if none / invalid. */
export function loadStoredDoc() {
  try {
    const raw = localStorage.getItem(DOC_KEY);
    if (!raw) return null;
    const doc = JSON.parse(raw);
    if (!doc || !Array.isArray(doc.nodes)) return null;
    return doc;
  } catch (_) { return null; }
}

/** Returns stored settings, or null. */
export function loadStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

export function clearStoredDoc() {
  try { localStorage.removeItem(DOC_KEY); } catch (_) { /* ignore */ }
}

function setStatus(state) {
  const el = document.getElementById('st-save');
  if (!el) return;
  el.classList.toggle('saving', state === 'saving');
  el.textContent = state === 'saving' ? 'Saving…' : state === 'error' ? 'Save error' : 'Saved';
}
