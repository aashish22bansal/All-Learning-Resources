---
title: Apache Hadoop
summary: The three ideas Hadoop introduced that everything after it inherited — and an honest account of which parts you still need and which are history.
aliases: ['hadoop', 'hdfs', 'yarn']
domain: hadoop
hub: true
mastery: learning
difficulty: 3
tags: ['hadoop', 'hdfs', 'yarn', 'distributed-systems', 'big-data']
estMinutes: 8
updated: 2026-09-17
sources:
  - title: 'Apache Hadoop 3.5.0 — HDFS Architecture'
    url: 'https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html'
---

Hadoop matters less as a thing you will build on and more as the thing that established the assumptions everything since has been arguing with. Learn it for the ideas; do not assume you will deploy it.

It is three separable components: **HDFS** for storage, **YARN** for resource scheduling, and **MapReduce** as a computation model. These get discussed as one product, which is the first confusion worth clearing up.

## HDFS: a filesystem that assumes disks fail

HDFS is a master/worker design. The documentation is direct about it: "An HDFS cluster consists of a single NameNode, a master server that manages the file system namespace and regulates access to files by clients." DataNodes hold the actual bytes.

Two decisions define its character.

**Very large blocks.** "A typical block size used by HDFS is 128 MB" — roughly thirty thousand times an ordinary filesystem block. This is deliberate. It keeps the NameNode's namespace metadata small enough to hold in memory, and it turns every read into a long sequential scan rather than a seek. It also makes HDFS actively bad at small files, which is the most common way people misuse it.

**Replication instead of RAID.** An application sets a replication factor, and placement is rack-aware: "one replica on the local machine... another replica on a node in a different (remote) rack, and the last on a different node in the same remote rack." Three copies surviving both a disk failure and an entire rack disappearing, on commodity hardware, with no special controller.

The single NameNode is the architecture's weak point. High-availability configurations exist precisely because losing it loses the namespace even while every byte of data is intact.

## The idea that actually propagated

> A computation requested by an application is much more efficient if it is executed near the data it operates on.

This is **data locality**, and it is Hadoop's intellectual core. In the era it was designed for, network bandwidth was the scarce resource, so it was "often better to migrate the computation closer to where the data is located rather than moving the data to where the application is running."

Every distributed processing system since has inherited that framing, [[apache-spark|Spark]] included. It is also the assumption that has weakened most: on cloud object storage with fast networks, compute and storage are separated *on purpose*, and the locality argument largely stops applying. Knowing why the assumption was made is what tells you when it no longer holds.

## MapReduce: the model, and why it lost

MapReduce expresses computation as a map over records and a reduce over grouped results, with a shuffle in between. It is genuinely elegant and was well matched to the hardware of its time.

It lost because **every stage boundary goes to disk**. A multi-stage job — which is most real work — pays a full HDFS write and read between each step, replication included. For anything iterative, such as training a model or traversing a graph, that cost dominates everything else. Spark's central contribution was keeping intermediate results in memory across stages, and that one change is most of why nobody writes MapReduce by hand any more.

## What is still worth learning

Worth your time:

- **YARN**, if you run Spark on a Hadoop cluster. It is the thing deciding whether your executors get containers, and "the job is stuck in ACCEPTED" is a YARN question, not a Spark one.
- **Columnar file formats** — Parquet and ORC, predicate pushdown, column pruning. These came out of this ecosystem and are completely current.
- **Partitioning and file sizing.** The small-file problem and data skew behave identically on Spark, on cloud object storage, and in a partitioned [[oracle-database|Oracle]] table. The lesson transfers even when the technology does not.

Safe to skip unless you actually meet it:

- Writing MapReduce jobs by hand.
- Hadoop Streaming, Pig, and most of the surrounding 2010s ecosystem.
- [[apache-sqoop|Sqoop]], which is retired outright — though you will still find it running.

## Where this sits next to a database

For a database engineer the useful bridge is that HDFS and a relational database solve *different* problems rather than competing at the same one.

HDFS gives you cheap, replicated, append-oriented bulk storage with no transactions, no indexes, and no update in place. Oracle gives you none of that cheapness and all of those guarantees. Choosing between them is choosing which guarantees you are willing to pay for.

The modern lakehouse formats — Delta, Iceberg, Hudi — exist precisely because people wanted some of the database guarantees back on top of the cheap storage, and spent a decade discovering which ones they actually missed.
