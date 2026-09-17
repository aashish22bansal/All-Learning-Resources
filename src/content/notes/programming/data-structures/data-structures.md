---
title: Data structures
summary: Every structure makes some operations cheap by making others expensive — and knowing which is which is most of what the subject is.
aliases: ['ds']
domain: data-structures
hub: true
mastery: learning
difficulty: 2
tags: ['data-structures', 'complexity', 'fundamentals']
estMinutes: 8
updated: 2026-09-17
sources:
  - title: 'Python Wiki — TimeComplexity'
    url: 'https://wiki.python.org/moin/TimeComplexity'
---

A data structure is a decision about what you want to be fast. There is no structure that makes everything cheap; each buys speed on some operations by paying for it on others. Learning the subject is mostly learning those trades well enough to recognise which one a problem is asking for.

## The trade, stated concretely

| Structure | Fast | Slow | Buy it for |
| --- | --- | --- | --- |
| Array / dynamic list | Index access, append, iteration | Insert or delete in the middle | Contiguous data you scan |
| Linked list | Insert/delete at a known position | Random access, cache behaviour | Rarely, honestly |
| Hash table | Lookup, insert, delete by key | Any ordering; worst case degrades | Membership and mapping |
| Balanced tree | Ordered traversal, range queries | Constant factors above a hash table | When order matters |
| Heap | Smallest or largest element | Arbitrary lookup | Priority scheduling, top-k |
| Trie | Prefix queries | Memory | Autocomplete, routing tables |

Python's own documentation gives exact complexities for its built-ins, and it is worth reading once rather than guessing — `list.insert(0, x)` is O(n), and people write it inside loops constantly.

## The two things people get wrong

**Assuming hash tables are always right.** They are usually right, which is different. A hash table gives you no ordering, no range queries, and no "next largest key." If you find yourself sorting the keys after every operation, you wanted a tree.

**Ignoring constant factors and memory layout.** Asymptotically a linked list and an array have the same traversal cost. In practice the array is dramatically faster because it is contiguous and the cache prefetches it, while a linked list chases pointers around memory. On modern hardware, memory locality frequently beats a better complexity class at realistic sizes. Big-O tells you how things scale, not which is faster at n = 1000.

## Why this is a database subject

For a database engineer this material is not abstract; it is a description of what your database is doing.

**A B-tree index is a balanced tree** chosen for exactly the reason above — it keeps keys ordered, which is what makes range scans and `ORDER BY` cheap, and it is shaped with high fan-out so each node is a disk page. That is the same "respect the memory hierarchy" argument as the array-versus-linked-list one, applied a level down.

**A hash join builds a hash table**, and its performance profile is the profile in the table above: excellent for equality, useless for ranges. That is why [[oracle-database|Oracle]] will not use one for `WHERE x BETWEEN`.

**The choice between a nested loop, a hash join and a sort-merge join** is the optimizer choosing a data structure on your behalf, based on estimated sizes. Reading an execution plan is reading those decisions, and [[cost-based-optimizer|the cost-based optimizer]] note is about how it makes them.

Once you see it that way, index design stops being a set of rules to memorise and becomes the same reasoning you would apply in memory.

## What is worth actually knowing

Not implementations — you will essentially never write a hash table. What pays is:

1. **The complexity table above**, internalised well enough to feel wrong when code violates it.
2. **When a structure degrades.** Hash tables with adversarial or heavily skewed keys; unbalanced trees; dynamic arrays reallocating in a loop. Skew is the recurring villain here as it is everywhere else — the same problem that makes a Spark partition hot and an Oracle histogram necessary.
3. **What your language actually gives you.** Python's `list` is a dynamic array, not a linked list. `dict` preserves insertion order and is not sorted. `set` has no order at all despite looking like one.
4. **Amortised analysis.** Appending to a dynamic array is O(1) amortised and occasionally O(n) when it resizes — which matters when a latency budget is per-operation rather than average.

## Where to go next

Pair this with [[algorithms|algorithms]] — the two are one subject split in half, and problems are usually solved by choosing the right structure rather than by being clever with the loop. The [[java|JVM]] collections library is a good place to see the trades made explicit in an API, since it names the implementation rather than hiding it.
