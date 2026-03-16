# Mission Control - Local AGENTS.md

This file defines how to work inside the `mission-control/` project.

## Required Reading Before Meaningful Work

Before making meaningful changes in this project, read:
1. `../PROJECT_PROTOCOL.md`
2. `../mission-control-spec-v1.md`
3. this file

If a future local decision log exists and the task touches architecture/workflow/contracts, read that too.

## Scope

This repo/folder is for Mission Control only.
Do not mix in unrelated project code.

## Documentation Sync Rule

If a change affects:
- task states
- transitions
- event schema
- notification behavior
- QA/test flow
- approval rules
- task/doc/project relationships
- operational expectations

then update the relevant docs in the same work session:
- `../mission-control-spec-v1.md`
- local decision log / changelog (if present)
- this file, if the local workflow changed

## No Silent Drift

Implementation should not quietly diverge from the spec.
If reality changes, update the docs.
If the docs are temporarily incomplete, leave an explicit note rather than pretending they are current.

## Project Bootstrap Rule

Any substantial sub-area added to Mission Control (runner, notifications, docs system, QA loop) should keep its contract documented so future work does not depend on memory alone.
