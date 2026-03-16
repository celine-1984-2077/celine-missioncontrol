# Mission Control Spec v1

_Last updated: 2026-03-15_

## 1. Purpose

Mission Control is Tony's personal operator console for working with Celine.

The first version focuses on a reliable execution loop for:
- task intake
- task selection
- execution
- progress visibility
- QA / browser testing
- bug feedback loop
- Discord notifications

This v1 does **not** try to solve every future personal-system feature yet.

It should also be designed so it can later split into:
- a public/shareable starter version for other OpenClaw users
- a personal extension/plugin layer for Tony-specific workflows

---

## 1.1 Two parallel product surfaces

We are designing two linked systems at the same time:

1. **OpenClaw protocol/config layer**
   - project bootstrap rules
   - spec/doc sync rules
   - reusable operating conventions
   - future packaging for public sharing

2. **Mission Control application layer**
   - tasks
   - activity
   - docs
   - runs
   - QA loop
   - notifications
   - project import and analysis workflows

Both should be documented explicitly.

## 1.2 Product distribution model

Mission Control should evolve toward two flavors:

### Public starter
- shareable repo/toolkit
- opinionated defaults
- immediate usability for new users
- supports importing an existing project and bootstrapping docs/specs/protocols

### Personal extension layer
- Tony-specific workflows and content
- examples: French study tools, article imports, personal memory modules
- best treated as plugins/modules/extensions rather than bundled into the public starter core

## 2. Core Product Model

### 2.1 Three layers

- **Task** = unit of execution
- **Doc** = durable knowledge / runbook / decision record
- **Activity** = event stream showing what happened
- **Protocol** = reusable OpenClaw/Mission Control operating rules

### 2.2 Canonical task states

These are the only primary board states:
- **Backlog**
- **Triage**
- **In Progress**
- **Blocked**
- **Done**

### 2.3 What is *not* a primary state

These should be modeled as phases, flags, or events instead of board columns:
- Review
- Testing
- Awaiting Decision
- Awaiting Approval
- Bugfix
- Retest

Reason:
- primary states should reflect task executability and scheduling,
- not every intermediate action.

---

## 3. Scheduling Model

### 3.1 Meaning of each state

#### Backlog
Idea pool. Not yet ready for the runner to pick up.

#### Triage
Ready for evaluation and possible pickup by automation.

#### In Progress
Currently being executed by exactly one active run.

#### Blocked
Execution cannot continue until a dependency, approval, credential, or decision is resolved.

#### Done
Task completed successfully. Main board may hide this by default and surface it through activity/history.

### 3.2 Pickup policy

Default policy:
- tasks in **Triage** are eligible for automatic pickup.

Exception:
- tasks with `requiresApproval = true` may not auto-start until approved.

### 3.3 Single-run rule

A task may have **at most one active execution run** at a time.

This must be enforced by:
- a task lock / lease
- run id
- atomic status transition to `In Progress`

---

## 4. Task Schema (v1)

Minimum required fields:

```ts
Task {
  id: string
  title: string
  objective: string
  acceptanceCriteria: string[]
  boundaries?: string[]

  status: 'backlog' | 'triage' | 'in_progress' | 'blocked' | 'done'
  projectId: string
  type: 'code' | 'doc' | 'research' | 'ops' | 'bug'

  requiresApproval: boolean
  approvedAt?: string
  approvedBy?: string

  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdBy: 'tony' | 'celine' | 'system'
  source: 'board' | 'chat' | 'system' | 'bug_loop'

  assignee: 'celine'

  needsUiTest: boolean
  parentTaskId?: string
  relatedDocIds?: string[]
  tags?: string[]

  plan?: Step[]
  currentStepIndex?: number
  nextStep?: string

  blockerReason?: BlockerReason
  blockerDetail?: string

  activeRunId?: string
  lastEventAt?: string

  createdAt: string
  updatedAt: string
  completedAt?: string
}

Step {
  id: string
  label: string
  status: 'pending' | 'in_progress' | 'done'
}

type BlockerReason =
  | 'needs_tony_decision'
  | 'needs_approval'
  | 'needs_credentials'
  | 'needs_external_input'
  | 'technical_failure'
  | 'waiting_on_dependency'
```

### 4.1 Minimum task creation contract

