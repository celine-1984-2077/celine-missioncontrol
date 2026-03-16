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
- Multi-session collaboration for important work:
  - builder/executor session
  - QA validation session
  - designer/UX review session

## 2.1 Two parallel tracks we are designing

We are not only building one thing.
We are designing two linked systems at the same time:

1. **OpenClaw protocol / configuration layer**
   - reusable project protocols
   - spec/doc sync behavior
   - project bootstrap rules
   - future packaging for public sharing

2. **Mission Control product layer**
   - board, docs, activity, runs, QA loop, notifications, and project import workflows

Both need to be documented explicitly.

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

### 5.2 Prior Mission Control work status

Tony confirmed the earlier Mission Control code is completely gone.

Implication:
- We should treat this as a fresh rebuild.
- The useful surviving assets are the remembered product ideas, workflow lessons, and UX/protocol decisions.

## 6. Confirmed Decisions (2026-03-15)

- The personal system website should be built as its **own separate repo/folder**.
- The first implementation should focus **only on Mission Control itself**.
- We can use the process of building Mission Control to calibrate how Tony and Celine work together.
- Discord notifications should target **`céline-notification`**.

## 7. Proposed Build Plan

### Phase 0 — Product spec + fresh repo bootstrap

1. Create a new standalone repo/folder for Mission Control.
2. Write the workflow spec before building automation.
3. Choose the canonical task state model.
4. Decide approval/autostart policy for triage.
5. Capture architecture options for execution, notifications, and QA.

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

## 8. Immediate Next Steps I Recommend

1. **Lock the state model**
   - my current recommendation is:
     - Backlog
     - Triage
     - In Progress
     - Blocked
     - Done
   - and treat `Review` + `Testing` as typed phases/events, not long-lived board columns
2. **Lock the triage pickup policy**
   - my current recommendation is:
     - default: triage items can auto-start
     - optional flag: `requiresApproval=true` for sensitive / ambiguous / external tasks
3. **Write the workflow spec**
   - tasks, events, notifications, QA contracts, bug creation rules
4. **Create the new standalone repo/folder**
5. **Then start coding the execution backbone first**
   - cron -> scan -> session -> update -> test -> notify -> bug-create

## 9. Open Design Choices

1. Confirm whether `Blocked` should be a first-class visible column.
2. Confirm whether `Testing` should appear in the UI as a badge/phase even if not a canonical status.
3. Confirm what minimum task fields are required at creation time.
4. Confirm whether docs are phase-1 UI or phase-2 after execution backbone lands.
 minimum task fields are required at creation time.
4. Confirm whether docs are phase-1 UI or phase-2 after execution backbone lands.
