import { useMemo, useState } from 'react'
import { addProgressEvent, autoPickNextTask, completeReviewRun, completeStep, completeUiTest, createFollowupTask, createTask, getBoardNotificationDigest, getReviewEvidenceSummary, getTaskNotificationDigest, hasPassingReview, heartbeatRun, loadState, markRunStale, requestReviewRun, requestUiTest, transitionTask, updateTask } from './store'
import type { ActivityEvent, DocSyncStatus, Priority, Task, TaskStatus, TaskType } from './types'

const EXPORT_FILE_PATH = '/tmp/mission-control/state.json'

const columns: Array<{ key: TaskStatus; label: string }> = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'blocked', label: 'Review' },
  { key: 'done', label: 'Testing' },
]

const statusTone: Record<TaskStatus, string> = {
  backlog: 'tone-slate',
  triage: 'tone-blue',
  in_progress: 'tone-amber',
  blocked: 'tone-red',
  done: 'tone-green',
}

const eventTone: Record<ActivityEvent['type'], string> = {
  task_created: 'tone-slate',
  task_picked_up: 'tone-blue',
  task_started: 'tone-blue',
  progress: 'tone-amber',
  step_completed: 'tone-green',
  blocked: 'tone-red',
  ui_test_failed: 'tone-red',
  bug_created: 'tone-red',
  done: 'tone-green',
  plan_updated: 'tone-blue',
  runner_error: 'tone-red',
  qa_review_requested: 'tone-blue',
  qa_review_passed: 'tone-green',
  qa_review_failed: 'tone-red',
  ux_review_requested: 'tone-blue',
  ux_review_submitted: 'tone-amber',
  spec_update_requested: 'tone-amber',
}

const transitionTargets: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['triage'],
  triage: ['backlog', 'in_progress', 'blocked'],
  in_progress: ['triage', 'blocked', 'done'],
  blocked: ['triage', 'backlog'],
  done: [],
}

const initialDraft = {
  title: '',
  objective: '',
  acceptanceCriteria: '',
  boundaries: '',
  type: 'code' as TaskType,
  priority: 'medium' as Priority,
  status: 'triage' as TaskStatus,
  requiresApproval: false,
  needsUiTest: true,
}

const navItems = ['Tasks', 'Content', 'Approvals', 'Council', 'Calendar', 'Docs', 'People', 'Todo', 'Office']

function formatStatus(status: TaskStatus) {
  return status.replace('_', ' ')
}

