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

---

## 2. Core Product Model

### 2.1 Three layers

- **Task** = unit of execution
- **Doc** = durable knowledge / runbook / decision record
- **Activity** = event stream showing what happened

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
  kind: 'execution' | 'ui_test'
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

If `needsUiTest = true`, Mission Control should request a dedicated UI test run after implementation completes.

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
- emit `ui_test_passed`
- complete the task
- emit `done`
- send completion notification

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
- activity feed derived from task creation and transitions
- minimum task creation form

### Phase C — Runner backbone
- triage polling
- pickup logic
- run tracking
- progress updates

### Phase D — QA loop
- ui test run trigger
- failure artifacts
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
