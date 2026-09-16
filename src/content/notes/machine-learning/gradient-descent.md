---
title: Gradient descent
summary: The optimization method underneath almost all of machine learning — follow the slope downhill, one step at a time, and hope the surface is kind.
aliases: ['batch gradient descent']
domain: machine-learning
mastery: solid
difficulty: 2
tags: ['optimization', 'training', 'calculus']
estMinutes: 7
updated: 2026-09-17
sources:
  - title: 'Sebastian Ruder — An overview of gradient descent optimization algorithms'
    url: 'https://www.ruder.io/optimizing-gradient-descent/'
  - title: 'Goodfellow, Bengio & Courville — Deep Learning, Ch. 4: Numerical Computation'
    url: 'https://www.deeplearningbook.org/contents/numerical.html'
---

Training a model means choosing parameters that make it wrong as rarely as possible. You encode "how wrong" as a **loss function** `J(θ)` — a single number that depends on the parameters `θ`. Training is then a search for the `θ` that makes `J` small.

The search space is far too large to enumerate. A model with ten thousand parameters has a ten-thousand-dimensional surface to search, and you cannot look at it. What you *can* do, cheaply, is ask a local question: **from where I am standing, which direction is downhill?**

That question has an exact answer. The gradient `∇J(θ)` is the vector of partial derivatives of the loss with respect to each parameter, and it points in the direction of steepest *increase*. So the steepest decrease is the opposite direction, and the update rule is the whole algorithm:

```
θ := θ − η · ∇J(θ)
```

`η` (eta) is the [[learning-rate|learning rate]] — how far to step. Everything else in this note is a consequence of that one line.

## Why this works, and when it doesn't

The gradient is a *local* fact. It tells you the slope where you are standing, and nothing about the terrain a hundred steps away. Gradient descent is therefore a greedy method, and it inherits the usual weakness of greedy methods: it finds a minimum, not necessarily *the* minimum.

For a **convex** loss surface — one shaped like a bowl, with no local dips — this doesn't matter. Any local minimum is the global minimum, and with a sensible step size you will reach it. Linear and logistic regression have convex losses, which is why they are so well behaved.

Neural networks do not. Their loss surfaces are non-convex, full of saddle points and flat regions. In practice this turns out to be survivable: in high dimensions, most critical points are saddles rather than bad local minima, and the minima that do get found tend to be of similar quality. That is an empirical result, not a guarantee.

## The cost of one step

The rule above says `∇J(θ)` — the gradient of the loss over the **entire training set**. Computing it means a full pass over every example before you are allowed to move once.

For a small dataset that is fine, and it has a real virtue: the gradient is exact, so the path downhill is smooth and every step is guaranteed to reduce the loss if `η` is small enough. This variant is **batch gradient descent**.

For anything modern it is unusable. Ruder puts the problem plainly: batch gradient descent "can be very slow and is intractable for datasets that don't fit in memory." A million-example dataset buys you one parameter update per full pass.

The fix is to stop insisting on an exact gradient, which is what [[stochastic-gradient-descent|stochastic gradient descent]] does.

## What you actually tune

Three things decide whether this converges:

| Knob | What goes wrong |
| --- | --- |
| Step size `η` | Too small: convergence takes forever. Too large: you overshoot the minimum and the loss oscillates or diverges. |
| Initialization | Where you start decides which basin you fall into on a non-convex surface. |
| Feature scaling | If one feature ranges over 0–1 and another over 0–100,000, the loss surface becomes a narrow ravine and the path zig-zags down the walls instead of along the floor. |

The third one catches people out most often, and it is the cheapest to fix — standardize your features and the ravine becomes a bowl.

## Why a database engineer should care

A query optimizer and a gradient descent optimizer are solving the same shape of problem: minimize a cost function over a space too large to enumerate, using local information and heuristics, with no guarantee of finding the true optimum. See [[cost-based-optimizer|the cost-based optimizer]] for where the analogy holds and where it breaks.
