---
title: Learning rate
summary: The single most consequential hyperparameter in training — how far to step downhill, and why both extremes fail differently.
aliases: ['step size', 'eta']
domain: machine-learning
mastery: learning
difficulty: 2
prereqs: ['gradient-descent']
tags: ['optimization', 'hyperparameters', 'training']
estMinutes: 5
updated: 2026-09-17
sources:
  - title: 'Sebastian Ruder — An overview of gradient descent optimization algorithms'
    url: 'https://www.ruder.io/optimizing-gradient-descent/'
  - title: 'Goodfellow, Bengio & Courville — Deep Learning, Ch. 8: Optimization for Training Deep Models'
    url: 'https://www.deeplearningbook.org/contents/optimization.html'
---

The gradient tells you which way is downhill. It does not tell you how far to walk. That is the learning rate `η`, and it is usually the first hyperparameter worth tuning and the one that wastes the most time when it is wrong.

## Both failures look different

Ruder states the trade-off directly: a learning rate that is too small "leads to painfully slow convergence," while one that is too large "can hinder convergence and cause the loss function to fluctuate around the minimum or even to diverge."

These fail in ways that are easy to tell apart from a loss curve:

- **Too small** — the loss decreases, smoothly, and keeps decreasing when you run out of patience. Nothing looks broken. This is the expensive failure, because it wastes days rather than minutes.
- **Too large** — the loss oscillates, plateaus at a poor value, or goes to `NaN` within a few dozen steps. This failure is loud, and therefore cheap.

Because the loud failure is cheaper, the standard advice is to start at the largest rate that does not diverge and come down from there, rather than starting small and creeping up.

## Why one fixed value is never right

Early in training you are far from any minimum and large steps are safe and useful. Late in training you are inside a basin and large steps just bounce you around it — the behaviour described in [[stochastic-gradient-descent|stochastic gradient descent]], where noise keeps the parameters rattling near the optimum instead of settling.

So the rate should start high and decrease. That is a **schedule**, and the common forms are step decay (cut by a factor every `k` epochs), exponential decay, and cosine annealing (a smooth decrease following a half cosine).

Ruder names the limitation of all of them: schedules "have to be defined in advance and are thus unable to adapt to a dataset's characteristics." You are guessing the shape of the decrease before you have seen how training goes.

## Warmup

A common refinement is to *increase* the rate for the first few hundred steps before decaying it. Early in training the parameters are random and the gradient estimates are correspondingly unreliable; taking large steps based on them can push the model into a bad region it never recovers from. Warmup keeps the first steps small while the estimates stabilize.

## The part that is still open for me

I have not yet worked through how adaptive methods — Adagrad, RMSProp, Adam — change this picture. They give each parameter its own effective rate derived from its gradient history, which reduces but does not remove the need to choose a global `η`. The claim I keep seeing is that Adam is "less sensitive to the learning rate," and I have not verified what that means precisely or where it stops being true.

Marked `learning` rather than `solid` for exactly that reason.
