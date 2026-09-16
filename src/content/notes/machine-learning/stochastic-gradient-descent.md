---
title: Stochastic gradient descent
summary: Trade an exact gradient for a cheap noisy one, and take a thousand rough steps in the time an exact method takes one.
aliases: ['SGD', 'mini-batch gradient descent']
domain: machine-learning
mastery: solid
difficulty: 3
prereqs: ['gradient-descent']
tags: ['optimization', 'training', 'sampling']
estMinutes: 6
updated: 2026-09-17
sources:
  - title: 'Sebastian Ruder — An overview of gradient descent optimization algorithms'
    url: 'https://www.ruder.io/optimizing-gradient-descent/'
  - title: 'Bottou, Curtis & Nocedal — Optimization Methods for Large-Scale Machine Learning (arXiv:1606.04838)'
    url: 'https://arxiv.org/abs/1606.04838'
---

[[gradient-descent]] in its plain form computes the loss gradient over the whole training set before taking a single step. The gradient is exact, and the price is one update per full pass over the data.

Stochastic gradient descent asks a different question: **do you actually need the exact gradient?**

You do not. You need a direction that is downhill *on average*. The gradient computed from a single randomly drawn example is an unbiased estimate of the true gradient — noisy, but pointing the right way in expectation. So take the step anyway:

```
θ := θ − η · ∇J(θ; x⁽ⁱ⁾, y⁽ⁱ⁾)
```

One example, one update. A million-example dataset now yields a million updates per pass instead of one.

## The noise is not only a cost

The obvious downside is variance. Ruder notes that SGD "performs frequent updates with a high variance that cause the objective function to fluctuate heavily" — the loss curve becomes jagged rather than a smooth descent.

The less obvious point is that this noise is sometimes *useful*. An exact gradient at a saddle point is zero, and batch gradient descent stops dead. A noisy gradient is not zero, so SGD rattles its way out. On non-convex surfaces the noise is part of why the method works at all.

It also means SGD never truly settles. It converges to a region around a minimum and then bounces within it, with the bounce size set by the [[learning-rate|learning rate]]. Shrinking `η` over time is what converts bouncing into convergence.

## Mini-batches: the version everyone actually uses

Neither extreme is right. One example per step is too noisy and wastes hardware — a GPU computing the gradient for a single example is almost entirely idle. The whole dataset per step is too slow.

**Mini-batch gradient descent** takes `n` examples at a time, typically 32 to 512:

```
θ := θ − η · ∇J(θ; x⁽ⁱ:ⁱ⁺ⁿ⁾, y⁽ⁱ:ⁱ⁺ⁿ⁾)
```

Two things improve at once. Ruder gives both: it "reduces the variance of the parameter updates, which can lead to more stable convergence," and it allows the use of highly optimized matrix operations, because a batch of 256 examples is one matrix multiply rather than 256 small ones.

Almost everyone says "SGD" and means this. The pure one-example-at-a-time version is mostly of historical and theoretical interest.

## Batch size is a systems decision as much as a statistical one

| Batch size | Gradient quality | Hardware use | Steps per epoch |
| --- | --- | --- | --- |
| 1 | Very noisy | Poor | Highest |
| 32–512 | Reasonable | Good | Moderate |
| Full dataset | Exact | Good, if it fits | 1 |

The usual constraint is memory: the batch, its activations, and the gradients must all fit. This is the same reasoning as choosing a fetch size in [[bulk-collect|BULK COLLECT]] — batch enough work to amortize the fixed per-step overhead, but not so much that you blow the memory budget. Different domain, identical trade-off.

## What comes next

Plain SGD applies one global learning rate to every parameter, which is crude when some parameters need large steps and others small ones. Adaptive methods — Adagrad, RMSProp, Adam — give each parameter its own effective rate based on the history of its gradients. That is a separate note, not yet written.
