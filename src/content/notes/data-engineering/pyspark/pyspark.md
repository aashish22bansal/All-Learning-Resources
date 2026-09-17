---
title: PySpark
summary: Spark from Python, and the one boundary that decides whether your job runs at Scala speed or many times slower than it.
aliases: ['py spark']
domain: pyspark
hub: true
mastery: learning
difficulty: 3
tags: ['pyspark', 'spark', 'python', 'performance']
estMinutes: 8
updated: 2026-09-17
sources:
  - title: 'Apache Spark 4.2.0 — PySpark Overview'
    url: 'https://spark.apache.org/docs/latest/api/python/index.html'
  - title: 'Apache Spark 4.2.0 — Cluster Mode Overview'
    url: 'https://spark.apache.org/docs/latest/cluster-overview.html'
---

PySpark is "the Python API for Apache Spark," enabling "real-time, large-scale data processing in a distributed environment using Python." It supports the whole surface — "Spark SQL, DataFrames, Structured Streaming, Machine Learning (MLlib), Pipelines and Spark Core."

That framing is accurate and slightly misleading, because it makes PySpark sound like a thin translation layer. The thing actually worth understanding is that **Spark runs on the JVM and your Python code does not**, and where that boundary falls decides your job's performance.

## The boundary, and the rule that follows from it

Everything in [[apache-spark|Spark]] — the planner, the executors, the shuffle — is JVM code. When you write PySpark, you are usually *describing* work in Python that the JVM then performs. The description crosses the boundary once, at planning time. The data never does.

That holds as long as you stay inside Spark's own expressions: `df.filter(col("x") > 5)`, `df.groupBy("k").agg(sum("v"))`, `df.join(other, "id")`. These compile to the same plan they would in [[scala]], and run at the same speed. There is no Python in the hot loop at all.

It stops holding the moment you hand Spark a Python function it cannot see into — a plain Python UDF. Then, for every row, data must leave the JVM, be serialised into a Python worker process, be operated on, and come back. You have replaced a JVM-native column operation with a per-row round trip across a process boundary, and you have also made the expression opaque to the Catalyst optimizer, which can no longer push it down or reorder around it.

**So the rule is: express it with built-in functions if it can possibly be expressed that way.** Reach for a UDF only when the logic genuinely has no Spark-native equivalent, and expect to pay for it when you do.

*What I have not verified:* the exact serialisation path and the size of the penalty in current versions. Arrow-based transfer and vectorised (pandas) UDFs exist specifically to reduce this cost by moving batches rather than rows, and my understanding is that they substantially narrow the gap without closing it. I have not measured this myself or found it stated in the pages cited above, so treat the magnitude as unconfirmed — the *direction* is not in doubt, but do not quote me a multiple.

## Why use PySpark at all, then

Because the boundary rarely binds in practice, and everything else favours Python:

- The data science ecosystem is Python. If the output of a pipeline feeds [[machine-learning|model training]], the language boundary has to be crossed somewhere, and crossing it once at the edge is better than twice.
- The **pandas API on Spark** lets you "scale your pandas workload to any size by running it distributed across multiple nodes," keeping "a single codebase that works both with pandas (tests, smaller datasets) and with Spark (production, distributed datasets)." Turning a working pandas script into a distributed job without a rewrite is a genuinely large win.
- Iteration speed. For exploratory work the difference between a REPL and a compile-submit cycle dominates any runtime difference.

The honest split: **Python for pipelines that feed analytics and models; [[scala]] when you are writing library-grade code, custom sources, or anything where you need to see into the JVM.**

## Spark Connect changes the deployment story

> Spark Connect is a client-server architecture within Apache Spark that enables remote connectivity to Spark clusters from any application. PySpark provides the client for the Spark Connect server, allowing Spark to be used as a service.

This matters more than it sounds. Historically a PySpark client was tightly coupled to the cluster — same Spark version, JVM on the client, driver in an awkward place. Spark Connect makes the client a thin thing talking to a server, so a notebook or an application can hold a session without embedding a driver.

It also clarifies the driver problem from the [[apache-spark|cluster overview]]: the driver "must be network addressable from the worker nodes," which is exactly the constraint that makes running a driver on a laptop against a remote cluster painful. Connect moves that problem server-side.

## The mistakes worth naming

- **`collect()` on anything large.** Results come back to the driver, which is one process with one heap. `show()`, `take()` or writing to storage are almost always what you meant.
- **Python UDFs used out of habit** where a built-in exists. `when`/`otherwise`, `regexp_extract` and the date functions cover more than people expect.
- **Assuming a pandas idiom is cheap.** `toPandas()` collects the entire dataset to the driver. The pandas API on Spark is the distributed thing; `toPandas()` is not.
- **Testing on data small enough to hide skew.** A job that is fine on a sample and terrible in production is usually a partitioning problem the sample could not show.
