/**
 * Linked list canvas drawing — data | next nodes with custom pointer targets
 */
(function () {
  "use strict";

  const BASE_ADDR = 3200;
  const ADDR_STEP = 400;

  function nodeColors(i, opts) {
    const hi = new Set(Array.isArray(opts.hi) ? opts.hi : []);
    if (opts.deleteAt === i) return { fill: "#ef4444", stroke: "#f87171", label: "delete" };
    if (opts.curr === i) return { fill: "#f59e0b", stroke: "#fbbf24", label: "curr" };
    if (opts.prev === i) return { fill: "#a855f7", stroke: "#c084fc", label: "prev" };
    if (opts.slow === i) return { fill: "#22c55e", stroke: "#4ade80", label: "slow" };
    if (opts.fast === i) return { fill: "#ef4444", stroke: "#f87171", label: "fast" };
    if (opts.savedNext === i) return { fill: "#38bdf8", stroke: "#7dd3fc", label: "nxt" };
    if (opts.flip === i) return { fill: "#fb923c", stroke: "#fdba74", label: "flip!" };
    if (hi.has(i)) return { fill: "#f59e0b", stroke: "#fbbf24", label: null };
    return { fill: "#e2e8f0", stroke: "#94a3b8", label: null };
  }

  function drawArrow(ctx, x1, y1, x2, y2, color, dashed) {
    ctx.strokeStyle = color || "#3b82f6";
    ctx.fillStyle = color || "#3b82f6";
    ctx.lineWidth = 2;
    ctx.setLineDash(dashed ? [6, 4] : []);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const sz = 7;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - sz * Math.cos(ang - 0.35), y2 - sz * Math.sin(ang - 0.35));
    ctx.lineTo(x2 - sz * Math.cos(ang + 0.35), y2 - sz * Math.sin(ang + 0.35));
    ctx.closePath();
    ctx.fill();
  }

  function drawNull(ctx, x, y) {
    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("NULL", x, y);
  }

  function layoutNodes(ctx, w, values, cy, nodeH) {
    const n = values.length;
    const nodeW = Math.min(88, Math.max(64, (w - 120) / Math.max(n, 1) - 14));
    const dataW = nodeW * 0.55;
    const nextW = nodeW - dataW;
    const gap = Math.min(52, Math.max(32, (w - 100 - n * nodeW) / Math.max(n, 1)));
    const totalW = n * nodeW + (n - 1) * gap;
    const startX = Math.max(72, (w - totalW) / 2 + 40);
    const positions = [];
    for (let i = 0; i < n; i++) {
      positions.push({
        i,
        x: startX + i * (nodeW + gap),
        y: cy,
        nodeW,
        dataW,
        nextW,
        nodeH,
        cx: startX + i * (nodeW + gap) + nodeW / 2,
        nextOutX: startX + i * (nodeW + gap) + nodeW,
        nextOutY: cy + 4
      });
    }
    return { positions, nodeW, dataW, nextW, nodeH, startX };
  }

  function drawNodeBox(ctx, pos, val, addr, c, cy, flipIdx) {
    const { x, nodeW, dataW, nextW, nodeH, i } = pos;
    const ny = cy - nodeH / 2;
    ctx.fillStyle = c.fill;
    ctx.strokeStyle = c.stroke;
    ctx.lineWidth = 2;
    ctx.fillRect(x, ny, dataW, nodeH);
    ctx.strokeRect(x, ny, dataW, nodeH);
    ctx.fillStyle = flipIdx === i ? "#fed7aa" : "#bbf7d0";
    ctx.fillRect(x + dataW, ny, nextW, nodeH);
    ctx.strokeStyle = c.stroke;
    ctx.strokeRect(x + dataW, ny, nextW, nodeH);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(val), x + dataW / 2, cy + 5);
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = "#166534";
    ctx.fillText("next", x + dataW + nextW / 2, cy + 4);
    ctx.fillStyle = "#64748b";
    ctx.font = "10px Consolas, monospace";
    ctx.fillText(String(addr), x + nodeW / 2, cy + nodeH / 2 + 18);
    if (c.label) {
      ctx.fillStyle = c.stroke;
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.fillText(c.label, x + nodeW / 2, ny - 6);
    }
  }

  /** Singly linked with custom nextTo[] — shows real pointer rewiring */
  function drawSingly(ctx, w, h, opts) {
    opts = opts || {};
    if (opts.merge) {
      drawMerge(ctx, w, h, opts);
      return;
    }

    const values = opts.values || [1, 2, 3, 4];
    const n = values.length;
    const nextTo = opts.nextTo || values.map((_, i) => (i < n - 1 ? i + 1 : -1));
    const head = opts.head != null ? opts.head : 0;
    const addrs = opts.addrs || values.map((_, i) => BASE_ADDR + i * ADDR_STEP);
    const msg = opts.msg || "";
    const cy = h * 0.42;
    const nodeH = 34;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);

    const layout = layoutNodes(ctx, w, values, cy, nodeH);
    const { positions } = layout;

    // Head pointer
    if (head >= 0 && head < n) {
      const hp = positions[head];
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("Head", hp.x - 12, cy - 8);
      drawArrow(ctx, hp.x - 6, cy + 4, hp.x, cy + 4, "#22c55e");
    } else {
      drawNull(ctx, 20, cy + 4);
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Head", 52, cy + 4);
    }

    // Pointer arrows (draw before nodes so nodes on top)
    positions.forEach(p => {
      const tgt = nextTo[p.i];
      const isBack = tgt >= 0 && tgt < p.i;
      const isFlip = opts.flip === p.i;
      const col = isFlip ? "#f97316" : isBack ? "#a855f7" : "#3b82f6";
      if (tgt >= 0 && tgt < n) {
        const tp = positions[tgt];
        drawArrow(ctx, p.nextOutX + 2, p.nextOutY, tp.x - 4, tp.y + 4, col, isBack);
      } else {
        drawArrow(ctx, p.nextOutX + 2, p.nextOutY, p.nextOutX + 28, p.nextOutY, col);
        drawNull(ctx, p.nextOutX + 34, p.nextOutY + 4);
      }
    });

    // Cycle arc
    if (opts.cyclic && n > 1) {
      const last = positions[n - 1];
      const tgt = nextTo[n - 1];
      if (tgt >= 0 && tgt < n) {
        const tp = positions[tgt];
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(last.nextOutX, last.y + nodeH / 2 + 6);
        ctx.quadraticCurveTo(last.x + 50, cy + nodeH + 24, tp.x + layout.nodeW / 2, cy + nodeH / 2 + 6);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    positions.forEach(p => {
      drawNodeBox(ctx, p, values[p.i], addrs[p.i], nodeColors(p.i, opts), cy, opts.flip);
    });

    // prev = NULL label
    if (opts.prev == null && opts.curr === 0) {
      ctx.fillStyle = "#a855f7";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("prev = NULL", 12, cy + nodeH + 28);
    }

    if (msg) {
      ctx.fillStyle = "#93c5fd";
      ctx.font = "13px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(msg, 12, 18);
    }
  }

  function drawMerge(ctx, w, h, opts) {
    const a = opts.listA || [1, 3, 5];
    const b = opts.listB || [2, 4, 6];
    const out = opts.out || [];
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);

    function drawRow(label, vals, ptr, y, pick) {
      ctx.fillStyle = "#64748b";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(label, 12, y - 8);
      let x = 60;
      vals.forEach((v, i) => {
        const active = i === ptr;
        ctx.fillStyle = active ? (pick ? "#22c55e" : "#f59e0b") : "#334155";
        ctx.fillRect(x, y, 36, 28);
        ctx.strokeStyle = active ? "#93c5fd" : "#475569";
        ctx.strokeRect(x, y, 36, 28);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(v), x + 18, y + 18);
        if (i < vals.length - 1) {
          drawArrow(ctx, x + 38, y + 14, x + 48, y + 14, "#64748b");
        }
        x += 52;
      });
    }

    drawRow("List A", a, opts.ptrA, h * 0.22, opts.pick === "A");
    drawRow("List B", b, opts.ptrB, h * 0.42, opts.pick === "B");
    ctx.fillStyle = "#64748b";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Merged result", 12, h * 0.62 - 8);
    let x = 60;
    out.forEach(v => {
      ctx.fillStyle = "#1e40af";
      ctx.fillRect(x, h * 0.62, 36, 28);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(v), x + 18, h * 0.62 + 18);
      if (x > 60) drawArrow(ctx, x - 14, h * 0.62 + 14, x - 4, h * 0.62 + 14, "#3b82f6");
      x += 44;
    });

    if (opts.msg) {
      ctx.fillStyle = "#93c5fd";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText(opts.msg, 12, 16);
    }
  }

  function drawDoubly(ctx, w, h, opts) {
    opts = opts || {};
    const values = opts.values || [10, 20, 30];
    const msg = opts.msg || "";
    const nodeW = 78;
    const partW = nodeW / 3;
    const nodeH = 36;
    const gap = 48;
    const totalW = values.length * nodeW + (values.length - 1) * gap;
    let x = Math.max(60, (w - totalW) / 2);
    const cy = h * 0.45;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Head", x - 12, cy - 6);
    drawArrow(ctx, x - 6, cy + 4, x, cy + 4, "#22c55e");

    values.forEach((val, i) => {
      const c = nodeColors(i, opts);
      const nx = x;
      const ny = cy - nodeH / 2;
      ctx.fillStyle = i === 0 ? "#334155" : "#cbd5e1";
      ctx.fillRect(nx, ny, partW, nodeH);
      ctx.fillStyle = c.fill;
      ctx.fillRect(nx + partW, ny, partW, nodeH);
      ctx.fillStyle = "#bbf7d0";
      ctx.fillRect(nx + partW * 2, ny, partW, nodeH);
      ctx.strokeStyle = c.stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(nx, ny, nodeW, nodeH);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(val), nx + partW * 1.5, cy + 5);
      x += nodeW + gap;
    });

    if (msg) {
      ctx.fillStyle = "#93c5fd";
      ctx.font = "13px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(msg, 12, 20);
    }
  }

  window.LinkedListDraw = { drawSingly, drawDoubly };
})();
