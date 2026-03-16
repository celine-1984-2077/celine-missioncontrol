# PROJECT_PROTOCOL.md - Spec & Doc Sync Rules

This file defines the default development protocol for **every project built in this workspace**, including Mission Control and any future project created through Mission Control.

## Goal

Prevent drift between:
- implementation
- project specification
- operating rules
- decision history

The rule is simple:

> If a project has a spec, I must read it before meaningful work, and update it when the implementation changes the contract.

---

## 1. Applies To

This protocol applies to:
- Mission Control
- any new repo/folder created for Tony
- any project spawned or managed through Mission Control
- any substantial feature branch or sub-project with its own workflow/contract

---

## 2. Required Project Docs

Each project should have, at minimum:

1. **Project spec**
   - examples:
     - `spec.md`
     - `project-spec.md`
     - `mission-control-spec-v1.md`
2. **Project-level AGENTS.md**
   - local execution rules for that repo/folder
3. **Decision log or notes file**
   - optional at first, but recommended once architecture decisions start accumulating

---

## 3. Mandatory Pre-Work Read Rule

Before starting meaningful work in a project, I must read:
1. the nearest project-level `AGENTS.md` if it exists
2. the current project spec file
3. any referenced decision log/doc if the task touches architecture, workflow, or contracts

"Meaningful work" includes:
- coding
- refactoring
- schema changes
- workflow changes
- automation changes
- notification changes
- QA/test loop changes
- task/state model changes

It does **not** necessarily require a fresh spec read for tiny isolated edits like:
- typo fixes
- trivial copy changes
- comments-only edits

---

## 4. Mandatory Post-Work Sync Rule

After completing work, I must ask:

1. Did I change behavior?
2. Did I change a contract, workflow, state machine, schema, or operator expectation?
3. Did I introduce a new rule or exception?
4. Did I make an old spec statement no longer true?

If yes to any of these, I must update at least one of:
- the project spec
- the decision log
- the project AGENTS.md
- the task record/changelog

No silent divergence.

---

## 5. When Spec Updates Are Mandatory

A spec/doc update is mandatory when work changes:
- canonical task states
- state transitions
- event schemas
- notification behavior
- QA/testing flow
- approval policy
- task intake rules
- persistence model
- data contracts
- project folder/repo conventions
- any behavior that Tony will rely on operationally

---

## 6. Allowed Alternatives to Direct Spec Edits

If a change is temporary, experimental, or too detailed for the main spec, I may instead:
- add a decision-log entry
- add an ADR-style note
- add a changelog note
- annotate the task with `requiresSpecUpdate=true` until reconciled

But I should not leave major implementation changes undocumented.

---

## 7. Task-Level Doc Sync Fields

Projects should reserve fields like:

```ts
specVersionSeen?: string
requiresSpecUpdate?: boolean
docSyncStatus?: 'in_sync' | 'needs_update' | 'deferred'
lastDocSyncAt?: string
```

These fields help make documentation sync visible rather than implicit.

---

## 8. Commit Discipline

For meaningful workflow or architecture changes:
- implementation and documentation should ideally land in the same commit
- if not possible, the follow-up doc update should happen immediately after
- do not let doc debt accumulate casually

---

## 9. Project Bootstrap Rule

When creating a new project repo/folder, I should create at least:
- `README.md`
- `AGENTS.md`
- an initial spec file (or explicit placeholder pointing to where the spec lives)

That way each project starts with an operating contract instead of relying on memory.

---

## 10. Mission Control Special Case

Mission Control is the system that will manage other projects.
So it must follow this protocol itself, and also propagate this protocol to projects created under its control.

That means Mission Control should eventually:
- expose project specs in UI
- track doc-sync status per task/project
- make spec drift visible
- encourage or enforce bootstrap docs for newly created projects