When Tony creates a task manually, Mission Control should ask for or infer:
- **goal**
- **acceptance criteria**
- **boundaries** (optional but recommended)

Celine should then generate:
- objective
- initial plan
- task type
- project mapping
- testing expectation

---

## 5. Run Schema (v1)

A task can have many historical runs, but only one active run.

```ts
Run {
  id: string
  taskId: string
  kind: 'execution' | 'ui_test' | 'qa_review' | 'ux_review'
  status: 'queued' | 'running' | 'passed' | 'failed' | 'cancelled'

  sessionRef?: string
  startedAt?: string
  endedAt?: string

  summary?: string
  errorSummary?: string
  artifactIds?: string[]
}
```

---

## 6. Activity / Event Schema

Activity is append-only.
It is the source for timelines, notifications, and auditability.

```ts
ActivityEvent {
  id: string
  taskId: string
  projectId: string
  runId?: string

  type:
    | 'task_created'
    | 'task_triaged'
    | 'task_picked_up'
    | 'task_started'
    | 'progress'
    | 'plan_updated'
    | 'step_started'
    | 'step_completed'
    | 'blocked'
    | 'unblocked'
    | 'approval_requested'
    | 'approved'
    | 'ui_test_requested'
    | 'ui_test_started'
    | 'ui_test_passed'
    | 'ui_test_failed'
    | 'qa_review_requested'
    | 'qa_review_passed'
    | 'qa_review_failed'
    | 'ux_review_requested'
    | 'ux_review_submitted'
    | 'spec_update_requested'
    | 'bug_created'
    | 'done'
    | 'notification_sent'
    | 'runner_error'

  title: string
  body?: string
  metadata?: Record<string, any>

  createdAt: string
  createdBy: 'tony' | 'celine' | 'system'
}
```

### 6.1 Event design rules

- Events are immutable.
- Notifications derive from events.
- UI timelines derive from events.
- State transitions should emit events consistently.
- Test failure should always emit structured failure events.

---

## 7. Execution State Machine

### 7.1 Primary transitions

Allowed transitions:

- `backlog -> triage`
- `triage -> in_progress`
- `triage -> blocked`
- `triage -> backlog`
- `in_progress -> blocked`
- `in_progress -> done`
- `in_progress -> triage` (retry / requeue only when explicitly intended)
- `blocked -> triage`
- `blocked -> backlog`

Disallowed:
- multiple simultaneous active runs
- direct `backlog -> done`
- direct `done -> in_progress` without creating follow-up / reopen semantics

### 7.2 Reopen / follow-up rule

If a completed task needs more work, prefer one of:
- create a new follow-up task
- create a bug task linked by `parentTaskId`

Avoid mutating completed history unless clearly necessary.

---

## 8. QA / Browser Testing Loop

### 8.1 When UI testing is required

If `needsUiTest = true`, Mission Control must require a dedicated browser/UI test run before the task is considered truly complete.

For UI-facing work, browser validation is not optional.
Implementation without browser verification is incomplete.

### 8.2 UI test run flow

1. execution run marks implementation complete
2. system creates `ui_test_requested` event
3. system starts a `ui_test` run
4. test run produces:
   - pass/fail
   - summary
   - screenshot(s) if possible
   - reproduction note on failure
5. system updates task outcome

### 8.3 Pass case

If UI test passes:
- emit a browser-test success event
- complete the task
- emit `done`
- send completion notification

### 8.3.1 Completion rule for UI work

If `needsUiTest = true`, a task should not be treated as done until browser validation passes.

### 8.4 Fail case

If UI test fails:
- emit `ui_test_failed`
- create a new bug task automatically
- link bug to original task via `parentTaskId`
- move bug to `triage`
- original task may either:
  - remain `in_progress` if actively being iterated immediately, or
  - move to `blocked` / `done_with_known_issue` later if we ever add that model

**v1 recommendation:**
- keep it simple:
  - original implementation task becomes `blocked`
  - blockerReason = `technical_failure`
  - bug task enters `triage`

---

## 8.5 Multi-session collaboration model

For important implementation work, especially UI-facing work, Mission Control should support separate sessions/runs for:

1. **execution**
   - builds the feature
2. **ui_test / QA validation**
   - verifies what was actually implemented
   - should inspect the resulting behavior, not just trust builder summaries
3. **ux_review**
   - evaluates usability, visual hierarchy, and interaction clarity

