/* ============================================================
   ui.js — shared, framework-free UI primitives:
   floating menus (toolbar dropdowns + context menu), toasts and
   a confirm modal. Kept tiny and dependency-free.
   ============================================================ */
import { el } from './utils.js';
import { bus, EVT } from './bus.js';

let openCloser = null; // currently open menu's close fn

/**
 * Open a floating menu at (x,y).
 * items: array of
 *   { label, icon(html), sub, danger, disabled, onClick }
 *   | { sep:true } | { title:'…' } | { desc:'…' }
 * Returns a close() function.
 */
export function openMenu(items, x, y, { align = 'left' } = {}) {
  closeMenu();
  const menu = el('div', { class: 'menu' });

  for (const it of items) {
    if (!it) continue;
    if (it.sep) { menu.appendChild(el('div', { class: 'menu-sep' })); continue; }
    if (it.title) { menu.appendChild(el('div', { class: 'menu-title', text: it.title })); continue; }
    if (it.desc) { menu.appendChild(el('div', { class: 'menu-desc', text: it.desc })); continue; }

    const item = el('div', {
      class: 'menu-item' + (it.danger ? ' danger' : '') + (it.disabled ? ' disabled' : ''),
      html: `${it.icon ? `<span class="mi-ico">${it.icon}</span>` : ''}<span>${it.label}</span>${it.sub ? `<span class="mi-sub">${it.sub}</span>` : ''}`,
    });
    if (!it.disabled) {
      item.addEventListener('click', () => { closeMenu(); it.onClick && it.onClick(); });
    }
    menu.appendChild(item);
  }

  menu.style.visibility = 'hidden';
  document.body.appendChild(menu);
  // keep on-screen
  const r = menu.getBoundingClientRect();
  let left = x, top = y;
  if (align === 'right') left = x - r.width;
  if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
  if (top + r.height > window.innerHeight - 8) top = window.innerHeight - r.height - 8;
  menu.style.left = Math.max(8, left) + 'px';
  menu.style.top = Math.max(8, top) + 'px';
  menu.style.visibility = 'visible';

  const onDown = (e) => { if (!menu.contains(e.target)) closeMenu(); };
  const onKey = (e) => { if (e.key === 'Escape') closeMenu(); };
  // defer so the opening click doesn't immediately close it
  setTimeout(() => {
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);
  }, 0);

  openCloser = () => {
    window.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('keydown', onKey, true);
    menu.remove();
    openCloser = null;
  };
  return openCloser;
}

export function closeMenu() { if (openCloser) openCloser(); }

/* ---------------- toast ---------------- */
function toastHost() {
  let h = document.getElementById('toast-host');
  if (!h) { h = el('div', { id: 'toast-host' }); document.body.appendChild(h); }
  return h;
}

export function toast(message, type = '') {
  const t = el('div', { class: 'toast ' + type, html: `<span class="t-dot"></span><span>${message}</span>` });
  toastHost().appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .25s, transform .25s';
    t.style.opacity = '0';
    t.style.transform = 'translateY(6px)';
    setTimeout(() => t.remove(), 260);
  }, 2200);
}

// allow any module to raise a toast via the bus
bus.on(EVT.TOAST, ({ message, type }) => toast(message, type));

/* ---------------- confirm modal ---------------- */
export function confirmModal({ title = 'Are you sure?', message = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    const backdrop = el('div', { class: 'modal-backdrop' });
    const modal = el('div', { class: 'modal' });
    modal.innerHTML = `
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="modal-actions">
        <button class="modal-btn" data-x="cancel">${cancelText}</button>
        <button class="modal-btn primary" data-x="ok">${confirmText}</button>
      </div>`;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const done = (val) => { backdrop.remove(); resolve(val); };
    modal.querySelector('[data-x="ok"]').addEventListener('click', () => done(true));
    modal.querySelector('[data-x="cancel"]').addEventListener('click', () => done(false));
    backdrop.addEventListener('pointerdown', (e) => { if (e.target === backdrop) done(false); });
    window.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { window.removeEventListener('keydown', onKey); done(false); }
      if (e.key === 'Enter') { window.removeEventListener('keydown', onKey); done(true); }
    });
  });
}
