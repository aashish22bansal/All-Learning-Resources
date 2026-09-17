---
title: Python
summary: Why the language of data work is slow in one specific way, what the GIL actually prevents, and why none of it usually matters.
aliases: ['cpython']
domain: python
hub: true
mastery: learning
difficulty: 2
tags: ['python', 'concurrency', 'gil', 'performance']
estMinutes: 8
updated: 2026-09-17
sources:
  - title: 'PEP 703 — Making the Global Interpreter Lock Optional in CPython'
    url: 'https://peps.python.org/pep-0703/'
  - title: 'Python documentation — asyncio'
    url: 'https://docs.python.org/3/library/asyncio.html'
---

Python is the default language of data work, and the reasons are social as much as technical: the libraries are there, the people are there, and the feedback loop is short. The technical case against it is narrow and specific, and knowing exactly how narrow is what stops you either over-trusting or over-avoiding it.

## The GIL, precisely

The claim "Python cannot do threads" is wrong in a way that matters. The accurate statement, from PEP 703:

> CPython's global interpreter lock ("GIL") prevents multiple threads from executing Python code at the same time.

Read that carefully. It prevents multiple threads from executing **Python bytecode** simultaneously. It does not prevent threads from existing, from waiting on I/O, or from running native code that releases the lock.

So:

- **I/O-bound threading works fine.** While a thread waits on a socket or a disk, it releases the GIL and another thread runs. Concurrency for I/O is real.
- **CPU-bound threading does not scale.** Two threads doing pure-Python computation take turns on one core. The GIL "is an obstacle to using modern multi-core CPUs efficiently."
- **NumPy, pandas and friends sidestep it.** Their heavy loops are C or Fortran, executed with the lock released. A vectorised NumPy operation is genuinely using the machine.

The last point is why the GIL matters much less in data work than the internet suggests. If your hot loop is inside a library, you are not paying for it. If your hot loop is a Python `for` statement over millions of rows, you are paying twice — for the interpreter and for the GIL — and the fix is to stop writing that loop, not to add threads.

## This is actively changing

PEP 703 is **Final**, associated with Python 3.13. It adds "a build configuration (`--disable-gil`) to CPython to let it run Python code without the global interpreter lock and with the necessary changes needed to make the interpreter thread-safe."

The GIL remains the default; free-threaded builds are opt-in and carry a distinct ABI tag. The motivation is explicitly the workloads you care about — the PEP names scientific and numeric computing, AI/ML and GPU-heavy work as the cases where the GIL hurts most.

Treat this as in-progress rather than settled. The direction is clear; the ecosystem's readiness, extension compatibility and single-threaded performance cost are the parts to check against current reality rather than against this note.

## Three models of concurrency, and when each applies

| Approach | Good for | Why |
| --- | --- | --- |
| `threading` | I/O-bound | Threads release the GIL while waiting |
| `multiprocessing` | CPU-bound | Separate interpreters, separate GILs; pay serialisation to move data |
| `asyncio` | Many concurrent I/O operations | Cooperative scheduling in one thread, no thread overhead |

`asyncio` is the one most often misapplied. It is excellent for thousands of concurrent network operations and does nothing whatsoever for CPU-bound work — an `async def` that computes does not yield, and blocks everything.

## What actually makes Python code slow

In rough order of how often it is the real cause:

1. **A Python-level loop over data that a library could vectorise.** Usually an order of magnitude or more, and usually a one-line fix.
2. **Copying data unnecessarily** — pandas operations that return new frames inside a loop.
3. **Doing per-row work at all**, rather than expressing it as a column operation. This is the same lesson as [[bulk-collect|BULK COLLECT]] in PL/SQL and as [[pyspark|PySpark]] UDFs: the per-item overhead is the cost, so stop paying it per item.
4. **Interpreter overhead proper**, which is real but is rarely the thing you should attack first.

That third row is worth dwelling on, because it is the same insight in three languages. Oracle charges you a context switch per row; Spark charges you a serialisation round trip per row; Python charges you interpreter dispatch per row. In all three the answer is the same shape: express the work as a bulk operation and let the fast layer handle iteration.

## What to learn next

1. **The data model** — `__dunder__` methods, descriptors, the object protocol. This is where Python stops feeling like a scripting language.
2. **Generators and iterators**, properly. Lazy evaluation is the cheapest memory win available.
3. **Type hints and a checker.** Optional, and the single biggest improvement to code you have to come back to.
4. **Packaging and virtual environments** — unglamorous, and the most common source of "it works on my machine."
5. **Profiling before optimising.** `cProfile` first; intuition about Python performance is unreliable, including mine.
