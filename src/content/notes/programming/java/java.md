---
title: Java
summary: The JVM is the reason Java matters to a data engineer — and virtual threads are the biggest change to it in a decade.
aliases: ['jvm']
domain: java
hub: true
mastery: learning
difficulty: 2
tags: ['java', 'jvm', 'concurrency', 'performance']
estMinutes: 8
updated: 2026-09-17
sources:
  - title: 'JEP 444: Virtual Threads (JDK 21)'
    url: 'https://openjdk.org/jeps/444'
---

For data work, Java is less interesting as a language than as a **runtime**. [[apache-hadoop|Hadoop]], [[apache-kafka|Kafka]], [[apache-spark|Spark]], Flink, Elasticsearch and Cassandra all run on the JVM. When one of them misbehaves in production, the diagnosis is a JVM diagnosis — heap, garbage collection, thread dumps — regardless of what language you wrote your job in.

That is the case for knowing it even if you never choose to write it.

## What the JVM gives you, and charges for

**Given:** portability across platforms, a mature garbage collector, and a just-in-time compiler that profiles running code and emits machine code specialised to the paths actually taken. That last point is why long-running JVM services reach performance close to native code — and why a benchmark that runs for two seconds measures the interpreter rather than the optimised result.

**Charged:** startup time, memory overhead per object, and garbage collection pauses. The first makes the JVM a poor fit for short-lived processes. The last is the one that ruins latency-sensitive systems, and is why GC tuning is a real discipline.

Practically, for someone operating Spark or Kafka: heap sizing and GC behaviour are the knobs you will actually turn. An executor dying with `OutOfMemoryError` and an executor lost to a long GC pause look similar from the outside and have different fixes.

## Virtual threads are the big recent change

Java's concurrency story was, for twenty years, that threads are expensive. JEP 444, delivered in **JDK 21**, changes that premise.

> A virtual thread is an instance of `java.lang.Thread` that is not tied to a particular OS thread.

Platform threads remain "a thin wrapper around an OS thread." Virtual threads are scheduled many-to-few onto them by the JVM, so blocking a virtual thread parks it rather than occupying an OS thread.

The problem this solves is stated plainly in the JEP: thread-per-request servers are capped because OS threads are scarce, and "the JDK's current implementation of threads caps the application's throughput to a level well below what the hardware can support."

The interesting part is what it means for how you write code. The industry's answer to that cap was asynchronous and reactive programming — callbacks, futures, reactive streams — which scales well and is genuinely hard to read, debug and stack-trace. Virtual threads make the simple blocking style scale instead:

> Virtual threads preserve the reliable thread-per-request style that is harmonious with the design of the Java Platform while utilizing the available hardware optimally.

That is a rare kind of improvement: the easy-to-read version becomes the fast version. If your mental model of Java concurrency predates JDK 21, it is out of date in a way worth correcting.

## For a database engineer, specifically

Two things transfer directly.

**JDBC is Java.** Every JVM-based tool that reads [[oracle-database|Oracle]] — Spark's JDBC source, [[apache-sqoop|Sqoop]], any ingestion framework — goes through a JDBC driver, and its behaviour is where fetch size, batch size and statement caching live. The [[bind-variables|bind variables]] argument is the same argument here: a `PreparedStatement` with parameters is both faster and the injection-safe form, for identical reasons.

**Connection pooling matters more than it looks.** A pool that opens more connections than the database can serve does not make anything faster; it moves the queue. This is the same reasoning as choosing a Sqoop mapper count, and the same reasoning as choosing Spark's `numPartitions` against a JDBC source.

## What to learn next

1. **Reading a thread dump and a heap histogram.** The two diagnostic skills with the highest payoff, and both are usable without writing Java.
2. **GC fundamentals** — generational collection, and what G1 or ZGC are trading. Enough to read a GC log.
3. **Collections and their complexity** — the practical face of [[data-structures|data structures]], and where most accidental quadratic behaviour hides.
4. **The memory model**, if you write concurrent code. `volatile`, happens-before, and why a data race is not merely a bug but undefined behaviour.
5. **[[scala|Scala]]**, if you work on Spark internals — it runs on the same JVM and interoperates directly.
