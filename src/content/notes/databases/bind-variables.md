---
title: Bind variables
summary: The one habit that fixes parsing overhead and SQL injection at the same time — and why string concatenation is never the faster option.
aliases: ['binds', 'bind variable']
domain: databases
mastery: solid
difficulty: 2
tags: ['plsql', 'performance', 'security', 'oracle']
estMinutes: 6
updated: 2026-09-17
sources:
  - title: 'Oracle Database 19c SQL Tuning Guide — Improving Real-World Performance Through Cursor Sharing'
    url: 'https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/improving-rwp-cursor-sharing.html'
  - title: 'Oracle Database 19c Development Guide — SQL Processing for Application Developers'
    url: 'https://docs.oracle.com/en/database/oracle/oracle-database/19/adfns/sql-processing-for-application-developers.html'
---

A bind variable is a placeholder in a SQL statement whose value is supplied separately at execution time, rather than pasted into the statement text.

```sql
-- Bound
SELECT SUM(salary) FROM hr.employees WHERE employee_id < :emp_id;

-- Concatenated
SELECT SUM(salary) FROM hr.employees WHERE employee_id < 137;
```

These look equivalent. They are not, and the difference shows up in two places that appear unrelated but have the same root cause.

## What the database does with a statement it has not seen

Before Oracle runs a statement it must parse it: check syntax, check semantics, check access rights, and build an execution plan. That is a **hard parse**, and Oracle's own documentation is blunt about the cost:

> For all of the preceding reasons, the CPU and memory overhead of hard parses can create serious performance problems.

To avoid repeating that work, Oracle caches the result in a **shared SQL area**, keyed on the statement text. A second session running a textually identical statement reuses the cached plan — a soft parse, far cheaper.

The key word is *textually*. With concatenated literals, `employee_id < 137` and `employee_id < 138` are two different statements. Every distinct value produces a hard parse, a new child cursor, and a new entry in the shared pool.

With a bind variable there is one statement text and one plan, regardless of how many values pass through it. The documentation calls this **cursor sharing**: "Multiple private SQL areas in the same or different sessions can reference a single shared SQL area."

## What actually goes wrong at scale

The wasted CPU is the visible symptom. The real damage is contention.

The shared pool is a shared resource protected by latches. An application hard-parsing thousands of statements per second has every session competing for the same latches, and the result is a system that gets *slower* as you add concurrency — the opposite of what throwing hardware at it is supposed to achieve. Meanwhile the pool fills with single-use cursors that evict plans other sessions still need.

Oracle's Real-World Performance group states the recommendation without hedging: reduce hard parsing as much as possible.

## The security half

The same change closes SQL injection. When values are concatenated into statement text, a value containing SQL *is* SQL:

```sql
-- Never do this
l_sql := 'SELECT * FROM users WHERE username = ''' || p_username || '''';
EXECUTE IMMEDIATE l_sql;
```

Pass `x' OR '1'='1` as `p_username` and the predicate is always true.

With a bind variable, the value is transferred separately from the text and is never parsed as SQL. It can contain quotes, semicolons, or an entire `DROP` statement, and it remains a string being compared against a column:

```sql
EXECUTE IMMEDIATE 'SELECT * FROM users WHERE username = :1'
  INTO l_user USING p_username;
```

The Oracle documentation puts it in absolute terms: "The only way to prevent SQL injection attacks is to use bind variables."

That sentence is worth taking literally. Escaping routines and blocklists are defence in depth at best; they are not the fix.

## Where it genuinely gets complicated

Bind variables are not free of trade-offs, and pretending otherwise is how people get surprised.

Because one plan is shared across all values, the plan is chosen for a value that may not represent the others. On a heavily skewed column — a `status` flag that is 99% `'CLOSED'` and 1% `'OPEN'` — the plan that suits one is wrong for the other. Oracle's answers to this are **bind peeking** (look at the first value when choosing the plan) and **adaptive cursor sharing** (notice the mismatch and build a second plan), and both are worth their own note.

The conclusion is not "avoid binds." It is that literals are occasionally defensible for a genuinely static, low-frequency, heavily skewed predicate — and that this is a deliberate exception you should be able to justify, not a default.

## Related

Reducing parse overhead is the same class of problem as reducing context switches in [[bulk-collect|BULK COLLECT]]: identify a fixed per-operation cost, then stop paying it once per row.
