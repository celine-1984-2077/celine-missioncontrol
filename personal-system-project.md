# Personal System Website / Mission Control

_Last updated: 2026-03-15_

## 1. Project Goal

Build Tony's personal operating system website.

Near-term priority:
- A reliable autonomous execution framework for task intake, execution, QA/testing, and notifications.

Longer-term surfaces:
- Docs / runbooks / durable knowledge
- Todo list synced with Notion
- Excerpt notebook synced with Notion
- Additional personal systems: vocabulary cards, photo library, 3D walkthroughs, public website, portfolio, family archive, WeChat import

## 2. What Tony Wants Most Right Now

The core system should support:
- A kanban board used to assign tasks to Celine
- A triage queue that is periodically scanned by cron
- Automatic task pickup and status movement
- Notifications pushed to the Discord Celine notification channel
- One execution session per task
- One browser-testing session per UI task after implementation
- Automatic bug creation when QA/testing fails
- A self-reinforcing loop where failed work goes back into backlog/triage until resolved

## 3. Product Model

### 3.1 Layers

- **Task** = workflow / execution unit
- **Doc** = durable knowledge / runbook / decision record
- **Activity** = event stream / operational visibility

### 3.2 Task state model

Prior design notes indicate a strong preference for constrained states.
Two variants have been mentioned historically:

**Variant A (older protocol):**
- Backlog
- In Progress
- Review
- Done

**Variant B (later UI screenshot / current direction):**
- Backlog
- In Progress
- Review
- Testing
- Done/history in activity

Open question:
- Should Testing remain a first-class state, or should it be modeled as a sub-state/log inside In Progress?

### 3.3 Required operational visibility

- Now Running card with:
  - task title
  - current step (Step x/y)
  - last action time
  - next step
- Recent updates timeline with typed events:
  - Scan
  - Progress
  - Blocker
  - Done
- Done digest for recently finished work
- Structured task detail sections:
  - Objective
  - Plan
  - Progress Log
  - Result
  - Artifact links

## 4. Reliability Principle

A key lesson from prior work:
- The workflow cannot rely only on written rules/prompts.
- Important behavior should be encoded into application logic and/or automation so notifications, testing, and state transitions happen reliably.

Implication:
- We should identify which steps are policy/UI only versus which must be enforced in code, job runners, or orchestration.

## 5. Existing Related Assets

### 5.1 In workspace now

- `TuanInsurance/` exists in the workspace and appears to be the current insurance project codebase.
- It includes docs for app overview, schema, deployment, and test suites.

### 5.2 Prior Mission Control work (from Tony's shared screenshots/text)

Already explored in some earlier version:
- task board UI
- docs view
- activity panel
- project-tagging ideas
- protocol for structured execution reporting

Unknown:
- where the prior Mission Control code currently lives
- whether it still exists in another repo/branch/archive
- whether the current desired implementation should rebuild from scratch or recover/adapt previous work

## 6. Proposed Build Plan

### Phase 0 — Recovery / audit

1. Inspect the workspace for any prior Mission Control code, branches, snapshots, or docs.
2. Identify whether TuanInsurance is separate from the personal-system website or whether the Mission Control UI was embedded elsewhere.
3. Capture current architecture options before writing new code.

### Phase 1 — Workflow spec (make it hard, not vague)

Define and lock:
1. canonical task states
2. event types and payloads
3. task schema
4. activity schema
5. doc/project relationship model
6. notification triggers
7. QA/test result contract
8. bug auto-creation rules

Deliverable:
- a short spec markdown Tony can review quickly

### Phase 2 — Execution backbone

Implement the automation backbone:
1. task poller / cron scanner
2. triage selection rules
3. per-task session creation
4. status transition engine
5. notification publisher
6. execution logging

Goal:
- stable, observable automation even before the UI is polished

### Phase 3 — QA loop

Implement:
1. browser-test job spawn for UI tasks
2. pass/fail result capture
3. artifact capture (screenshots/logs)
4. automatic bug creation on failure
5. loop-back into backlog/triage

### Phase 4 — UI hardening

Refine:
1. Now Running
2. activity feed
3. task detail structure
4. project tags
5. docs filtered by project
6. done digest / history

### Phase 5 — Knowledge system

Implement:
1. docs by project
2. task ↔ doc linking
3. decision log
4. runbooks
5. later Notion sync

## 7. Immediate Next Steps I Recommend

1. **Recover the old work first**
   - search workspace/git history for prior Mission Control implementation
2. **Confirm the canonical state model**
   - decide whether Testing is a board column or internal execution phase
3. **Write the workflow spec**
   - tasks, events, notifications, QA contracts
4. **Map the automation architecture**
   - cron -> scan -> session -> update -> test -> notify -> bug-create
5. **Only then start coding**
   - to avoid rebuilding the same instability

## 8. Clarifications to Ask Tony

1. Where did the earlier Mission Control code live? Same repo, another repo, or a deleted workspace only?
2. Do you want the personal system website in its own repo/folder now, or inside an existing project?
3. Should `Testing` be a visible board column, or just a system phase under `In Progress`?
4. What is the exact Discord destination for notifications right now (channel/session/workflow)?
5. Do you want the system to auto-start work from triage with no manual approval, or should some tasks require approval gates?
6. Should the first implementation focus only on Mission Control itself, or also connect immediately to TuanInsurance tasks as a real client project?
