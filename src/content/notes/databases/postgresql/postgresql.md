---
title: PostgreSQL
summary: What actually transfers from Oracle and what does not — centred on the one architectural difference that explains most of the rest.
aliases: ['postgres', 'pg']
domain: postgresql
hub: true
mastery: learning
difficulty: 3
tags: ['postgresql', 'architecture', 'concurrency', 'mvcc']
estMinutes: 9
updated: 2026-09-17
sources:
  - title: 'PostgreSQL 18 Documentation — 13.1. Introduction (Concurrency Control)'
    url: 'https://www.postgresql.org/docs/current/mvcc-intro.html'
  - title: 'PostgreSQL 18 Documentation — 24.1. Routine Vacuuming'
    url: 'https://www.postgresql.org/docs/current/routine-vacuuming.html'
---

Coming to PostgreSQL from Oracle, the SQL is the easy part. Joins, window functions, CTEs and transactions all behave roughly as you expect. What catches people is that one architectural decision differs, and it propagates into operations, monitoring, schema design and failure modes.

That decision is where old row versions live.

## Both databases are MVCC. They implement it oppositely

PostgreSQL states the goal in terms that would be familiar from Oracle:

> Internally, data consistency is maintained by using a multiversion model (Multiversion Concurrency Control, MVCC). This means that each SQL statement sees a snapshot of data (a *database version*) as it was some time ago, regardless of the current state of the underlying data.

And the same headline property:

> reading never blocks writing and writing never blocks reading.

So far, identical to [[oracle-database|Oracle]]. The divergence is in the mechanism.

**Oracle** writes the *old* value to a separate undo segment and updates the row in place. The table holds current data; history lives elsewhere; readers reconstruct the past by applying undo backwards.

**PostgreSQL** does not update in place at all. An `UPDATE` writes a **new row version** into the table and leaves the old one there, marked with the transaction IDs that bound its visibility. The table holds every version until something cleans up.

> In PostgreSQL, an `UPDATE` or `DELETE` of a row does not immediately remove the old version of the row. This approach is necessary to gain the benefits of multiversion concurrency control (MVCC): the row version must not be deleted while it is still potentially visible to other transactions.

Neither is better in the abstract. They trade different costs, and the trades are what you have to internalise.

## What follows from that, in order

**There is no `ORA-01555`.** A long-running query cannot run out of undo, because the versions it needs are still sitting in the table. Reporting queries that would be a constant hazard on Oracle simply are not one here.

**Instead, you get bloat.** Dead versions occupy space that must be reclaimed, or the table grows without bound. The documentation lists reclaiming that space as the first of four reasons `VACUUM` exists. A table receiving heavy updates can become many times larger than its live data, and — worse than the disk cost — every sequential scan reads the dead rows too.

**`VACUUM` is not maintenance you can defer.** It reclaims space, updates planner statistics, updates the visibility map that makes index-only scans possible, and protects against transaction ID wraparound. **Autovacuum** handles this by default and is "optional but highly recommended"; tuning it is a real part of running PostgreSQL, in a way that has no Oracle equivalent.

**Transaction ID wraparound is a genuine failure mode.** Transaction IDs are 32 bits, so a long-lived cluster can exhaust them:

> the XID counter wraps around to zero, and all of a sudden transactions that were in the past appear to be in the future — which means their output become invisible. In short, catastrophic data loss.

The requirement is to vacuum every table in every database at least once every two billion transactions. Modern versions defend against this aggressively, but "my autovacuum has been blocked for weeks by an idle transaction" is a real incident shape, and it has no counterpart in Oracle.

**A long idle transaction is dangerous in a way it is not on Oracle.** It holds back the oldest visible XID, which prevents vacuum from cleaning *anything* newer, across the whole database. On Oracle a forgotten open transaction holds locks; on PostgreSQL it quietly stops garbage collection.

## Things that do not map across

- **No `DUAL`.** `SELECT 1;` is legal without a `FROM`.
- **Sequences and identity behave differently**, and `currval` is session-scoped.
- **`NULL` and the empty string are distinct.** Oracle treats `''` as `NULL`; PostgreSQL does not. This is the single most likely source of a silent behaviour change in migrated code.
- **PL/pgSQL is not PL/SQL.** The syntax rhymes, but packages do not exist, and the transaction model inside functions differs.
- **No shared pool of the Oracle kind**, so the parse-avoidance argument in [[bind-variables|bind variables]] does not transfer directly — though prepared statements still matter, and the injection argument transfers exactly.

## Extensions are the real cultural difference

PostgreSQL ships a small core and expects capability to arrive as extensions — PostGIS for spatial, `pg_stat_statements` for query telemetry, `pgvector` for embeddings. An Oracle engineer's instinct is to look for a built-in feature and conclude it is missing. Usually it is an extension away, and usually the extension is the mainstream answer rather than a workaround.

## What to learn next

1. **The visibility map and index-only scans** — why `VACUUM` affects read performance, not just disk.
2. **`EXPLAIN (ANALYZE, BUFFERS)`** — the planner is cost-based like Oracle's, but the output and the tuning knobs are unfamiliar.
3. **WAL, checkpoints, replication** — the redo-equivalent, and the basis of both backup and standby.
4. **Isolation levels in practice** — PostgreSQL's serializable is genuine SSI, which behaves differently from anything Oracle offers.
