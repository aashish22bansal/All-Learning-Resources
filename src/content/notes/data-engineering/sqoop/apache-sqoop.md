---
title: Apache Sqoop
summary: Retired in 2021 and moved to the Attic. What it did, why it went away, and what to reach for instead — written because you will still meet it.
aliases: ['sqoop']
domain: sqoop
hub: true
mastery: learning
difficulty: 2
tags: ['sqoop', 'hadoop', 'ingestion', 'legacy', 'retired']
estMinutes: 6
updated: 2026-09-17
sources:
  - title: 'The Apache Attic — Sqoop'
    url: 'https://attic.apache.org/projects/sqoop.html'
---

Start with the fact that changes how you should read everything else: **Sqoop is retired.** The committers voted to retire it for inactivity, it left the Apache Software Foundation's active projects in June 2021, and the move to the **Attic** completed in July 2021. Its website, mailing lists, git repository, downloads and bug tracker remain available read-only at unchanged URLs, with no further development.

That does not make it irrelevant. Cloudera still ships and supports Sqoop in Cloudera Runtime, and a great deal of working infrastructure was built on it. You are far more likely to *inherit* Sqoop than to choose it, and this note is written for that case.

## What it did

Sqoop moved bulk data between relational databases and Hadoop — the name contracts SQL-to-Hadoop. Its stated mission was the creation and maintenance of software related to bulk data transfer between Hadoop and structured datastores.

The mechanism is the part worth knowing, because it explains both why it was fast and how it hurt people. A Sqoop import does not stream rows through one process. It:

1. Reads the source table's metadata to pick a **split column**, usually the primary key.
2. Finds that column's minimum and maximum values.
3. Divides the range into contiguous slices, one per mapper.
4. Launches a MapReduce job in which each mapper opens **its own JDBC connection** and issues a `SELECT` bounded by its slice.
5. Writes the results straight into [[apache-hadoop|HDFS]].

So an eight-mapper import is eight concurrent range-scanned queries against your database, not one stream.

## Why that mattered to the source, not to Hadoop

This is the part worth carrying forward, because it is not really about Sqoop at all.

Sqoop applies its parallelism to the **source system**. Eight mappers means eight simultaneous sessions running large range scans against a production database, competing for I/O and buffer cache with everything else already running there — and arriving without warning, because the configuration lives in someone else's job.

From the [[oracle-database|Oracle]] side that is a sustained multi-session read load, and a long-running import is exactly the profile that provokes `ORA-01555`: a query that outlives the undo it depends on.

The recurring incident was never Sqoop breaking. It was Sqoop working precisely as configured and flattening the source. Every modern replacement has the same property, because the binding constraint is the database's capacity, not the tool.

The split column matters for the same reason. Split on a skewed or unindexed column and one mapper inherits most of the rows while the others finish immediately — the same skew problem that appears everywhere in distributed processing, and the same one that makes a histogram matter to Oracle's optimizer.

## Why it was retired

No dramatic cause, just erosion on three fronts:

- **The ecosystem moved underneath it.** Sqoop is MapReduce-based, and MapReduce stopped being how people compute. [[apache-spark|Spark]] reads JDBC with the same range-partitioned parallelism natively, inside the job that then does the actual work — no separate tool, no intermediate landing zone.
- **Batch snapshots stopped being the requirement.** Sqoop is a bulk copy. What people increasingly wanted was **change data capture** — a stream of what changed, usually into [[apache-kafka|Kafka]] — rather than re-reading entire tables every night.
- **Managed services absorbed the job**, making a self-managed transfer tool hard to justify.

The committers' own stated reason was simply inactivity. Not enough people were working on it to keep a project alive.

## What to reach for instead

- **Spark's JDBC source**, with `partitionColumn`, `lowerBound`, `upperBound` and `numPartitions`. The closest structural equivalent, and it puts ingestion in the same job as the processing.
- **Debezium into Kafka**, when you want change data capture rather than periodic snapshots.
- **The database's own bulk unload**, when the target really is a file. Often both the fastest and the gentlest option, and the one people forget exists.

## Why this deserves a note at all

Two reasons, neither nostalgic.

First, if you inherit it you need to know it will not be patched — that is a security and planning fact, not a preference.

Second, the mechanism is the durable part. Parallel range-partitioned reads against a live transactional source is a pattern you will implement again under a different name, and the failure modes will be identical.
