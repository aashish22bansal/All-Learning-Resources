---
title: Apache Kafka
summary: A durable ordered log that consumers read at their own pace — and why that one shape replaced the message queue it superficially resembles.
aliases: ['kafka']
domain: kafka
hub: true
mastery: learning
difficulty: 3
tags: ['kafka', 'streaming', 'distributed-systems', 'messaging']
estMinutes: 8
updated: 2026-09-17
sources:
  - title: 'Apache Kafka 4.3 — Introduction'
    url: 'https://kafka.apache.org/intro'
---

Kafka looks like a message queue and is usually introduced as one. That framing causes most of the confusion people have with it, because the defining behaviour is the opposite of a queue's.

## Events are not consumed away

In a traditional queue, a consumer takes a message and the message is gone. In Kafka, "events are not deleted after consumption." A topic is "similar to a folder in a filesystem, and the events are the files in that folder," and how long they stay is a policy decision: "you define for how long Kafka should retain your events through a per-topic configuration setting, after which old events will be discarded."

Retention is time or size based, not consumption based. The log is the source of truth, and reading it does not change it.

Everything distinctive follows from that:

- **Many independent consumers** can read the same topic without competing. "Producers and consumers are fully decoupled and agnostic of each other." Adding a new system that needs the same events requires no change to the producer.
- **Replay is ordinary.** A consumer that had a bug can reset its position and reprocess last week. In a queue, that data is gone.
- **The consumer tracks its own position.** The broker is not maintaining per-message acknowledgement state, which is a large part of why Kafka scales the way it does.

## Partitions are the unit of everything

A topic is "spread over a number of buckets located on different Kafka brokers." That partitioning is what gives Kafka its throughput, and it is also the source of its one real constraint.

**Ordering is per partition, not per topic.** Kafka guarantees that "events with the same event key are written to the same partition" and that consumers "read that partition's events in exactly the same order" as written. Across partitions there is no ordering at all.

This is the design decision to internalise. If you need all events for one customer processed in order, key by customer ID and you get it. If you need *global* ordering across everything, you need one partition, and you have given up the parallelism that made Kafka worth using. Most systems that "need global ordering" actually need per-entity ordering and have not noticed the difference.

Partition count also bounds consumer parallelism within a consumer group: a partition is consumed by at most one member, so ten partitions means at most ten useful consumers.

## Durability

"Every topic can be replicated, even across geo-regions or datacenters," with "a common production setting" being a replication factor of 3. Each partition has a leader and followers; writes go to the leader and replicate.

The durability guarantee is tunable per producer, which is the knob that actually decides whether you lose data under failure. Requiring acknowledgement from all in-sync replicas is slower and safe; acknowledging on the leader alone is faster and loses data if that leader dies before replication. This is an availability-versus-durability trade with no universally right setting, and it is worth being deliberate about rather than inheriting a default.

## Why a database engineer should look twice

Kafka is a log, and a log is the thing that makes a database durable. [[oracle-database|Oracle]] redo, PostgreSQL WAL and a Kafka topic are the same idea: an append-only ordered record of what happened, from which state can be rebuilt.

The difference is what it is *for*. A database keeps its log privately and exposes the derived state. Kafka makes the log the public interface and lets every consumer derive its own state. Once that clicks, change data capture stops sounding exotic — it is just exposing the database's private log as a Kafka topic, and it is why [[apache-sqoop|Sqoop]]-style periodic snapshots lost to streaming.

It also explains where Kafka is the wrong tool. There is no query language, no index, no ad-hoc lookup by key. Asking "what is this customer's balance right now" is not a Kafka question; it is a question for whatever database you built by consuming the topic.

## What to learn next

1. **Consumer groups and rebalancing** — how partitions get assigned, and why a slow consumer can trigger a rebalance storm.
2. **Offset management and delivery semantics** — at-least-once against exactly-once, and what the latter actually costs.
3. **Kafka Connect** — the standard way in and out, including CDC via Debezium.
4. **Compacted topics** — retention by key rather than by time, which turns a log into a queryable-ish snapshot.
5. **Kafka with [[apache-spark|Spark]] Structured Streaming** — the most common pairing, and where checkpointing semantics start to matter.
