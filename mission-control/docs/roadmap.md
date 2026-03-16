# Mission Control Roadmap

## Current focus

Advance Mission Control from a local board prototype into an autonomous review/development loop with real QA + UX evidence capture and notification-friendly outputs.

## Shipped in local prototype

- canonical task states with validated transitions
- local-first task/activity/run store
- task intake, editing, progress logging, and plan-step completion
- runner pickup / heartbeat / stale-run simulation
- browser-test gating with auto-created bug follow-up tasks
- QA review and UX review run modeling
- review artifact fields for summary, findings, screenshot path, snapshot id, evidence links, and target URL
- task detail surface for review artifact history
- missing-evidence warnings on review artifacts plus dashboard counts for incomplete reviews
- notification digest helpers + UI preview for push-friendly summaries
- copy-ready board/task digest actions for push-message handoff
- digest output now includes missing-evidence counts and example incomplete review runs
- browser review harness script that saves reusable JSON artifacts

## Next priorities

### 1. Browser-capable QA execution loop
- invoke the browser review harness from a real runner path
- persist artifact JSON references back into task/run state automatically
- support multi-step QA flows, not just single captures

### 2. UX review involvement as a required lane
- make UX review expectation visible on UI work
- surface per-task UX gate status in board/detail UI and notification previews
- separate must-fix UX findings from polish
- promote serious UX findings into improvement tasks with evidence attached

### 3. Evidence + review artifact handling
- track artifact timestamps and latest evidence per task
- add lightweight import/export for review artifacts
- support screenshot + snapshot bundles in a stable review folder
- escalate incomplete review submissions (missing screenshot/snapshot/links) sooner than task-detail-only visibility

### 4. Notification-ready outputs
- generate compact summaries suitable for Discord push notifications
- include blockers, next steps, and evidence references
- avoid noisy pushes by focusing on state changes and review outcomes
- wire the digest helper to real exported/app state instead of sample JSON

### 5. Spec/docs sync
- keep README, roadmap, and harness docs aligned with what the local prototype actually does
- document blockers whenever a real integration path is missing
- maintain `docs/state-export-bridge.md` as the short-term plan for escaping browser-only state

## Known blockers

- app runtime still does not directly invoke `peekaboo`; the browser harness is still shell-driven
- Discord push wiring is still modeled, not fully executed from app state transitions
- no backend persistence yet; current state remains browser-local
- exported state still requires a manual browser download; `/tmp/mission-control/state.json` is not refreshed automatically yet
