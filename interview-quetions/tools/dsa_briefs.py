# -*- coding: utf-8 -*-
"""Curated beginner-friendly 'In simple terms' text for DSA cards."""
DSA_BRIEFS = {
    "complexity": (
        "Big O tells you how slow an algorithm gets when input size grows — not exact seconds, but the trend (constant, linear, quadratic, etc.).",
        ["O(1) = fixed time regardless of size", "O(n) = loop once through data", "O(n²) = nested loops — avoid on large n", "Always mention space complexity too"],
    ),
    "complexity-cheat": (
        "Memorize the speed order from fastest to slowest — interviewers expect you to compare solutions instantly.",
        ["O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ)", "Binary search = O(log n)", "HashMap get/put = O(1) average", "BFS/DFS = O(V + E)"],
    ),
    "recursion-backtracking": (
        "Recursion breaks a problem into smaller same-type subproblems. Backtracking tries a path, and if it fails, undoes the last choice and tries another.",
        ["Recursion needs base case + progress toward it", "Backtracking = choose → explore → undo", "Used for subsets, permutations, N-Queens", "Often exponential — prune early"],
    ),
    "gcd-primes": (
        "GCD finds the largest number dividing two integers. Primes have only 1 and themselves as divisors — common in math-heavy DSA.",
        ["Euclidean GCD: while b≠0, swap a,b = b, a%b", "Check prime up to √n", "LCM = a×b / GCD"],
    ),
    "approach-framework": (
        "A repeatable interview workflow so you never stare at a blank screen — clarify, example, brute force, optimize, code, test.",
        ["Clarify input, output, edge cases first", "Match pattern: sliding window, two pointers, BFS, DP, heap", "State time and space at the end"],
    ),
    "space-complexity-examples": (
        "Space complexity = extra memory your algorithm uses beyond the input.",
        ["O(1): two pointers, in-place swap", "O(n): HashMap, recursion stack depth n", "O(n²): 2D DP table"],
    ),
    "two-sum": (
        "Find two numbers in an array that add up to a target — classic HashMap pattern.",
        ["Store value→index while scanning", "Check if (target − current) already seen", "O(n) time, O(n) space", "Sorted array → two pointers instead"],
    ),
    "sliding-window": (
        "Maintain a window [left, right] over array/string — expand right, shrink left when rule breaks.",
        ["Variable window: longest/shortest satisfying condition", "Fixed window: subarray of size K", "Track counts in HashMap for duplicates", "O(n) — each element enters/leaves once"],
    ),
    "prefix-sum": (
        "Precompute running totals so any range sum is O(1) after O(n) setup.",
        ["prefix[i] = sum of nums[0..i]", "Range [l,r] sum = prefix[r] − prefix[l−1]", "Subarray sum K: count prefixes where (curr−K) seen before"],
    ),
    "two-pointers": (
        "Two indices moving toward each other or in same direction to avoid nested loops.",
        ["Opposite ends: container with most water, pair sum in sorted array", "Same direction: remove duplicates in-place", "Move the pointer that limits the answer"],
    ),
    "valid-anagram": (
        "Two strings are anagrams if they have the same character counts.",
        ["Count frequency in int[26] or HashMap", "Decrement for second string — any negative = false", "O(n) time"],
    ),
    "array-traversal-ops": (
        "Know cost of basic array operations — interviewers ask when choosing data structures.",
        ["Index access O(1)", "Search unsorted O(n)", "Insert/delete middle O(n) due to shifting", "ArrayList append amortized O(1)"],
    ),
    "linked-list-types": (
        "Linked list = nodes connected by pointers instead of contiguous memory like arrays.",
        ["Singly: one next pointer, can't go backward", "Doubly: next + prev — O(1) delete at node", "Circular: last → head — round-robin use cases"],
    ),
    "reverse-linked-list": (
        "Flip direction of all next pointers — must-know linked list problem.",
        ["Three pointers: prev, curr, next", "curr.next = prev; advance all three", "O(n) time, O(1) space"],
    ),
    "cycle-detection": (
        "Detect if linked list has a cycle (last node points back).",
        ["Floyd: slow +1, fast +2 — meet means cycle", "Find cycle start: reset slow to head, both +1", "O(n) time, O(1) space"],
    ),
    "merge-two-lists": (
        "Merge two sorted linked lists into one sorted list.",
        ["Dummy head avoids edge cases", "Attach smaller node each step", "O(n+m) time, O(1) extra space"],
    ),
    "stack-queue-uses": (
        "Stack = LIFO (last in first out). Queue = FIFO (first in first out).",
        ["Stack: DFS, parentheses, undo, call stack", "Queue: BFS, job buffers, thread pools", "Deque: both ends — sliding window max"],
    ),
    "valid-parentheses": (
        "Check if brackets are properly opened and closed using a stack.",
        ["Push opening brackets", "On closing: pop must match", "End with empty stack", "O(n) time"],
    ),
    "queue-bfs-ring": (
        "Queue processes in arrival order; circular queue reuses fixed buffer; deque allows both ends.",
        ["Java: ArrayDeque for queue/deque", "Circular queue: front/rear wrap with modulo", "BFS uses queue for level order"],
    ),
    "min-stack": (
        "Design a stack that returns minimum element in O(1).",
        ["Second stack tracks current min", "On push: push min(val, topMin)", "Pop from both stacks together"],
    ),
    "implement-queue-stacks": (
        "Simulate queue using two stacks — classic design question.",
        ["inStack for enqueue", "Pour inStack → outStack when outStack empty on dequeue", "Amortized O(1) per operation"],
    ),
    "tree-traversals": (
        "Visit every node in a defined order — foundation for all tree problems.",
        ["Inorder (L,root,R): BST gives sorted order", "Preorder (root,L,R): copy/serialize tree", "Postorder (L,R,root): delete tree", "All O(n)"],
    ),
    "bfs-tree": (
        "Level-order traversal — process tree level by level using a queue.",
        ["Queue + snapshot size each level", "Add children after processing node", "Used for level sums, zigzag, min depth"],
    ),
    "bst-operations": (
        "Binary Search Tree: left < root < right at every node.",
        ["Search/insert O(h) — O(log n) if balanced", "Validate BST: pass min/max bounds, not just parent check", "Inorder traversal = sorted values"],
    ),
    "tree-height-diameter": (
        "Height = longest path root to leaf. Diameter = longest path between any two nodes.",
        ["Height: max(left, right) + 1", "Diameter at node: leftHeight + rightHeight", "Track global max during recursion"],
    ),
    "lca-bst": (
        "Lowest Common Ancestor = deepest node that is ancestor of both p and q.",
        ["BST: walk from root — both left go left, both right go right, else found", "Binary tree: postorder return p/q/upward", "O(h) time"],
    ),
    "max-depth-tree": (
        "Maximum depth = number of nodes along longest root-to-leaf path.",
        ["Base: null → 0", "Return 1 + max(left depth, right depth)", "O(n) visits every node once"],
    ),
    "heap-basics": (
        "Heap = complete binary tree where parent is min (min-heap) or max (max-heap) of children.",
        ["Insert/poll O(log n), peek O(1)", "Java: PriorityQueue — default min-heap", "Max-heap: PriorityQueue with reverseOrder()"],
    ),
    "k-largest-heap": (
        "Find Kth largest using a min-heap of size K — root is the answer after scanning all.",
        ["If heap size > K, poll smallest", "O(n log K) time", "Alternative: Quickselect O(n) average"],
    ),
    "heap-sort": (
        "Sort by building max-heap then repeatedly swapping root to end.",
        ["Build heap O(n)", "Swap root with last, heapify reduced size", "O(n log n), O(1) extra space, not stable"],
    ),
    "lru-cache": (
        "Cache with fixed capacity — evict least recently used item when full.",
        ["HashMap for O(1) lookup", "Doubly linked list for O(1) move/evict", "get/put both O(1)", "Real use: Redis, HTTP caches"],
    ),
    "hashmap-how": (
        "HashMap stores key→value pairs using a hash function to find a bucket quickly.",
        ["hash(key) % buckets → index", "Average O(1) get/put", "Java 8+: long chains become red-black trees", "Load factor 0.75 triggers resize"],
    ),
    "collision-handling": (
        "When two keys hash to same bucket — must resolve without losing data.",
        ["Chaining: bucket holds list/tree of entries", "Open addressing: probe next slot", "Good hash + load factor keeps chains short"],
    ),
    "frequency-count": (
        "Count how often each element appears — unlocks anagram, top-K, majority problems.",
        ["HashMap element → count", "Top K: min-heap of size K on counts", "Boyer-Moore for majority without extra space"],
    ),
    "group-anagrams": (
        "Group words that are anagrams of each other.",
        ["Key = sorted word OR char count signature", "HashMap key → list of words", "O(n × k log k) with sort per word"],
    ),
    "graph-representation": (
        "Store graph so you can traverse edges efficiently.",
        ["Adjacency list: Map<node, List<neighbors>> — O(V+E) space, best for sparse", "Adjacency matrix: O(V²) — O(1) edge lookup", "Use list for most interview graphs"],
    ),
    "bfs-dfs": (
        "Two ways to explore a graph — choose based on what you need.",
        ["BFS + queue: shortest path in unweighted graph, level order", "DFS + stack/recursion: cycles, components, topo sort", "Both O(V + E) with visited set"],
    ),
    "dijkstra": (
        "Find shortest path when edges have non-negative weights.",
        ["Min-heap of (distance, node)", "Relax neighbors if shorter path found", "O((V+E) log V)", "Bellman-Ford if negative weights"],
    ),
    "mst-algorithms": (
        "Minimum Spanning Tree connects all vertices with minimum total edge weight.",
        ["Kruskal: sort edges, Union-Find add if no cycle", "Prim: grow from start with min-heap frontier", "Used in network design"],
    ),
    "topological-sort": (
        "Linear ordering of DAG nodes where all edges go forward — course prerequisites.",
        ["Kahn: BFS on indegree 0 nodes", "Or DFS postorder reversed", "If processed < V → cycle exists"],
    ),
    "num-islands": (
        "Count connected groups of '1's in a 2D grid — classic flood fill.",
        ["Scan grid; on '1' count++ and DFS/BFS sink island", "Mark visited as '0' or use visited set", "Template for grid graph problems"],
    ),
    "sorting-comparison": (
        "Know trade-offs between sorting algorithms — interview table question.",
        ["Bubble/Selection/Insertion: O(n²) — teaching only", "Merge: O(n log n), stable, O(n) space", "Quick: O(n log n) avg, in-place", "Heap: O(n log n), O(1) space"],
    ),
    "merge-sort": (
        "Divide array in half, sort halves, merge — guaranteed O(n log n).",
        ["Split until size 1", "Merge two sorted arrays with two pointers", "O(n log n) time, O(n) auxiliary space", "Stable sort"],
    ),
    "quick-sort": (
        "Pick pivot, partition smaller left / larger right, recurse.",
        ["Average O(n log n), worst O(n²) bad pivot", "Random pivot reduces worst case", "In-place, cache-friendly"],
    ),
    "binary-search": (
        "Find target in sorted array by halving search space each step.",
        ["lo, hi, mid = lo + (hi-lo)/2", "O(log n) time, O(1) space", "Variants: first/last occurrence, rotated array"],
    ),
    "merge-intervals": (
        "Combine overlapping time intervals into merged ranges.",
        ["Sort by start time", "If overlap with last result, extend end", "Else add new interval", "O(n log n) for sort"],
    ),
    "dp-intro": (
        "Dynamic Programming solves problems by storing results of subproblems instead of recomputing.",
        ["Need: optimal substructure + overlapping subproblems", "Memoization = top-down recursion + cache", "Tabulation = bottom-up fill table", "Define state dp[i] meaning first"],
    ),
    "fibonacci-dp": (
        "Fibonacci shows why naive recursion is slow and DP fixes it.",
        ["Naive recursion recalculates same values → O(2ⁿ)", "DP stores previous two values → O(n) time O(1) space", "Classic intro to overlapping subproblems"],
    ),
    "max-subarray": (
        "Find contiguous subarray with largest sum — Kadane's algorithm.",
        ["curr = max(nums[i], curr + nums[i])", "best = max(best, curr)", "O(n) time O(1) space", "dp[i] = max sum ending at i"],
    ),
    "knapsack-01": (
        "0/1 Knapsack: pick items with max value without exceeding weight — each item once.",
        ["dp[w] = max value at capacity w", "Loop items; for w down to weight (no reuse)", "O(n × W) pseudo-polynomial"],
    ),
    "lcs": (
        "Longest Common Subsequence — longest sequence appearing in both strings in order (not necessarily contiguous).",
        ["If chars match: dp[i][j] = 1 + dp[i-1][j-1]", "Else: max(dp[i-1][j], dp[i][j-1])", "O(m×n) time", "Used in diff tools, edit distance variant"],
    ),
    "grid-dp": (
        "DP on 2D grids — paths or min cost from top-left to bottom-right.",
        ["Unique paths: dp[i][j] = dp[i-1][j] + dp[i][j-1]", "Min path sum: dp[i][j] += min(top, left)", "Can optimize to one row"],
    ),
    "greedy-vs-dp": (
        "Greedy picks best local choice each step; DP explores all subproblem choices.",
        ["Greedy works when greedy choice property + optimal substructure proven", "If greedy fails a counterexample → use DP", "Example: fractional knapsack = greedy, 0/1 = DP"],
    ),
    "activity-selection": (
        "Pick maximum non-overlapping intervals — classic greedy.",
        ["Sort by end time (not start!)", "Take next if start ≥ last end", "O(n log n)", "Same pattern: meeting rooms, balloons"],
    ),
    "fractional-knapsack": (
        "Knapsack where you can take fractions of items — greedy by value/weight ratio.",
        ["Sort by value/weight descending", "Take full item or fraction to fill capacity", "O(n log n)", "0/1 version needs DP"],
    ),
    "huffman-coding": (
        "Build optimal prefix codes for compression — frequent symbols get shorter codes.",
        ["Min-heap of symbol frequencies", "Repeatedly merge two smallest into tree", "Left=0, right=1 on edges", "Used in ZIP, JPEG"],
    ),
}
