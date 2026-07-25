# Architecture Editor

An Eraser.io-style **System Design whiteboard** built with **pure HTML, CSS and Vanilla JS** (native ES modules — no build step, no npm, no frameworks). It lives inside the Visual Learning site and is linked from the homepage.

Live path once deployed: `https://<user>.github.io/<repo>/editor/`

## Features

- **Infinite canvas** with smooth zoom (mouse wheel), pan (Space + drag or middle mouse) and a grid background.
- **Component palette** grouped by category (Networking, Backend, Database, Storage, Messaging, Infrastructure, Monitoring, Security, Cloud) with search, tooltips and professional SVG icons. Drag onto the canvas or click to drop.
- **Nodes**: move (with snapping), resize (8 handles), double-click to rename, duplicate, delete, lock/unlock, group/ungroup, bring forward / send backward.
- **Connectors**: drag from a node port to another node. Straight / curved / orthogonal routing, arrowheads, animated flow and editable labels with protocol presets (REST, HTTP, HTTPS, gRPC, Kafka, TCP, UDP, WebSocket).
- **Selection**: click, Shift multi-select, marquee drag-box, `Ctrl+A`, right-click context menu.
- **Properties panel**: name, technology, description, colour, background, border, port, instances, notes (live-bound to the selection).
- **Toolbar**: undo, redo, zoom, fit, toggle grid, connector style, animate, auto layout, templates, export (PNG/SVG/JSON), import JSON, clear, dark/light theme.
- **Templates**: Netflix, YouTube, Instagram, WhatsApp, Uber, Payment Gateway, Chat Application, URL Shortener.
- **Autosave** to LocalStorage with automatic restore on refresh.
- **Export** to PNG, SVG and JSON — all client-side, no dependencies.

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Copy / Cut / Paste | `Ctrl+C` / `Ctrl+X` / `Ctrl+V` |
| Duplicate | `Ctrl+D` |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Shift+Z` (or `Ctrl+Y`) |
| Select all | `Ctrl+A` |
| Delete | `Delete` / `Backspace` |
| Rename | `F2` |
| Pan | `Space` + drag (or middle-mouse drag) |
| Zoom | Mouse wheel (or `+` / `-`) |
| Fit to screen | `Shift+1` |
| Toggle grid | `G` |
| Save now | `Ctrl+S` |

## Code structure

```
editor/
  index.html          # layout shell (header / palette / canvas / properties / status bar)
  main.js             # bootstrap: restore, mount modules, shortcuts
  core/
    state.js          # serializable document + store (single source of truth)
    bus.js            # tiny pub/sub event bus (decouples logic from UI)
    ui.js             # menus, toasts, confirm modal
    utils.js          # id/geometry/dom/debounce helpers
  viewport.js         # pan / zoom / grid / fit + screen<->world math
  canvas.js           # render reconcile, marquee select, context menu
  nodes.js            # node factory + drag / resize / rename / commands / clipboard
  edges.js            # connectors: routing, arrowheads, labels, port-drag
  sidebar.js          # component palette + search + drag-to-canvas
  properties.js       # right panel (live property editing)
  toolbar.js          # top toolbar actions + auto layout
  history.js          # snapshot undo / redo
  storage.js          # debounced LocalStorage autosave + restore
  export.js           # JSON / SVG / PNG export + JSON import
  templates.js        # ready-to-edit reference architectures
  catalog.js          # component metadata + inline SVG icons
  styles/             # editor.css, components.css, canvas.css
```

The architecture is intentionally decoupled through a serializable document + event bus, leaving clear extension points for future work (AI diagram generation, architecture review, interview mode, traffic simulation, failure injection, version history, real-time collaboration) without rewriting the rendering layer.

## Running locally

Native ES modules must be served over HTTP (not opened via `file://`). From the **repository root**:

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000/editor/
```

or

```bash
npx serve .
# then open the printed URL + /editor/
```

## Deployment (GitHub Pages)

No build step and no workflow changes are required. The repository's existing GitHub Pages workflow (`.github/workflows/static.yml`) publishes the whole repo on every push to `main`, so the `editor/` folder ships automatically. After a push, the editor is available at `/<repo>/editor/`.
