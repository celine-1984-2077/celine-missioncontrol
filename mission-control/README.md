# Mission Control

Standalone repo/folder for Tony's personal operator console with Celine.

Initial source of truth:
- ../mission-control-spec-v1.md

Current state:
- Phase B skeleton is in place
- React + Vite app scaffolded
- board UI, activity feed, task detail panel, and doc-sync fields are visible with sample data

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
