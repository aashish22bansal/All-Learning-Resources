---
title: Deep learning
summary: What changes when you stop engineering features and let the model learn its own representations — and what that costs.
aliases: ['dl', 'neural networks']
domain: deep-learning
hub: true
mastery: learning
difficulty: 3
prereqs: ['machine-learning', 'gradient-descent']
tags: ['deep-learning', 'neural-networks', 'representation-learning']
estMinutes: 8
updated: 2026-09-17
sources:
  - title: 'Goodfellow, Bengio & Courville — Deep Learning, Ch. 6: Deep Feedforward Networks'
    url: 'https://www.deeplearningbook.org/contents/mlp.html'
  - title: 'Goodfellow, Bengio & Courville — Deep Learning, Ch. 15: Representation Learning'
    url: 'https://www.deeplearningbook.org/contents/representation.html'
---

Deep learning is [[machine-learning|machine learning]] where the model learns its own representation of the input rather than being handed one.

That is the whole distinction, and it is easy to miss because the popular framing is about depth or scale. Depth is the mechanism. **Learned representation is the point.**

## The thing it replaced

Classical ML on hard inputs — images, audio, text — spent most of its effort on feature engineering. A human decided what to measure: edge detectors, spectral coefficients, word counts. The model then fitted a relatively simple function over those human-chosen features, and the ceiling on performance was largely the quality of that human judgement.

A deep network removes that step. Each layer transforms the previous layer's output, so the network builds its own intermediate representations, and the later layers fit a simple function over features the earlier layers invented. Nobody specifies what those features are; they fall out of minimising the loss.

The consequence is that performance stopped being bounded by how well a person could describe the problem and started being bounded by data and compute. That is why the field's trajectory changed so abruptly.

## Why depth, specifically

A network with one sufficiently wide hidden layer can approximate essentially any continuous function — which sounds like it should make depth unnecessary. It does not, for a practical reason: the width required can be absurd. Depth lets a network compose simple transformations, reusing intermediate results, and represent certain functions far more compactly than a shallow network can.

The intuition that survives contact with practice: shallow networks can represent anything but may need exponentially many units; deep networks represent structured, compositional problems efficiently. Real data is compositional — edges into shapes into objects, characters into words into meaning — which is why the assumption pays off.

## Training is the same algorithm you already know

There is no separate optimisation theory here. A deep network is trained by [[gradient-descent|gradient descent]], in practice [[stochastic-gradient-descent|mini-batch SGD]] or an adaptive variant, on batches of data.

**Backpropagation** is not a learning algorithm — it is the chain rule applied efficiently, computing the gradient of the loss with respect to every parameter in one backward pass. Confusing backprop with the optimiser is a common and consequential mix-up: backprop tells you the gradient, the optimiser decides what to do with it.

What does change at depth is that the loss surface stops being convex, and gradients must survive being multiplied through many layers. The practical toolkit that resulted — better activations, normalization layers, residual connections, careful initialisation — is mostly a response to gradients vanishing or exploding on the way back. [[learning-rate|The learning rate]] becomes correspondingly more delicate, which is why warmup and schedules are near-universal.

## What it costs

Worth being blunt, because deep learning is over-applied:

- **Data.** It learns representations from scratch, so it needs enough examples to do that. On a few thousand rows a gradient-boosted tree will usually beat it.
- **Compute.** Training is expensive in a way classical ML is not, and the hardware is specialised.
- **Interpretability.** The learned features are not meant to be human-readable and generally are not. In a regulated setting, "the network decided" is not always an acceptable answer.
- **Tuning.** More knobs, more ways to fail silently. A model that trains to a plausible-looking loss can still be broken.

**On tabular data — which is most business data — deep learning is usually not the right answer.** Trees remain extremely strong there. Deep learning wins decisively where inputs are high-dimensional and perceptual, or where enormous unlabelled corpora exist.

## Self-supervision is what unlocked scale

The expensive ingredient in supervised learning is labels. Self-supervised learning manufactures a supervised problem from unlabelled data — hide part of the input, predict it from the rest — which turns the entire internet into training data without anyone labelling it.

That is the hinge the current generation turns on, and it leads directly to [[context-engineering|language models and everything built on them]].

## What to learn next

1. **Backpropagation worked through by hand**, once, on a two-layer network. It stops being magic permanently.
2. **Convolutions and attention** — the two structural priors that matter, for grids and for sequences.
3. **Normalization and residual connections** — why very deep networks train at all.
4. **Transfer learning and fine-tuning** — how to get deep learning's benefits without its data requirements, which is what most practitioners actually do.
