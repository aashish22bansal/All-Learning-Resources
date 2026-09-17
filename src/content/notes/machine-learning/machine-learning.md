---
title: Machine learning
summary: Fitting a function to data instead of specifying rules — and why generalization, not accuracy, is the entire problem.
aliases: ['ml']
domain: machine-learning
hub: true
mastery: learning
difficulty: 2
tags: ['machine-learning', 'generalization', 'statistics']
estMinutes: 8
updated: 2026-09-17
sources:
  - title: 'Goodfellow, Bengio & Courville — Deep Learning, Ch. 5: Machine Learning Basics'
    url: 'https://www.deeplearningbook.org/contents/ml.html'
  - title: 'Sebastian Ruder — An overview of gradient descent optimization algorithms'
    url: 'https://www.ruder.io/optimizing-gradient-descent/'
---

Ordinary programming specifies the rule and applies it to data. Machine learning takes the data and the answers, and searches for a rule that would have produced them. That inversion is the whole idea; everything else is consequence.

Concretely: you choose a family of functions with adjustable parameters, define a **loss** that scores how wrong a given setting is, and search for parameters that make the loss small. The search is almost always [[gradient-descent|gradient descent]] or one of its variants.

## The problem is not fitting. It is generalizing

A model that reproduces its training data perfectly is trivial to build — memorise it. That model is worthless, because it says nothing about data it has not seen, and data it has not seen is the only data you will ever actually use it on.

So the real objective is invisible during training. You minimise loss on data you have, while caring about loss on data you do not. Everything that looks like ceremony in ML practice exists to manage that gap:

- **Holding out a test set** you never train on, so you have an honest estimate.
- **A separate validation set** for tuning, because a test set you make decisions against stops being honest.
- **Cross-validation** when you have too little data to give some away.

The two failure directions have names:

**Underfitting** — the model family is too simple to represent the pattern. Training error is high, and more data will not help.

**Overfitting** — the model is flexible enough to fit noise as though it were signal. Training error is low, test error is high, and the gap between them is the diagnostic.

**Capacity** is the dial between them. More parameters, more flexibility, more risk of fitting noise. This is the bias–variance framing: a rigid model is consistently wrong in the same way (bias); a flexible one is wildly different depending on which sample it saw (variance).

## The part that surprises people

**More features is not obviously better.** In high dimensions, points become far apart and sparse, distance-based reasoning degrades, and the amount of data needed to cover the space grows explosively.

**There is no universally best algorithm.** Averaged across all possible problems, every algorithm performs the same. Choosing a model is choosing an assumption about the structure of your particular problem. This is why "which algorithm is best" has no answer and "what does my data look like" does.

**The data usually dominates the model.** Fixing leakage, label noise or a biased sample almost always beats trying a fancier architecture. The unglamorous work is the high-leverage work.

## The three settings

**Supervised** — you have inputs and correct outputs; learn the mapping. Classification and regression. This is most deployed ML.

**Unsupervised** — you have inputs only; find structure. Clustering, dimensionality reduction, density estimation. Evaluation is genuinely hard because there is no right answer to check against.

**Reinforcement** — an agent acts, receives reward, and learns a policy. Powerful and considerably harder to make work.

The boundary blurs. Modern [[deep-learning|deep learning]] leans heavily on self-supervision: manufacture a supervised problem from unlabelled data, such as predicting a hidden part of the input from the rest. That trick is most of why large language models were possible.

## Why this should feel familiar

A [[cost-based-optimizer|cost-based optimizer]] is solving the same shape of problem: minimise an objective over a space too large to enumerate, using estimates built from summary statistics, with no guarantee of finding the true optimum.

The analogy is worth carrying because the failure modes rhyme. An optimizer with stale statistics chooses a bad plan; a model trained on unrepresentative data makes bad predictions. In both cases the fix is upstream — fix what the system believes about the data, rather than overriding its decision.

## What to learn next, in order

1. [[gradient-descent|Gradient descent]], then [[stochastic-gradient-descent|its stochastic form]], then [[learning-rate|the learning rate]]. Optimization is the engine underneath everything.
2. **Evaluation metrics beyond accuracy.** Precision, recall, ROC-AUC, calibration. On imbalanced data accuracy is actively misleading, and most interesting problems are imbalanced.
3. **Regularization** — L1, L2, early stopping, dropout. The direct lever on the capacity dial.
4. **Trees and ensembles.** Gradient-boosted trees remain the thing to beat on tabular data, which is most business data.
5. **Feature engineering and leakage.** Leakage is the single most common reason a model that looked excellent fails in production.

Scale comes later, and when it does, [[pyspark|PySpark]] is the usual bridge from a single machine to a cluster.
