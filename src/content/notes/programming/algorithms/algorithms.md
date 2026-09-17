---
title: Algorithms
summary: A small number of patterns solve most problems — and recognising which one applies matters far more than recalling an implementation.
aliases: ['algorithm']
domain: algorithms
hub: true
mastery: learning
difficulty: 2
tags: ['algorithms', 'complexity', 'problem-solving', 'fundamentals']
estMinutes: 8
updated: 2026-09-17
sources:
  - title: 'Python Wiki — TimeComplexity'
    url: 'https://wiki.python.org/moin/TimeComplexity'
---

Competitive practice makes this subject look like a memory game. It is not. Almost every problem worth solving is an instance of one of a handful of patterns, and the skill being trained is **recognition** — noticing which pattern a problem is wearing.

## Complexity is the language, not the goal

Big-O describes how cost grows with input size, ignoring constants and lower-order terms. That makes it the right tool for comparing approaches and the wrong tool for predicting runtime.

The distinctions that actually change decisions:

- **O(1) and O(log n)** are effectively free. A binary search over a billion items is thirty comparisons.
- **O(n) and O(n log n)** are the realistic targets for most work. Sorting sits at the top of this band.
- **O(n²)** is fine at a thousand items and fatal at a million. Nearly every performance disaster is an accidental quadratic — usually a loop containing a linear search that should have been a hash lookup.
- **O(2ⁿ) and O(n!)** mean you are not going to enumerate. You need pruning, approximation or a different formulation.

Two cautions. Constants matter: an O(n log n) algorithm with an ugly constant can lose to an O(n²) one at realistic sizes. And the input size that matters is the one at production scale, not the one in your test.

## The patterns worth recognising

**Divide and conquer.** Split, solve independently, combine. Merge sort, quicksort, binary search. Also the shape of every distributed computation — [[apache-spark|Spark]] is divide and conquer with the network as the recursion.

**Greedy.** Take the locally best option and never reconsider. Fast, and correct only when the problem has the right structure. [[gradient-descent|Gradient descent]] is greedy, which is exactly why it finds a local minimum rather than a global one.

**Dynamic programming.** Overlapping subproblems solved once and cached. The hard part is always identifying the state, never writing the recurrence.

**Graph traversal.** BFS for shortest path in unweighted graphs, DFS for reachability and cycles, Dijkstra with weights, topological sort for dependencies. A surprising number of problems are graph problems in disguise — including the dependency ordering a build system does, and the prerequisite graph in this repository.

**Two pointers and sliding windows.** Turns a nested loop into a single pass over sorted or sequential data. The most common way an accidental quadratic becomes linear.

**Binary search on the answer.** When you cannot compute the answer directly but can cheaply check whether a candidate is feasible. Underused, and it turns many optimisation problems into O(log n) checks.

## Where this shows up in real work

The connection to databases is direct enough to be worth making explicit.

**Join algorithms are algorithm choices.** Nested loop is the brute-force O(n·m). Hash join builds a hash table for O(n+m) at the cost of memory. Sort-merge sorts both sides for O(n log n + m log m) and gets ordering for free. [[cost-based-optimizer|The optimizer]] picks between them using estimated cardinalities — it is doing algorithm selection with incomplete information, which is the same job you do when choosing an approach by hand.

**Sorting is everywhere and is rarely free.** `ORDER BY`, `GROUP BY`, window functions, merge joins and Spark shuffles all sort. When a query spills to disk, it is usually a sort that did not fit in memory.

**Skew breaks average-case reasoning.** A hash join assumes keys distribute evenly. When 90% of rows share one key, the hash table degenerates toward a list and your O(n+m) becomes something much worse. This is the identical failure that makes one Spark partition hot and makes an Oracle histogram necessary — a uniform assumption meeting non-uniform data, which may be the single most transferable idea in this repository.

## How to practise usefully

1. **Solve it slowly before solving it fast.** A correct brute force clarifies the problem; optimising is easier from something that works.
2. **State the complexity out loud** before writing code. Aiming for a target usually reveals the pattern.
3. **Revisit problems after a week.** Recognition is the skill, and recognition needs spaced repetition. Getting an answer right immediately after reading the solution proves nothing.
4. **Study the ones you failed**, not the ones you solved.

Pair this with [[data-structures|data structures]]: most algorithmic insight turns out to be choosing the structure that makes the operation cheap, rather than being clever with the loop.