### 8.5.1 Why this separation matters

A builder session should not be the only authority on whether work is complete.

Key rule:
- **implemented != validated**

A task may be implemented, but until QA/browser validation passes, it is not validated.

### 8.5.2 QA session responsibilities

A QA session should receive:
- task id
- objective
- acceptance criteria
- builder summary
- changed files / changed surfaces
- URL or page to test
- expected flows

A QA session should return:
- pass / fail / partial
- verified behaviors
- unverified behaviors
- reproduction notes
- artifact references when available
- whether a bug or spec-update task should be created

### 8.5.3 UX review responsibilities

A UX review session should evaluate:
- usability
- information hierarchy
- visual clarity
- confusing interactions
- what should be must-fix vs polish

UX findings should not automatically equal bugs; some should become improvement tasks.

## 9. Notification Contract

Target channel:
- **Discord: `céline-notification`**

### 9.1 Notify on these events

Must notify:
- task created
- task picked up
- task blocked
- approval requested
- ui test failed
- bug created
- task done

Optional / batched:
- normal progress updates
- step changes
- digest summaries

### 9.2 Notification design goals

Notifications should be:
- concise
- structured
- linked to task identity
- not spammy
- enough to let Tony know what changed without opening the board every minute

### 9.3 Example notification shape

```txt
[In Progress] MC-12 Mission Control Spec v1
Step 2/5: Writing event schema
Next: Lock notification contract
```

```txt
[Blocked] MC-18 Connect Discord notifications
Reason: needs approval
Needed from Tony: approve Discord channel integration
```

```txt
[UI Test Failed] MC-27 Task detail panel
Bug created: MC-28
Reason: save action did not persist after refresh
```

---

## 10. Approval Model

### 10.1 Default

Internal/local work may auto-start from triage.

Examples:
- coding
- refactoring
- local testing
- writing docs
- creating internal bug tasks
- project organization inside workspace

### 10.2 Requires approval

Tasks should require approval when they involve:
- external communication
- sending messages/emails/posts
- production-impacting actions
- destructive data changes
- secrets / credentials / account access
- purchases or real-money actions
- ambiguous sensitive actions

### 10.3 Approval implementation

```ts
requiresApproval: boolean
approvedAt?: string
approvedBy?: string
```

Runner rule:
- `triage` tasks with `requiresApproval = true` are visible but not pickable until approved.

---

## 11. UI Surfaces (MVP)

### 11.1 Kanban board

Columns:
- Backlog
- Triage
- In Progress
- Blocked
- Done (may be hidden/collapsed by default)

### 11.2 Now Running panel

Show exactly one primary active task summary:
- task title
- project
- step x/y
- current phase
- last action time
- next step

### 11.3 Task detail

Every task should support structured sections:
- Objective
- Acceptance Criteria
- Boundaries
- Plan
- Progress Log
- Result
- Artifact Links
- Related Bugs
- Related Docs

### 11.4 Activity panel

Sections:
- Now Running
- Recent Updates
- Done Digest

---

## 12. Documentation Sync Rules

Mission Control must follow the workspace-wide project protocol in `PROJECT_PROTOCOL.md`.

### 12.1 Required pre-work read

Before meaningful Mission Control work, read:
- `PROJECT_PROTOCOL.md`
- `mission-control/AGENTS.md`
- this spec
- any relevant decision notes if they exist

### 12.2 Required post-work sync

If implementation changes behavior, workflow, schema, contracts, or operator expectations, the docs must be updated in the same work session.

### 12.3 Task schema reservation for doc sync

Mission Control should reserve support for fields like:

```ts
specVersionSeen?: string
requiresSpecUpdate?: boolean
docSyncStatus?: 'in_sync' | 'needs_update' | 'deferred'
lastDocSyncAt?: string
```

### 12.4 Project propagation rule

Because Mission Control will manage future projects, it should eventually help bootstrap the same mechanism for every project it creates or manages:
- project-level `AGENTS.md`
- project spec file
- visible doc-sync status

## 13. Reliability Rules

These are non-negotiable for v1.

### 13.1 Single source of truth

Task status must come from one authoritative store.
Do not let UI, runner, and notifications each invent their own task state.

### 13.2 Atomic pickup

