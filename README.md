# Celine Mission Control

Celine Mission Control is a personal operator console built on top of OpenClaw-style working protocols.

It is designed around a simple idea:

- **OpenClaw protocol/config layer** defines how projects should be bootstrapped, documented, and kept in sync.
- **Mission Control application layer** gives those protocols a visible operating surface: tasks, runs, QA, docs, activity, and project workflows.

Together, they aim to create a system where someone can import a project, establish a spec, generate working docs, and develop through a structured loop instead of ad-hoc chat and memory.

## What this project is trying to become

This project is evolving toward two connected products:

### 1. Public starter
A shareable starter repo/toolkit that other people can pick up and use immediately.

The goal is that someone can:
- clone it,
- connect it to OpenClaw,
- import their own project,
- generate initial specs and operating docs,
- and begin using Mission Control as a structured development console.

That public starter should help bootstrap things like:
- project specs,
- AGENTS / protocol files,
- runbooks / playbooks,
- database docs,
- service / system analysis docs,
- and linked project knowledge inside the docs surface.

### 2. Personal extension layer
A second layer for highly personal workflows that should not live in the public core.

Examples include:
- language-learning modules,
- personal article imports,
- memory-driven tools,
- and other custom life-management features.

These are better treated as plugins, modules, or extensions on top of the shareable core.

## Core operating idea

Mission Control is not just a kanban board.
It is meant to support a full execution loop:

- task intake
- triage
- implementation
- progress visibility
- browser / QA validation
- bug feedback loop
- UX review
- documentation sync
- roadmap tracking

A key rule in this system is:

> **implemented != validated**

If a feature affects UI or user interaction, it is not truly complete until it has gone through required browser validation.

## Multi-session collaboration model

Important work should not rely on a single builder session deciding that it is finished.
The system is intended to support separate sessions/runs for:

- **execution** — builds the feature
- **QA / browser validation** — verifies what was actually implemented
- **UX review** — evaluates usability and clarity

That separation exists to prevent the common failure mode of “I built it, therefore it must be good.”

## Roadmap discipline

Each project spec should eventually show roadmap status explicitly, using stages like:
- planned
- in_progress
- implemented
- validated
- shipped
- blocked

This makes it possible to see not just what exists, but what has actually been verified.

## Status today

Right now this repository contains:
- the project protocol layer,
- the Mission Control spec,
- an evolving Mission Control web app prototype,
- and the working notes that define how this system should grow.

The current prototype already includes:
- task creation and editing,
- validated state transitions,
- activity logging,
- local run tracking,
- a local runner prototype,
- required browser-test gating for UI work,
- and bug auto-creation in the QA prototype flow.

## Long-term direction

The long-term goal is for this system to let someone bring in an existing project and rapidly establish:
- what the project is,
- how it works,
- what docs are missing,
- what roadmap exists,
- and how an AI-assisted development loop should operate around it.

In other words:

**this is both a product and a protocol.**

It is a development console, but also a reusable way of working.
