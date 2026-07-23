/**
 * Striver SDE Sheet — generic step-by-step answer visualizer (canvas + step list)
 */
(function () {
  "use strict";

  const AUTOPLAY_MS = 850;
  const inited = new WeakSet();

  function drawBars(ctx, w, h, arr, hi, msg) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);
    if (!arr || !arr.length) {
      if (msg) {
        ctx.fillStyle = "#93c5fd";
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText(msg, 16, 32);
      }
      return;
    }
    const n = arr.length;
    const barW = Math.min(44, (w - 30) / Math.max(n, 1) - 4);
    const maxV = Math.max(...arr, 1);
    const baseY = h - 28;
    const hiSet = new Set(Array.isArray(hi) ? hi : []);
    arr.forEach((v, i) => {
      const bh = (v / maxV) * (h - 70);
      const x = 15 + i * (barW + 4);
      ctx.fillStyle = hiSet.has(i) ? "#f59e0b" : "#3b82f6";
      ctx.fillRect(x, baseY - bh, barW, bh);
      ctx.fillStyle = "#8b9cb3";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(v), x + barW / 2, baseY + 14);
    });
    if (msg) {
      ctx.fillStyle = "#93c5fd";
      ctx.font = "13px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(msg, 12, 20);
    }
  }

  function drawTypeBadge(ctx, w, h, vtype, msg) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);
    const labels = {
      tree: "Binary tree traversal / recursion",
      graph: "Graph BFS / DFS / shortest path",
      string: "String scan — two pointers / HashMap",
      trie: "Trie node — char → child map",
      greedy: "Greedy — sort then pick best",
      recursion: "Recursion / backtrack decision tree",
      heap: "Heap push / pop — O(log n)",
      stack: "Stack / queue operations",
      hash: "HashMap lookup O(1)",
      linkedlist: "Pointer rewiring — curr.next = prev, merge, Floyd cycle",
      dp: "DP table fill — bottom-up",
      binarysearch: "Binary search on sorted space",
      array: "Array scan",
      misc: "Algorithm steps"
    };
    ctx.fillStyle = "#64748b";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(labels[vtype] || labels.misc, 16, 36);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "15px system-ui, sans-serif";
    wrapText(ctx, msg || "Press Next step", 16, 64, w - 32, 22);
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(" ");
    let line = "";
    words.forEach(word => {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y);
        line = word;
        y += lineH;
      } else {
        line = test;
      }
    });
    if (line) ctx.fillText(line, x, y);
  }

  function highlightSteps(card, stepIdx) {
    card.querySelectorAll(".striver-step-item").forEach((el, i) => {
      el.classList.toggle("active", i === stepIdx);
      el.setAttribute("aria-current", i === stepIdx ? "step" : "false");
    });
  }

  function initCard(card, problem) {
    if (inited.has(card)) return;
    inited.add(card);

    const canvas = card.querySelector("canvas.striver-canvas");
    const status = card.querySelector(".visual-status");
    const steps = problem.demoSteps && problem.demoSteps.length
      ? problem.demoSteps
      : (problem.approach || []).map(msg => ({ msg }));

    const state = { step: 0, playing: false, timer: null };

    function resize() {
      if (!canvas) return;
      const stage = card.querySelector(".visual-stage");
      const rect = stage ? stage.getBoundingClientRect() : { width: 400, height: 180 };
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(280, rect.width) * dpr;
      canvas.height = 240 * dpr;
      canvas.style.width = Math.max(280, rect.width) + "px";
      canvas.style.height = "240px";
      render();
    }

    function setStatus(t) {
      if (status) status.textContent = t;
    }

    function stopAuto() {
      state.playing = false;
      if (state.timer) clearInterval(state.timer);
      state.timer = null;
      const btn = card.querySelector('[data-action="play"]');
      if (btn) {
        btn.textContent = "Auto play";
        btn.setAttribute("aria-pressed", "false");
      }
    }

    function render() {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const idx = Math.min(state.step, steps.length - 1);
      const cur = steps[idx] || { msg: "" };
      highlightSteps(card, idx);
      if (cur.ll && window.LinkedListDraw) {
        const ll = cur.ll;
        if (ll.doubly) window.LinkedListDraw.drawDoubly(ctx, w, h, { ...ll, msg: cur.msg });
        else window.LinkedListDraw.drawSingly(ctx, w, h, { ...ll, msg: cur.msg });
      } else if (cur.bars) {
        drawBars(ctx, w, h, cur.bars, cur.hi, cur.msg);
      } else {
        drawTypeBadge(ctx, w, h, problem.visualType, cur.msg);
      }
    }

    function reset() {
      stopAuto();
      state.step = 0;
      render();
      setStatus("Ready — press Next step to walk through the answer");
    }

    function next() {
      if (state.step >= steps.length) {
        stopAuto();
        setStatus("Done — press Reset to replay");
        return;
      }
      state.step++;
      render();
      const cur = steps[Math.min(state.step - 1, steps.length - 1)];
      setStatus(`Step ${state.step}/${steps.length}: ${cur.msg}`);
      if (state.step >= steps.length) stopAuto();
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
      btn.textContent = "Pause";
      btn.setAttribute("aria-pressed", "true");
      state.timer = setInterval(() => {
        if (state.step >= steps.length) stopAuto();
        else next();
      }, AUTOPLAY_MS);
    });

    window.addEventListener("resize", resize);
    reset();
    requestAnimationFrame(resize);
  }

  window.StriverVisuals = {
    initCard,
    observeCards(root) {
      const byId = {};
      (window.STRIVER_SHEET?.problems || []).forEach(p => { byId[p.id] = p; });

      root.querySelectorAll("details.striver-card").forEach(details => {
        details.addEventListener("toggle", () => {
          if (!details.open) return;
          const id = details.dataset.id;
          const problem = byId[id];
          if (!problem) return;

          const embed = details.querySelector(".striver-dsa-embed");
          const embedSpecial = problem.visualLink &&
            ["visual-cycle-floyd", "visual-doubly-ll"].includes(problem.visualLink);
          if (embedSpecial && embed && window.DsaVisuals?.mountEmbed) {
            if (!embed.dataset.ready) {
              embed.dataset.ready = "1";
              window.DsaVisuals.mountEmbed(embed, problem.visualLink);
            }
            return;
          }

          const viz = details.querySelector(".striver-step-visual");
          if (viz) initCard(viz, problem);
        });
      });
    }
  };
})();
