import { activity as seedActivity, runs as seedRuns, tasks as seedTasks } from './sampleData'
import type { ActivityEvent, DocSyncStatus, Run, Task, TaskStatus } from './types'

const TASKS_KEY = 'mission-control/tasks'
const EVENTS_KEY = 'mission-control/events'
const RUNS_KEY = 'mission-control/runs'

const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['triage'],
  triage: ['backlog', 'in_progress', 'blocked'],
  in_progress: ['triage', 'blocked', 'done'],
  blocked: ['triage', 'backlog'],
  done: [],
}

export interface MissionControlState {
  tasks: Task[]
  activity: ActivityEvent[]
  runs: Run[]
}

export interface NotificationDigest {
  headline: string
  lines: string[]
}

export interface TaskDraft {
  title: string
  objective: string
  acceptanceCriteria: string[]
  boundaries?: string[]
  type: Task['type']
  priority: Task['priority']
  status: 'backlog' | 'triage' | 'blocked'
  requiresApproval: boolean
  needsUiTest: boolean
}

export interface TaskUpdateInput {
  title: string
  objective: string
  acceptanceCriteria: string[]
  boundaries?: string[]
  nextStep?: string
  docSyncStatus?: DocSyncStatus
  requiresSpecUpdate?: boolean
}

export interface ReviewSubmissionInput {
  summary: string
  findings?: string
  screenshotPath?: string
  snapshotId?: string
  evidenceLinks?: string[]
  targetUrl?: string
}

export interface ReviewEvidenceSummary {
  latestRun?: Run
  latestCompletedRun?: Run
  latestArtifact?: Run['artifact']
  missingEvidence: boolean
}

export function loadState(): MissionControlState {
  if (typeof window === 'undefined') {
    return { tasks: seedTasks, activity: seedActivity, runs: seedRuns }
  }

  const storedTasks = window.localStorage.getItem(TASKS_KEY)
  const storedEvents = window.localStorage.getItem(EVENTS_KEY)
  const storedRuns = window.localStorage.getItem(RUNS_KEY)

  if (!storedTasks || !storedEvents || !storedRuns) {
    saveState({ tasks: seedTasks, activity: seedActivity, runs: seedRuns })
    return { tasks: seedTasks, activity: seedActivity, runs: seedRuns }
  }

  return {
    tasks: JSON.parse(storedTasks) as Task[],
    activity: JSON.parse(storedEvents) as ActivityEvent[],
    runs: JSON.parse(storedRuns) as Run[],
  }
}

export function saveState(state: MissionControlState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(state.tasks))
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(state.activity))
  window.localStorage.setItem(RUNS_KEY, JSON.stringify(state.runs))
}

