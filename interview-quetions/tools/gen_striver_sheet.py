# -*- coding: utf-8 -*-
"""Generate Striver SDE Sheet data + brief step explanations for visualizations."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(__file__).resolve().parent / "striver_problems_raw.txt"

# Exact title -> dsa-visuals anchor (checked first)
EXACT_VISUAL = {
    "Flood Fill Algorithm": "visual-graph",
    "Clone a graph": "visual-graph",
    "DFS Traversal": "visual-graph",
    "BFS Traversal": "visual-graph",
    "Cycle Detection in Undirected Graph": "visual-graph",
    "Cycle Detection inDirected Graph": "visual-graph",
    "Topological Sort": "visual-toposort",
    "Number of Islands": "visual-graph",
    "Bipartite Graph": "visual-graph",
    "Strongly Connected Components": "visual-toposort",
    "Dijkstra's Shortest Path": "visual-dijkstra",
    "Bellman Ford Algorithm": "visual-dijkstra",
    "Flloyd Warshall Algorithm": "visual-dijkstra",
    "Prim's Algorithm": "visual-union-find",
    "Kruskal's Algorithm": "visual-union-find",
    "Implement Trie": "visual-trie",
    "Implement Trie II": "visual-trie",
    "Complete String": "visual-trie",
    "Number of Distinct Substring": "visual-trie",
    "Maximum Xor inside a Array": "visual-trie",
    "Maximum Xor with an Element": "visual-trie",
    "Power Set": "visual-recursion-backtrack",
}

# Map problem title keywords -> existing dsa-visuals.html anchor
VISUAL_LINKS = [
    (r"two sum|pair sum", "visual-two-sum"),
    (r"longest substr without|630418|unique char", "visual-sliding-window"),
    (r"subarray.*zero|count subarrays.*xor", "visual-prefix-sum"),
    (r"trapping rain|two pointer|container|3 sum|4 sum", "visual-two-pointers"),
    (r"reverse.*linked|reverse linked", "visual-linked-list"),
    (r"cycle|floyd|loop", "visual-cycle-floyd"),
    (r"merge interval|meeting|activity|platform", "visual-greedy-intervals"),
    (r"fractional knapsack", "visual-fractional-knapsack"),
    (r"subset|permutation|n queen|sudoku|maze|backtrack|combination", "visual-recursion-backtrack"),
    (r"binary search|rotated sorted|median of two|book alloc|kth element.*sorted", "visual-binary-search"),
    (r"heap|kth largest|kth smallest|merge k|frequent", "visual-heap"),
    (r"valid parenthes|stack|queue using", "visual-stack"),
    (r"rotting orange|level order", "visual-bfs-tree"),
    (r"inorder|preorder|postorder", "visual-tree-traversal"),
    (r"bst|binary search tree", "visual-bst"),
    (r"dijkstra|bellman|floyd warshall|shortest path", "visual-dijkstra"),
    (r"topological|strongly connected", "visual-toposort"),
    (r"kruskal|prim|mst|union", "visual-union-find"),
    (r"islands|clone graph|flood fill|bipartite|graph|dfs traversal|bfs traversal", "visual-graph"),
    (r"trie|distinct substring|complete string|maximum xor", "visual-trie"),
    (r"sort 0 1 2|merge sort|quick|sorting", "visual-sorting"),
    (r"maximum subarray|kadane|max product subarray", "visual-kadane"),
    (r"0.?1 knapsack|knapsack", "visual-knapsack"),
    (r"longest common subsequence|edit distance", "visual-lcs"),
    (r"unique path|grid|minimum path", "visual-knapsack"),
    (r"hash|anagram", "visual-hashmap"),
    (r"lru", "visual-doubly-ll"),
    (r"deque|sliding window max", "visual-deque"),
]

TOPIC_TYPE = {
    "Arrays": "array",
    "Linked List": "linkedlist",
    "2 Pointer": "array",
    "Greedy": "greedy",
    "Recursion": "recursion",
    "BackTracking": "recursion",
    "Binary Search": "binarysearch",
    "Heaps": "heap",
    "Stack": "stack",
    "Queue": "stack",
    "Stack and Queue": "stack",
    "Deque": "stack",
    "HashMap": "hash",
    "String": "string",
    "Binary Tree": "tree",
    "Binary Search Tree": "tree",
    "Graph": "graph",
    "DFS": "graph",
    "Dynamic Programming": "dp",
    "Trie": "trie",
}

APPROACH_TEMPLATES = {
    "array": [
        "Clarify constraints: size, negatives, sorted or not.",
        "Try brute force, then optimize with HashMap / two pointers / prefix sum.",
        "Track indices or running totals while scanning once.",
        "Handle edge cases: empty array, single element, all same values.",
        "State time and space complexity before coding.",
    ],
    "linkedlist": [
        "Draw pointers: prev, curr, next (or slow/fast for cycles).",
        "Use dummy head node to simplify edge cases.",
        "Move pointers in one pass when possible — O(n) time, O(1) space.",
        "Watch null checks on every step.",
    ],
    "greedy": [
        "Sort input by the greedy key (end time, ratio, deadline).",
        "Pick locally best choice that leaves room for future picks.",
        "Prove or cite why greedy works (exchange argument).",
    ],
    "recursion": [
        "Define recursive state: index, path, remaining choices.",
        "Base case: when to save answer or return.",
        "Recurse → undo (backtrack) to try other branches.",
        "Prune early when invalid.",
    ],
    "binarysearch": [
        "Identify monotonic property on answer or index space.",
        "Maintain lo, hi; mid = lo + (hi-lo)//2.",
        "Shrink search space based on comparison.",
        "Watch overflow and infinite loop (lo <= hi).",
    ],
    "heap": [
        "Use min-heap of size K for Kth largest; max-heap for Kth smallest.",
        "Push/pop as you scan — O(n log K).",
        "Two heaps for median stream (max left, min right).",
    ],
    "stack": [
        "Use stack for LIFO matching (parentheses, monotonic next greater).",
        "Deque for sliding window max — maintain decreasing order.",
        "Each element pushed/popped once → O(n).",
    ],
    "tree": [
        "Choose traversal: inorder (BST sorted), BFS (level), DFS (paths).",
        "Recursive with base null; pass down min/max for BST validate.",
        "Track global answer during postorder (diameter, max path).",
    ],
    "graph": [
        "Build adjacency list; BFS for unweighted shortest path.",
        "DFS for cycles, components, topo sort on DAG.",
        "Visited set prevents infinite loops.",
    ],
    "dp": [
        "Define dp state meaning (dp[i], dp[i][j]).",
        "Write recurrence from smaller subproblems.",
        "Fill bottom-up or memoize top-down.",
        "Optimize space if only previous row needed.",
    ],
    "string": [
        "Two pointers or expand-around-center for palindromes.",
        "HashMap for frequency / anagram checks.",
        "KMP/Z for pattern matching — prefix function.",
    ],
    "trie": [
        "Each node = map of char → child; mark end of word.",
        "Insert/search O(length); good for prefix queries.",
    ],
    "hash": [
        "HashMap for O(1) lookup: count, index, last seen.",
        "Watch collision handling and key design.",
    ],
    "misc": [
        "Understand input/output and constraints first.",
        "Start brute force, then optimize pattern.",
        "Test edge cases before submitting.",
    ],
}

SIMPLE_TEMPLATES = {
    "array": "Classic array problem — often solved with one scan, HashMap, or two pointers in O(n).",
    "linkedlist": "Linked list pointer manipulation — reverse, merge, or detect cycles in O(n) time.",
    "greedy": "Make the locally best choice after sorting — optimal when greedy property holds.",
    "recursion": "Explore choices with recursion; backtrack by undoing the last choice when stuck.",
    "binarysearch": "Search on sorted data or on the answer space using binary search O(log n).",
    "heap": "Priority queue (heap) for top-K, merging streams, or scheduling.",
    "stack": "Stack or monotonic deque for matching, nesting, or next greater element.",
    "tree": "Binary tree traversal or property check — usually O(n) recursive or BFS.",
    "graph": "Graph BFS/DFS or shortest path — model as nodes and edges first.",
    "dp": "Break into overlapping subproblems; cache results in a DP table.",
    "string": "String scan with HashMap, two pointers, or pattern matching.",
    "trie": "Prefix tree for efficient word/prefix lookup and XOR tricks.",
    "hash": "HashMap/set for frequency counting or O(1) lookups.",
    "misc": "Standard DSA interview problem from Striver's SDE Sheet.",
}


def norm_topic(raw):
    t = raw.strip()
    if "Linked List" in t and "Array" in t:
        return "2 Pointer"
    if "Recursion" in t or "BackTracking" in t or "Backtracking" in t:
        return "Recursion"
    if "Binary Search" in t and "Tree" not in t:
        return "Binary Search"
    if "Binary Tree" in t or "Binary Search Tree" in t:
        return "Binary Tree" if "Search Tree" not in t else "Binary Search Tree"
    if "Greedy" in t:
        return "Greedy"
    if "Dynamic Programming" in t or "DP" in t:
        return "Dynamic Programming"
    if "Graph" in t or t == "DFS":
        return "Graph"
    if "Heap" in t:
        return "Heaps"
    if "Stack" in t or "Queue" in t or "Deque" in t:
        return "Stack and Queue"
    if "Trie" in t:
        return "Trie"
    if "String" in t:
        return "String"
    if "Hash" in t:
        return "HashMap"
    if "Linked List" in t:
        return "Linked List"
    if "Array" in t or "Pointer" in t or "2 Pointer" in t:
        return "Arrays"
    return t.split()[0] if t else "Misc"


def guess_level(title, topic):
    tl = title.lower()
    if any(x in tl for x in ["implement trie", "sudoku", "median of two", "lru", "serialize", "word break 2", "strongly connected"]):
        return "hard"
    if any(x in tl for x in ["two sum", "reverse linked", "valid parenthes", "inorder", "dfs", "bfs", "set matrix"]):
        return "easy"
    if topic in ("Recursion", "Graph", "Dynamic Programming", "Binary Search Tree"):
        return "hard"
    if topic == "Greedy":
        return "medium"
    return "medium"


def visual_link(title, topic=None):
    if title in EXACT_VISUAL:
        return EXACT_VISUAL[title]
    tl = title.lower()
    for pat, vid in VISUAL_LINKS:
        if re.search(pat, tl, re.I):
            if vid == "visual-cycle-floyd" and topic in ("Graph", "Trie"):
                continue
            if vid == "visual-linked-list" and topic == "Linked List":
                continue
            return vid
    if topic == "Graph":
        return "visual-graph"
    if topic == "Trie":
        return "visual-trie"
    if topic == "Linked List":
        tl = title.lower()
        if "cycle" in tl or "loop" in tl:
            return "visual-cycle-floyd"
        if "random" in tl or "clone" in tl:
            return "visual-doubly-ll"
        return None  # use inline algorithm steps, not traversal embed
    return None


def _linear_next(n):
    return [i + 1 if i < n - 1 else -1 for i in range(n)]


def _ll_frame(values, next_to, head, prev, curr, saved, flip, msg, **extra):
    ll = {
        "values": values,
        "nextTo": next_to,
        "head": head,
        "prev": prev if prev is not None and prev >= 0 else None,
        "curr": curr if curr is not None and curr >= 0 else None,
    }
    if saved is not None and saved >= 0:
        ll["savedNext"] = saved
    if flip is not None and flip >= 0:
        ll["flip"] = flip
    ll.update(extra)
    return {"msg": msg, "ll": ll}


def _reverse_ll_steps(values=None):
    values = values or [1, 2, 3, 4]
    n = len(values)
    next_to = _linear_next(n)
    steps = []
    prev, curr = -1, 0
    steps.append(_ll_frame(values, next_to[:], 0, prev, curr, None, None,
                           f"Start: prev = NULL, curr = head (value {values[0]})"))
    while curr >= 0:
        saved = next_to[curr]
        steps.append(_ll_frame(values, next_to[:], 0, prev, curr, saved, None,
                               f"Save nxt = curr.next → {'node '+str(saved)+' ('+str(values[saved])+')' if saved >= 0 else 'NULL'}",
                               hi=[curr]))
        next_to[curr] = prev
        steps.append(_ll_frame(values, next_to[:], 0, prev, curr, saved, curr,
                               f"curr.next = prev → node {curr} points {'back to '+str(values[prev]) if prev >= 0 else 'to NULL'}",
                               hi=[curr]))
        prev, curr = curr, saved
        if curr < 0:
            break
        steps.append(_ll_frame(values, next_to[:], 0, prev, curr, None, None,
                               f"Advance: prev = {values[prev]}, curr = node {curr} (value {values[curr]})",
                               hi=[prev, curr]))
    steps.append(_ll_frame(values, next_to[:], prev, prev, None, None, None,
                           f"Done: new head = node {prev} (value {values[prev]})", hi=[prev]))
    return steps


def _middle_ll_steps(values=None):
    values = values or [1, 2, 3, 4, 5]
    n = len(values)
    next_to = _linear_next(n)
    slow = fast = 0
    steps = [_ll_frame(values, next_to[:], 0, None, slow, None, None,
                       "slow = head, fast = head", slow=0, fast=0)]
    for _ in range(n):
        if next_to[fast] < 0:
            break
        slow = next_to[slow] if next_to[slow] >= 0 else slow
        nxt = next_to[fast]
        fast = next_to[nxt] if nxt >= 0 and next_to[nxt] >= 0 else (nxt if nxt >= 0 else fast)
        steps.append(_ll_frame(values, next_to[:], 0, None, slow, None, None,
                               f"slow → {slow}, fast → {fast}. Middle ≈ slow", slow=slow, fast=fast, hi=[slow, fast]))
    steps.append(_ll_frame(values, next_to[:], 0, None, slow, None, None,
                           f"Middle node: {values[slow]}", slow=slow, fast=fast, hi=[slow]))
    return steps


def _merge_ll_steps(a=None, b=None):
    a = a or [1, 3, 5]
    b = b or [2, 4, 6]
    steps = [{"msg": "Dummy head; compare list A and list B",
              "ll": {"merge": True, "listA": a, "listB": b, "ptrA": 0, "ptrB": 0, "out": []}}]
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            steps.append({"msg": f"A[{i}]={a[i]} ≤ B[{j}] → append {a[i]}",
                          "ll": {"merge": True, "listA": a, "listB": b, "ptrA": i, "ptrB": j, "out": out[:], "pick": "A"}})
            i += 1
        else:
            out.append(b[j])
            steps.append({"msg": f"B[{j}]={b[j]} < A[{i}] → append {b[j]}",
                          "ll": {"merge": True, "listA": a, "listB": b, "ptrA": i, "ptrB": j, "out": out[:], "pick": "B"}})
            j += 1
    out.extend(a[i:])
    out.extend(b[j:])
    steps.append({"msg": f"Merged: {' → '.join(map(str, out))}",
                  "ll": {"merge": True, "listA": a, "listB": b, "ptrA": -1, "ptrB": -1, "out": out, "done": True}})
    return steps


def _delete_kth_steps(values=None, k=2):
    values = values or [1, 2, 3, 4, 5]
    n = len(values)
    next_to = _linear_next(n)
    slow = fast = 0
    steps = [_ll_frame(values, next_to[:], 0, None, slow, None, None,
                       f"Move fast {k} steps ahead of slow", slow=0, fast=0)]
    for s in range(k):
        if next_to[fast] >= 0:
            fast = next_to[fast]
        steps.append(_ll_frame(values, next_to[:], 0, None, slow, None, None,
                               f"Fast step {s+1}/{k} → node {fast}", slow=slow, fast=fast, hi=[fast]))
    while next_to[fast] >= 0:
        slow = next_to[slow]
        fast = next_to[fast]
        steps.append(_ll_frame(values, next_to[:], 0, None, slow, None, None,
                               "Move both until fast.next is NULL", slow=slow, fast=fast, hi=[slow]))
    deleted = next_to[slow]
    steps.append(_ll_frame(values, next_to[:], 0, slow, deleted, None, deleted,
                           f"slow.next = slow.next.next → remove node {deleted} (value {values[deleted]})",
                           slow=slow, deleteAt=deleted, hi=[deleted]))
    next_to[slow] = next_to[deleted] if next_to[deleted] >= 0 else -1
    steps.append(_ll_frame(values, next_to[:], 0, None, None, None, None,
                           "Node deleted — O(n) one pass", slow=slow, hi=[slow]))
    return steps


def _cycle_ll_steps(values=None):
    values = values or [3, 7, 2, 9, 5]
    n = len(values)
    next_to = _linear_next(n)
    next_to[n - 1] = 2
    slow = fast = 0
    steps = [_ll_frame(values, next_to[:], 0, None, slow, None, None,
                       "slow +1, fast +2 on cyclic list", slow=0, fast=0, cyclic=True)]
    for s in range(1, 7):
        slow = next_to[slow]
        nxt = next_to[fast]
        fast = next_to[nxt] if nxt >= 0 else fast
        met = slow == fast
        steps.append(_ll_frame(values, next_to[:], 0, None, slow, None, None,
                               f"{'Cycle detected at node '+str(slow)+'!' if met else 'Step '+str(s)+': slow→'+str(slow)+', fast→'+str(fast)}",
                               slow=slow, fast=fast, cyclic=True, hi=[slow] if met else [slow, fast]))
        if met:
            break
    return steps


def demo_steps_linkedlist(title):
    t = title.lower()
    if "reverse" in t and "k group" in t:
        return _reverse_ll_steps([1, 2, 3, 4, 5, 6])
    if "reverse" in t:
        return _reverse_ll_steps([1, 2, 3, 4])
    if "middle" in t:
        return _middle_ll_steps([1, 2, 3, 4, 5])
    if "merge" in t and "sorted" in t:
        return _merge_ll_steps([1, 3, 5], [2, 4, 6])
    if "delete" in t and "k" in t:
        return _delete_kth_steps([1, 2, 3, 4, 5], 2)
    if "cycle" in t or "loop" in t:
        return _cycle_ll_steps([3, 7, 2, 9, 5])
    if "intersection" in t:
        return _merge_ll_steps([2, 4, 6], [1, 2, 4])
    if "palindrome" in t:
        return _reverse_ll_steps([1, 2, 2, 1])
    if "rotate" in t:
        return _reverse_ll_steps([1, 2, 3, 4, 5])
    if "add two" in t:
        return _merge_ll_steps([2, 4, 3], [5, 6, 4])
    return _reverse_ll_steps([1, 2, 3, 4])


def demo_steps(title, vtype):
    """Generic step demo with optional bar highlights."""
    base = [
        {"msg": "Read input and note constraints (size, sorted, negatives)."},
        {"msg": "Apply the core pattern for this problem type."},
        {"msg": "Update data structure / pointers each step."},
        {"msg": "Return result when scan or recursion completes."},
    ]
    if vtype == "array":
        arr = [3, 1, 4, 1, 5, 9]
        return [
            {"msg": "Start: scan array left → right", "bars": arr, "hi": [0]},
            {"msg": "Check condition at index i", "bars": arr, "hi": [2]},
            {"msg": "Update HashMap / pointers / sum", "bars": arr, "hi": [2, 4]},
            {"msg": "Found answer / continue", "bars": arr, "hi": [4]},
        ]
    if vtype == "linkedlist":
        return demo_steps_linkedlist(title)
    if vtype == "binarysearch":
        arr = [1, 3, 5, 7, 9, 11, 13]
        return [
            {"msg": "lo=0, hi=n-1, target in sorted array", "bars": arr, "hi": [3]},
            {"msg": "mid = lo + (hi-lo)/2", "bars": arr, "hi": [3]},
            {"msg": "Compare arr[mid] with target", "bars": arr, "hi": [3]},
            {"msg": "Shrink lo or hi; repeat until found", "bars": arr, "hi": [5]},
        ]
    if vtype == "dp":
        return [
            {"msg": "Define dp table / state meaning", "bars": [0, 1, 1, 2, 3], "hi": [0]},
            {"msg": "Fill base cases", "bars": [0, 1, 1, 2, 3], "hi": [1, 2]},
            {"msg": "Transition from smaller states", "bars": [0, 1, 1, 2, 3], "hi": [3]},
            {"msg": "Answer at dp[n] or max of table", "bars": [0, 1, 1, 2, 3], "hi": [4]},
        ]
    return base


def parse_raw():
    text = SRC.read_text(encoding="utf-8") if SRC.exists() else ""
    problems = []
    for m in re.finditer(
        r"^\s*(\d{3})\s*\|\s*([^|]+)\|\s*\[([^\]]+)\]",
        text,
        re.M,
    ):
        num = int(m.group(1))
        topic = m.group(2).strip()
        title = m.group(3).strip()
        problems.append((num, topic, title))
    # dedupe by num, sort
    seen = {}
    for num, topic, title in problems:
        seen[num] = (topic, title)
    out = [(n, seen[n][0], seen[n][1]) for n in sorted(seen)]
    return out


def section_for_topic(topic, title):
    t = norm_topic(topic)
    mapping = {
        "Arrays": "Arrays",
        "2 Pointer": "Arrays & Two Pointers",
        "Linked List": "Linked List",
        "Greedy": "Greedy",
        "Recursion": "Recursion & Backtracking",
        "Binary Search": "Binary Search",
        "Heaps": "Heaps",
        "Stack and Queue": "Stack & Queue",
        "HashMap": "Stack & Queue",
        "String": "String",
        "Binary Tree": "Binary Tree",
        "Binary Search Tree": "Binary Search Tree",
        "Graph": "Graph",
        "Dynamic Programming": "Dynamic Programming",
        "Trie": "Trie",
    }
    return mapping.get(t, t)


def build():
    raw = parse_raw()
    sections_order = []
    problems = []
    for num, topic_raw, title in raw:
        topic = norm_topic(topic_raw)
        vtype = TOPIC_TYPE.get(topic, "misc")
        if vtype == "misc" and topic in TOPIC_TYPE:
            vtype = TOPIC_TYPE[topic]
        sec = section_for_topic(topic, title)
        if sec not in sections_order:
            sections_order.append(sec)
        vl = visual_link(title, topic)
        problems.append({
            "id": f"striver-{num:03d}",
            "num": num,
            "title": title,
            "section": sec,
            "topic": topic,
            "level": guess_level(title, topic),
            "simple": f"{title}: {SIMPLE_TEMPLATES.get(vtype, SIMPLE_TEMPLATES['misc'])}",
            "approach": APPROACH_TEMPLATES.get(vtype, APPROACH_TEMPLATES["misc"]),
            "visualLink": vl,
            "visualType": vtype,
            "demoSteps": demo_steps(title, vtype),
        })
    return {"sections": sections_order, "problems": problems, "source": "Striver SDE Sheet (takeUforward)"}


def js_escape(s):
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")


def write_js(data):
    out = ROOT / "assets" / "striver-sheet-data.js"
    lines = [
        "/** Auto-generated Striver SDE Sheet problem data — do not edit by hand */",
        "window.STRIVER_SHEET = " + json.dumps(data, indent=2, ensure_ascii=False) + ";",
    ]
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(data['problems'])} problems to {out}")


if __name__ == "__main__":
    # Copy raw list to tools/striver_problems_raw.txt from github mirror if missing
    if not SRC.exists():
        print("Missing striver_problems_raw.txt — run from repo with raw data")
    data = build()
    write_js(data)
