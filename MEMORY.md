# MEMORY.md

## People

- Tony is the human I am helping. He is a programmer at Salesforce and also takes on software development projects outside of work.

## Identity

- My name is Celine.
- Tony bought this computer as my base/home and wants me to become his 7/24 assistant.

## Active / Known Projects

- TuanInsurance: a WeChat Mini Program plus SPA for Tony's father's insurance company. The code is already in the workspace.
- Personal system website / Mission Control: Tony wants a website that acts as his personal operating system.
- Future project mentioned: a database-building project, details to be added later.

## Personal System Website Vision

Core near-term priority:
- Build a reliable self-development + QA + notification framework.
- Main control surface is a task-management board (Mission Control / kanban-style).
- Desired flow: backlog ideas -> triage queue -> in progress -> done, with automated scanning and execution.
- Every task should produce visible state updates and notifications in Tony's Discord `céline-notification` channel.
- Each task should run in its own session.
- Any code task with UI/user interaction should trigger a dedicated browser-testing session.
- If testing fails, create a bug item and feed it back into the board so the system can self-loop.
- The personal system website should live in its own separate repo/folder.
- The first implementation should focus only on Mission Control itself.

Other planned website areas:
- Project docs / runbooks / durable project memory
- Notion-connected docs, todo list, and excerpt notebook
- Later: vocabulary cards, photo management, 3D walk-throughs of places lived, public-facing personal world/site, portfolio, freelancing, photography, family voice/video archive, WeChat chat import

## Product / UX Structure Tony Wants

- Docs should be organized by project.
- Tasks should carry project tags.
- Tasks, docs, and activity are different layers:
  - Task = workflow
  - Doc = knowledge base
  - Activity = event stream
- Preferred task protocol from prior work:
  - Strong status semantics
  - Clear Now Running area
  - Structured task details (Objective / Plan / Progress Log / Result)
  - Done digest / concise completion summaries

## Confirmed Mission Control Decisions

- Canonical task states are: Backlog, Triage, In Progress, Blocked, Done.
- Triage should default to auto-start.
- Sensitive/ambiguous tasks can opt into approval via `requiresApproval`.
- Review and Testing should not be long-lived primary board columns; they are better modeled as phases/events/flags.

## Operating Preferences

- When Tony says to remember something, I should write it down explicitly in memory/files.
- For uncertain details, I should ask clarification questions instead of guessing.
- Tony wants a persistent project markdown file to track ideas, understanding, and breakdowns for the personal system website.
- Tony wants the read-spec / update-spec mechanism to apply not just to Mission Control, but to every project developed through it.
- Tony wants us to explicitly track two parallel things: (1) OpenClaw protocol/configuration patterns and (2) Mission Control product/application design and development.
- Tony wants a future split between a public/shareable starter version and a personal plugin/customization layer for his own workflows (for example, French learning and other personal modules).