export function transitionTask(state: MissionControlState, taskId: string, nextStatus: TaskStatus): MissionControlState {
  const task = state.tasks.find((item) => item.id === taskId)
  if (!task) return state

  const allowed = allowedTransitions[task.status]
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Invalid transition: ${task.status} -> ${nextStatus}`)
  }

  const now = new Date().toISOString()
  const updatedTask: Task = {
    ...task,
    status: nextStatus,
    updatedAt: now,
    lastEventAt: now,
    completedAt: nextStatus === 'done' ? now : task.completedAt,
    currentStepIndex: nextStatus === 'in_progress' && typeof task.currentStepIndex !== 'number' ? 0 : task.currentStepIndex,
    activeRunId: nextStatus === 'done' ? undefined : task.activeRunId,
  }

  const nextRuns = task.activeRunId && (nextStatus === 'done' || nextStatus === 'blocked')
    ? finalizeRun(state.runs, task.activeRunId, nextStatus === 'done' ? 'passed' : 'failed', now)
    : state.runs

  const event = buildTransitionEvent(task, nextStatus, now)
  return commit({
    tasks: state.tasks.map((item) => (item.id === taskId ? updatedTask : item)),
    activity: [event, ...state.activity],
    runs: nextRuns,
  })
}

export function createTask(state: MissionControlState, draft: TaskDraft): MissionControlState {
  const now = new Date().toISOString()
  const nextId = `MC-${state.tasks.length + 1}`
  const newTask: Task = {
    id: nextId,
    title: draft.title,
    objective: draft.objective,
    acceptanceCriteria: draft.acceptanceCriteria,
    boundaries: draft.boundaries,
    status: draft.status,
    projectId: 'mission-control',
    type: draft.type,
    requiresApproval: draft.requiresApproval,
    priority: draft.priority,
    createdBy: 'tony',
    source: 'board',
    assignee: 'celine',
    needsUiTest: draft.needsUiTest,
    requiresUxReview: draft.needsUiTest,
    plan: [
      { id: `${nextId}-1`, label: 'Clarify and structure the task', status: 'pending' },
      { id: `${nextId}-2`, label: 'Execute implementation', status: 'pending' },
      { id: `${nextId}-3`, label: 'Wrap up result and handoff', status: 'pending' },
    ],
    lastEventAt: now,
    createdAt: now,
    updatedAt: now,
    specVersionSeen: 'v1',
    requiresSpecUpdate: false,
    docSyncStatus: 'in_sync',
    lastDocSyncAt: now,
  }

  const event: ActivityEvent = {
    id: crypto.randomUUID(),
    taskId: nextId,
    projectId: 'mission-control',
    type: 'task_created',
    title: `Task created: ${draft.title}`,
    body: `Entered ${draft.status.replace('_', ' ')} with ${draft.acceptanceCriteria.length} acceptance criteria item(s).`,
    createdAt: now,
    createdBy: 'tony',
  }

  return commit({ tasks: [newTask, ...state.tasks], activity: [event, ...state.activity], runs: state.runs })
}

export function updateTask(state: MissionControlState, taskId: string, input: TaskUpdateInput): MissionControlState {
  const task = state.tasks.find((item) => item.id === taskId)
  if (!task) return state
  const now = new Date().toISOString()

  const updatedTask: Task = {
    ...task,
    title: input.title,
    objective: input.objective,
    acceptanceCriteria: input.acceptanceCriteria,
    boundaries: input.boundaries,
    nextStep: input.nextStep,
    docSyncStatus: input.docSyncStatus ?? task.docSyncStatus,
    requiresSpecUpdate: input.requiresSpecUpdate ?? task.requiresSpecUpdate,
    updatedAt: now,
    lastEventAt: now,
    lastDocSyncAt: input.docSyncStatus ? now : task.lastDocSyncAt,
  }

  const event: ActivityEvent = {
    id: crypto.randomUUID(),
    taskId: task.id,
    projectId: task.projectId,
    type: 'plan_updated',
    title: `${task.id} details updated`,
    body: 'Objective, acceptance criteria, boundaries, or doc-sync fields changed.',
    createdAt: now,
    createdBy: 'celine',
  }

  return commit({
    tasks: state.tasks.map((item) => (item.id === taskId ? updatedTask : item)),
    activity: [event, ...state.activity],
    runs: state.runs,
  })
}

export function addProgressEvent(state: MissionControlState, taskId: string, message: string, nextStep?: string): MissionControlState {
  const task = state.tasks.find((item) => item.id === taskId)
  if (!task) return state
  const now = new Date().toISOString()

  const updatedTask: Task = {
    ...task,
    nextStep: nextStep ?? task.nextStep,
    updatedAt: now,
    lastEventAt: now,
  }

  const event: ActivityEvent = {
    id: crypto.randomUUID(),
    taskId: task.id,
    projectId: task.projectId,
    runId: task.activeRunId,
    type: 'progress',
    title: `${task.id} progress update`,
    body: message,
    createdAt: now,
    createdBy: 'celine',
  }

  return commit({
    tasks: state.tasks.map((item) => (item.id === taskId ? updatedTask : item)),
    activity: [event, ...state.activity],
    runs: state.runs,
  })
}

export function completeStep(state: MissionControlState, taskId: string, stepId: string): MissionControlState {
  const task = state.tasks.find((item) => item.id === taskId)
  if (!task) return state
  const now = new Date().toISOString()

  const stepIndex = task.plan.findIndex((step) => step.id === stepId)
  if (stepIndex === -1) return state

  const nextPlan = task.plan.map((step, index) => {
    if (index < stepIndex) return { ...step, status: 'done' as const }
    if (index === stepIndex) return { ...step, status: 'done' as const }
    if (index === stepIndex + 1) return { ...step, status: 'in_progress' as const }
    return step
  })

  const updatedTask: Task = {
    ...task,
    plan: nextPlan,
    currentStepIndex: Math.min(stepIndex + 1, nextPlan.length - 1),
    nextStep: nextPlan[stepIndex + 1]?.label,
    updatedAt: now,
    lastEventAt: now,
  }

  const event: ActivityEvent = {
    id: crypto.randomUUID(),
    taskId: task.id,
    projectId: task.projectId,
    runId: task.activeRunId,
    type: 'step_completed',
    title: `${task.id} step completed`,
    body: task.plan[stepIndex]?.label,
    createdAt: now,
    createdBy: 'celine',
  }

  return commit({
    tasks: state.tasks.map((item) => (item.id === taskId ? updatedTask : item)),
    activity: [event, ...state.activity],
    runs: state.runs,
  })
}

export function autoPickNextTask(state: MissionControlState): MissionControlState {
  const candidate = state.tasks.find((task) => task.status === 'triage' && !task.requiresApproval && !task.activeRunId)
  if (!candidate) return state

  const now = new Date().toISOString()
  const runId = `RUN-${state.runs.length + 1}`
  const firstPendingIndex = candidate.plan.findIndex((step) => step.status !== 'done')
  const nextPlan = candidate.plan.map((step, index) => {
    if (index === firstPendingIndex && step.status === 'pending') return { ...step, status: 'in_progress' as const }
    return step
  })

  const updatedTask: Task = {
    ...candidate,
    status: 'in_progress',
    activeRunId: runId,
    currentStepIndex: firstPendingIndex >= 0 ? firstPendingIndex : candidate.currentStepIndex,
    nextStep: nextPlan[firstPendingIndex]?.label ?? candidate.nextStep,
    updatedAt: now,
    lastEventAt: now,
  }

  const run: Run = {
    id: runId,
    taskId: candidate.id,
    kind: 'execution',
    status: 'running',
    startedAt: now,
    heartbeatAt: now,
    summary: `Auto-picked from triage for ${candidate.title}`,
  }

  const events: ActivityEvent[] = [
    {
      id: crypto.randomUUID(),
      taskId: candidate.id,
      projectId: candidate.projectId,
      runId,
      type: 'task_picked_up',
      title: `${candidate.id} picked up from triage`,
      body: 'Runner selected this task for execution.',
      createdAt: now,
      createdBy: 'system',
    },
    {
      id: crypto.randomUUID(),
      taskId: candidate.id,
      projectId: candidate.projectId,
      runId,
      type: 'task_started',
      title: `${candidate.id} execution started`,
      body: `Run ${runId} is now active.`,
      createdAt: now,
      createdBy: 'system',
    },
  ]

  return commit({
    tasks: state.tasks.map((task) => (task.id === candidate.id ? updatedTask : task)),
    activity: [...events.reverse(), ...state.activity],
    runs: [run, ...state.runs],
  })
}

export function heartbeatRun(state: MissionControlState, runId: string): MissionControlState {
  const run = state.runs.find((item) => item.id === runId)
  if (!run) return state
  const now = new Date().toISOString()
  return commit({
    ...state,
    runs: state.runs.map((item) => (item.id === runId ? { ...item, heartbeatAt: now } : item)),
  })
}

export function markRunStale(state: MissionControlState, runId: string): MissionControlState {
  const run = state.runs.find((item) => item.id === runId)
  if (!run) return state
  const task = state.tasks.find((item) => item.id === run.taskId)
  const now = new Date().toISOString()

  const updatedRun: Run = {
    ...run,
    status: 'failed',
    endedAt: now,
    errorSummary: 'Run marked stale by local prototype check.',
  }

  const updatedTask = task
    ? {
        ...task,
        status: 'blocked' as const,
        activeRunId: undefined,
        blockerDetail: 'Run heartbeat went stale in local prototype.',
        updatedAt: now,
        lastEventAt: now,
      }
    : undefined

  const event: ActivityEvent = {
    id: crypto.randomUUID(),
    taskId: run.taskId,
    projectId: task?.projectId ?? 'mission-control',
    runId,
    type: 'runner_error',
    title: `${run.taskId} run marked stale`,
    body: 'Prototype stale-run detector moved task to blocked.',
    createdAt: now,
    createdBy: 'system',
  }

  return commit({
    tasks: updatedTask ? state.tasks.map((item) => (item.id === run.taskId ? updatedTask : item)) : state.tasks,
    activity: [event, ...state.activity],
    runs: state.runs.map((item) => (item.id === runId ? updatedRun : item)),
  })
}

export function requestUiTest(state: MissionControlState, taskId: string): MissionControlState {
  const task = state.tasks.find((item) => item.id === taskId)
  if (!task || !task.needsUiTest) return state
  const now = new Date().toISOString()
  const runId = `RUN-${state.runs.length + 1}`

  const uiRun: Run = {
    id: runId,
    taskId,
    kind: 'ui_test',
    status: 'running',
    startedAt: now,
    heartbeatAt: now,
    summary: `Browser validation requested for ${task.title}`,
  }

  const event: ActivityEvent = {
    id: crypto.randomUUID(),
    taskId,
    projectId: task.projectId,
    runId,
    type: 'task_started',
    title: `${task.id} browser test started`,
    body: 'UI validation is now required before completion.',
    createdAt: now,
    createdBy: 'system',
  }

  return commit({
    tasks: state.tasks.map((item) => (item.id === taskId ? { ...item, activeRunId: runId, updatedAt: now, lastEventAt: now } : item)),
    activity: [event, ...state.activity],
    runs: [uiRun, ...state.runs],
  })
}

export function completeUiTest(state: MissionControlState, taskId: string, passed: boolean): MissionControlState {
  const task = state.tasks.find((item) => item.id === taskId)
  if (!task || !task.activeRunId) return state
  const run = state.runs.find((item) => item.id === task.activeRunId)
  if (!run || run.kind !== 'ui_test') return state
  const now = new Date().toISOString()

  if (passed) {
    const updatedTask: Task = {
      ...task,
      status: 'done',
      activeRunId: undefined,
      completedAt: now,
      updatedAt: now,
      lastEventAt: now,
    }
    const updatedRun: Run = {
      ...run,
      status: 'passed',
      endedAt: now,
      summary: 'Browser validation passed.',
    }
    const events: ActivityEvent[] = [
      {
        id: crypto.randomUUID(),
        taskId: task.id,
        projectId: task.projectId,
        runId: run.id,
        type: 'progress',
        title: `${task.id} browser test passed`,
        body: 'Required UI/browser validation completed successfully.',
        createdAt: now,
        createdBy: 'system',
      },
      {
        id: crypto.randomUUID(),
        taskId: task.id,
        projectId: task.projectId,
        runId: run.id,
        type: 'done',
        title: `${task.id} completed after browser validation`,
        body: 'Task moved to done only after required browser verification passed.',
        createdAt: now,
        createdBy: 'system',
      },
    ]
    return commit({
      tasks: state.tasks.map((item) => (item.id === task.id ? updatedTask : item)),
      activity: [...events.reverse(), ...state.activity],
      runs: state.runs.map((item) => (item.id === run.id ? updatedRun : item)),
    })
  }

  const bugId = `MC-${state.tasks.length + 1}`
  const bugTask: Task = {
    id: bugId,
    title: `Bug: ${task.title}`,
    objective: `Fix browser-validation failure for ${task.id}.`,
    acceptanceCriteria: ['Root cause is fixed', 'Browser validation passes on retry'],
    boundaries: ['Preserve original task intent'],
    status: 'triage',
    projectId: task.projectId,
    type: 'bug',
    requiresApproval: false,
    priority: 'high',
    createdBy: 'system',
    source: 'bug_loop',
    assignee: 'celine',
    needsUiTest: true,
    requiresUxReview: task.requiresUxReview,
    parentTaskId: task.id,
    plan: [
      { id: `${bugId}-1`, label: 'Reproduce browser failure', status: 'pending' },
      { id: `${bugId}-2`, label: 'Fix implementation', status: 'pending' },
      { id: `${bugId}-3`, label: 'Retest in browser', status: 'pending' },
    ],
    lastEventAt: now,
    createdAt: now,
    updatedAt: now,
    specVersionSeen: task.specVersionSeen,
    requiresSpecUpdate: false,
    docSyncStatus: 'in_sync',
    lastDocSyncAt: now,
  }

  const updatedTask: Task = {
    ...task,
    status: 'blocked',
    activeRunId: undefined,
    blockerDetail: `Browser validation failed. Follow-up bug ${bugId} created.`,
    updatedAt: now,
    lastEventAt: now,
  }

  const updatedRun: Run = {
    ...run,
    status: 'failed',
    endedAt: now,
    errorSummary: 'Browser validation failed in local prototype.',
  }

  const events: ActivityEvent[] = [
    {
      id: crypto.randomUUID(),
      taskId: task.id,
      projectId: task.projectId,
      runId: run.id,
      type: 'ui_test_failed',
      title: `${task.id} browser test failed`,
      body: `Required browser validation failed. Bug ${bugId} created.`,
      createdAt: now,
      createdBy: 'system',
    },
    {
      id: crypto.randomUUID(),
      taskId: bugId,
      projectId: task.projectId,
      type: 'bug_created',
      title: `${bugId} created from browser failure`,
      body: `Follow-up bug created from ${task.id}.`,
      createdAt: now,
      createdBy: 'system',
    },
  ]

  return commit({
    tasks: [bugTask, ...state.tasks.map((item) => (item.id === task.id ? updatedTask : item))],
    activity: [...events.reverse(), ...state.activity],
    runs: state.runs.map((item) => (item.id === run.id ? updatedRun : item)),
  })
}


export function requestReviewRun(state: MissionControlState, taskId: string, kind: 'qa_review' | 'ux_review'): MissionControlState {
  const task = state.tasks.find((item) => item.id == taskId)
  if (!task) return state
  const now = new Date().toISOString()
  const runId = `RUN-${state.runs.length + 1}`
  const run: Run = {
    id: runId,
    taskId,
    kind,
    status: 'running',
    startedAt: now,
    heartbeatAt: now,
    summary: kind === 'qa_review' ? `QA review started for ${task.title}` : `UX review started for ${task.title}`,
  }
  const event: ActivityEvent = {
    id: crypto.randomUUID(),
    taskId,
    projectId: task.projectId,
    runId,
    type: kind === 'qa_review' ? 'qa_review_requested' : 'ux_review_requested',
    title: kind === 'qa_review' ? `${task.id} QA review started` : `${task.id} UX review started`,
    body: kind === 'qa_review'
      ? 'Separate validation session should verify what was actually implemented.'
      : 'Separate UX/design session should review usability and visual clarity.',
    createdAt: now,
    createdBy: 'system',
  }
  return commit({ ...state, runs: [run, ...state.runs], activity: [event, ...state.activity] })
}

export function completeReviewRun(
  state: MissionControlState,
  runId: string,
  outcome: 'pass' | 'fail' | 'submit',
  submission?: ReviewSubmissionInput,
): MissionControlState {
  const run = state.runs.find((item) => item.id === runId)
  if (!run || (run.kind !== 'qa_review' && run.kind !== 'ux_review')) return state
  const task = state.tasks.find((item) => item.id === run.taskId)
  const now = new Date().toISOString()

  const updatedRun: Run = {
    ...run,
    status: outcome === 'fail' ? 'failed' : 'passed',
    endedAt: now,
    summary:
      submission?.summary ||
      (run.kind === 'qa_review'
        ? outcome === 'pass'
          ? 'QA review passed.'
          : 'QA review failed.'
        : 'UX review submitted.'),
    artifact: submission
      ? {
          screenshotPath: submission.screenshotPath,
          snapshotId: submission.snapshotId,
          evidenceLinks: submission.evidenceLinks,
          reviewSummary: submission.summary,
          findings: submission.findings,
          targetUrl: submission.targetUrl,
          capturedAt: now,
        }
      : run.artifact,
  }

  let extraTasks: Task[] = []
  let extraEvents: ActivityEvent[] = []

  if (run.kind === 'qa_review' && outcome === 'fail' && task) {
    const bugId = `MC-${state.tasks.length + 1}`
    extraTasks.push({
      id: bugId,
      title: `QA Bug: ${task.title}`,
      objective: `Address QA validation issues found after implementing ${task.id}.`,
      acceptanceCriteria: ['QA issue resolved', 'Validation passes on retry'],
      boundaries: ['Preserve intended behavior'],
      status: 'triage',
      projectId: task.projectId,
      type: 'bug',
      requiresApproval: false,
      priority: 'high',
      createdBy: 'system',
      source: 'bug_loop',
      assignee: 'celine',
      needsUiTest: task.needsUiTest,
      requiresUxReview: task.requiresUxReview,
      parentTaskId: task.id,
      plan: [
        { id: `${bugId}-1`, label: 'Review QA findings', status: 'pending' },
        { id: `${bugId}-2`, label: 'Fix issue', status: 'pending' },
        { id: `${bugId}-3`, label: 'Re-run validation', status: 'pending' },
      ],
      lastEventAt: now,
      createdAt: now,
      updatedAt: now,
      specVersionSeen: task.specVersionSeen,
      requiresSpecUpdate: false,
      docSyncStatus: 'in_sync',
      lastDocSyncAt: now,
      reviewSummary: submission?.summary,
      evidenceLinks: submission?.evidenceLinks,
    })
    extraEvents.push({
      id: crypto.randomUUID(),
      taskId: bugId,
      projectId: task.projectId,
      type: 'bug_created',
      title: `${bugId} created from QA review`,
      body: `Follow-up QA bug created from ${task.id}.`,
      createdAt: now,
      createdBy: 'system',
    })
  }

  if (run.kind === 'ux_review' && task) {
    extraEvents.push({
      id: crypto.randomUUID(),
      taskId: task.id,
      projectId: task.projectId,
      runId: run.id,
      type: 'ux_review_submitted',
      title: `${task.id} UX review submitted`,
      body: submission?.summary || 'Use this review output to create polish or improvement tasks.',
      createdAt: now,
      createdBy: 'system',
    })
  }

  if (run.kind === 'qa_review' && task) {
    extraEvents.push({
      id: crypto.randomUUID(),
      taskId: task.id,
      projectId: task.projectId,
      runId: run.id,
      type: outcome === 'pass' ? 'qa_review_passed' : 'qa_review_failed',
      title: outcome === 'pass' ? `${task.id} QA review passed` : `${task.id} QA review failed`,
      body: submission?.summary || (outcome === 'pass' ? 'Separate QA validation passed.' : 'Separate QA validation failed and requires follow-up.'),
      createdAt: now,
      createdBy: 'system',
    })
  }

  const updatedTasks = task
    ? state.tasks.map((item) =>
        item.id === task.id
          ? {
              ...item,
              reviewSummary: submission?.summary ?? item.reviewSummary,
              evidenceLinks: submission?.evidenceLinks?.length ? submission.evidenceLinks : item.evidenceLinks,
              updatedAt: submission ? now : item.updatedAt,
              lastEventAt: submission ? now : item.lastEventAt,
            }
          : item,
      )
    : state.tasks

  return commit({
    tasks: [...extraTasks, ...updatedTasks],
    runs: state.runs.map((item) => (item.id === runId ? updatedRun : item)),
    activity: [...extraEvents.reverse(), ...state.activity],
  })
}


export function createFollowupTask(
  state: MissionControlState,
  taskId: string,
  kind: 'improvement' | 'spec_update',
  title: string,
  summary: string,
): MissionControlState {
  const task = state.tasks.find((item) => item.id === taskId)
  if (!task) return state
  const now = new Date().toISOString()
  const nextId = `MC-${state.tasks.length + 1}`
  const newTask: Task = {
    id: nextId,
    title,
    objective: summary,
    acceptanceCriteria: ['Follow-up captured and tracked', 'Task reviewed and processed'],
    boundaries: ['Derived from review workflow'],
    status: 'triage',
    projectId: task.projectId,
    type: kind,
    requiresApproval: false,
    priority: kind === 'spec_update' ? 'medium' : 'high',
    createdBy: 'system',
    source: 'system',
    assignee: 'celine',
    needsUiTest: false,
    requiresUxReview: false,
    parentTaskId: task.id,
    plan: [
      { id: `${nextId}-1`, label: 'Review finding', status: 'pending' },
      { id: `${nextId}-2`, label: 'Apply change', status: 'pending' },
    ],
    lastEventAt: now,
    createdAt: now,
    updatedAt: now,
    specVersionSeen: task.specVersionSeen,
    requiresSpecUpdate: kind === 'spec_update',
    docSyncStatus: kind === 'spec_update' ? 'needs_update' : 'in_sync',
    lastDocSyncAt: now,
  }
  const event: ActivityEvent = {
    id: crypto.randomUUID(),
    taskId: nextId,
    projectId: task.projectId,
    type: kind === 'spec_update' ? 'spec_update_requested' : 'bug_created',
    title: `${nextId} created from review findings`,
    body: summary,
    createdAt: now,
    createdBy: 'system',
  }
  return commit({ ...state, tasks: [newTask, ...state.tasks], activity: [event, ...state.activity] })
}

export function hasPassingReview(state: MissionControlState, taskId: string, kind: 'qa_review' | 'ux_review') {
  return state.runs.some((run) => run.taskId === taskId && run.kind === kind && run.status === 'passed')
}

export function getReviewEvidenceSummary(
  state: MissionControlState,
  taskId: string,
  kind?: 'qa_review' | 'ux_review',
): ReviewEvidenceSummary {
  const reviewRuns = state.runs
    .filter((run) => run.taskId === taskId && (run.kind === 'qa_review' || run.kind === 'ux_review') && (!kind || run.kind === kind))
    .sort((a, b) => {
      const aTime = a.endedAt ?? a.startedAt ?? ''
      const bTime = b.endedAt ?? b.startedAt ?? ''
      return bTime.localeCompare(aTime)
    })

  const latestRun = reviewRuns[0]
  const latestCompletedRun = reviewRuns.find((run) => run.status !== 'running')
  const latestArtifact = latestCompletedRun?.artifact
  const missingEvidence = Boolean(
    latestCompletedRun &&
    !latestArtifact?.screenshotPath &&
    !latestArtifact?.snapshotId &&
    !(latestArtifact?.evidenceLinks?.length)
  )

  return {
    latestRun,
    latestCompletedRun,
    latestArtifact,
    missingEvidence,
  }
}

export function getTaskNotificationDigest(state: MissionControlState, taskId: string): NotificationDigest | undefined {
  const task = state.tasks.find((item) => item.id === taskId)
  if (!task) return undefined

  const lines = [
    `${task.id} · ${task.title}`,
    `status=${task.status} priority=${task.priority} type=${task.type}`,
  ]

  if (task.nextStep) lines.push(`next: ${task.nextStep}`)
  if (task.blockerDetail) lines.push(`blocker: ${task.blockerDetail}`)
  if (task.reviewSummary) lines.push(`review: ${task.reviewSummary}`)

  const qaReady = hasPassingReview(state, task.id, 'qa_review')
  const uxReady = !task.requiresUxReview || hasPassingReview(state, task.id, 'ux_review')
  const uiReady = !task.needsUiTest || state.runs.some((run) => run.taskId === task.id && run.kind === 'ui_test' && run.status === 'passed') || task.status === 'done'
  const qaEvidence = getReviewEvidenceSummary(state, task.id, 'qa_review')
  const uxEvidence = getReviewEvidenceSummary(state, task.id, 'ux_review')
  lines.push(`gates: ui=${uiReady ? 'ok' : 'pending'} qa=${qaReady ? 'ok' : 'pending'} ux=${uxReady ? 'ok' : 'pending'}`)
  if (qaEvidence.latestArtifact?.screenshotPath || qaEvidence.latestArtifact?.snapshotId) {
    lines.push(`qa evidence: ${qaEvidence.latestArtifact?.snapshotId ?? qaEvidence.latestArtifact?.screenshotPath}`)
  } else if (qaEvidence.missingEvidence) {
    lines.push('qa evidence: missing capture/link proof')
  }
  if (task.requiresUxReview) {
    if (uxEvidence.latestArtifact?.screenshotPath || uxEvidence.latestArtifact?.snapshotId) {
      lines.push(`ux evidence: ${uxEvidence.latestArtifact?.snapshotId ?? uxEvidence.latestArtifact?.screenshotPath}`)
    } else if (uxEvidence.missingEvidence) {
      lines.push('ux evidence: missing capture/link proof')
    }
  }

  return {
    headline: task.status === 'blocked' ? 'Mission Control blocker' : task.status === 'done' ? 'Mission Control completed task' : 'Mission Control update',
    lines,
  }
}

export function getBoardNotificationDigest(state: MissionControlState): NotificationDigest {
  const blocked = state.tasks.filter((task) => task.status === 'blocked')
  const inProgress = state.tasks.filter((task) => task.status === 'in_progress')
  const pendingUx = state.tasks.filter((task) => task.requiresUxReview && !hasPassingReview(state, task.id, 'ux_review'))
  const missingEvidence = state.runs.filter((run) =>
    (run.kind === 'qa_review' || run.kind === 'ux_review') &&
    run.status !== 'running' &&
    !run.artifact?.screenshotPath &&
    !run.artifact?.snapshotId &&
    !(run.artifact?.evidenceLinks?.length)
  )
  const latestEvents = state.activity.slice(0, 3).map((event) => `${event.taskId}: ${event.title}`)
  const evidenceReadyTasks = state.tasks
    .map((task) => ({ task, review: getReviewEvidenceSummary(state, task.id) }))
    .filter(({ review }) => review.latestArtifact?.snapshotId || review.latestArtifact?.screenshotPath)

  return {
    headline: 'Mission Control overnight digest',
    lines: [
      `in_progress=${inProgress.length} blocked=${blocked.length} pending_ux=${pendingUx.length} missing_evidence=${missingEvidence.length}`,
      ...(blocked.slice(0, 2).map((task) => `blocked: ${task.id} ${task.blockerDetail ?? task.title}`)),
      ...(pendingUx.slice(0, 2).map((task) => `ux gate: ${task.id} awaiting UX review pass`)),
      ...(missingEvidence.slice(0, 2).map((run) => `missing evidence: ${run.taskId} ${run.kind} ${run.id}`)),
      ...(evidenceReadyTasks.slice(0, 2).map(({ task, review }) => `latest evidence: ${task.id} ${review.latestArtifact?.snapshotId ?? review.latestArtifact?.screenshotPath}`)),
      ...(inProgress.slice(0, 2).map((task) => `active: ${task.id} next=${task.nextStep ?? 'unset'}`)),
      ...latestEvents,
    ],
  }
}

function finalizeRun(runs: Run[], runId: string, status: 'passed' | 'failed', now: string) {
  return runs.map((item) =>
    item.id === runId
      ? {
          ...item,
          status,
          endedAt: now,
        }
      : item,
  )
}

function buildTransitionEvent(task: Task, nextStatus: TaskStatus, createdAt: string): ActivityEvent {
  const typeMap: Partial<Record<TaskStatus, ActivityEvent['type']>> = {
    in_progress: 'task_started',
    blocked: 'blocked',
    done: 'done',
    triage: 'task_picked_up',
  }

  return {
    id: crypto.randomUUID(),
    taskId: task.id,
    projectId: task.projectId,
    runId: task.activeRunId,
    type: typeMap[nextStatus] ?? 'progress',
    title: `${task.id} moved to ${nextStatus.replace('_', ' ')}`,
    body: `State transition from ${task.status.replace('_', ' ')} to ${nextStatus.replace('_', ' ')}.`,
    createdAt,
    createdBy: 'celine',
  }
}

function commit(nextState: MissionControlState): MissionControlState {
  saveState(nextState)
  return nextState
}
