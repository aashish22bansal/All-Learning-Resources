---
title: Oracle Database
summary: An orienting map of the Oracle domain — the instance/database split, how read consistency is actually achieved, and which concepts everything else hangs off.
aliases: ['oracle', 'oracle db']
domain: oracle-db
hub: true
mastery: learning
difficulty: 3
tags: ['oracle', 'architecture', 'concurrency', 'plsql']
estMinutes: 9
updated: 2026-09-17
sources:
  - title: 'Oracle Database 19c Concepts — Data Concurrency and Consistency'
    url: 'https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/data-concurrency-and-consistency.html'
  - title: 'Oracle Database 19c — Introduction to the Multitenant Architecture'
    url: 'https://docs.oracle.com/en/database/oracle/oracle-database/19/multi/introduction-to-the-multitenant-architecture.html'
  - title: 'Oracle Database 19c PL/SQL Language Reference — PL/SQL Optimization and Tuning'
    url: 'https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/plsql-optimization-and-tuning.html'
---

This is the entry point for the Oracle notes. It is not an introduction to databases — it is a map of which concepts the rest of this domain hangs off, and which of them are worth understanding at mechanism level rather than at interface level.

## Instance and database are different things

The word "database" in ordinary speech collapses two things Oracle keeps apart, and almost every confusing error message lives in the gap.

The **database** is the files on disk — data files, control files, redo logs. The **instance** is the memory structures and background processes that operate on them: the SGA, and processes like DBWn, LGWR, SMON and PMON. An instance mounts a database. One database can be mounted by several instances, which is what RAC is.

This matters practically because it tells you where to look. A problem with a datafile is a database problem and survives a restart. A problem with a latch, a cursor or the buffer cache is an instance problem and usually does not.

## Read consistency is the load-bearing idea

If you understand one mechanism deeply, make it this one, because it explains a whole family of otherwise unrelated behaviour.

Oracle gives every query a **read-consistent** view: the data it returns is committed and consistent as of a single point in time, and readers never block writers. The documentation states both properties directly — queries are "read-consistent" and "nonblocking."

The mechanism is **undo**:

> Whenever a user modifies data, Oracle Database creates undo entries, which it writes to undo segments. The undo segments contain the old values of data that have been changed by uncommitted or recently committed transactions.

So when a query starts, Oracle records the current **SCN** (system change number). As it reads blocks, any block changed after that SCN is not what the query is entitled to see. Rather than blocking, Oracle copies the block and applies undo to walk it *backwards* to the query's start point. The result is a **consistent read clone**:

> The database copies current data blocks to a new buffer and applies undo data to reconstruct previous versions of the blocks. These reconstructed data blocks are called consistent read (CR) clones.

Three things fall out of this immediately.

**`ORA-01555`, snapshot too old, stops being mysterious.** A long-running query needs undo that a later transaction has already overwritten. It is not a corruption and not a bug in your query — it is a query that outlived the undo it depends on. The documentation is explicit that undo retention is the lever.

**Long queries cost writers nothing, but cost themselves.** The CR reconstruction work is done by the reader, per block, every time. A report scanning a hot table does an enormous amount of undo application that never shows up as a lock.

**Commits are cheap and rollbacks are expensive.** A commit writes a marker; the old versions are already elsewhere. A rollback has to apply all that undo. This is the opposite of the intuition most people arrive with.

Compare this with how [[postgresql|PostgreSQL]] solves the same problem — it keeps old row versions in the table itself rather than in a separate undo area, and the consequences of that one difference run through the whole system.

## The optimizer decides everything and tells you almost nothing

Oracle is not a database where you write the execution strategy. You write a declarative statement and the **cost-based optimizer** chooses a plan from a space too large to enumerate, using estimates derived from statistics.

Nearly all serious Oracle performance work is therefore not "make the query faster" but "fix what the optimizer believes about the data." That framing, and where it breaks, is in [[cost-based-optimizer|the cost-based optimizer as an optimization problem]].

## PL/SQL runs in a different engine

PL/SQL and SQL are separate engines, and control passing between them is a **context switch**. Oracle's own tuning documentation frames bulk SQL entirely in these terms: it exists to minimise "the performance overhead of the communication between PL/SQL and SQL."

Two habits follow, and they are the highest-value things in the whole PL/SQL syllabus:

- Stop paying the switch once per row — [[bulk-collect|BULK COLLECT and the context switch]].
- Stop paying for a hard parse once per value — [[bind-variables|bind variables]], which is also the only real defence against SQL injection.

## Multitenant is the current architecture, not an option to evaluate

Since 12c, an Oracle database is a **container database** (CDB) holding pluggable databases (PDBs). A CDB has one root, one seed PDB, and zero or more user PDBs; a PDB is "a portable collection of schemas, schema objects, and nonschema objects that appears to an Oracle Net client as a non-CDB."

The non-CDB architecture is deprecated, so this is not a choice you get to defer. The practical consequence is that a connection now targets a *service* resolving to a PDB, and that a surprising number of operations — parameters, users, tablespaces — have to be reasoned about as "is this at the root or in the PDB?"

## Where to go from here

The Oracle material worth writing next, roughly in order of how much it changes your decisions:

1. **Redo and undo as a pair** — redo replays forward, undo rolls backward. Most recovery and concurrency behaviour is one or the other.
2. **Statistics and histograms** — the input the optimizer is only as good as.
3. **Partitioning** — the one physical design decision that changes plans rather than just storage.
4. **`FORALL` and partial failure** — the write-side companion to `BULK COLLECT`, with a sharper edge.

## What is deliberately not here

Installation, patching and licensing. They matter at work and they are not knowledge that compounds — they change with every release and the documentation is authoritative in a way a note never will be.
