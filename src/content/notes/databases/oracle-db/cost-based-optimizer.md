---
title: The cost-based optimizer as an optimization problem
summary: Oracle's CBO and a gradient descent optimizer are solving the same shape of problem. Where that analogy is genuinely useful, and where it quietly breaks.
aliases: ['CBO', 'query optimizer', 'cost based optimizer']
domain: oracle-db
mastery: learning
difficulty: 4
prereqs: ['gradient-descent']
tags: ['oracle', 'optimization', 'architecture', 'machine-learning']
estMinutes: 8
updated: 2026-09-17
sources:
  - title: 'Oracle Database 19c SQL Tuning Guide — Query Optimizer Concepts'
    url: 'https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/query-optimizer-concepts.html'
  - title: 'Sebastian Ruder — An overview of gradient descent optimization algorithms'
    url: 'https://www.ruder.io/optimizing-gradient-descent/'
---

Databases and machine learning are filed apart here, and for most purposes that is right. This is the note that argues the filing is misleading: Oracle's cost-based optimizer and the optimizer inside a training loop are the same algorithm family wearing different vocabulary.

## The same problem statement

Both are given:

- a **search space** too large to enumerate,
- an **objective function** that scores a candidate,
- **no ability to evaluate the objective exactly** before committing,

and both must return a good answer in bounded time rather than the best answer eventually.

For the CBO, a candidate is an execution plan — an access method, a join order, a join method, a set of transformations. The objective is *cost*, which Oracle defines as "an internal numeric measure that represents the estimated resource usage for a plan," combining estimated I/O, CPU and memory.

For [[gradient-descent|gradient descent]], a candidate is a parameter vector `θ` and the objective is the loss `J(θ)`.

## Both refuse to look at the whole space

This is the part that makes them genuinely similar rather than superficially so.

The number of possible plans grows exponentially with the number of tables in the `FROM` clause. Oracle does not evaluate them all. It applies an internal cutoff, and the documentation describes the heuristic precisely:

> The optimizer uses an internal cutoff to reduce the number of plans it tries when finding the lowest-cost plan. The cutoff is based on the cost of the current best plan. If the current best cost is large, then the optimizer explores alternative plans to find a lower cost plan. If the current best cost is small, then the optimizer ends the search swiftly because further cost improvement is not significant.

That is an adaptive stopping rule keyed to how good the current answer already is — structurally the same idea as early stopping in training, where you stop when the objective stops improving enough to justify more compute.

Gradient descent refuses the whole space differently: it never considers candidates at all, only a direction from where it stands. But the motive is identical. Enumeration is impossible, so use local information and a stopping rule.

## Both run on estimates, and both inherit the estimator's errors

The CBO's cost comes from an **estimator** built on three quantities: selectivity (the fraction of rows a predicate passes, 0.0 to 1.0), cardinality (the row count each operation produces), and cost. Oracle's worked example: a table with 107 rows and 58 distinct salary values gives `WHERE salary = '10200'` an estimated cardinality of `107/58 = 1.84` rows.

Notice that this estimate assumes values are *uniformly distributed*. When they are not — a status column that is 99% one value — the estimate is badly wrong, the plan built on it is wrong, and the query is slow for reasons the plan itself does not reveal. This is the same skew problem that makes [[bind-variables|bind variables]] complicated, and it has the same root: one summary statistic standing in for a distribution that does not fit it.

The parallel in training is direct. [[stochastic-gradient-descent]] does not compute the true gradient; it computes an estimate from a sample and steps on that. The estimate is unbiased, so the errors cancel over many steps.

**This is where the analogy starts to break, and the difference is the interesting part.**

## Where it breaks

| | Cost-based optimizer | Gradient descent |
| --- | --- | --- |
| Estimate errors | **Compound.** A bad cardinality estimate at step one feeds every subsequent join estimate. | **Cancel.** Unbiased sampling noise averages out over many steps. |
| Number of shots | One. The plan is chosen, then executed. | Thousands. Every step is a correction. |
| Feedback | None during execution — the plan does not know it is going badly. | Continuous. The next gradient reflects the last step. |
| Objective | Discrete, combinatorial. No gradient exists. | Continuous, differentiable. |

The last row is the deep one. The CBO *cannot* do gradient descent, because "join order" has no derivative. There is no direction in which a plan is slightly more nested-loop. It is a combinatorial search problem, and it belongs with branch-and-bound and dynamic programming rather than with continuous optimization.

The compounding of errors is the practical one. Gradient descent tolerates a noisy estimator because it gets thousands of chances. The optimizer gets one, and a cardinality error early in a join tree can be off by orders of magnitude by the time it reaches the top. That is why Oracle added adaptive plans and statistics feedback — mechanisms to get a second shot, which is exactly the thing the analogy says it was missing.

## What I take from this

Concretely useful, rather than merely cute:

1. **The estimator is the weak point in both.** Tuning a slow query usually means fixing what the optimizer believes about the data, not overriding its decision. Fixing training usually means fixing the data or the sampling, not the optimizer.
2. **Skew defeats summary statistics.** Histograms in Oracle and stratified sampling in ML are the same idea.
3. **"Adaptive" means getting a second look at a decision made under uncertainty** — adaptive cursor sharing, adaptive plans, adaptive learning rates. Same word, same motivation.

## Still unresolved

I have not worked out whether the branch-and-bound framing genuinely maps onto anything in the ML tooling I use, or whether that is where the analogy should be retired. Marked `learning` until I do.
