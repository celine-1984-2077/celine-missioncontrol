import { useMemo, useState } from 'react'
import { addProgressEvent, completeStep, completeUiTest, createTask, hasPassingReview, loadState, requestUiTest, transitionTask, updateTask } from './store'
import type { ActivityEvent, DocSyncStatus, Priority, Task, TaskStatus, TaskType } from './types'

const columns: Array<{ key: 'backlog' | 'in_progress' | 'blocked' | 'done'; label: string }> = [
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
  status: 'backlog' as TaskStatus,
  requiresApproval: false,
  needsUiTest: true,
}

const navItems = ['Tasks', 'Content', 'Approvals', 'Council', 'Calendar', 'Docs', 'People', 'Todo', 'Office']

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
  const [detailDraft, setDetailDraft] = useState(() => createDetailDraft(state.tasks[0]))
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [error, setError] = useState('')

  const tasks = state.tasks
  const activity = state.activity
  const nowRunning = useMemo(() => tasks.find((task) => task.status === 'in_progress'), [tasks])
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0]

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

  function openTask(task: Task) {
    setSelectedTaskId(task.id)
    setDetailDraft(createDetailDraft(task))
    setShowDetailModal(true)
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
    setState(nextState)
    setDraft(initialDraft)
    setShowCreateModal(false)
    setError('')
  }

  function handleSaveDetail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTask) return
    const nextState = updateTask(state, selectedTask.id, {
      title: detailDraft.title.trim(),
      objective: detailDraft.objective.trim(),
      acceptanceCriteria: linesToArray(detailDraft.acceptanceCriteria),
      boundaries: linesToArray(detailDraft.boundaries),
      nextStep: detailDraft.nextStep.trim(),
      docSyncStatus: detailDraft.docSyncStatus,
      requiresSpecUpdate: detailDraft.requiresSpecUpdate,
    })
    setState(nextState)
    setShowDetailModal(false)
  }

  function handleTransition(taskId: string, nextStatus: TaskStatus) {
    try {
      const nextState = transitionTask(state, taskId, nextStatus)
      setState(nextState)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transition task')
    }
  }

  function addQuickLog(message: string) {
    if (!selectedTask) return
    const nextState = addProgressEvent(state, selectedTask.id, message)
    setState(nextState)
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
            <button onClick={() => setShowCreateModal(true)}>+ New Task</button>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <section className="stats-strip card-shell">
          <StatBig label="This week" value={String(stats.week)} accent="green" />
          <StatBig label="In progress" value={String(stats.inProgress)} accent="blue" />
          <StatBig label="Total" value={String(stats.total)} accent="white" />
          <StatBig label="Completion" value={stats.completion} accent="purple" />
        </section>

        <section className="board-and-activity">
          <section className="board-panel wide-card">
            <div className="kanban-grid">
              {columns.map((column) => (
                <div key={column.key} className="kanban-column">
                  <div className="kanban-header">{column.label}</div>
                  <div className="kanban-body">
                    {(boardTasks[column.key as keyof typeof boardTasks] ?? []).map((task) => (
                      <article key={task.id} className={`kanban-card ${selectedTask?.id === task.id ? 'selected-card' : ''}`} onClick={() => openTask(task)}>
                        <h3>{task.title}</h3>
                        <div className="kanban-meta">
                          <span>Objective</span>
                          <p>{task.objective}</p>
                        </div>
                        <div className="kanban-meta">
                          <span>Plan</span>
                          <p>{task.plan.slice(0, 2).map((step, idx) => `${idx + 1}) ${step.label}`).join('\n')}</p>
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

      {showCreateModal && (
        <div className="overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="panel-heading"><h3>New Task</h3><button className="secondary" onClick={() => setShowCreateModal(false)}>Close</button></div>
            <form className="detail-form" onSubmit={handleCreateTask}>
              <label><span>Title</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
              <label><span>Objective</span><textarea rows={3} value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} /></label>
              <label><span>Acceptance Criteria</span><textarea rows={4} value={draft.acceptanceCriteria} onChange={(e) => setDraft({ ...draft, acceptanceCriteria: e.target.value })} /></label>
              <label><span>Boundaries</span><textarea rows={3} value={draft.boundaries} onChange={(e) => setDraft({ ...draft, boundaries: e.target.value })} /></label>
              <div className="two-col">
                <label><span>Status</span><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}><option value="backlog">backlog</option><option value="triage">triage</option><option value="blocked">blocked</option></select></label>
                <label><span>Priority</span><select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="urgent">urgent</option></select></label>
              </div>
              <div className="two-col">
                <label className="checkbox-row"><input type="checkbox" checked={draft.needsUiTest} onChange={(e) => setDraft({ ...draft, needsUiTest: e.target.checked })} /><span>Needs UI test</span></label>
                <label className="checkbox-row"><input type="checkbox" checked={draft.requiresApproval} onChange={(e) => setDraft({ ...draft, requiresApproval: e.target.checked })} /><span>Requires approval</span></label>
              </div>
              <div className="actions-row"><button type="submit">Create Task</button></div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedTask && (
        <div className="overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-card detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-heading">
              <div>
                <h3>{selectedTask.title}</h3>
                <p className="muted">{selectedTask.status === 'in_progress' ? 'Execution view' : selectedTask.status === 'backlog' || selectedTask.status === 'triage' ? 'Backlog editor' : 'Task detail'}</p>
              </div>
              <button className="secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>

            {(selectedTask.status === 'backlog' || selectedTask.status === 'triage') ? (
              <form className="detail-form" onSubmit={handleSaveDetail}>
                <label><span>Title</span><input value={detailDraft.title} onChange={(e) => setDetailDraft({ ...detailDraft, title: e.target.value })} /></label>
                <label><span>Objective</span><textarea rows={3} value={detailDraft.objective} onChange={(e) => setDetailDraft({ ...detailDraft, objective: e.target.value })} /></label>
                <label><span>Acceptance Criteria</span><textarea rows={4} value={detailDraft.acceptanceCriteria} onChange={(e) => setDetailDraft({ ...detailDraft, acceptanceCriteria: e.target.value })} /></label>
                <label><span>Boundaries</span><textarea rows={3} value={detailDraft.boundaries} onChange={(e) => setDetailDraft({ ...detailDraft, boundaries: e.target.value })} /></label>
                <label><span>Next step</span><input value={detailDraft.nextStep} onChange={(e) => setDetailDraft({ ...detailDraft, nextStep: e.target.value })} /></label>
                <div className="actions-row"><button type="submit">Save</button></div>
              </form>
            ) : (
              <div className="detail-readonly">
                <section className="detail-section">
                  <h3>Objective</h3>
                  <p>{selectedTask.objective}</p>
                </section>
                <section className="detail-section">
                  <h3>Acceptance Criteria</h3>
                  <ul>{selectedTask.acceptanceCriteria.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
                <section className="detail-section">
                  <h3>Execution Log</h3>
                  <div className="stale-list">
                    {activity.filter((event) => event.taskId === selectedTask.id).slice(0, 8).map((event) => (
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
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function linesToArray(text: string) {
  return text.split('\n').map((item) => item.trim()).filter(Boolean)
}

function createDetailDraft(task?: Task) {
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
