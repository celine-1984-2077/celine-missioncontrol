export type TaskStatus = 'backlog' | 'triage' | 'in_progress' | 'blocked' | 'done'
export type TaskType = 'code' | 'doc' | 'research' | 'ops' | 'bug' | 'improvement' | 'spec_update'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type StepStatus = 'pending' | 'in_progress' | 'done'
export type DocSyncStatus = 'in_sync' | 'needs_update' | 'deferred'
export type RunKind = 'execution' | 'ui_test' | 'qa_review' | 'ux_review'
export type RunStatus = 'queued' | 'running' | 'passed' | 'failed' | 'cancelled'
export type ActivityEventType =
  | 'task_created'
  | 'task_picked_up'
  | 'task_started'
  | 'progress'
  | 'plan_updated'
  | 'step_completed'
  | 'blocked'
  | 'ui_test_failed'
  | 'bug_created'
  | 'done'
  | 'runner_error'
  | 'qa_review_requested'
  | 'qa_review_passed'
  | 'qa_review_failed'
  | 'ux_review_requested'
  | 'ux_review_submitted'
  | 'spec_update_requested'

export interface Step {
  id: string
  label: string
  status: StepStatus
}

export interface ReviewArtifact {
  screenshotPath?: string
  snapshotId?: string
  evidenceLinks?: string[]
  reviewSummary?: string
  findings?: string
  targetUrl?: string
  capturedAt?: string
}

export interface Run {
  id: string
  taskId: string
  kind: RunKind
  status: RunStatus
  startedAt?: string
  endedAt?: string
  summary?: string
  errorSummary?: string
  heartbeatAt?: string
  artifact?: ReviewArtifact
}

export interface Task {
  id: string
  title: string
  objective: string
  acceptanceCriteria: string[]
  boundaries?: string[]
  status: TaskStatus
  projectId: string
  type: TaskType
  requiresApproval: boolean
  priority: Priority
  createdBy: 'tony' | 'celine' | 'system'
  source: 'board' | 'chat' | 'system' | 'bug_loop'
  assignee: 'celine'
  needsUiTest: boolean
  parentTaskId?: string
  relatedDocIds?: string[]
  tags?: string[]
  plan: Step[]
  currentStepIndex?: number
  nextStep?: string
  blockerDetail?: string
  activeRunId?: string
  lastEventAt: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  specVersionSeen?: string
  requiresSpecUpdate?: boolean
  docSyncStatus?: DocSyncStatus
  lastDocSyncAt?: string
  reviewSummary?: string
  evidenceLinks?: string[]
}

export interface ActivityEvent {
  id: string
  taskId: string
  projectId: string
  runId?: string
  type: ActivityEventType
  title: string
  body?: string
  createdAt: string
  createdBy: 'tony' | 'celine' | 'system'
}
