/* ============================================================
   main.js — bootstrap.

   Restores persisted settings + document, mounts every module in
   the right order, wires global keyboard shortcuts and the panel
   collapse controls, then reveals the UI.
   ============================================================ */
import { store, emptyDoc } from './core/state.js';
import { isEditingText, el } from './core/utils.js';
import { closeMenu } from './core/ui.js';
import { viewport } from './viewport.js';
import { initCanvas, lastPointerWorld } from './canvas.js';
import { initSidebar } from './sidebar.js';
import { initProperties } from './properties.js';
import { initToolbar } from './toolbar.js';
import { initStorage, loadStoredDoc, loadStoredSettings } from './storage.js';
import { initHistory, undo, redo } from './history.js';
import {
  deleteSelection, duplicateSelection, startRename,
  copySelection, cutSelection, pasteClipboard,
} from './nodes.js';

boot();

function boot() {
  restoreSettings();

  initCanvas();      // also initialises the viewport
  initSidebar();
  initProperties();
  initToolbar();
  initStorage();

  restoreDocument(); // load saved diagram (or start fresh + centred)
  initHistory();     // baseline = the just-restored document

  wireShortcuts();
  wirePanels();
  revealUI();
}

/* ---------------- restore persisted state ---------------- */
function restoreSettings() {
  const s = loadStoredSettings();
  if (s && typeof s === 'object') Object.assign(store.settings, s);
  if (store.settings.theme === 'light') document.body.classList.add('theme-light');
}

function restoreDocument() {
  const doc = loadStoredDoc();
  if (doc) {
    store.loadDoc(doc, { reason: 'restore' });
  } else {
    store.loadDoc(emptyDoc(), { reason: 'restore' });
    viewport.center();
  }
}

/* ---------------- keyboard shortcuts ---------------- */
function wireShortcuts() {
  window.addEventListener('keydown', (e) => {
    const editing = isEditingText();
    const mod = e.ctrlKey || e.metaKey;

    // Escape always works (also closes menus / clears selection)
    if (e.key === 'Escape') { closeMenu(); if (!editing) store.clearSelection(); return; }
    if (editing) return; // don't hijack typing

    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
      return;
    }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelection(); return; }
    if (mod && e.key.toLowerCase() === 'x') { e.preventDefault(); cutSelection(); return; }
    if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteClipboard(lastPointerWorld()); return; }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelection(); return; }
    if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); store.selectAll(); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); import('./storage.js').then((m) => m.saveNow()); return; }

    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); return; }
    if (e.key === 'F2') { const id = [...store.selection][0]; if (id) startRename(id); return; }

    if (e.key === 'g' || e.key === 'G') { store.setSetting('grid', !store.settings.grid); return; }
    if (e.key === '1' && e.shiftKey) { viewport.fit(); return; }
    if (e.key === '=' || e.key === '+') { viewport.zoomIn(); return; }
    if (e.key === '-' || e.key === '_') { viewport.zoomOut(); return; }
    if (e.key === '0' && mod) { e.preventDefault(); viewport.resetZoom(); return; }
  });
}

/* ---------------- panel collapse controls ---------------- */
function wirePanels() {
  const left = document.getElementById('collapse-left');
  const right = document.getElementById('collapse-right');
  left?.addEventListener('click', () => document.body.classList.add('left-collapsed'));
  right?.addEventListener('click', () => document.body.classList.add('right-collapsed'));

  const wrap = document.getElementById('ed-canvas-wrap');
  const reLeft = el('button', {
    class: 'panel-reopen left', title: 'Show components',
    html: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  });
  const reRight = el('button', {
    class: 'panel-reopen right', title: 'Show properties',
    html: '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
  });
  reLeft.addEventListener('click', () => document.body.classList.remove('left-collapsed'));
  reRight.addEventListener('click', () => document.body.classList.remove('right-collapsed'));
  wrap.append(reLeft, reRight);
}

/* ---------------- reveal ---------------- */
function revealUI() {
  const fade = document.getElementById('fade');
  requestAnimationFrame(() => fade && fade.classList.add('hide'));
  setTimeout(() => { if (fade) fade.style.display = 'none'; }, 520);
}
