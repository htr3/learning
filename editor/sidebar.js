/* ============================================================
   sidebar.js — the left component palette.

   Renders catalog components grouped by category, provides a
   search filter, tooltips, collapsible categories, and lets the
   user drag a component onto the canvas (or click to drop it at
   the viewport centre).
   ============================================================ */
import { CATALOG, CATEGORIES, iconMarkup } from './catalog.js';
import { el } from './core/utils.js';
import { viewport } from './viewport.js';
import { createNode } from './nodes.js';

const DND_MIME = 'application/x-arch-component';
const collapsed = new Set();

let paletteEl = null;
let searchEl = null;

export function initSidebar() {
  paletteEl = document.getElementById('palette');
  searchEl = document.getElementById('component-search');

  render('');

  searchEl.addEventListener('input', () => render(searchEl.value));

  // enable drag-and-drop dropping onto the canvas
  const wrap = document.getElementById('ed-canvas-wrap');
  wrap.addEventListener('dragover', (e) => {
    if (![...e.dataTransfer.types].includes(DND_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    wrap.classList.add('drop-active');
  });
  wrap.addEventListener('dragleave', (e) => {
    if (e.target === wrap) wrap.classList.remove('drop-active');
  });
  wrap.addEventListener('drop', (e) => {
    const id = e.dataTransfer.getData(DND_MIME);
    wrap.classList.remove('drop-active');
    if (!id) return;
    e.preventDefault();
    const w = viewport.screenToWorld(e.clientX, e.clientY);
    createNode(id, w.x - 84, w.y - 33, { select: true });
  });
}

function render(filter) {
  const q = filter.trim().toLowerCase();
  paletteEl.innerHTML = '';

  let anyShown = false;
  for (const cat of CATEGORIES) {
    const items = CATALOG.filter((c) => c.category === cat.id && matches(c, q));
    if (!items.length) continue;
    anyShown = true;

    const isOpen = q ? true : !collapsed.has(cat.id);
    const section = el('div', { class: 'cat' + (isOpen ? '' : ' collapsed') });

    const head = el('button', {
      class: 'cat-head', type: 'button',
      html: `<svg class="cat-chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
             <span class="cat-dot" style="background:${cat.color}"></span>
             <span>${cat.label}</span>
             <span class="cat-count">${items.length}</span>`,
    });
    head.addEventListener('click', () => {
      if (collapsed.has(cat.id)) collapsed.delete(cat.id); else collapsed.add(cat.id);
      render(searchEl.value);
    });
    section.appendChild(head);

    const grid = el('div', { class: 'cat-items' });
    for (const c of items) grid.appendChild(paletteItem(c));
    section.appendChild(grid);
    paletteEl.appendChild(section);
  }

  if (!anyShown) {
    paletteEl.appendChild(el('div', { class: 'palette-empty', text: 'No components match your search.' }));
  }
}

function matches(c, q) {
  if (!q) return true;
  return [c.label, c.tech, c.desc, c.category].join(' ').toLowerCase().includes(q);
}

function paletteItem(c) {
  const item = el('div', {
    class: 'pal-item',
    draggable: 'true',
    'data-tip': c.desc,
    style: { '--comp-color': c.color },
    html: `<span class="pal-ico">${iconMarkup(c.icon)}</span><span class="pal-label">${c.label}</span>`,
  });

  item.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData(DND_MIME, c.id);
    e.dataTransfer.effectAllowed = 'copy';
    item.classList.add('dragging');
  });
  item.addEventListener('dragend', () => item.classList.remove('dragging'));

  // click-to-add at the centre of the current viewport
  item.addEventListener('click', () => {
    const r = viewport.rect();
    const w = viewport.screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
    createNode(c.id, w.x - 84, w.y - 33, { select: true });
  });

  return item;
}
