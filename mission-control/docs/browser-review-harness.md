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
