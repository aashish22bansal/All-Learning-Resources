---
title: Apache Spark
summary: Driver, executors and the shuffle — the three things that explain nearly every Spark performance problem you will have.
aliases: ['spark']
domain: spark
hub: true
mastery: learning
difficulty: 3
tags: ['spark', 'distributed-systems', 'big-data', 'jvm']
estMinutes: 9
updated: 2026-09-17
sources:
  - title: 'Apache Spark 4.2.0 — Cluster Mode Overview'
    url: 'https://spark.apache.org/docs/latest/cluster-overview.html'
---

Spark is the default answer to "this computation does not fit on one machine." Understanding three things — how a job is distributed, when data has to move, and what the optimizer does with your code — covers most of what goes wrong.

## The shape of a running application

> Spark applications run as independent sets of processes on a cluster, coordinated by the `SparkContext` object in your main program (called the *driver program*).

The **driver** holds your program's control flow and decides what work exists. A **cluster manager** — Spark's own standalone manager, YARN or Kubernetes — allocates resources. **Executors** are the processes that actually compute: Spark "acquires executors on nodes in the cluster, which are processes that run computations and store data for your application."

Two consequences worth internalising early.

**The driver is a real participant, not a launcher.** It "must listen for and accept incoming connections from its executors throughout its lifetime" and must be network addressable from the workers. It also collects results, which is why `collect()` on a large dataset kills the driver rather than an executor.

**Applications cannot share data directly.** Each application gets its own executors, which "stay up for the duration of the whole application," isolating applications on both scheduling and execution. The documentation states the cost plainly: "data cannot be shared across different Spark applications (instances of SparkContext) without writing it to an external storage system." Two jobs that both need the same expensive intermediate result must materialise it somewhere.

Spark is deliberately "agnostic to the underlying cluster manager," which is why the same application runs on YARN in an on-premises [[apache-hadoop|Hadoop]] cluster and on Kubernetes in the cloud with no code change.

## The shuffle is where the time goes

Spark splits a job into **stages** at points where data must be redistributed across the cluster. That redistribution is the **shuffle**, and it is the single most expensive thing Spark does: it writes intermediate files to local disk, then reads them across the network.

Operations that shuffle — `groupBy`, `join`, `distinct`, `repartition`, most window functions — are the ones to look at first when a job is slow. Operations that do not — `filter`, `select`, `map`, `union` — are comparatively free.

Two failure modes account for most bad shuffles:

**Skew.** Partitioning by a key whose values are wildly uneven gives one task most of the rows. The job is then as slow as that one task, and no amount of extra executors helps, because they are idle. This is the same problem as an Oracle histogram on a skewed column: a uniform assumption meeting non-uniform data.

**Too many or too few partitions.** Too few and you cannot use the cluster. Too many and per-task overhead dominates — thousands of tasks each processing a handful of rows, and the scheduler becomes the bottleneck.

## Lazy evaluation and the optimizer

Spark transformations build a plan; nothing runs until an **action** asks for a result. This is not a quirk — it is what allows the Catalyst optimizer to rearrange your whole pipeline before executing any of it, pushing filters down, pruning columns, and collapsing operations.

The practical consequence is one the [[cost-based-optimizer|cost-based optimizer]] note makes at length in a different setting: **you are writing a declaration of intent, not an execution strategy.** Spark's planner, like Oracle's, chooses a plan from estimates and can choose badly when its estimates are wrong. `explain()` is the equivalent of an execution plan, and reading it is the same skill.

The corollary is that a DataFrame expression will nearly always beat a hand-written function doing the same thing, because the optimizer can see inside the expression and cannot see inside your function. That gap is widest in [[pyspark|PySpark]], where a Python function is opaque to the JVM entirely.

## Where Spark is the wrong answer

Worth saying, because Spark gets reached for reflexively:

- **Data that fits in memory on one machine.** Below a few tens of gigabytes, a single-process tool is usually faster end to end than a cluster, and vastly simpler to operate. Spark's startup cost alone is measured in seconds.
- **Low-latency point lookups.** Spark has no indexes in the database sense. Fetching one row by key is a full scan unless the file format saves you.
- **Transactional updates.** Spark is not a database. Update-in-place is the thing [[oracle-database|Oracle]] exists for, and the lakehouse formats exist because people wanted some of that back.

## What to learn next

1. **Reading `explain()`** — physical plans, and where exchanges appear.
2. **Adaptive Query Execution** — Spark re-planning mid-job using real statistics, which addresses exactly the estimate problem above.
3. **Broadcast joins** — the single highest-leverage manual optimisation, and the one most often left on the table.
4. **Partitioning and file layout on the read side** — most Spark tuning is really storage-layout tuning.
5. Whether to write it in [[pyspark|Python]] or [[scala]], which is a real decision with real costs.
