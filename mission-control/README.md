# Mission Control

Standalone repo/folder for Tony's personal operator console with Celine.

Initial source of truth:
- ../mission-control-spec-v1.md

Current state:
- Phase B local-first MVP is in place
- React + Vite app scaffolded
- board UI, activity feed, task detail panel, and doc-sync fields are visible
- local task store persists to browser localStorage
- task creation form is wired
- task detail editing is wired
- structured progress updates can be added per task
- steps can be completed from the plan UI
- run records are tracked locally
- local runner prototype can auto-pick triage work
- run heartbeat and stale-run simulation are visible in UI
- UI tasks can start a required browser-test run in the local prototype
- browser-test pass/fail can gate completion in the local prototype
- browser-test failure can auto-create a linked bug task in triage
- QA review and UX review skeleton runs can be spawned
- QA review failure can auto-create follow-up bug tasks
- initial local browser-review harness is documented under `docs/browser-review-harness.md`
- state transitions are validated against the canonical state machine
- activity entries are generated from task creation, edits, transitions, progress updates, runner actions, and browser-test actions

Planned focus:
- Kanban task board
- Activity/event stream
- Execution runner
- QA/test loop
- Discord notifications

## Local development

From the workspace root:

```bash
npm install
npm run --workspace mission-control dev
```

Build:

```bash
npm run --workspace mission-control build
```
