/**
 * Linked list algorithm step generators — reverse, middle, merge, etc.
 */
(function () {
  "use strict";

  function linearNext(n) {
    const next = [];
    for (let i = 0; i < n; i++) next.push(i < n - 1 ? i + 1 : -1);
    return next;
  }

  function ll(prev, curr, saved, flip, head, values, nextTo, extra) {
    return Object.assign({
      values,
      nextTo: nextTo.slice(),
      head: head ?? 0,
      prev: prev >= 0 ? prev : null,
      curr: curr >= 0 ? curr : null,
      savedNext: saved >= 0 ? saved : null,
      flip: flip >= 0 ? flip : null
    }, extra || {});
  }

  /** Reverse linked list — shows curr.next = prev each step */
  function reverseSteps(values) {
    values = values || [1, 2, 3, 4];
    const n = values.length;
    const steps = [];
    let prev = -1;
    let curr = 0;
    const nextTo = linearNext(n);

    steps.push({
      msg: `Start: prev = NULL, curr = head (value ${values[0]})`,
      ll: ll(-1, 0, -1, -1, 0, values, nextTo)
    });

    while (curr >= 0 && curr < n) {
      const saved = nextTo[curr];
      steps.push({
        msg: `Save nxt = curr.next → ${saved >= 0 ? "node " + saved + " (" + values[saved] + ")" : "NULL"}`,
        ll: ll(prev, curr, saved, -1, 0, values, nextTo, { hi: [curr] })
      });
      nextTo[curr] = prev;
      steps.push({
        msg: `curr.next = prev  →  node ${curr} points ${prev >= 0 ? "back to " + values[prev] : "to NULL"}`,
        ll: ll(prev, curr, saved, curr, 0, values, nextTo, { hi: [curr] })
      });
      prev = curr;
      curr = saved;
      if (curr < 0) break;
      steps.push({
        msg: `Advance: prev = ${values[prev]}, curr = node ${curr} (value ${values[curr]})`,
        ll: ll(prev, curr, -1, -1, 0, values, nextTo, { hi: [prev, curr] })
      });
    }

    steps.push({
      msg: `Done: return prev as new head → ${values[prev]} | ${values[n - 2] || ""} | … reversed`,
      ll: ll(prev, -1, -1, -1, prev, values, nextTo, { hi: [prev] })
    });
    return steps;
  }

  /** Tortoise & hare — find middle */
  function middleSteps(values) {
    values = values || [1, 2, 3, 4, 5];
    const n = values.length;
    const nextTo = linearNext(n);
    let slow = 0;
    let fast = 0;
    const steps = [{
      msg: "slow = head, fast = head",
      ll: ll(-1, slow, -1, -1, 0, values, nextTo, { slow: 0, fast: 0 })
    }];
    while (fast >= 0 && nextTo[fast] >= 0) {
      slow = slow + 1 <= n - 1 ? slow + 1 : slow;
      const f1 = nextTo[fast];
      fast = f1 >= 0 && nextTo[f1] >= 0 ? nextTo[f1] : (f1 >= 0 ? f1 : fast);
      if (nextTo[fast] < 0 && f1 >= 0) fast = f1;
      steps.push({
        msg: `slow +1 → node ${slow}; fast +2 → node ${fast}. Middle ≈ slow`,
        ll: ll(-1, slow, -1, -1, 0, values, nextTo, { slow, fast, hi: [slow, fast] })
      });
      if (fast >= 0 && nextTo[fast] < 0) break;
    }
    steps.push({
      msg: `Middle node: ${values[slow]} (slow when fast reached end)`,
      ll: ll(-1, slow, -1, -1, 0, values, nextTo, { slow, fast, hi: [slow] })
    });
    return steps;
  }

  /** Merge two sorted lists */
  function mergeSteps(a, b) {
    a = a || [1, 3, 5];
    b = b || [2, 4, 6];
    const steps = [];
    let i = 0;
    let j = 0;
    const out = [];
    steps.push({
      msg: "Dummy head; compare list A and list B",
      ll: { merge: true, listA: a, listB: b, ptrA: 0, ptrB: 0, out: [] }
    });
    while (i < a.length && j < b.length) {
      if (a[i] <= b[j]) {
        out.push(a[i]);
        steps.push({
          msg: `A[${i}]=${a[i]} ≤ B[${j}]=${b[j]} → append ${a[i]}`,
          ll: { merge: true, listA: a, listB: b, ptrA: i, ptrB: j, out: out.slice(), pick: "A" }
        });
        i++;
      } else {
        out.push(b[j]);
        steps.push({
          msg: `B[${j}]=${b[j]} < A[${i}]=${a[i]} → append ${b[j]}`,
          ll: { merge: true, listA: a, listB: b, ptrA: i, ptrB: j, out: out.slice(), pick: "B" }
        });
        j++;
      }
    }
    while (i < a.length) { out.push(a[i++]); }
    while (j < b.length) { out.push(b[j++]); }
    steps.push({
      msg: `Merged: [${out.join(" → ")}]`,
      ll: { merge: true, listA: a, listB: b, ptrA: -1, ptrB: -1, out, done: true }
    });
    return steps;
  }

  /** Delete kth node from end — two pointers k apart */
  function deleteKthSteps(values, k) {
    values = values || [1, 2, 3, 4, 5];
    k = k || 2;
    const n = values.length;
    const nextTo = linearNext(n);
    let fast = 0;
    let slow = 0;
    const steps = [{
      msg: `Move fast ${k} steps ahead of slow`,
      ll: ll(-1, slow, -1, -1, 0, values, nextTo, { slow: 0, fast: 0 })
    }];
    for (let s = 0; s < k && fast < n; s++) {
      fast = nextTo[fast] >= 0 ? nextTo[fast] : fast;
      steps.push({
        msg: `Fast pointer step ${s + 1}/${k} → node ${fast}`,
        ll: ll(-1, slow, -1, -1, 0, values, nextTo, { slow, fast, hi: [fast] })
      });
    }
    while (nextTo[fast] >= 0) {
      slow = nextTo[slow];
      fast = nextTo[fast];
      steps.push({
        msg: `Move both until fast.next is NULL. slow before node to delete`,
        ll: ll(-1, slow, -1, -1, 0, values, nextTo, { slow, fast, hi: [slow] })
      });
    }
    const del = nextTo[slow];
    steps.push({
      msg: `slow.next = slow.next.next → skip node ${del} (value ${values[del]})`,
      ll: ll(slow, del, -1, del, 0, values, nextTo, { slow, deleteAt: del, hi: [del] })
    });
    nextTo[slow] = nextTo[del] >= 0 ? nextTo[del] : -1;
    steps.push({
      msg: `Node ${del} removed — O(n) one pass`,
      ll: ll(-1, -1, -1, -1, 0, values, nextTo, { slow, hi: [slow] })
    });
    return steps;
  }

  /** Floyd cycle — slow +1, fast +2 */
  function cycleSteps(values) {
    values = values || [3, 7, 2, 9, 5];
    const n = values.length;
    const nextTo = linearNext(n);
    nextTo[n - 1] = 2; // cycle back to index 2
    let slow = 0;
    let fast = 0;
    const steps = [{
      msg: "slow +1, fast +2 each step on cyclic list",
      ll: ll(-1, slow, -1, -1, 0, values, nextTo, { slow: 0, fast: 0, cyclic: true })
    }];
    for (let s = 1; s <= 6; s++) {
      slow = nextTo[slow];
      fast = nextTo[nextTo[fast] >= 0 ? nextTo[fast] : fast];
      const met = slow === fast;
      steps.push({
        msg: met ? `slow === fast at node ${slow} — cycle detected!` : `Step ${s}: slow→${slow}, fast→${fast}`,
        ll: ll(-1, slow, -1, -1, 0, values, nextTo, { slow, fast, cyclic: true, hi: met ? [slow] : [slow, fast] })
      });
      if (met) break;
    }
    return steps;
  }

  function stepsForTitle(title) {
    const t = title.toLowerCase();
    if (t.includes("reverse") && t.includes("k group")) return reverseSteps([1, 2, 3, 4, 5, 6]);
    if (t.includes("reverse")) return reverseSteps([1, 2, 3, 4]);
    if (t.includes("middle")) return middleSteps([1, 2, 3, 4, 5]);
    if (t.includes("merge") && t.includes("sorted")) return mergeSteps([1, 3, 5], [2, 4, 6]);
    if (t.includes("delete") && t.includes("k")) return deleteKthSteps([1, 2, 3, 4, 5], 2);
    if (t.includes("cycle") || t.includes("loop")) return cycleSteps([3, 7, 2, 9, 5]);
    if (t.includes("intersection")) return mergeSteps([2, 4, 6], [1, 2, 4]);
    if (t.includes("palindrome")) return reverseSteps([1, 2, 2, 1]);
    if (t.includes("rotate")) return reverseSteps([1, 2, 3, 4, 5]);
    if (t.includes("add two")) return mergeSteps([2, 4, 3], [5, 6, 4]);
    return reverseSteps([1, 2, 3, 4]);
  }

  window.LinkedListAlgos = {
    reverseSteps,
    middleSteps,
    mergeSteps,
    deleteKthSteps,
    cycleSteps,
    stepsForTitle
  };
})();
