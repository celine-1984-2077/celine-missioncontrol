import { tasks as seedTasks, activity as seedActivity } from './sampleData'
import type { ActivityEvent, Task, TaskStatus } from './types'

const TASKS_KEY = 'mission-control/tasks'
const EVENTS_KEY = 'mission-control/events'

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
}

export function loadState(): MissionControlState {
  if (typeof window === 'undefined') {
    return { tasks: seedTasks, activity: seedActivity }
  }

  const storedTasks = window.localStorage.getItem(TASKS_KEY)
  const storedEvents = window.localStorage.getItem(EVENTS_KEY)

  if (!storedTasks || !storedEvents) {
    saveState({ tasks: seedTasks, activity: seedActivity })
    return { tasks: seedTasks, activity: seedActivity }
  }

  return {
    tasks: JSON.parse(storedTasks) as Task[],
    activity: JSON.parse(storedEvents) as ActivityEvent[],
  }
}

export function saveState(state: MissionControlState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(state.tasks))
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(state.activity))
}

export function transitionTask(
  state: MissionControlState,
  taskId: string,
  nextStatus: TaskStatus,
): MissionControlState {
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
    currentStepIndex:
      nextStatus === 'in_progress' && typeof task.currentStepIndex !== 'number' ? 0 : task.currentStepIndex,
  }

  const event = buildTransitionEvent(task, nextStatus, now)

  const nextState = {
    tasks: state.tasks.map((item) => (item.id === taskId ? updatedTask : item)),
    activity: [event, ...state.activity],
  }
  saveState(nextState)
  return nextState
}

export function createTask(
  state: MissionControlState,
  draft: Pick<Task, 'title' | 'objective' | 'acceptanceCriteria' | 'boundaries' | 'type' | 'priority' | 'status' | 'requiresApproval' | 'needsUiTest'>,
): MissionControlState {
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

  const nextState = {
    tasks: [newTask, ...state.tasks],
    activity: [event, ...state.activity],
  }
  saveState(nextState)
  return nextState
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
    type: typeMap[nextStatus] ?? 'progress',
    title: `${task.id} moved to ${nextStatus.replace('_', ' ')}`,
    body: `State transition from ${task.status.replace('_', ' ')} to ${nextStatus.replace('_', ' ')}.`,
    createdAt,
    createdBy: 'celine',
  }
}
