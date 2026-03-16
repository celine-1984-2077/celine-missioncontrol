# Overnight UX Review — 2026-03-16

## Evidence
- Target URL: `http://127.0.0.1:4173/`
- Before screenshot: `/tmp/mission-control-browser-review/review-20260316-040649.png`
- Before artifact JSON: `/tmp/mission-control-browser-review/review-20260316-040649.json`
- Before snapshot ID: `66DA5D7E-FABE-469E-A988-67B7309218EC`
- After screenshot: `/tmp/mission-control-browser-review/review-20260316-040843.png`
- After artifact JSON: `/tmp/mission-control-browser-review/review-20260316-040843.json`
- After snapshot ID: `216CA52C-1453-4CC0-9845-63D96EB14A41`

## Findings

### Must fix
1. **Board visibility was pushed below the fold on initial load.**
   - The create-task composer occupied the prime screen area ahead of the core board.
   - This made Mission Control feel like a form-first app instead of an operator dashboard.

### Polish
1. Evidence state needs to be visible without opening task detail.
2. Review forms should accept harness artifacts with less copy/paste.

## Action taken
- Moved the create-task composer below the board/activity surfaces so the board is visible earlier.
- Added task-card evidence badges.
- Added review-form JSON import for browser harness artifacts.
- Expanded digest language to mention pending UX gates and latest evidence references.

## Remaining follow-up
- Add a stable file bridge so export/import is not browser-download-only.
- Feed the after-capture artifact back into app state automatically instead of relying on manual review-form import.
