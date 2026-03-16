# Browser Review Harness

This document defines the first real "eyes" layer for Mission Control QA and UX review.

## Goal

QA and UX sessions must be able to open the running app in a browser, inspect what was actually built, and produce review outputs based on visible behavior.

Key rule:
- builder summaries are not enough
- browser-visible validation is required for UI work

## Current local harness

Mission Control currently uses `peekaboo` on macOS as the browser-observation / interaction layer.

Verified locally:
- Safari can be launched against the local Mission Control URL
- Peekaboo can capture and annotate the window
- Interactive elements can be detected from the running app

## Quickstart

Start the app locally:

```bash
npm run --workspace mission-control dev
```

Run a browser-review capture:

```bash
./mission-control/scripts/browser-review.sh
```

Optional custom URL:

```bash
./mission-control/scripts/browser-review.sh http://127.0.0.1:4173/
```

The harness now saves:
- annotated screenshot path
- raw `peekaboo see --json` artifact file
- `latest.json` convenience pointer for the newest capture
- snapshot id echoed in terminal for follow-up review/test actions

Recommended review loop:
1. run the harness against the local app
2. paste screenshot path, snapshot id, target URL, and any evidence links into the Mission Control review form
3. submit QA or UX review result
4. verify the task-level notification preview reflects updated review gates
5. create follow-up improvement/spec-update tasks when findings require it

UX review expectation:
- UI tasks should carry a UX review requirement until a UX review passes
- push/digest output should make pending UX review visible so unfinished polish is not hidden

Notification bridge:
- `npm run --workspace mission-control digest` renders Discord-friendly bullet output from JSON task/run/activity state
- the app now exposes a manual **Export state JSON** action to produce a handoff snapshot
- the digest helper now prefers `/tmp/mission-control/state.json` before falling back to sample data
- current blocker: the export still downloads via browser UX rather than writing directly to `/tmp/mission-control/state.json`
- next bridge plan is documented in `docs/state-export-bridge.md`

## What the harness should support next

### QA browser review
- open target URL
- capture annotated page state
- click through required flow(s)
- record pass/fail/partial
- save artifact references
- promote failures to bug tasks

### UX browser review
- open target URL
- capture visible layout and interaction structure
- identify hierarchy/usability issues
- classify must-fix vs polish
- promote serious findings to improvement tasks

## Current known limitation

This is still a local harness/prototype.
The Mission Control app can model QA/UX review runs, but does not yet directly invoke `peekaboo` from inside the app runtime.

That is the next integration step.
