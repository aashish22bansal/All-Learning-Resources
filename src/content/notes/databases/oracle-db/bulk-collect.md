---
title: BULK COLLECT and the context switch
summary: Why row-by-row PL/SQL is slow, what a context switch actually costs, and why BULK COLLECT without LIMIT trades one problem for a worse one.
aliases: ['bulk collect', 'bulk binding']
domain: oracle-db
mastery: solid
difficulty: 3
tags: ['plsql', 'performance', 'oracle']
estMinutes: 6
updated: 2026-09-17
sources:
  - title: 'Oracle Database 19c PL/SQL Language Reference — PL/SQL Optimization and Tuning'
    url: 'https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/plsql-optimization-and-tuning.html'
---

A PL/SQL block runs in the PL/SQL engine. A SQL statement runs in the SQL engine. They are separate, and every time control passes between them there is a **context switch** — the runtime has to hand over, transfer the bind data, and hand back.

One context switch is cheap. A cursor loop that fetches ten thousand rows one at a time performs ten thousand of them, and that is where the time goes. The work is not in the SQL and not in the PL/SQL; it is in the traffic between them.

Oracle's documentation is explicit about what the feature is for:

> Bulk SQL minimizes the performance overhead of the communication between PL/SQL and SQL. The PL/SQL features that comprise bulk SQL are the FORALL statement and the BULK COLLECT clause.

## The naive loop

```sql
DECLARE
  CURSOR c_orders IS
    SELECT order_id, customer_id, order_total
      FROM orders
     WHERE order_status = 'PENDING';
BEGIN
  FOR r IN c_orders LOOP
    process_order(r.order_id, r.customer_id, r.order_total);
  END LOOP;
END;
```

This is readable and it is what most people write first. It is also one context switch per row.

## BULK COLLECT, and the trap in it

`BULK COLLECT` fetches many rows into a collection in a single switch:

```sql
DECLARE
  TYPE t_orders IS TABLE OF orders%ROWTYPE;
  l_orders t_orders;
BEGIN
  SELECT * BULK COLLECT INTO l_orders
    FROM orders
   WHERE order_status = 'PENDING';
END;
```

One switch instead of ten thousand. It is also a loaded gun: `l_orders` is a PL/SQL collection, which lives in the session's **PGA**. An unbounded `BULK COLLECT` on a table with fifty million pending rows will try to materialize all fifty million in session memory.

The failure mode is not a slow query. It is `ORA-04030` — out of process memory — and on a busy server it takes more than your session down with it. You have replaced a slow program with an unpredictable one, which is worse.

## LIMIT is not optional

The correct form bounds the fetch and loops:

```sql
DECLARE
  TYPE t_orders IS TABLE OF orders%ROWTYPE;
  l_orders   t_orders;
  c_limit    CONSTANT PLS_INTEGER := 500;

  CURSOR c_pending IS
    SELECT * FROM orders WHERE order_status = 'PENDING';
BEGIN
  OPEN c_pending;
  LOOP
    FETCH c_pending BULK COLLECT INTO l_orders LIMIT c_limit;
    EXIT WHEN l_orders.COUNT = 0;

    FOR i IN 1 .. l_orders.COUNT LOOP
      process_order(l_orders(i).order_id,
                    l_orders(i).customer_id,
                    l_orders(i).order_total);
    END LOOP;
  END LOOP;
  CLOSE c_pending;
END;
```

Two details that are easy to get wrong:

- **Exit on `COUNT = 0`, not on `%NOTFOUND`.** A `BULK COLLECT` fetch that returns a partial batch sets `%NOTFOUND` to true while still having returned rows. Exiting on `%NOTFOUND` silently drops the final partial batch — a bug that only shows up when the row count is not a multiple of the limit.
- **The collection is emptied and refilled each fetch**, so you do not need to reset it, and you must not accumulate into it.

## Choosing the limit

There is no universal right answer, but the shape of the trade-off is fixed: larger batches mean fewer context switches and more PGA per session. The gain is steeply diminishing — going from 1 to 100 removes 99% of the switches; going from 100 to 1000 removes 0.9% more, for ten times the memory.

Somewhere in the low hundreds is the usual sweet spot, and it should be a named constant rather than a literal, so it can be tuned without hunting through the code.

This is the same trade-off as choosing a mini-batch size in [[stochastic-gradient-descent|stochastic gradient descent]]: batch enough to amortize a fixed per-step cost, not so much that memory becomes the binding constraint.

## The other half

`BULK COLLECT` fixes reads. `FORALL` fixes writes, binding an entire collection into a single DML statement rather than one per row. They are usually used together, and `FORALL` has its own sharp edge in how it handles partial failure — that is a separate note.