Picking a triage task must atomically:
- verify task is still pickable
- assign a run id
- acquire lock/lease
- transition to `in_progress`
- emit pickup event

### 13.3 Idempotent notifications

If notification delivery retries, duplicate sends should be prevented or tolerated safely.

### 13.4 Structured failure handling

Runner/test failure must always produce:
- an event
- an error summary
- a visible task outcome

No silent failure.

### 13.5 No orphaned runs

If a run crashes or disappears, Mission Control should eventually detect stale runs and surface them as blocked or errored.

---

## 13.1 Roadmap status in project specs

Every project spec should include a roadmap/progress section showing what has reached each stage.

Recommended stages:
- planned
- in_progress
- implemented
- validated
- shipped
- blocked

This distinction is important because:
- implemented does not automatically mean validated
- validated does not always mean shipped

Recommended format: checklist or status table by phase/workstream.

## 13.2 Imported project bootstrap expectation

When a user imports an existing project into Mission Control, the system should eventually help generate:
- initial project spec
- project AGENTS/protocol file
- runbook / playbook drafts
- database doc drafts if relevant
- service/system analysis docs if relevant

These should appear in the docs surface and become editable, linked project knowledge.

## 13.3 Current roadmap status (Mission Control itself)

### Phase A — Spec + repo bootstrap
- [x] project scaffold created
- [x] spec created
- [x] protocol/bootstrap rules created
- [x] GitHub repo published

### Phase B — Local single-user engine
- [x] board UI
- [x] local task store
- [x] task creation
- [x] task editing
- [x] validated state transitions
- [x] structured progress logging
- [x] plan step completion

### Phase C — Runner backbone
- [x] local run model
- [x] local auto-pick prototype
- [x] heartbeat placeholder
- [x] stale-run simulation
- [ ] real session-backed execution orchestration

### Phase D — QA loop
- [x] required browser-test prototype
- [x] UI test pass/fail gating
- [x] bug auto-creation prototype
- [ ] real browser automation harness
- [ ] screenshots / artifact capture
- [ ] structured test reports

### Phase E — Multi-session review
- [ ] qa_review run skeleton in app
- [ ] ux_review run skeleton in app
- [ ] review result capture
- [ ] promote review findings to bug / improvement / spec-update tasks

### Phase F — Notifications
- [ ] Discord event delivery
- [ ] anti-spam digesting

### Phase G — Docs / project import
- [ ] docs surface for imported projects
- [ ] bootstrap generated specs/protocols/playbooks
- [ ] db/service analysis doc generation

## 14. MVP Success Criteria

Mission Control v1 is successful when all of the following are true:

1. Tony can create tasks on the board.
2. Triage tasks auto-start unless approval is required.
3. Only one active run can own a task at a time.
4. In Progress tasks show structured progress.
5. UI tasks can trigger a dedicated test run.
6. Test failures automatically create bug tasks.
7. Blocked tasks clearly say what is needed.
8. Done tasks produce a concise result summary.
9. Key events reliably notify `céline-notification`.
10. Tony can understand what Celine is doing from the board + activity feed alone.

---

## 15. Build Order Recommendation

### Phase A — Spec + repo bootstrap
- create standalone repo
- define data model
- define state machine
- define event model

### Phase B — Local single-user engine
- browser-local task store (localStorage for MVP)
- board UI
- validated state transitions
- activity feed derived from task creation, edits, transitions, and progress updates
- minimum task creation form
- task detail editing
- structured progress logging
- plan step completion UI

### Phase C — Runner backbone
- triage pickup logic
- run tracking
- local runner prototype controls
- heartbeat placeholder
- stale-run simulation / error surfacing
- progress updates

### Phase D — QA loop
- required browser-test trigger for UI tasks
- ui_test run records
- pass/fail task gating
- failure artifacts (prototype placeholders first)
- bug auto-creation

### Phase E — Notifications
- Discord channel integration
- digest / anti-spam behavior

### Phase F — Docs integration
- docs by project
- task ↔ doc linking

---

## 16. Open Questions for v1.1+

- Should blocked tasks support SLA / reminder timers?
- Should there be a separate concept of `epic` or `initiative` above tasks?
- Should bug tasks inherit acceptance criteria from parent tasks automatically?
- Should docs be markdown-file based, database based, or hybrid?
- Should done items disappear from the board after N days and move fully into history?