function formatRelativeish(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diff = Math.max(0, Date.now() - date.getTime())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function App() {
  const [state, setState] = useState(() => loadState())
  const [selectedTaskId, setSelectedTaskId] = useState<string>(state.tasks[0]?.id ?? '')
  const [draft, setDraft] = useState(initialDraft)
  const [progressText, setProgressText] = useState('')
  const [progressNextStep, setProgressNextStep] = useState('')
  const [error, setError] = useState<string>('')
  const [reviewDraft, setReviewDraft] = useState({ summary: '', findings: '', screenshotPath: '', snapshotId: '', evidenceLinks: '', targetUrl: 'http://127.0.0.1:4173/' })

  const tasks = state.tasks
  const activity = state.activity
  const runs = state.runs
  const nowRunning = useMemo(() => tasks.find((task) => task.status === 'in_progress'), [tasks])
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? nowRunning ?? tasks[0]
  const selectedTaskEvidence = selectedTask ? getReviewEvidenceSummary(state, selectedTask.id) : undefined
  const doneDigest = tasks.filter((task) => task.status === 'done').slice(0, 3)
  const boardDigest = getBoardNotificationDigest(state)
  const selectedTaskDigest = selectedTask ? getTaskNotificationDigest(state, selectedTask.id) : undefined
  const selectedTaskQaReady = selectedTask ? hasPassingReview(state, selectedTask.id, 'qa_review') : false
  const selectedTaskUxReady = selectedTask ? (!selectedTask.requiresUxReview || hasPassingReview(state, selectedTask.id, 'ux_review')) : false
  const missingEvidenceCount = runs.filter((run) =>
    (run.kind === 'qa_review' || run.kind === 'ux_review') &&
    run.status !== 'running' &&
    !run.artifact?.screenshotPath &&
    !run.artifact?.snapshotId &&
    !(run.artifact?.evidenceLinks?.length),
  ).length
  const reviewRunsForTask = runs.filter((run) => run.taskId === selectedTask?.id && (run.kind === 'qa_review' || run.kind === 'ux_review'))
  const latestReviewRuns = [...reviewRunsForTask].sort((a, b) => {
    const aTime = a.endedAt ?? a.startedAt ?? ''
    const bTime = b.endedAt ?? b.startedAt ?? ''
    return bTime.localeCompare(aTime)
  })

  const [editDraft, setEditDraft] = useState(() => createEditDraft(selectedTask))

  function syncEditDraft(task?: Task) {
    setEditDraft(createEditDraft(task))
  }

  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId)
    syncEditDraft(tasks.find((task) => task.id === taskId))
    setProgressText('')
    setProgressNextStep('')
    setReviewDraft({ summary: '', findings: '', screenshotPath: '', snapshotId: '', evidenceLinks: '', targetUrl: 'http://127.0.0.1:4173/' })
  }

  function handleTransition(taskId: string, nextStatus: TaskStatus) {
    try {
      setError('')
      const nextState = transitionTask(state, taskId, nextStatus)
      setState(nextState)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transition task')
    }
  }

  function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.title.trim() || !draft.objective.trim() || !draft.acceptanceCriteria.trim()) {
      setError('Title, objective, and acceptance criteria are required.')
      return
    }
    const nextState = createTask(state, {
      title: draft.title.trim(),
      objective: draft.objective.trim(),
      acceptanceCriteria: linesToArray(draft.acceptanceCriteria),
      boundaries: linesToArray(draft.boundaries),
      type: draft.type,
      priority: draft.priority,
      status: draft.status as 'backlog' | 'triage' | 'blocked',
      requiresApproval: draft.requiresApproval,
      needsUiTest: draft.needsUiTest,
    })
    const created = nextState.tasks[0]
    setState(nextState)
    setSelectedTaskId(created.id)
    syncEditDraft(created)
    setDraft(initialDraft)
    setError('')
  }

  function handleUpdateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTask) return
    const nextState = updateTask(state, selectedTask.id, {
      title: editDraft.title.trim(),
      objective: editDraft.objective.trim(),
      acceptanceCriteria: linesToArray(editDraft.acceptanceCriteria),
      boundaries: linesToArray(editDraft.boundaries),
      nextStep: editDraft.nextStep.trim(),
      docSyncStatus: editDraft.docSyncStatus,
      requiresSpecUpdate: editDraft.requiresSpecUpdate,
    })
    setState(nextState)
  }

  function handleProgressSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTask || !progressText.trim()) return
    const nextState = addProgressEvent(state, selectedTask.id, progressText.trim(), progressNextStep.trim() || undefined)
    setState(nextState)
    setProgressText('')
    setProgressNextStep('')
  }

  function handleCompleteStep(stepId: string) {
    if (!selectedTask) return
    setState(completeStep(state, selectedTask.id, stepId))
  }

  function submitReview(runId: string, outcome: 'pass' | 'fail' | 'submit') {
    const nextState = completeReviewRun(state, runId, outcome, {
      summary: reviewDraft.summary,
      findings: reviewDraft.findings,
      screenshotPath: reviewDraft.screenshotPath,
      snapshotId: reviewDraft.snapshotId,
      evidenceLinks: reviewDraft.evidenceLinks.split('\n').map((item) => item.trim()).filter(Boolean),
      targetUrl: reviewDraft.targetUrl.trim(),
    })
    setState(nextState)
    setReviewDraft({ summary: '', findings: '', screenshotPath: '', snapshotId: '', evidenceLinks: '', targetUrl: 'http://127.0.0.1:4173/' })
  }

  function handleExportState() {
    const payload = { tasks: state.tasks, runs: state.runs, activity: state.activity, exportedAt: new Date().toISOString(), sourceVersion: 'mission-control-local-v1', exportPathHint: EXPORT_FILE_PATH }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'mission-control-state.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function importReviewArtifactFromFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const raw = await file.text()
      const parsed = JSON.parse(raw) as { url?: string; data?: { snapshot_id?: string; screenshot_path?: string } }
      setReviewDraft((current) => ({
        ...current,
        targetUrl: parsed.url ?? current.targetUrl,
        snapshotId: parsed.data?.snapshot_id ?? current.snapshotId,
        screenshotPath: parsed.data?.screenshot_path ?? current.screenshotPath,
        evidenceLinks: [current.evidenceLinks, file.name].filter(Boolean).join('\n'),
      }))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import review artifact JSON')
    } finally {
      event.target.value = ''
    }
  }

  async function copyText(text: string) {
    try { await navigator.clipboard.writeText(text) } catch (err) { setError(err instanceof Error ? err.message : 'Failed to copy text') }
  }

  function formatDigestForCopy(headline: string, lines: string[], nextAction?: string) {
    return [`**${headline}**`, ...lines.map((line) => `- ${line}`), ...(nextAction ? [`- next_action: ${nextAction}`] : [])].join('\n')
  }

  const stats = {
    week: 48,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    total: tasks.length,
    completion: `${Math.round((tasks.filter((t) => t.status === 'done').length / Math.max(1, tasks.length)) * 100)}%`,
  }

  const boardTasks = {
    backlog: tasks.filter((t) => t.status === 'backlog' || t.status === 'triage'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    blocked: tasks.filter((t) => t.status === 'blocked'),
    done: tasks.filter((t) => t.status === 'done'),
  }

  return (
    <div className="mission-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <p className="eyebrow">TONY × CÉLINE</p>
          <h1>Mission Control</h1>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item, index) => (
            <button key={item} className={`nav-item ${index === 0 ? 'active' : ''}`}>{item}</button>
          ))}
        </nav>
        <div className="sidebar-footer muted">… More</div>
      </aside>

      <main className="main-shell">
        <header className="tasks-header card-shell">
          <div>
            <h2 className="tasks-title">Tasks</h2>
            <p className="subtitle">Organize work and track progress</p>
          </div>
          <div className="header-actions">
            <span className="pill">🌙 Dark</span>
            <span className="pill">EN</span>
            <button className="secondary">Run Smoke Test</button>
            <button>+ New Task</button>
          </div>
        </header>

        <section className="stats-strip card-shell">
          <StatBig label="This week" value={String(stats.week)} accent="green" />
          <StatBig label="In progress" value={String(stats.inProgress)} accent="blue" />
          <StatBig label="Total" value={String(stats.total)} accent="white" />
          <StatBig label="Completion" value={stats.completion} accent="purple" />
        </section>

        <section className="filters-row card-shell">
          <div className="chips-row">
            <span className="pill active-chip">All</span>
            <span className="pill">Scan</span>
            <span className="pill">Progress</span>
            <span className="pill">Done</span>
            <span className="pill">All projects</span>
            <span className="pill">Stale &lt; 45m</span>
          </div>
          <div className="chips-row muted small">
            <span>Autopilot scans backlog every 1m</span>
            <span>Last refresh: {formatRelativeish(activity[0]?.createdAt)}</span>
            <span>Next scan: 52s</span>
          </div>
        </section>

        <section className="board-and-activity">
          <section className="board-panel wide-card">
            <div className="kanban-grid">
              {columns.map((column) => (
                <div key={column.key} className="kanban-column">
                  <div className="kanban-header">{column.label}</div>
                  <div className="kanban-body">
                    {(boardTasks[column.key as keyof typeof boardTasks] ?? []).map((task) => (
                      <article key={task.id} className={`kanban-card ${selectedTask?.id === task.id ? 'selected-card' : ''}`} onClick={() => handleSelectTask(task.id)}>
                        <h3>{task.title}</h3>
                        <div className="kanban-meta">
                          <span>Objective</span>
                          <p>{task.objective}</p>
                        </div>
                        <div className="kanban-meta">
                          <span>Plan</span>
                          <p>{task.plan.slice(0, 3).map((step, idx) => `${idx + 1}) ${step.label}`).join('\n')}</p>
                        </div>
                        <div className="card-signal compact"><strong>Next:</strong> {task.nextStep ?? 'Next step pending…'}</div>
                        {task.blockerDetail && <div className="card-signal blocker-signal"><strong>Blocked:</strong> {task.blockerDetail}</div>}
                        <div className="live-pill">Live activity: [{task.requiresUxReview ? 'UX' : 'QA'} Plan]</div>
                        <div className="tag-row">
                          <span className="tag">{task.priority}</span>
                          <span className="tag">Céline</span>
                          <span className="tag">MissionControl</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="activity-card wide-card">
            <h3 className="activity-title">ACTIVITY</h3>
            <section className="now-running-box">
              <div className="small-heading">NOW RUNNING</div>
              {nowRunning ? (
                <>
                  <strong>{nowRunning.title}</strong>
                  <p>{nowRunning.objective}</p>
                  <p>Step {(nowRunning.currentStepIndex ?? 0) + 1}/{nowRunning.plan.length}</p>
                  <p>Next: {nowRunning.nextStep ?? 'Next step pending…'}</p>
                </>
              ) : <p className="muted">Idle</p>}
            </section>
            <div className="stale-list">
              {activity.slice(0, 5).map((event) => (
                <div key={event.id} className="stale-item">
                  <span className={`dot ${eventTone[event.type] ?? 'tone-slate'}`} />
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.body ?? 'No details'}</p>
                    <span className="muted small">{formatRelativeish(event.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}

function linesToArray(text: string) {
  return text.split('\n').map((item) => item.trim()).filter(Boolean)
}

function createEditDraft(task?: Task) {
  return {
    title: task?.title ?? '',
    objective: task?.objective ?? '',
    acceptanceCriteria: (task?.acceptanceCriteria ?? []).join('\n'),
    boundaries: (task?.boundaries ?? []).join('\n'),
    nextStep: task?.nextStep ?? '',
    docSyncStatus: task?.docSyncStatus ?? 'in_sync',
    requiresSpecUpdate: task?.requiresSpecUpdate ?? false,
  }
}

function StatBig({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div className={`stat-big ${accent}`}><strong>{value}</strong><span>{label}</span></div>
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return <article className="artifact-item"><strong>{title}</strong><p>{value}</p></article>
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="detail-section"><h3>{title}</h3>{children}</section>
}
