# State Export Bridge

This note defines the shortest path from the current browser-local Mission Control prototype to a usable autonomous loop with external QA/UX runners and Discord-ready notifications.

## Current blocker

Mission Control state lives in browser `localStorage`.

That means:
- the UI can model runs, reviews, and notification digests
- the shell/browser-review helpers cannot reliably read current state
- the digest CLI currently needs sample/exported JSON instead of real runtime state
- the app's Export action still downloads JSON through the browser instead of refreshing `/tmp/mission-control/state.json`

## Immediate goal

Create a lightweight export/import bridge before adding any real backend.

The bridge should let Mission Control:
1. export current state to a stable JSON file
2. let shell helpers / browser review harnesses read that JSON
3. let follow-up tooling write back artifact references or status updates in a controlled way

## Recommended v1 shape

### Export file
Store the latest exported state in a predictable location, for example:

```text
/tmp/mission-control/state.json
```

Structure:
- `tasks`
- `runs`
- `activity`
- `exportedAt`
- `sourceVersion`

### Export trigger
Add a manual UI button first:
- **Export state JSON**

Then later support:
- export on review submission
- export on major task state changes
- export before notification rendering

### Import path
Keep import narrow and safe.

Recommended first import use cases:
- attach browser review artifact metadata
- mark review run completed
- add follow-up improvement/spec-update tasks

Do **not** build a wide-open arbitrary state overwrite flow first.

## Why this order

This keeps the system local-first while unlocking:
- real digest rendering from live state
- browser-review artifact attachment without manual copy/paste everywhere
- future Discord push wiring from exported state snapshots

## Next implementation slice

1. ✅ add `Export state JSON` action in the app
2. ⛔ write current state to `/tmp/mission-control/state.json` (still blocked; export is browser-download-only today)
3. ✅ update `render-digest.mjs` to default to that file before falling back to sample JSON
4. ✅ document the export path in README and browser-review harness docs
5. ✅ add a narrow review-artifact import helper in the UI for harness JSON
6. next: replace manual download/import with a stable file write/read bridge

## Non-goals for this slice

- backend/database persistence
- multi-user sync
- fully automatic bidirectional orchestration
- direct in-app execution of `peekaboo`

Those can come after the file-based bridge exists.
