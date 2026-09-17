---
title: Scala
summary: The language Spark is written in, why its collection API makes distributed computing feel natural, and whether you should actually write it.
aliases: []
domain: scala
hub: true
mastery: learning
difficulty: 3
tags: ['scala', 'jvm', 'functional-programming', 'spark']
estMinutes: 7
updated: 2026-09-17
sources:
  - title: 'Tour of Scala — scala-lang.org'
    url: 'https://docs.scala-lang.org/tour/tour-of-scala.html'
  - title: 'Scala 3 Book — Introduction'
    url: 'https://docs.scala-lang.org/scala3/book/introduction.html'
---

Scala is a statically typed language on the [[java|JVM]] that combines object-oriented and functional programming. For most data engineers the practical reason to care is narrower: **[[apache-spark|Spark]] is written in it**, so Scala is the language of Spark's own source, its most complete API, and any serious extension of it.

## Why Spark chose it, and why that shows

Spark's API is not an accident of taste. Scala's collections library is built around immutable structures and higher-order transformations — `map`, `filter`, `flatMap`, `reduce`, `groupBy` — composed into chains.

Those operations happen to be exactly the operations that parallelise. A transformation with no shared mutable state and no dependence on ordering can be run on partitions independently and combined. So Spark's distributed API could be made to look almost identical to Scala's local collection API, and a developer's existing intuition transferred straight to a cluster.

That is why Spark code reads the way it does, and why the same shape of code appears in [[pyspark|PySpark]] even though Python's own idioms are different. The lineage is visible.

## The type system is the other half

Scala's types are considerably more expressive than Java's, and in a data context the payoff is concrete: a Spark `Dataset[Person]` is checked at compile time, so a misspelled field or a wrong type is caught before the job is submitted rather than forty minutes into a run.

`DataFrame` operations, by contrast, are checked at runtime against the schema — which is what you get in PySpark, always. When a job takes an hour and fails at the end on a column name, that difference stops being academic.

Against that: Scala's type system is genuinely complex, its compiler is slow, and the language historically permitted several incompatible dialects of itself. Scala 3 deliberately simplified the surface, and the language's own documentation frames it as combining object-oriented and functional programming in a concise, high-level form — but the learning curve remains the honest objection.

## Should you write it

A defensible split:

**Use Scala when** you are writing Spark library code, custom data sources or sinks, performance-critical jobs where the JVM boundary matters, or anything that will be maintained by a team for years and benefits from compile-time guarantees.

**Use [[python|Python]] when** the pipeline feeds analytics or [[machine-learning|model training]], when iteration speed dominates, or when the people maintaining it are analysts and scientists rather than engineers. Which is most of the time.

The thing not to do is choose Scala for a job that is really "read some tables, transform, write" and then maintain a JVM build toolchain for it. And the thing not to *assume* is that Scala is faster: for work expressed entirely in Spark's built-in operations, both languages produce the same plan and run at the same speed, because the work happens in the JVM either way. Scala's advantage appears specifically when you need to drop below that level — custom logic that would otherwise be a Python UDF.

## Concepts worth taking even if you never write it

These make Spark, and a lot of modern Python, easier to read:

- **Immutability by default.** `val` versus `var`, and why a value you cannot change is easier to reason about across threads and machines.
- **Higher-order functions.** Functions as arguments is the whole basis of the transformation API.
- **Pattern matching.** Structural destructuring with exhaustiveness checking — far stronger than a `switch`.
- **`Option` instead of `null`.** Absence as part of the type, so the compiler forces you to handle it. Python's `Optional` type hints are the same idea, unenforced.
- **Lazy evaluation.** Scala's `lazy val` is the local version of the thing Spark does across a whole job graph.

## What to learn next

1. **The collections API in depth** — it *is* the Spark API, locally.
2. **`sbt` and the build model**, if you intend to ship anything.
3. **Implicits, or Scala 3's `given`/`using`** — pervasive in Spark's source, and impenetrable until they click.
4. **`Dataset` versus `DataFrame`** — the practical face of the typing argument above.
