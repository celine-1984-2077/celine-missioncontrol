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
  }

  const event = buildTransitionEvent(task, nextStatus, now)
  return commit({
    tasks: state.tasks.map((item) => (item.id === taskId ? updatedTask : item)),
    activity: [event, ...state.activity],
    runs: state.runs,
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
