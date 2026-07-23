/**
 * DSA Interactive Visuals — Three.js (3D) + Canvas 2D step animators
 * Works on file:// and static servers; falls back to 2D on narrow viewports.
 */
(function () {
  "use strict";

  const MOBILE_MAX = 768;
  const AUTOPLAY_MS = 900;

  function isMobile() {
    return window.innerWidth < MOBILE_MAX;
  }

  function use3D() {
    return !isMobile() && typeof THREE !== "undefined";
  }

  function randArr(n, max) {
    max = max || 20;
    return Array.from({ length: n }, () => 2 + Math.floor(Math.random() * (max - 1)));
  }

  function makeControls(card, opts) {
    const stage = card.querySelector(".visual-stage");
    const status = card.querySelector(".visual-status");
    const slider = card.querySelector('input[type="range"]');
    const state = {
      step: 0,
      playing: false,
      timer: null,
      data: opts.initData ? opts.initData() : null
    };

    function setStatus(text) {
      if (status) status.textContent = text;
    }

    function stopAuto() {
      state.playing = false;
      if (state.timer) clearInterval(state.timer);
      state.timer = null;
      const playBtn = card.querySelector('[data-action="play"]');
      if (playBtn) {
        playBtn.setAttribute("aria-pressed", "false");
        playBtn.textContent = "Auto play";
      }
    }

    function reset() {
      stopAuto();
      state.step = 0;
      if (slider && opts.sizeFromSlider) {
        state.data = opts.initData(parseInt(slider.value, 10));
      } else {
        state.data = opts.initData ? opts.initData() : null;
      }
      opts.render(state, setStatus);
      setStatus(opts.statusText ? opts.statusText(state) : "Ready — press Next step");
    }

    function next() {
      const max = opts.maxSteps(state);
      if (state.step >= max) {
        stopAuto();
        setStatus("Done — press Reset to replay");
        return;
      }
      state.step++;
      opts.onStep(state);
      opts.render(state, setStatus);
      setStatus(opts.statusText(state));
      if (state.step >= max) stopAuto();
    }

    card.querySelector('[data-action="reset"]')?.addEventListener("click", reset);
    card.querySelector('[data-action="next"]')?.addEventListener("click", next);

    card.querySelector('[data-action="play"]')?.addEventListener("click", (e) => {
      const btn = e.currentTarget;
      if (state.playing) {
        stopAuto();
        return;
      }
      state.playing = true;
      btn.setAttribute("aria-pressed", "true");
      btn.textContent = "Pause";
      state.timer = setInterval(() => {
        if (state.step >= opts.maxSteps(state)) {
          reset();
          next();
        } else next();
      }, opts.interval || AUTOPLAY_MS);
    });

    slider?.addEventListener("input", () => reset());

    if (opts.extraInit) opts.extraInit(card, state, reset);
    reset();
    return { state, reset, next, setStatus };
  }

  /* —— Shared canvas factories —— */
  function prepCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width = canvas.clientWidth;
    const h = canvas.height = canvas.clientHeight;
    ctx.fillStyle = "#0f1419";
    ctx.fillRect(0, 0, w, h);
    return { ctx, w, h };
  }

  function drawBars(ctx, w, h, arr, hiMap, msg) {
    const n = arr.length;
    const barW = Math.min(44, (w - 30) / Math.max(n, 1) - 4);
    const maxV = Math.max(...arr, 1);
    const baseY = h - 28;
    arr.forEach((v, i) => {
      const bh = (v / maxV) * (h - 70);
      const x = 15 + i * (barW + 4);
      ctx.fillStyle = (hiMap && hiMap[i]) || "#3b82f6";
      ctx.fillRect(x, baseY - bh, barW, bh);
      ctx.fillStyle = "#8b9cb3";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(v), x + barW / 2, baseY + 14);
    });
    if (msg) {
      ctx.fillStyle = "#93c5fd";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(msg, 12, 20);
    }
  }

  function drawDpGrid(ctx, w, h, table, hi, rows, cols, rowLabels, colLabels) {
    const cellW = Math.min(48, (w - 60) / cols);
    const cellH = Math.min(36, (h - 50) / rows);
    const ox = 50;
    const oy = 36;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ox + c * cellW;
        const y = oy + r * cellH;
        const on = hi && hi[0] === r && hi[1] === c;
        ctx.fillStyle = on ? "#f59e0b" : "#1e293b";
        ctx.fillRect(x, y, cellW - 2, cellH - 2);
        ctx.strokeStyle = "#334155";
        ctx.strokeRect(x, y, cellW - 2, cellH - 2);
        ctx.fillStyle = on ? "#fff" : "#e7ecf3";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(table[r][c]), x + cellW / 2 - 1, y + cellH / 2 + 4);
      }
    }
    if (colLabels) colLabels.forEach((lb, c) => {
      ctx.fillStyle = "#8b9cb3";
      ctx.fillText(lb, ox + c * cellW + cellW / 2, oy - 8);
    });
    if (rowLabels) rowLabels.forEach((lb, r) => {
      ctx.fillStyle = "#8b9cb3";
      ctx.textAlign = "right";
      ctx.fillText(lb, ox - 8, oy + r * cellH + cellH / 2 + 4);
      ctx.textAlign = "center";
    });
  }

  function sampleTree() {
    return { val: 8, left: { val: 3, left: { val: 1, left: null, right: null }, right: { val: 6, left: { val: 4, left: null, right: null }, right: null } }, right: { val: 10, left: null, right: { val: 14, left: { val: 12, left: null, right: null }, right: null } } };
  }

  function layoutTree(node, depth, xMin, xMax) {
    if (!node) return [];
    const mid = (xMin + xMax) / 2;
    return [{ node, x: mid, y: -depth * 1.4, val: node.val }]
      .concat(layoutTree(node.left, depth + 1, xMin, mid), layoutTree(node.right, depth + 1, mid, xMax));
  }

  function drawTree2D(canvas, root, pathSet, order, step) {
    const { ctx, w, h } = prepCanvas(canvas);
    const nodes = layoutTree(root, 0, -5, 5);
    const scaleX = w / 10;
    const scaleY = 42;
    const oy = 50;
    const visited = order ? new Set(order.slice(0, step)) : pathSet;
    nodes.forEach(({ node, x, y, val }) => {
      const px = w / 2 + x * scaleX * 0.9;
      const py = oy - y * scaleY;
      const on = pathSet ? pathSet.has(node) : visited && visited.has(val);
      const cur = order && order[step - 1] === val;
      ctx.beginPath();
      ctx.arc(px, py, 22, 0, Math.PI * 2);
      ctx.fillStyle = cur ? "#f59e0b" : on ? "#22c55e" : "#3b82f6";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(val), px, py + 5);
    });
    nodes.forEach(({ node, x, y }) => {
      ["left", "right"].forEach(side => {
        const ch = node[side];
        if (!ch) return;
        const c = nodes.find(n => n.node === ch);
        if (!c) return;
        ctx.strokeStyle = "#64748b";
        ctx.beginPath();
        ctx.moveTo(w / 2 + x * scaleX * 0.9, oy - y * scaleY);
        ctx.lineTo(w / 2 + c.x * scaleX * 0.9, oy - c.y * scaleY);
        ctx.stroke();
      });
    });
  }

  function getTraversalOrder(root, mode) {
    const out = [];
    function walk(n) {
      if (!n) return;
      if (mode === "preorder") out.push(n.val);
      walk(n.left);
      if (mode === "inorder") out.push(n.val);
      walk(n.right);
      if (mode === "postorder") out.push(n.val);
    }
    walk(root);
    return out;
  }

  function levelOrder(root) {
    if (!root) return [];
    const q = [root];
    const order = [];
    while (q.length) {
      const sz = q.length;
      for (let i = 0; i < sz; i++) {
        const n = q.shift();
        order.push(n.val);
        if (n.left) q.push(n.left);
        if (n.right) q.push(n.right);
      }
    }
    return order;
  }

  const GRAPH_SAMPLE = {
    edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5]],
    nodes: [{ id: 0, x: 0, y: 2 }, { id: 1, x: -2, y: 0 }, { id: 2, x: 2, y: 0 }, { id: 3, x: 0, y: 0 }, { id: 4, x: -1.5, y: -2 }, { id: 5, x: 1.5, y: -2 }]
  };

  function buildAdj(edges) {
    const adj = {};
    edges.forEach(([a, b]) => {
      (adj[a] = adj[a] || []).push(b);
      (adj[b] = adj[b] || []).push(a);
    });
    Object.keys(adj).forEach(k => adj[k].sort((a, b) => a - b));
    return adj;
  }

  function drawGraph2D(canvas, spec, order, step) {
    const { ctx, w, h } = prepCanvas(canvas);
    const { edges, nodes } = spec;
    const sx = w / 6;
    const sy = h / 5;
    const ox = w / 2;
    const oy = h / 2 - 10;
    const visited = new Set(order.slice(0, step));
    const current = order[step - 1];
    edges.forEach(([a, b]) => {
      const na = nodes[a];
      const nb = nodes[b];
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ox + na.x * sx, oy - na.y * sy);
      ctx.lineTo(ox + nb.x * sx, oy - nb.y * sy);
      ctx.stroke();
    });
    nodes.forEach(n => {
      const px = ox + n.x * sx;
      const py = oy - n.y * sy;
      ctx.beginPath();
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.fillStyle = n.id === current ? "#f59e0b" : visited.has(n.id) ? "#22c55e" : "#3b82f6";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(n.id), px, py + 4);
    });
  }

  function canvasOnly(card) {
    const c = card.querySelector(".three-container");
    if (c) c.style.display = "none";
    const cv = card.querySelector("canvas.visual-canvas");
    if (cv) cv.style.display = "block";
    return cv;
  }

  /* —— Three.js helpers —— */
  function createThreeScene(container, opts) {
    const w = container.clientWidth || 400;
    const h = container.clientHeight || 280;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(opts.bg || 0x0f1419);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(opts.camX || 0, opts.camY || 8, opts.camZ || 14);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(5, 12, 8);
    scene.add(ambient, dir);

    let animId = null;
    function animate() {
      animId = requestAnimationFrame(animate);
      if (opts.onAnimate) opts.onAnimate();
      renderer.render(scene, camera);
    }
    animate();

    function resize() {
      const nw = container.clientWidth || 400;
      const nh = container.clientHeight || 280;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    }
    window.addEventListener("resize", resize);

    return { scene, camera, renderer, resize, dispose: () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      renderer.dispose();
    }};
  }

  function labelSprite(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e7ecf3";
    ctx.font = "bold 14px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 32, 22);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.2, 0.6, 1);
    return sprite;
  }

  /* —— 1. Array indexing / insertion —— */
  function initArrayVisual(card) {
    const container = card.querySelector(".three-container");
    const canvas2d = card.querySelector("canvas.visual-canvas");
    let threeCtx = null;
    let meshes = [];
    let highlightIdx = -1;

    function build3D(arr, hi) {
      if (!threeCtx) {
        threeCtx = createThreeScene(container, { camY: 6, camZ: 12 });
      }
      const { scene } = threeCtx;
      meshes.forEach(m => scene.remove(m));
      meshes = [];
      const n = arr.length;
      const gap = 1.1;
      const startX = -((n - 1) * gap) / 2;
      arr.forEach((v, i) => {
        const geo = new THREE.BoxGeometry(0.85, v * 0.18, 0.85);
        const color = i === hi ? 0x22c55e : i === hi + 1 ? 0xf59e0b : 0x3b82f6;
        const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.6 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(startX + i * gap, (v * 0.18) / 2, 0);
        scene.add(mesh);
        meshes.push(mesh);
        const lbl = labelSprite(String(i));
        lbl.position.set(mesh.position.x, -0.6, 0.6);
        scene.add(lbl);
        meshes.push(lbl);
      });
      threeCtx.resize();
    }

    function draw2D(arr, hi, msg) {
      const ctx = canvas2d.getContext("2d");
      const w = canvas2d.width = canvas2d.clientWidth;
      const h = canvas2d.height = canvas2d.clientHeight;
      ctx.fillStyle = "#0f1419";
      ctx.fillRect(0, 0, w, h);
      const n = arr.length;
      const barW = Math.min(48, (w - 40) / n - 6);
      const maxV = Math.max(...arr, 1);
      const baseY = h - 36;
      arr.forEach((v, i) => {
        const bh = (v / maxV) * (h - 80);
        const x = 20 + i * (barW + 8);
        ctx.fillStyle = i === hi ? "#22c55e" : "#3b82f6";
        ctx.fillRect(x, baseY - bh, barW, bh);
        ctx.fillStyle = "#8b9cb3";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(i), x + barW / 2, baseY + 16);
        ctx.fillStyle = "#e7ecf3";
        ctx.fillText(String(v), x + barW / 2, baseY - bh - 6);
      });
      if (msg) {
        ctx.fillStyle = "#93c5fd";
        ctx.font = "13px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(msg, 12, 20);
      }
    }

    const steps = [
      { hi: 0, msg: "Access index 0 — O(1) direct lookup" },
      { hi: 2, msg: "Access index 2 — still O(1)" },
      { hi: -1, msg: "Insert at index 2: shift elements right — O(n)" },
      { hi: 2, msg: "After insert: value 99 at index 2" }
    ];
    let inserted = false;

    makeControls(card, {
      sizeFromSlider: true,
      initData(n) {
        inserted = false;
        highlightIdx = -1;
        return { arr: randArr(n || 8), insertVal: 99, insertAt: 2 };
      },
      maxSteps: () => steps.length,
      onStep(state) {
        const s = steps[state.step - 1];
        if (state.step === 4 && !inserted) {
          const a = state.data.arr;
          const v = state.data.insertVal;
          const at = state.data.insertAt;
          state.data.arr = [...a.slice(0, at), v, ...a.slice(at)];
          inserted = true;
        }
        highlightIdx = s ? s.hi : -1;
      },
      statusText(st) {
        const s = steps[st.step - 1];
        return s ? s.msg : "Array: contiguous memory — index → value in O(1)";
      },
      render(st, setStatus) {
        const arr = st.data.arr;
        const s = steps[st.step - 1];
        const hi = s ? s.hi : -1;
        const msg = s ? s.msg : null;
        if (use3D() && container) {
          canvas2d.style.display = "none";
          container.style.display = "block";
          build3D(arr, hi);
        } else {
          if (container) container.style.display = "none";
          canvas2d.style.display = "block";
          draw2D(arr, hi, msg);
        }
      }
    });
  }

  /* —— 2. Linked list — reverse algorithm (pointer rewiring) —— */
  function initLinkedListVisual(card) {
    const canvas2d = card.querySelector("canvas.visual-canvas");
    const container = card.querySelector(".three-container");
    const values = [1, 2, 3, 4];
    const script = window.LinkedListAlgos
      ? window.LinkedListAlgos.reverseSteps(values)
      : [{ msg: "Load linked-list-algos.js", ll: { values, nextTo: [1, 2, 3, -1] } }];

    makeControls(card, {
      initData: () => ({}),
      maxSteps: () => script.length,
      onStep(st) {
        st.data.frame = script[Math.min(st.step - 1, script.length - 1)];
      },
      statusText: st => st.data.frame?.msg || "Reverse: curr.next = prev, then advance",
      render(st) {
        const frame = st.data.frame || script[0];
        if (!canvas2d) return;
        const ctx = canvas2d.getContext("2d");
        const w = canvas2d.width = canvas2d.clientWidth;
        const h = canvas2d.height = canvas2d.clientHeight;
        if (container) container.style.display = "none";
        canvas2d.style.display = "block";
        if (window.LinkedListDraw && frame.ll) {
          window.LinkedListDraw.drawSingly(ctx, w, h, { ...frame.ll, msg: frame.msg });
        }
      }
    });
  }

  /* —— 3. Stack push / pop —— */
  function initStackVisual(card) {
    const container = card.querySelector(".three-container");
    const canvas2d = card.querySelector("canvas.visual-canvas");
    let threeCtx = null;
    const stack = [];

    function renderStack(highlight) {
      const ops = highlight;
      if (use3D() && container) {
        if (!threeCtx) threeCtx = createThreeScene(container, { camX: 4, camY: 5, camZ: 10 });
        const { scene } = threeCtx;
        while (scene.children.length > 2) scene.remove(scene.children[2]);
        stack.forEach((v, i) => {
          const geo = new THREE.BoxGeometry(1.8, 0.5, 1.2);
          const top = i === stack.length - 1;
          const mat = new THREE.MeshStandardMaterial({
            color: top ? 0x22c55e : 0x3b82f6
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(0, i * 0.55, 0);
          scene.add(mesh);
          const lbl = labelSprite(String(v));
          lbl.position.set(0, i * 0.55, 0.9);
          scene.add(lbl);
        });
        const lblTop = labelSprite("top ↑");
        lblTop.position.set(1.5, stack.length * 0.55, 0);
        scene.add(lblTop);
        threeCtx.resize();
        container.style.display = "block";
        canvas2d.style.display = "none";
      } else {
        const ctx = canvas2d.getContext("2d");
        const w = canvas2d.width = canvas2d.clientWidth;
        const h = canvas2d.height = canvas2d.clientHeight;
        ctx.fillStyle = "#0f1419";
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2 - 40;
        const base = h - 40;
        ctx.strokeStyle = "#2d3a4f";
        ctx.lineWidth = 3;
        ctx.strokeRect(cx, 30, 80, base - 30);
        stack.forEach((v, i) => {
          const y = base - (i + 1) * 36;
          ctx.fillStyle = i === stack.length - 1 ? "#22c55e" : "#3b82f6";
          ctx.fillRect(cx + 6, y, 68, 32);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(v), cx + 40, y + 21);
        });
        ctx.fillStyle = "#93c5fd";
        ctx.textAlign = "left";
        ctx.font = "13px sans-serif";
        ctx.fillText(ops || "LIFO stack — push adds on top, pop removes top", 12, 22);
        container.style.display = "none";
        canvas2d.style.display = "block";
      }
    }

    const script = [
      { op: "push", v: 10, msg: "push(10) — O(1)" },
      { op: "push", v: 20, msg: "push(20)" },
      { op: "push", v: 30, msg: "push(30) — top is 30" },
      { op: "pop", msg: "pop() → 30 removed — O(1)" },
      { op: "peek", msg: "peek() → 20 (top without remove)" }
    ];

    makeControls(card, {
      initData: () => ({ stack: [], scriptIdx: 0 }),
      maxSteps: () => script.length,
      onStep(st) {
        const s = script[st.step - 1];
        if (s.op === "push") stack.push(s.v);
        else if (s.op === "pop" && stack.length) stack.pop();
        st.data.lastMsg = s.msg;
      },
      statusText: st => st.data.lastMsg || "Stack: Last In, First Out",
      render: st => renderStack(st.data.lastMsg)
    });
  }

  /* —— 4. BST insert / search —— */
  function initBstVisual(card) {
    const container = card.querySelector(".three-container");
    const canvas2d = card.querySelector("canvas.visual-canvas");
    let root = null;
    let highlight = null;
    let threeCtx = null;

    function insert(node, val) {
      if (!node) return { val, left: null, right: null };
      if (val < node.val) node.left = insert(node.left, val);
      else if (val > node.val) node.right = insert(node.right, val);
      return node;
    }

    function layout(node, depth, xMin, xMax) {
      if (!node) return [];
      const mid = (xMin + xMax) / 2;
      const out = [{ node, x: mid, y: -depth * 1.4, val: node.val }];
      return out.concat(
        layout(node.left, depth + 1, xMin, mid),
        layout(node.right, depth + 1, mid, xMax)
      );
    }

    function searchPath(val) {
      const path = [];
      let cur = root;
      while (cur) {
        path.push(cur);
        if (val === cur.val) return path;
        cur = val < cur.val ? cur.left : cur.right;
      }
      return path;
    }

    function renderBst(pathNodes, target) {
      const nodes = layout(root, 0, -5, 5);
      const pathSet = new Set(pathNodes || []);

      if (use3D() && container) {
        if (!threeCtx) threeCtx = createThreeScene(container, { camY: 2, camZ: 14 });
        const { scene } = threeCtx;
        while (scene.children.length > 2) scene.remove(scene.children[2]);
        nodes.forEach(({ node, x, y, val }) => {
          const onPath = pathSet.has(node);
          const found = node.val === target;
          const geo = new THREE.SphereGeometry(0.42, 20, 20);
          const mat = new THREE.MeshStandardMaterial({
            color: found ? 0x22c55e : onPath ? 0xf59e0b : 0x3b82f6
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(x, y, 0);
          scene.add(mesh);
          const lbl = labelSprite(String(val));
          lbl.position.set(x, y + 0.75, 0);
          scene.add(lbl);
        });
        nodes.forEach(({ node, x, y }) => {
          [["left", -2], ["right", 2]].forEach(([side, dx]) => {
            const child = node[side];
            if (!child) return;
            const childPos = nodes.find(n => n.node === child);
            if (!childPos) return;
            const points = [
              new THREE.Vector3(x, y, 0),
              new THREE.Vector3(childPos.x, childPos.y, 0)
            ];
            scene.add(new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(points),
              new THREE.LineBasicMaterial({ color: 0x64748b })
            ));
          });
        });
        threeCtx.resize();
        container.style.display = "block";
        canvas2d.style.display = "none";
      } else {
        const ctx = canvas2d.getContext("2d");
        const w = canvas2d.width = canvas2d.clientWidth;
        const h = canvas2d.height = canvas2d.clientHeight;
        ctx.fillStyle = "#0f1419";
        ctx.fillRect(0, 0, w, h);
        const scaleX = w / 10;
        const scaleY = 42;
        const oy = 50;
        nodes.forEach(({ node, x, y, val }) => {
          const px = w / 2 + x * scaleX * 0.9;
          const py = oy - y * scaleY;
          const onPath = pathSet.has(node);
          const found = node.val === target;
          ctx.beginPath();
          ctx.arc(px, py, 22, 0, Math.PI * 2);
          ctx.fillStyle = found ? "#22c55e" : onPath ? "#f59e0b" : "#3b82f6";
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(val), px, py + 5);
        });
        nodes.forEach(({ node, x, y }) => {
          ["left", "right"].forEach(side => {
            const child = node[side];
            if (!child) return;
            const c = nodes.find(n => n.node === child);
            if (!c) return;
            ctx.strokeStyle = "#64748b";
            ctx.beginPath();
            ctx.moveTo(w / 2 + x * scaleX * 0.9, oy - y * scaleY);
            ctx.lineTo(w / 2 + c.x * scaleX * 0.9, oy - c.y * scaleY);
            ctx.stroke();
          });
        });
        container.style.display = "none";
        canvas2d.style.display = "block";
      }
    }

    const inserts = [8, 3, 10, 1, 6, 14, 4];
    const searchVal = 6;

    makeControls(card, {
      initData: () => {
        root = null;
        highlight = null;
        return { phase: "BST: left < node < right" };
      },
      maxSteps: () => inserts.length + (root ? searchPath(searchVal).length : 4),
      onStep(st) {
        if (st.step <= inserts.length) {
          root = insert(root, inserts[st.step - 1]);
          st.data.phase = `Insert ${inserts[st.step - 1]} — go left if smaller, right if larger`;
        } else {
          const path = searchPath(searchVal);
          const sub = st.step - inserts.length;
          const pathSlice = path.slice(0, sub);
          const last = pathSlice[pathSlice.length - 1];
          if (last && last.val === searchVal) {
            st.data.phase = `Found ${searchVal}! Search path length ${path.length} — O(h)`;
          } else if (last) {
            st.data.phase = `Search ${searchVal}: at node ${last.val}, go ${searchVal < last.val ? "left" : "right"}`;
          }
        }
      },
      statusText: st => st.data.phase,
      render: st => {
        const path = st.step > inserts.length
          ? searchPath(searchVal).slice(0, st.step - inserts.length)
          : [];
        const found = path.length && path[path.length - 1].val === searchVal;
        renderBst(path, found ? searchVal : null);
      }
    });
  }

  /* —— Extended visuals (basics → greedy) —— */
  function initBigO(card) {
    const canvas = canvasOnly(card);
    const curves = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)"];
    const colors = ["#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ef4444"];
    makeControls(card, {
      initData: () => ({ n: 4 }),
      maxSteps: () => curves.length,
      onStep(st) { st.data.n = st.step; },
      statusText: st => st.step ? `${curves[st.step - 1]} — ${["constant","logarithmic","linear","linearithmic","quadratic"][st.step-1]} growth` : "Compare worst-case upper bounds as n grows",
      render(st) {
        const { ctx, w, h } = prepCanvas(canvas);
        const n = st.step || 1;
        const maxN = 16;
        curves.slice(0, n).forEach((label, i) => {
          ctx.strokeStyle = colors[i];
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let x = 1; x <= maxN; x++) {
            const fn = [1, Math.log2(x+1), x, x*Math.log2(x+1), x*x][i];
            const px = 40 + (x / maxN) * (w - 60);
            const py = h - 30 - (fn / (maxN*maxN)) * (h - 60);
            if (x === 1) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.fillStyle = colors[i];
          ctx.font = "12px sans-serif";
          ctx.fillText(label, w - 90, 24 + i * 16);
        });
      }
    });
  }

  function initRecursionBacktrack(card) {
    const canvas = canvasOnly(card);
    const steps = [
      { path: [], msg: "Start — empty subset []" },
      { path: [1], msg: "Include 1 → [1]" },
      { path: [1, 2], msg: "Include 2 → [1,2]" },
      { path: [1, 2, 3], msg: "Include 3 → [1,2,3] (complete)" },
      { path: [1, 2], msg: "Backtrack: remove 3" },
      { path: [1], msg: "Skip 3 from [1,2] → [1,2] done; backtrack 2" },
      { path: [], msg: "Skip 2 → [1]; skip 1 → explore branch without 1" }
    ];
    makeControls(card, {
      initData: () => ({}),
      maxSteps: () => steps.length,
      onStep() {},
      statusText: st => steps[st.step - 1]?.msg || "Backtracking = choose → recurse → undo",
      render(st) {
        const { ctx, w, h } = prepCanvas(canvas);
        const s = steps[st.step - 1];
        const path = s ? s.path : [];
        ctx.fillStyle = "#93c5fd";
        ctx.font = "14px sans-serif";
        ctx.fillText("Elements [1, 2, 3]:", 12, 24);
        ctx.fillStyle = "#e7ecf3";
        ctx.font = "bold 18px monospace";
        ctx.fillText("subset = [" + (path.length ? path.join(", ") : "") + "]", 12, 52);
        [1, 2, 3].forEach((el, i) => {
          const x = 40 + i * 70;
          const included = path.includes(el);
          ctx.fillStyle = included ? "#22c55e" : "#334155";
          ctx.fillRect(x, 80, 50, 40);
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(String(el), x + 25, 106);
        });
        if (s) { ctx.fillStyle = "#93c5fd"; ctx.textAlign = "left"; ctx.font = "13px sans-serif"; ctx.fillText(s.msg, 12, h - 16); }
      }
    });
  }

  function initTwoSum(card) {
    const canvas = canvasOnly(card);
    const nums = [2, 7, 11, 15];
    const target = 9;
    makeControls(card, {
      initData: () => ({ i: -1, map: {} }),
      maxSteps: () => nums.length + 1,
      onStep(st) {
        const i = st.step - 1;
        if (i < nums.length) {
          const need = target - nums[i];
          if (st.data.map[need] !== undefined) st.data.found = [st.data.map[need], i];
          st.data.map[nums[i]] = i;
          st.data.i = i;
        }
      },
      statusText: st => {
        if (st.data.found) return `Found pair indices ${st.data.found[0]} & ${st.data.found[1]} → ${nums[st.data.found[0]]}+${nums[st.data.found[1]]}=${target}`;
        if (st.data.i >= 0) return `i=${st.data.i}: check if ${target - nums[st.data.i]} in map; store ${nums[st.data.i]}→${st.data.i}`;
        return `Target=${target}. HashMap stores value→index`;
      },
      render(st) {
        const hi = {};
        if (st.data.i >= 0) hi[st.data.i] = "#f59e0b";
        if (st.data.found) { hi[st.data.found[0]] = "#22c55e"; hi[st.data.found[1]] = "#22c55e"; }
        const { ctx, w, h } = prepCanvas(canvas);
        drawBars(ctx, w, h, nums, hi, null);
        ctx.fillStyle = "#93c5fd";
        ctx.font = "12px sans-serif";
        ctx.fillText("Map: " + JSON.stringify(st.data.map || {}), 12, 20);
      }
    });
  }

  function initSlidingWindow(card) {
    const canvas = canvasOnly(card);
    const s = "abcabcbb";
    makeControls(card, {
      initData: () => ({ l: 0, r: -1, best: 0 }),
      maxSteps: () => s.length,
      onStep(st) {
        st.data.r++;
        const c = s[st.data.r];
        const last = st.data.last || {};
        if (last[c] !== undefined) st.data.l = Math.max(st.data.l, last[c] + 1);
        last[c] = st.data.r;
        st.data.last = last;
        st.data.best = Math.max(st.data.best, st.data.r - st.data.l + 1);
      },
      statusText: st => st.data.r < 0 ? `String "${s}" — expand right, shrink left on duplicate` : `r=${st.data.r} char='${s[st.data.r]}' l=${st.data.l} best=${st.data.best}`,
      render(st) {
        const { ctx, w, h } = prepCanvas(canvas);
        ctx.fillStyle = "#e7ecf3";
        ctx.font = "22px monospace";
        ctx.textAlign = "center";
        const y = h / 2;
        for (let i = 0; i < s.length; i++) {
          const x = w / 2 - (s.length * 14) + i * 28;
          const inWin = i >= st.data.l && i <= st.data.r;
          ctx.fillStyle = inWin ? "#22c55e" : "#475569";
          ctx.fillRect(x - 10, y - 20, 24, 32);
          ctx.fillStyle = inWin ? "#fff" : "#8b9cb3";
          ctx.fillText(s[i], x + 2, y + 2);
        }
      }
    });
  }

  function initPrefixSum(card) {
    const canvas = canvasOnly(card);
    const nums = [3, 1, 4, 2, 5];
    makeControls(card, {
      initData: () => ({ built: 0, l: 1, r: 3 }),
      maxSteps: () => nums.length + 2,
      onStep(st) { if (st.step <= nums.length) st.data.built = st.step; },
      statusText: st => {
        if (!st.data.built) return "Build prefix[i] = sum(nums[0..i])";
        const p = [0]; for (let i = 0; i < nums.length; i++) p.push(p[i] + nums[i]);
        if (st.data.built < nums.length) return `prefix[${st.data.built}] = ${p[st.data.built + 1]}`;
        return `Query [${st.data.l},${st.data.r}] = prefix[${st.data.r}] - prefix[${st.data.l - 1}]`;
      },
      render(st) {
        const p = [0]; nums.forEach((v, i) => p.push(p[i] + v));
        const hi = {};
        if (st.data.built) for (let i = 0; i < st.data.built; i++) hi[i] = "#3b82f6";
        if (st.data.built >= nums.length) { hi[st.data.l] = "#f59e0b"; hi[st.data.r] = "#f59e0b"; }
        const { ctx, w, h } = prepCanvas(canvas);
        drawBars(ctx, w, h, nums, hi, null);
        ctx.fillStyle = "#93c5fd";
        ctx.font = "12px sans-serif";
        ctx.fillText("prefix: [" + p.join(", ") + "]", 12, 20);
      }
    });
  }

  function initTwoPointers(card) {
    const canvas = canvasOnly(card);
    const hts = [1, 8, 6, 2, 5, 4, 8, 3, 7];
    makeControls(card, {
      initData: () => ({ l: 0, r: hts.length - 1, best: 0 }),
      maxSteps: () => 6,
      onStep(st) {
        const area = Math.min(hts[st.data.l], hts[st.data.r]) * (st.data.r - st.data.l);
        st.data.best = Math.max(st.data.best, area);
        st.data.lastArea = area;
        if (hts[st.data.l] < hts[st.data.r]) st.data.l++; else st.data.r--;
      },
      statusText: st => st.step ? `Area=${st.data.lastArea}, best=${st.data.best}. Move shorter side inward.` : "Two pointers at ends — O(n)",
      render(st) {
        const hi = { [st.data.l]: "#f59e0b", [st.data.r]: "#f59e0b" };
        const { ctx, w, h } = prepCanvas(canvas);
        drawBars(ctx, w, h, hts, hi, `l=${st.data.l} r=${st.data.r}`);
      }
    });
  }

  function initDoublyLL(card) {
    const canvas = canvasOnly(card);
    const vals = [10, 20, 30];
    makeControls(card, {
      initData: () => ({ curr: -1 }),
      maxSteps: () => vals.length + 1,
      onStep(st) { st.data.curr = Math.min(st.step - 1, vals.length - 1); },
      statusText: st => st.data.curr < 0 ? "Doubly linked: prev ← node → next" : `At node ${st.data.curr}, value ${vals[st.data.curr]}`,
      render(st) {
        const { ctx, w, h } = prepCanvas(canvas);
        if (window.LinkedListDraw) {
          window.LinkedListDraw.drawDoubly(ctx, w, h, {
            values: vals,
            curr: st.data.curr >= 0 ? st.data.curr : undefined,
            msg: st.data.curr < 0 ? "Doubly linked: prev ← node → next" : `At node ${st.data.curr}, value ${vals[st.data.curr]}`
          });
        }
      }
    });
  }

  function initCycleFloyd(card) {
    const canvas = canvasOnly(card);
    const script = window.LinkedListAlgos
      ? window.LinkedListAlgos.cycleSteps([3, 7, 2, 9, 5])
      : [];
    makeControls(card, {
      initData: () => ({}),
      maxSteps: () => script.length,
      onStep(st) {
        st.data.frame = script[Math.min(st.step - 1, script.length - 1)];
      },
      statusText: st => st.data.frame?.msg || "Floyd: slow +1, fast +2",
      render(st) {
        const frame = st.data.frame || script[0];
        const { ctx, w, h } = prepCanvas(canvas);
        if (window.LinkedListDraw && frame?.ll) {
          window.LinkedListDraw.drawSingly(ctx, w, h, { ...frame.ll, msg: frame.msg });
        }
      }
    });
  }

  function initQueue(card) {
    const canvas = canvasOnly(card);
    const q = [];
    const script = [
      { op: "enq", v: 5, msg: "enqueue(5) — rear" },
      { op: "enq", v: 10, msg: "enqueue(10)" },
      { op: "enq", v: 15, msg: "enqueue(15)" },
      { op: "deq", msg: "dequeue() → 5 removed from front" },
      { op: "peek", msg: "front = 10 (FIFO)" }
    ];
    makeControls(card, {
      initData: () => ({}),
      maxSteps: () => script.length,
      onStep(st) {
        const s = script[st.step - 1];
        if (s.op === "enq") q.push(s.v);
        else if (s.op === "deq" && q.length) q.shift();
        st.data.msg = s.msg;
      },
      statusText: st => st.data.msg || "Queue: FIFO",
      render() {
        const { ctx, w, h } = prepCanvas(canvas);
        const y = h / 2;
        ctx.fillStyle = "#334155";
        ctx.strokeRect(30, y - 30, w - 60, 60);
        ctx.fillStyle = "#93c5fd";
        ctx.font = "12px sans-serif";
        ctx.fillText("front →", 36, y - 38);
        ctx.fillText("← rear", w - 70, y - 38);
        q.forEach((v, i) => {
          const x = 50 + i * 55;
          ctx.fillStyle = i === 0 ? "#22c55e" : "#3b82f6";
          ctx.fillRect(x, y - 22, 48, 44);
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(String(v), x + 24, y + 6);
        });
      }
    });
  }

  function initDeque(card) {
    const canvas = canvasOnly(card);
    const dq = [];
    const script = [
      { op: "addLast", v: 1, msg: "addLast(1)" },
      { op: "addLast", v: 2, msg: "addLast(2)" },
      { op: "addFirst", v: 0, msg: "addFirst(0) — both ends" },
      { op: "removeLast", msg: "removeLast() → 2" },
      { op: "removeFirst", msg: "removeFirst() → 0" }
    ];
    makeControls(card, {
      initData: () => ({}),
      maxSteps: () => script.length,
      onStep(st) {
        const s = script[st.step - 1];
        if (s.op === "addLast") dq.push(s.v);
        else if (s.op === "addFirst") dq.unshift(s.v);
        else if (s.op === "removeLast") dq.pop();
        else if (s.op === "removeFirst") dq.shift();
        st.data.msg = s.msg;
      },
      statusText: st => st.data.msg || "Deque: O(1) at both ends",
      render() {
        const { ctx, w, h } = prepCanvas(canvas);
        const y = h / 2;
        const startX = (w - dq.length * 56) / 2;
        dq.forEach((v, i) => {
          ctx.fillStyle = i === 0 ? "#22c55e" : i === dq.length - 1 ? "#f59e0b" : "#3b82f6";
          ctx.fillRect(startX + i * 56, y - 22, 50, 44);
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(String(v), startX + i * 56 + 25, y + 6);
        });
        ctx.fillStyle = "#93c5fd";
        ctx.fillText("front", 12, y + 4);
        ctx.textAlign = "right";
        ctx.fillText("rear", w - 12, y + 4);
      }
    });
  }

  function initTreeTraversal(card) {
    const canvas = canvasOnly(card);
    const root = sampleTree();
    const sel = card.querySelector(".visual-mode-select");
    makeControls(card, {
      initData: () => ({ mode: sel?.value || "inorder" }),
      maxSteps: st => getTraversalOrder(root, st.data.mode).length + 1,
      onStep(st) { st.data.mode = sel?.value || "inorder"; },
      statusText: st => {
        const ord = getTraversalOrder(root, st.data.mode);
        if (!st.step) return `${st.data.mode}: visit order`;
        if (st.step > ord.length) return `Done: [${ord.join(", ")}]`;
        return `Step ${st.step}: visit ${ord[st.step - 1]}`;
      },
      render(st) {
        st.data.mode = sel?.value || "inorder";
        const ord = getTraversalOrder(root, st.data.mode);
        drawTree2D(canvas, root, null, ord, st.step);
      },
      extraInit: (_, __, reset) => sel?.addEventListener("change", reset)
    });
  }

  function initBfsTree(card) {
    const canvas = canvasOnly(card);
    const root = sampleTree();
    const order = levelOrder(root);
    makeControls(card, {
      initData: () => ({}),
      maxSteps: () => order.length + 1,
      onStep() {},
      statusText: st => st.step ? `BFS level order: visit ${order[st.step - 1]}` : "Queue processes level by level",
      render(st) { drawTree2D(canvas, root, null, order, st.step); }
    });
  }

  function initHeap(card) {
    const canvas = canvasOnly(card);
    const inserts = [4, 10, 3, 5, 1];
    makeControls(card, {
      initData: () => ({ heap: [] }),
      maxSteps: () => inserts.length * 3,
      onStep(st) {
        const idx = Math.floor((st.step - 1) / 3);
        const phase = (st.step - 1) % 3;
        if (phase === 0 && idx < inserts.length) {
          st.data.heap.push(inserts[idx]);
          st.data.msg = `Insert ${inserts[idx]} at end`;
        } else if (phase === 1) {
          let i = st.data.heap.length - 1;
          st.data.bubble = i;
          st.data.msg = `Bubble up index ${i}`;
        } else {
          let i = st.data.heap.length - 1;
          while (i > 0) {
            const p = Math.floor((i - 1) / 2);
            if (st.data.heap[i] >= st.data.heap[p]) break;
            [st.data.heap[i], st.data.heap[p]] = [st.data.heap[p], st.data.heap[i]];
            i = p;
          }
          st.data.bubble = -1;
          st.data.msg = "Heap property restored (min-heap)";
        }
      },
      statusText: st => st.data.msg || "Min heap in array form",
      render(st) {
        const { ctx, w, h } = prepCanvas(canvas);
        const heap = st.data.heap || [];
        drawBars(ctx, w, h, heap.length ? heap : [0], st.data.bubble >= 0 ? { [st.data.bubble]: "#f59e0b" } : {}, "array heap");
        heap.forEach((v, i) => {
          if (!heap.length) return;
          const px = w / 2 + ((i % 4) - 1.5) * 50;
          const py = 100 + Math.floor(i / 4) * 50;
          ctx.fillStyle = i === st.data.bubble ? "#f59e0b" : "#6366f1";
          ctx.beginPath();
          ctx.arc(px, py, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(String(v), px, py + 4);
        });
      }
    });
  }

  function initHashMap(card) {
    const canvas = canvasOnly(card);
    const keys = ["cat", "dog", "car"];
    const buckets = 5;
    makeControls(card, {
      initData: () => ({ placed: 0 }),
      maxSteps: () => keys.length + 1,
      onStep(st) { st.data.placed = Math.min(st.step, keys.length); },
      statusText: st => {
        if (!st.step) return `hash(key) % ${buckets} → bucket index`;
        const k = keys[st.data.placed - 1];
        if (!k) return "";
        const b = k.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % buckets;
        return `put("${k}") → bucket ${b}`;
      },
      render(st) {
        const { ctx, w, h } = prepCanvas(canvas);
        const slotW = (w - 40) / buckets;
        for (let b = 0; b < buckets; b++) {
          const x = 20 + b * slotW;
          ctx.strokeStyle = "#475569";
          ctx.strokeRect(x, 60, slotW - 6, h - 100);
          ctx.fillStyle = "#8b9cb3";
          ctx.font = "11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("b" + b, x + slotW / 2 - 3, 52);
        }
        for (let i = 0; i < st.data.placed; i++) {
          const b = keys[i].split("").reduce((a, c) => a + c.charCodeAt(0), 0) % buckets;
          const x = 20 + b * slotW + 8;
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(x, 80 + i * 5, slotW - 20, 28);
          ctx.fillStyle = "#fff";
          ctx.font = "11px sans-serif";
          ctx.fillText(keys[i], x + (slotW - 20) / 2, 98);
        }
      }
    });
  }

  function initHashCollision(card) {
    const canvas = canvasOnly(card);
    const pairs = [["ab", 1], ["ba", 2]];
    const buckets = 4;
    makeControls(card, {
      initData: () => ({ n: 0 }),
      maxSteps: () => pairs.length + 1,
      onStep(st) { st.data.n = st.step; },
      statusText: st => st.step ? `Collision: "${pairs[st.step-1][0]}" chains in same bucket` : "Chaining: list per bucket",
      render(st) {
        const { ctx, w, h } = prepCanvas(canvas);
        const hash = s => s.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % buckets;
        const b = hash("ab");
        ctx.fillStyle = "#93c5fd";
        ctx.fillText(`Both hash to bucket ${b}`, 12, 22);
        for (let i = 0; i < st.data.n && i < pairs.length; i++) {
          ctx.fillStyle = i === 0 ? "#3b82f6" : "#ef4444";
          ctx.fillRect(80, 70 + i * 45, 120, 36);
          ctx.fillStyle = "#fff";
          ctx.fillText(pairs[i][0] + "→" + pairs[i][1], 140, 94 + i * 45);
          if (i > 0) { ctx.strokeStyle = "#93c5fd"; ctx.beginPath(); ctx.moveTo(140, 106); ctx.lineTo(140, 115); ctx.stroke(); }
        }
      }
    });
  }

  function initDijkstra(card) {
    const canvas = canvasOnly(card);
    const nodes = [{ id: 0, x: 0, y: 0 }, { id: 1, x: -2, y: 1 }, { id: 2, x: 2, y: 1 }, { id: 3, x: 0, y: -1.5 }];
    const edges = [{ a: 0, b: 1, w: 4 }, { a: 0, b: 2, w: 1 }, { a: 2, b: 1, w: 2 }, { a: 1, b: 3, w: 5 }, { a: 2, b: 3, w: 8 }];
    const steps = [
      { cur: 0, dist: { 0: 0, 1: Infinity, 2: Infinity, 3: Infinity }, msg: "Start at 0, dist[0]=0" },
      { cur: 0, dist: { 0: 0, 1: 4, 2: 1, 3: Infinity }, msg: "Relax edges from 0" },
      { cur: 2, dist: { 0: 0, 1: 3, 2: 1, 3: 9 }, msg: "Pick node 2 (smallest dist)" },
      { cur: 1, dist: { 0: 0, 1: 3, 2: 1, 3: 8 }, msg: "Pick node 1, relax to 3" },
      { cur: 3, dist: { 0: 0, 1: 3, 2: 1, 3: 8 }, msg: "Shortest to 3 is 8" }
    ];
    makeControls(card, {
      initData: () => ({}),
      maxSteps: () => steps.length,
      onStep() {},
      statusText: st => steps[st.step - 1]?.msg || "Dijkstra: min-heap + relax",
      render(st) {
        const s = steps[st.step - 1] || steps[0];
        const { ctx, w, h } = prepCanvas(canvas);
        const sx = w / 5, sy = h / 5, ox = w / 2, oy = h / 2;
        edges.forEach(e => {
          const na = nodes[e.a], nb = nodes[e.b];
          ctx.strokeStyle = "#475569";
          ctx.beginPath();
          ctx.moveTo(ox + na.x * sx, oy - na.y * sy);
          ctx.lineTo(ox + nb.x * sx, oy - nb.y * sy);
          ctx.stroke();
          const mx = (ox + na.x * sx + ox + nb.x * sx) / 2;
          const my = (oy - na.y * sy + oy - nb.y * sy) / 2;
          ctx.fillStyle = "#8b9cb3";
          ctx.font = "10px sans-serif";
          ctx.fillText(String(e.w), mx, my);
        });
        nodes.forEach(n => {
          const px = ox + n.x * sx, py = oy - n.y * sy;
          ctx.beginPath();
          ctx.arc(px, py, 22, 0, Math.PI * 2);
          ctx.fillStyle = n.id === s.cur ? "#f59e0b" : "#3b82f6";
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(String(n.id), px, py + 4);
          const d = s.dist[n.id];
          ctx.fillStyle = "#93c5fd";
          ctx.fillText(d === Infinity ? "∞" : String(d), px, py - 28);
        });
      }
    });
  }

  function initToposort(card) {
    const canvas = canvasOnly(card);
    const dagEdges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]];
    const indeg = [0, 0, 0, 0, 0];
    dagEdges.forEach(([u, v]) => indeg[v]++);
    const order = [];
    const q = indeg.map((d, i) => d === 0 ? i : -1).filter(i => i >= 0);
    const steps = [];
    const id = [...indeg];
    const qq = [...q];
    while (qq.length) {
      const u = qq.shift();
      steps.push({ u, indeg: [...id], q: [...qq], order: [...order, u] });
      order.push(u);
      dagEdges.filter(e => e[0] === u).forEach(([, v]) => {
        id[v]--;
        if (id[v] === 0) qq.push(v);
      });
    }
    makeControls(card, {
      initData: () => ({}),
      maxSteps: () => steps.length,
      onStep() {},
      statusText: st => steps[st.step - 1] ? `Dequeue ${steps[st.step-1].u}, order: [${steps[st.step-1].order.join(",")}]` : "Kahn: indegree 0 queue",
      render(st) {
        const s = steps[st.step - 1];
        const { ctx, w, h } = prepCanvas(canvas);
        const pos = [{ x: 0, y: 2 }, { x: -1.5, y: 0 }, { x: 1.5, y: 0 }, { x: 0, y: -1 }, { x: 0, y: -2.5 }];
        dagEdges.forEach(([a, b]) => {
          ctx.strokeStyle = "#475569";
          ctx.beginPath();
          ctx.moveTo(w/2 + pos[a].x*50, h/2 - pos[a].y*40);
          ctx.lineTo(w/2 + pos[b].x*50, h/2 - pos[b].y*40);
          ctx.stroke();
        });
        pos.forEach((p, i) => {
          const px = w/2 + p.x*50, py = h/2 - p.y*40;
          const active = s && s.u === i;
          ctx.beginPath();
          ctx.arc(px, py, 18, 0, Math.PI * 2);
          ctx.fillStyle = active ? "#f59e0b" : s && s.order.includes(i) ? "#22c55e" : "#3b82f6";
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(String(i), px, py + 4);
          if (s) { ctx.fillStyle = "#8b9cb3"; ctx.fillText("in:"+s.indeg[i], px, py - 26); }
        });
      }
    });
  }

  function initUnionFind(card) {
    const canvas = canvasOnly(card);
    const edges = [[0, 1], [1, 2], [3, 4], [2, 3]];
    const parent = [0, 1, 2, 3, 4];
    function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
    const steps = [{ parent: [...parent], msg: "5 nodes, each own set" }];
    edges.forEach(([a, b]) => {
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent[ra] = rb;
      steps.push({ parent: [...parent], edge: [a, b], msg: `Union(${a},${b})` });
    });
    makeControls(card, {
      initData: () => ({}),
      maxSteps: () => steps.length,
      onStep() {},
      statusText: st => steps[st.step - 1]?.msg || "Union-Find for Kruskal MST",
      render(st) {
        const s = steps[st.step - 1] || steps[0];
        const { ctx, w, h } = prepCanvas(canvas);
        for (let i = 0; i < 5; i++) {
          const px = 60 + (i % 3) * 90;
          const py = 80 + Math.floor(i / 3) * 90;
          const root = s.parent[i];
          ctx.beginPath();
          ctx.arc(px, py, 20, 0, Math.PI * 2);
          ctx.fillStyle = i === root ? "#22c55e" : "#3b82f6";
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(String(i), px, py + 4);
          ctx.fillStyle = "#8b9cb3";
          ctx.fillText("p→" + s.parent[i], px, py + 32);
        }
        if (s.edge) {
          ctx.strokeStyle = "#f59e0b";
          const [a, b] = s.edge;
          ctx.beginPath();
          ctx.moveTo(60 + (a % 3) * 90, 80 + Math.floor(a / 3) * 90);
          ctx.lineTo(60 + (b % 3) * 90, 80 + Math.floor(b / 3) * 90);
          ctx.stroke();
        }
      }
    });
  }

  function initBinarySearch(card) {
    const canvas = canvasOnly(card);
    const arr = [1, 3, 5, 7, 9, 11, 13];
    const target = 7;
    makeControls(card, {
      initData: () => ({ lo: 0, hi: arr.length - 1, mid: -1, found: false }),
      maxSteps: () => 5,
      onStep(st) {
        const { lo, hi } = st.data;
        if (lo > hi) return;
        st.data.mid = lo + Math.floor((hi - lo) / 2);
        if (arr[st.data.mid] === target) st.data.found = true;
        else if (arr[st.data.mid] < target) st.data.lo = st.data.mid + 1;
        else st.data.hi = st.data.mid - 1;
      },
      statusText: st => st.data.found ? `Found ${target} at index ${st.data.mid}` : st.data.mid >= 0 ? `mid=${st.data.mid}, compare ${arr[st.data.mid]} vs ${target}` : `Search ${target} in sorted array`,
      render(st) {
        const hi = {};
        for (let i = st.data.lo; i <= st.data.hi; i++) hi[i] = "#334155";
        if (st.data.mid >= 0) hi[st.data.mid] = st.data.found ? "#22c55e" : "#f59e0b";
        const { ctx, w, h } = prepCanvas(canvas);
        drawBars(ctx, w, h, arr, hi, `lo=${st.data.lo} hi=${st.data.hi}`);
      }
    });
  }

  function initFibDp(card) {
    const canvas = canvasOnly(card);
    const n = 8;
    makeControls(card, {
      initData: () => ({ dp: [0, 1] }),
      maxSteps: () => n - 1,
      onStep(st) {
        const i = st.data.dp.length;
        st.data.dp.push(st.data.dp[i - 1] + st.data.dp[i - 2]);
      },
      statusText: st => st.data.dp.length > 2 ? `dp[${st.data.dp.length - 1}] = ${st.data.dp[st.data.dp.length-1]}` : "dp[0]=0, dp[1]=1",
      render(st) {
        const { ctx, w, h } = prepCanvas(canvas);
        drawBars(ctx, w, h, st.data.dp, {}, "Fibonacci tabulation");
      }
    });
  }

  function initKadane(card) {
    const canvas = canvasOnly(card);
    const nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4];
    makeControls(card, {
      initData: () => ({ i: 0, curr: nums[0], best: nums[0] }),
      maxSteps: () => nums.length,
      onStep(st) {
        const i = st.step;
        if (i < nums.length) {
          st.data.curr = Math.max(nums[i], st.data.curr + nums[i]);
          st.data.best = Math.max(st.data.best, st.data.curr);
          st.data.i = i;
        }
      },
      statusText: st => `At i=${st.data.i}: curr=${st.data.curr}, best=${st.data.best}`,
      render(st) {
        const hi = {};
        for (let j = 0; j <= st.data.i; j++) hi[j] = "#3b82f6";
        hi[st.data.i] = "#f59e0b";
        const { ctx, w, h } = prepCanvas(canvas);
        drawBars(ctx, w, h, nums, hi, "Kadane max subarray");
      }
    });
  }

  function initKnapsack(card) {
    const canvas = canvasOnly(card);
    const wt = [2, 3, 4], val = [3, 4, 5], W = 5;
    makeControls(card, {
      initData: () => ({ dp: Array(W + 1).fill(0), item: 0 }),
      maxSteps: () => wt.length * 2,
      onStep(st) {
        const phase = (st.step - 1) % 2;
        const it = Math.floor((st.step - 1) / 2);
        if (phase === 0) { st.data.item = it; st.data.msg = `Consider item ${it} (w=${wt[it]}, v=${val[it]})`; }
        else {
          for (let w = W; w >= wt[it]; w--)
            st.data.dp[w] = Math.max(st.data.dp[w], st.data.dp[w - wt[it]] + val[it]);
          st.data.msg = `Update dp[] — max value capacity ${W}`;
        }
      },
      statusText: st => st.data.msg || "0/1 knapsack",
      render(st) {
        const { ctx, w, h } = prepCanvas(canvas);
        const row = st.data.dp.map((v, i) => v || 0);
        drawDpGrid(ctx, w, h, [row], null, 1, row.length, ["dp"], row.map((_, i) => String(i)));
      }
    });
  }

  function initLcs(card) {
    const canvas = canvasOnly(card);
    const a = "abcde", b = "ace";
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    const cells = [];
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++) {
        if (a[i-1] === b[j-1]) dp[i][j] = 1 + dp[i-1][j-1];
        else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
        cells.push({ i, j, v: dp[i][j] });
      }
    makeControls(card, {
      initData: () => ({ idx: 0 }),
      maxSteps: () => cells.length,
      onStep(st) { st.data.idx = st.step; },
      statusText: st => {
        const c = cells[st.step - 1];
        return c ? `dp[${c.i}][${c.j}]=${c.v} — '${a[c.i-1]}' vs '${b[c.j-1]}'` : `LCS("${a}","${b}")`;
      },
      render(st) {
        const { ctx, w, h } = prepCanvas(canvas);
        const show = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
        for (let k = 0; k < st.step; k++) { const c = cells[k]; show[c.i][c.j] = c.v; }
        const hi = cells[st.step - 1] ? [cells[st.step - 1].i, cells[st.step - 1].j] : null;
        drawDpGrid(ctx, w, h, show, hi, m + 1, n + 1, ["", ...a.split("")], ["", ...b.split("")]);
      }
    });
  }

  function initGreedyIntervals(card) {
    const canvas = canvasOnly(card);
    const intervals = [[1, 3], [2, 4], [3, 5], [0, 6], [5, 7], [8, 9]];
    const sorted = [...intervals].sort((a, b) => a[1] - b[1]);
    const picked = [];
    let lastEnd = -1;
    const steps = [{ picked: [], msg: "Sort by end time" }];
    sorted.forEach(int => {
      if (int[0] >= lastEnd) {
        picked.push(int);
        lastEnd = int[1];
        steps.push({ picked: [...picked], cur: int, msg: `Take [${int[0]},${int[1]}]` });
      } else steps.push({ picked: [...picked], cur: int, skip: true, msg: `Skip [${int[0]},${int[1]}] — overlaps` });
    });
    makeControls(card, {
      initData: () => ({}),
      maxSteps: () => steps.length,
      onStep() {},
      statusText: st => steps[st.step - 1]?.msg || "Activity selection greedy",
      render(st) {
        const s = steps[st.step - 1];
        const { ctx, w, h } = prepCanvas(canvas);
        const scale = (w - 40) / 10;
        intervals.forEach(([a, b], i) => {
          const y = 50 + i * 28;
          const sel = s && s.picked.some(p => p[0] === a && p[1] === b);
          const cur = s && s.cur && s.cur[0] === a;
          ctx.fillStyle = sel ? "#22c55e" : cur ? (s.skip ? "#ef4444" : "#f59e0b") : "#334155";
          ctx.fillRect(30 + a * scale, y, (b - a) * scale, 18);
        });
      }
    });
  }

  function initFractionalKnapsack(card) {
    const canvas = canvasOnly(card);
    const items = [{ w: 10, v: 60 }, { w: 20, v: 100 }, { w: 30, v: 120 }];
    const cap = 50;
    const sorted = items.map((it, i) => ({ ...it, i, ratio: it.v / it.w })).sort((a, b) => b.ratio - a.ratio);
    let rem = cap, taken = 0;
    const steps = [{ rem, taken: 0, msg: "Sort by value/weight ratio" }];
    sorted.forEach(it => {
      if (rem <= 0) return;
      const frac = Math.min(1, rem / it.w);
      taken += it.v * frac;
      rem -= it.w * frac;
      steps.push({ rem, taken: Math.round(taken), item: it, frac, msg: frac >= 1 ? `Take all item (ratio ${it.ratio.toFixed(2)})` : `Take ${(frac*100).toFixed(0)}% of item` });
    });
    makeControls(card, {
      initData: () => ({}),
      maxSteps: () => steps.length,
      onStep() {},
      statusText: st => steps[st.step - 1]?.msg || "Fractional knapsack greedy",
      render(st) {
        const s = steps[st.step - 1];
        const { ctx, w, h } = prepCanvas(canvas);
        ctx.fillStyle = "#334155";
        ctx.fillRect(40, h - 50, w - 80, 24);
        const fill = s ? ((cap - s.rem) / cap) * (w - 80) : 0;
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(40, h - 50, fill, 24);
        ctx.fillStyle = "#93c5fd";
        ctx.fillText(`Capacity used: ${cap - (s?.rem ?? cap)}/${cap}, value≈${s?.taken ?? 0}`, 40, 30);
      }
    });
  }

  /* —— Sorting (multi-algorithm) —— */
  function initSorting(card) {
    const canvas = canvasOnly(card);
    const sel = card.querySelector('.visual-mode-select[data-mode="sort"]');
    let arr = [], hi = {}, done = false, engine = null;

    function resetEngine(mode, n) {
      arr = randArr(n || 8, 16);
      done = false;
      hi = {};
      if (mode === "bubble") {
        let i = 0, j = 0;
        engine = {
          step() {
            if (i >= arr.length - 1) { done = true; return "Sorted — O(n²)"; }
            if (j >= arr.length - i - 1) { i++; j = 0; return `Pass ${i} complete`; }
            hi = { [j]: "#f59e0b", [j + 1]: "#f59e0b" };
            if (arr[j] > arr[j + 1]) {
              [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
              hi[j] = hi[j + 1] = "#ef4444";
              j++;
              return `Swap at ${j - 1},${j}`;
            }
            j++;
            return `Compare ${j - 1},${j} — OK`;
          }
        };
      } else if (mode === "selection") {
        let i = 0, j = 0, min = 0;
        engine = {
          step() {
            if (i >= arr.length - 1) { done = true; return "Sorted — O(n²)"; }
            if (j >= arr.length) {
              [arr[i], arr[min]] = [arr[min], arr[i]];
              hi = { [i]: "#22c55e" };
              i++; j = i + 1; min = i;
              return `Place min at index ${i}`;
            }
            hi = { [j]: "#f59e0b", [min]: "#a855f7" };
            if (arr[j] < arr[min]) min = j;
            j++;
            return `Find min from index ${i}`;
          }
        };
      } else if (mode === "insertion") {
        let i = 1, j = 1, key = arr[1];
        engine = {
          step() {
            if (i >= arr.length) { done = true; return "Sorted — O(n²)"; }
            if (j > 0 && arr[j - 1] > key) {
              arr[j] = arr[j - 1];
              hi = { [j]: "#ef4444", [j - 1]: "#f59e0b" };
              j--;
              return `Shift right at ${j + 1}`;
            }
            arr[j] = key;
            hi = { [j]: "#22c55e" };
            i++;
            if (i < arr.length) { key = arr[i]; j = i; }
            return `Insert key at ${j}`;
          }
        };
      } else if (mode === "merge") {
        const steps = [];
        function mergeSort(a, l, r) {
          if (r - l <= 1) return;
          const m = Math.floor((l + r) / 2);
          mergeSort(a, l, m);
          mergeSort(a, m, r);
          const left = a.slice(l, m), right = a.slice(m, r);
          let i = 0, j = 0, k = l;
          while (i < left.length || j < right.length) {
            if (j >= right.length || (i < left.length && left[i] <= right[j])) {
              steps.push({ arr: a.slice(), l, r, k, msg: `Merge: take ${left[i]} from left` });
              a[k++] = left[i++];
            } else {
              steps.push({ arr: a.slice(), l, r, k, msg: `Merge: take ${right[j]} from right` });
              a[k++] = right[j++];
            }
          }
        }
        const copy = arr.slice();
        mergeSort(copy, 0, copy.length);
        let si = 0;
        engine = {
          step() {
            if (si >= steps.length) { arr = copy; done = true; return "Sorted — O(n log n)"; }
            const s = steps[si++];
            arr = s.arr;
            hi = { [s.k]: "#f59e0b" };
            return s.msg;
          }
        };
      } else if (mode === "quick") {
        const stack = [[0, arr.length - 1]];
        let pivot = arr[arr.length - 1], lo = 0, hiPtr = arr.length - 2, p = arr.length - 1;
        engine = {
          step() {
            if (!stack.length) { done = true; return "Sorted — O(n log n) avg"; }
            if (lo < hiPtr) {
              if (arr[lo] > pivot) {
                [arr[lo], arr[hiPtr]] = [arr[hiPtr], arr[lo]];
                hiPtr--;
                hi = { [lo]: "#f59e0b", [hiPtr]: "#ef4444" };
                return "Partition: swap lo with hi";
              }
              lo++;
              hi = { [lo]: "#f59e0b", [p]: "#a855f7" };
              return "Partition: advance lo";
            }
            [arr[lo], arr[p]] = [arr[p], arr[lo]];
            const [L, R] = stack.pop();
            if (lo - 1 > L) stack.push([L, lo - 1]);
            if (lo + 1 < R) stack.push([lo + 1, R]);
            if (stack.length) {
              const [L2, R2] = stack[stack.length - 1];
              lo = L2; hiPtr = R2 - 1; p = R2;
              pivot = arr[p];
            }
            hi = { [lo]: "#22c55e" };
            return `Pivot ${pivot} placed at index ${lo}`;
          }
        };
      } else {
        let end = arr.length;
        engine = {
          step() {
            if (end <= 1) { done = true; return "Sorted — O(n log n)"; }
            let i = 0, largest = 0;
            for (let j = 1; j < end; j++) if (arr[j] > arr[largest]) largest = j;
            hi = { [largest]: "#f59e0b", [end - 1]: "#ef4444" };
            [arr[largest], arr[end - 1]] = [arr[end - 1], arr[largest]];
            end--;
            return `Heapify: max ${arr[end]} at end`;
          }
        };
      }
    }

    makeControls(card, {
      sizeFromSlider: true,
      initData(n) {
        const mode = sel?.value || "bubble";
        resetEngine(mode, n);
        return { msg: `${mode} sort ready`, mode };
      },
      maxSteps: st => (done ? st.step : arr.length * arr.length + 20),
      onStep(st) {
        st.data.mode = sel?.value || "bubble";
        if (engine) st.data.msg = engine.step();
        st.data.done = done;
      },
      statusText: st => st.data.msg || "Pick algorithm and step through",
      render(st) {
        const { ctx, w, h } = prepCanvas(canvas);
        drawBars(ctx, w, h, arr, hi, st.data.msg);
      },
      extraInit: (_, __, reset) => sel?.addEventListener("change", reset)
    });
  }

  /* —— 6. Graph BFS / DFS —— */
  function initGraphVisual(card) {
    const container = card.querySelector(".three-container");
    const canvas2d = card.querySelector("canvas.visual-canvas");
    const edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5]];
    const nodes = [
      { id: 0, x: 0, y: 2 },
      { id: 1, x: -2, y: 0 },
      { id: 2, x: 2, y: 0 },
      { id: 3, x: 0, y: 0 },
      { id: 4, x: -1.5, y: -2 },
      { id: 5, x: 1.5, y: -2 }
    ];
    const adj = {};
    edges.forEach(([a, b]) => {
      (adj[a] = adj[a] || []).push(b);
      (adj[b] = adj[b] || []).push(a);
    });
    Object.keys(adj).forEach(k => adj[k].sort((a, b) => a - b));

    let threeCtx = null;
    let bfsOrder = [];
    let dfsOrder = [];

    function bfs(start) {
      const vis = new Set();
      const q = [start];
      const order = [];
      vis.add(start);
      while (q.length) {
        const u = q.shift();
        order.push(u);
        for (const v of adj[u] || []) {
          if (!vis.has(v)) {
            vis.add(v);
            q.push(v);
          }
        }
      }
      return order;
    }

    function dfs(start, vis, order) {
      vis.add(start);
      order.push(start);
      for (const v of adj[start] || []) {
        if (!vis.has(v)) dfs(v, vis, order);
      }
    }

    bfsOrder = bfs(0);
    const dfsVis = new Set();
    dfsOrder = [];
    dfs(0, dfsVis, dfsOrder);

    function renderGraph(order, step, mode) {
      const visited = new Set(order.slice(0, step));
      const current = order[step - 1];

      if (use3D() && container) {
        if (!threeCtx) threeCtx = createThreeScene(container, { camY: 1, camZ: 11 });
        const { scene } = threeCtx;
        while (scene.children.length > 2) scene.remove(scene.children[2]);
        edges.forEach(([a, b]) => {
          const na = nodes[a];
          const nb = nodes[b];
          const points = [
            new THREE.Vector3(na.x, na.y, 0),
            new THREE.Vector3(nb.x, nb.y, 0)
          ];
          scene.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({ color: 0x475569 })
          ));
        });
        nodes.forEach(n => {
          const vis = visited.has(n.id);
          const cur = n.id === current;
          const geo = new THREE.SphereGeometry(0.38, 20, 20);
          const mat = new THREE.MeshStandardMaterial({
            color: cur ? 0xf59e0b : vis ? 0x22c55e : 0x3b82f6
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(n.x, n.y, 0);
          scene.add(mesh);
          const lbl = labelSprite(String(n.id));
          lbl.position.set(n.x, n.y + 0.7, 0);
          scene.add(lbl);
        });
        threeCtx.resize();
        container.style.display = "block";
        canvas2d.style.display = "none";
      } else {
        const ctx = canvas2d.getContext("2d");
        const w = canvas2d.width = canvas2d.clientWidth;
        const h = canvas2d.height = canvas2d.clientHeight;
        ctx.fillStyle = "#0f1419";
        ctx.fillRect(0, 0, w, h);
        const sx = w / 6;
        const sy = h / 5;
        const ox = w / 2;
        const oy = h / 2 - 10;
        edges.forEach(([a, b]) => {
          const na = nodes[a];
          const nb = nodes[b];
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ox + na.x * sx, oy - na.y * sy);
          ctx.lineTo(ox + nb.x * sx, oy - nb.y * sy);
          ctx.stroke();
        });
        nodes.forEach(n => {
          const px = ox + n.x * sx;
          const py = oy - n.y * sy;
          const vis = visited.has(n.id);
          const cur = n.id === current;
          ctx.beginPath();
          ctx.arc(px, py, 20, 0, Math.PI * 2);
          ctx.fillStyle = cur ? "#f59e0b" : vis ? "#22c55e" : "#3b82f6";
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(n.id), px, py + 4);
        });
        container.style.display = "none";
        canvas2d.style.display = "block";
      }
    }

    const modeSelect = card.querySelector(".graph-mode-select");

    makeControls(card, {
      initData: () => ({ mode: modeSelect?.value || "bfs", step: 0 }),
      maxSteps: st => (st.data.mode === "dfs" ? dfsOrder : bfsOrder).length + 1,
      onStep(st) {
        st.data.mode = modeSelect?.value || "bfs";
      },
      statusText(st) {
        const mode = st.data.mode;
        const order = mode === "dfs" ? dfsOrder : bfsOrder;
        if (st.step === 0) return mode === "bfs"
          ? "BFS: queue — explores layer by layer (shortest path unweighted)"
          : "DFS: stack/recursion — goes deep first";
        if (st.step > order.length) return `${mode.toUpperCase()} complete: [${order.join(", ")}] — O(V+E)`;
        return `${mode.toUpperCase()} step ${st.step}: visit node ${order[st.step - 1]}`;
      },
      render(st) {
        const order = st.data.mode === "dfs" ? dfsOrder : bfsOrder;
        renderGraph(order, st.step, st.data.mode);
      },
      extraInit: (cardEl, st, reset) => {
        modeSelect?.addEventListener("change", reset);
      }
    });
  }

  /* —— Trie — insert & search —— */
  function initTrie(card) {
    const canvas = canvasOnly(card);
    const script = [
      { op: "start", msg: "Empty trie — root has no characters" },
      { op: "insert", word: "cat", msg: "Insert \"cat\": c → a → t, mark end ★" },
      { op: "insert", word: "car", msg: "Insert \"car\": reuse c→a, add r, mark end ★" },
      { op: "insert", word: "dog", msg: "Insert \"dog\": new branch d → o → g ★" },
      { op: "search", word: "car", msg: "Search \"car\": path exists and is a word ✓" },
      { op: "search", word: "cab", msg: "Search \"cab\": fails at 'b' — not in trie ✗" }
    ];

    function emptyTrie() {
      return { ch: {}, end: false };
    }

    function insertWord(trie, word) {
      let node = trie;
      for (const c of word) {
        if (!node.ch[c]) node.ch[c] = { ch: {}, end: false };
        node = node.ch[c];
      }
      node.end = true;
    }

    function searchWord(trie, word) {
      let node = trie;
      const path = [];
      for (const c of word) {
        if (!node.ch[c]) return { ok: false, path };
        path.push(c);
        node = node.ch[c];
      }
      return { ok: node.end, path };
    }

    function layoutTrie(trie, hi) {
      const out = [];
      function walk(node, depth, xMin, xMax, char) {
        if (depth > 0) {
          out.push({ char, node, x: (xMin + xMax) / 2, y: depth, end: node.end, hi: hi.has(char) });
        }
        const keys = Object.keys(node.ch).sort();
        keys.forEach((k, i) => {
          const span = (xMax - xMin) / keys.length;
          walk(node.ch[k], depth + 1, xMin + i * span, xMin + (i + 1) * span, k);
        });
      }
      walk(trie, 0, -4, 4, "");
      return out;
    }

    function drawTrie(trie, hi, msg) {
      const { ctx, w, h } = prepCanvas(canvas);
      const nodes = layoutTrie(trie, hi);
      const scaleX = w / 9;
      const oy = 36;
      const pos = new Map();
      nodes.forEach(n => pos.set(n.node, { px: w / 2 + n.x * scaleX, py: oy + n.y * 38, ...n }));
      nodes.forEach(n => {
        const p = pos.get(n.node);
        Object.keys(n.node.ch).forEach(k => {
          const c = pos.get(n.node.ch[k]);
          if (!c) return;
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.px, p.py + 14);
          ctx.lineTo(c.px, c.py - 14);
          ctx.stroke();
        });
      });
      nodes.forEach(n => {
        const p = pos.get(n.node);
        ctx.beginPath();
        ctx.arc(p.px, p.py, 16, 0, Math.PI * 2);
        ctx.fillStyle = p.hi ? "#f59e0b" : "#3b82f6";
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.char, p.px, p.py + 4);
        if (p.end) {
          ctx.fillStyle = "#22c55e";
          ctx.font = "10px sans-serif";
          ctx.fillText("★", p.px + 14, p.py - 10);
        }
      });
      ctx.fillStyle = "#93c5fd";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(msg || "Trie — prefix tree", 10, 18);
    }

    makeControls(card, {
      initData: () => ({ trie: emptyTrie(), hi: new Set(), msg: "" }),
      maxSteps: () => script.length,
      onStep(st) {
        const s = script[st.step - 1];
        if (s.op === "start") {
          st.data.trie = emptyTrie();
          st.data.hi = new Set();
        } else if (s.op === "insert") {
          insertWord(st.data.trie, s.word);
          st.data.hi = new Set(s.word.split(""));
        } else if (s.op === "search") {
          const res = searchWord(st.data.trie, s.word);
          st.data.hi = new Set(res.path);
        }
        st.data.msg = s.msg;
      },
      statusText: st => st.data.msg || "Trie: each edge is a character — O(L) insert/search",
      render(st) {
        drawTrie(st.data.trie, st.data.hi || new Set(), st.data.msg);
      }
    });
  }

  const VISUAL_INITS = {
    "visual-big-o": initBigO,
    "visual-recursion-backtrack": initRecursionBacktrack,
    "visual-array": initArrayVisual,
    "visual-two-sum": initTwoSum,
    "visual-sliding-window": initSlidingWindow,
    "visual-prefix-sum": initPrefixSum,
    "visual-two-pointers": initTwoPointers,
    "visual-linked-list": initLinkedListVisual,
    "visual-doubly-ll": initDoublyLL,
    "visual-cycle-floyd": initCycleFloyd,
    "visual-stack": initStackVisual,
    "visual-queue": initQueue,
    "visual-deque": initDeque,
    "visual-tree-traversal": initTreeTraversal,
    "visual-bfs-tree": initBfsTree,
    "visual-bst": initBstVisual,
    "visual-heap": initHeap,
    "visual-hashmap": initHashMap,
    "visual-hash-collision": initHashCollision,
    "visual-graph": initGraphVisual,
    "visual-dijkstra": initDijkstra,
    "visual-toposort": initToposort,
    "visual-union-find": initUnionFind,
    "visual-sorting": initSorting,
    "visual-binary-search": initBinarySearch,
    "visual-fib-dp": initFibDp,
    "visual-kadane": initKadane,
    "visual-knapsack": initKnapsack,
    "visual-lcs": initLcs,
    "visual-greedy-intervals": initGreedyIntervals,
    "visual-fractional-knapsack": initFractionalKnapsack,
    "visual-trie": initTrie
  };

  function shellHtml(visualId) {
    const controls = `
      <p class="visual-status" aria-live="polite"></p>
      <div class="visual-controls">
        <button type="button" class="btn" data-action="reset">Reset</button>
        <button type="button" class="btn btn-primary" data-action="next">Next step</button>
        <button type="button" class="btn" data-action="play" aria-pressed="false">Auto play</button>
      </div>`;
    if (visualId === "visual-graph") {
      return `
        <div class="visual-stage">
          <div class="three-container" aria-hidden="true"></div>
          <canvas class="visual-canvas" aria-label="Graph traversal"></canvas>
        </div>
        <label>Traversal:
          <select class="filter-select graph-mode-select" aria-label="BFS or DFS">
            <option value="bfs">BFS (queue)</option>
            <option value="dfs">DFS (stack)</option>
          </select>
        </label>
        ${controls}`;
    }
    return `
      <div class="visual-stage"><canvas class="visual-canvas" aria-label="Algorithm visual"></canvas></div>
      ${controls}`;
  }

  function mountEmbed(container, visualId) {
    if (!container || !VISUAL_INITS[visualId]) return null;
    const card = document.createElement("section");
    card.className = "visual-card diagram-card striver-embedded-visual";
    card.id = visualId;
    card.innerHTML = shellHtml(visualId);
    container.appendChild(card);
    initVisualCard(card);
    return card;
  }

  window.DsaVisuals = { mountEmbed, ids: Object.keys(VISUAL_INITS) };

  function initVisualCard(card) {
    const fn = VISUAL_INITS[card.id];
    if (fn && !card.dataset.visualReady) {
      card.dataset.visualReady = "1";
      fn(card);
    }
  }

  function init() {
    const countEl = document.getElementById("visual-count");
    if (countEl) countEl.textContent = String(Object.keys(VISUAL_INITS).length);

    const hash = location.hash.replace("#", "");
    const eager = hash && VISUAL_INITS[hash]
      ? document.getElementById(hash)
      : document.querySelector(".visual-card");

    if (eager) initVisualCard(eager);

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            initVisualCard(e.target);
            observer.unobserve(e.target);
          }
        });
      },
      { rootMargin: "160px 0px", threshold: 0.05 }
    );

    document.querySelectorAll(".visual-card[id]").forEach(card => {
      if (card.dataset.visualReady) return;
      observer.observe(card);
    });

    window.addEventListener("resize", () => {
      document.querySelectorAll(".visual-card").forEach(c => {
        c.dispatchEvent(new Event("visual-resize"));
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
