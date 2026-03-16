import { useMemo, useState } from 'react'
import { addProgressEvent, completeStep, createTask, loadState, transitionTask, updateTask } from './store'
import type { ActivityEvent, DocSyncStatus, Priority, Task, TaskStatus, TaskType } from './types'

const columns: Array<{ key: TaskStatus; label: string }> = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'triage', label: 'Triage' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'done', label: 'Done' },
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

function formatStatus(status: TaskStatus) {
  return status.replace('_', ' ')
}

export function App() {
  const [state, setState] = useState(() => loadState())
  const [selectedTaskId, setSelectedTaskId] = useState<string>(state.tasks[0]?.id ?? '')
  const [draft, setDraft] = useState(initialDraft)
  const [progressText, setProgressText] = useState('')
  const [progressNextStep, setProgressNextStep] = useState('')
  const [error, setError] = useState<string>('')

  const tasks = state.tasks
  const activity = state.activity
  const nowRunning = useMemo(() => tasks.find((task) => task.status === 'in_progress'), [tasks])
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? nowRunning ?? tasks[0]
  const doneDigest = tasks.filter((task) => task.status === 'done').slice(0, 3)

  const [editDraft, setEditDraft] = useState(() => createEditDraft(selectedTask))

  function syncEditDraft(task?: Task) {
    setEditDraft(createEditDraft(task))
  }

  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId)
    syncEditDraft(tasks.find((task) => task.id === taskId))
    setProgressText('')
    setProgressNextStep('')
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
    const nextState = completeStep(state, selectedTask.id, stepId)
    setState(nextState)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Tony × Celine</p>
          <h1>Mission Control</h1>
          <p className="subtitle">Phase B+: editable tasks, structured progress updates, and step completion flow.</p>
        </div>
        <div className="topbar-stats">
          <Stat label="Tasks" value={String(tasks.length)} />
          <Stat label="In Progress" value={String(tasks.filter((t) => t.status === 'in_progress').length)} />
          <Stat label="Needs Doc Sync" value={String(tasks.filter((t) => t.docSyncStatus === 'needs_update').length)} />
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="composer card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Create task</p>
            <h2>Minimum task intake contract</h2>
          </div>
          <span className="pill">local-first</span>
        </div>

        <form className="composer-grid" onSubmit={handleCreateTask}>
          <label><span>Title</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
          <label><span>Objective</span><input value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} /></label>
          <label><span>Type</span><select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as TaskType })}><option value="code">code</option><option value="doc">doc</option><option value="research">research</option><option value="ops">ops</option><option value="bug">bug</option></select></label>
          <label><span>Priority</span><select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="urgent">urgent</option></select></label>
          <label><span>Initial status</span><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}><option value="backlog">backlog</option><option value="triage">triage</option><option value="blocked">blocked</option></select></label>
          <label className="checkbox-row"><input type="checkbox" checked={draft.needsUiTest} onChange={(e) => setDraft({ ...draft, needsUiTest: e.target.checked })} /><span>Needs UI test</span></label>
          <label className="checkbox-row"><input type="checkbox" checked={draft.requiresApproval} onChange={(e) => setDraft({ ...draft, requiresApproval: e.target.checked })} /><span>Requires approval</span></label>
          <label className="full-span"><span>Acceptance criteria (one per line)</span><textarea rows={4} value={draft.acceptanceCriteria} onChange={(e) => setDraft({ ...draft, acceptanceCriteria: e.target.value })} /></label>
          <label className="full-span"><span>Boundaries (optional, one per line)</span><textarea rows={3} value={draft.boundaries} onChange={(e) => setDraft({ ...draft, boundaries: e.target.value })} /></label>
          <div className="full-span actions-row"><button type="submit">Create task</button></div>
        </form>
      </section>

      <main className="layout">
        <section className="board-panel card">
          <div className="panel-heading"><div><p className="eyebrow">Board</p><h2>Canonical states</h2></div><span className="pill">validated transitions</span></div>
          <div className="board-grid">
            {columns.map((column) => (
              <div key={column.key} className="board-column">
                <div className="column-header"><h3>{column.label}</h3><span>{tasks.filter((task) => task.status === column.key).length}</span></div>
                <div className="column-cards">
                  {tasks.filter((task) => task.status === column.key).map((task) => (
                    <article key={task.id} className={`task-card ${selectedTask?.id === task.id ? 'selected-card' : ''}`} onClick={() => handleSelectTask(task.id)}>
                      <div className="task-card-header"><span className={`pill ${statusTone[task.status]}`}>{formatStatus(task.status)}</span><span className="task-id">{task.id}</span></div>
                      <h4>{task.title}</h4>
                      <p>{task.objective}</p>
                      <div className="meta-row"><span>{task.type}</span><span>{task.priority}</span>{task.needsUiTest && <span>ui test</span>}</div>
                      <div className="meta-row"><span className={`pill ${task.docSyncStatus === 'needs_update' ? 'tone-red' : task.docSyncStatus === 'deferred' ? 'tone-slate' : 'tone-green'}`}>doc: {task.docSyncStatus ?? 'n/a'}</span>{task.requiresApproval && <span className="pill tone-red">approval</span>}</div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="activity-panel card">
          <div className="panel-heading"><div><p className="eyebrow">Activity</p><h2>Operator visibility</h2></div></div>
          <section className="subpanel now-running">
            <div className="subpanel-header"><h3>Now Running</h3>{nowRunning ? <span className="pill tone-amber">active</span> : <span className="pill">idle</span>}</div>
            {nowRunning ? <><h4>{nowRunning.title}</h4><p>Step {(nowRunning.currentStepIndex ?? 0) + 1}/{nowRunning.plan.length}</p><p className="muted">Next: {nowRunning.nextStep ?? 'Not set yet'}</p><p className="muted">Last event: {nowRunning.lastEventAt}</p></> : <p className="muted">No active task.</p>}
          </section>
          <section className="subpanel"><div className="subpanel-header"><h3>Recent Updates</h3></div><div className="timeline">{activity.slice(0, 10).map((event) => (<div key={event.id} className="timeline-item"><div className={`timeline-dot ${eventTone[event.type] ?? 'tone-slate'}`} /><div><div className="timeline-title-row"><strong>{event.title}</strong><span className="task-id">{event.taskId}</span></div>{event.body && <p>{event.body}</p>}<span className="muted small">{event.createdAt}</span></div></div>))}</div></section>
          <section className="subpanel"><div className="subpanel-header"><h3>Done Digest</h3></div><div className="digest-list">{doneDigest.map((task) => (<div key={task.id} className="digest-item"><strong>{task.id}</strong><span>{task.title}</span></div>))}</div></section>
        </aside>
      </main>

      {selectedTask && (
        <section className="detail-panel card">
          <div className="panel-heading"><div><p className="eyebrow">Task Detail</p><h2>{selectedTask.title}</h2></div><div className="meta-row wrap"><span className={`pill ${statusTone[selectedTask.status]}`}>{formatStatus(selectedTask.status)}</span><span className="pill">spec: {selectedTask.specVersionSeen}</span><span className="pill">doc sync: {selectedTask.docSyncStatus}</span></div></div>
          <div className="transition-row">{transitionTargets[selectedTask.status].map((nextStatus) => (<button key={nextStatus} type="button" className="secondary" onClick={() => handleTransition(selectedTask.id, nextStatus)}>Move to {formatStatus(nextStatus)}</button>))}</div>
          <div className="detail-grid">
            <DetailSection title="Edit Task">
              <form className="detail-form" onSubmit={handleUpdateTask}>
                <label><span>Title</span><input value={editDraft.title} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} /></label>
                <label><span>Objective</span><textarea rows={3} value={editDraft.objective} onChange={(e) => setEditDraft({ ...editDraft, objective: e.target.value })} /></label>
                <label><span>Acceptance Criteria</span><textarea rows={4} value={editDraft.acceptanceCriteria} onChange={(e) => setEditDraft({ ...editDraft, acceptanceCriteria: e.target.value })} /></label>
                <label><span>Boundaries</span><textarea rows={3} value={editDraft.boundaries} onChange={(e) => setEditDraft({ ...editDraft, boundaries: e.target.value })} /></label>
                <label><span>Next Step</span><input value={editDraft.nextStep} onChange={(e) => setEditDraft({ ...editDraft, nextStep: e.target.value })} /></label>
                <label><span>Doc Sync</span><select value={editDraft.docSyncStatus} onChange={(e) => setEditDraft({ ...editDraft, docSyncStatus: e.target.value as DocSyncStatus })}><option value="in_sync">in_sync</option><option value="needs_update">needs_update</option><option value="deferred">deferred</option></select></label>
                <label className="checkbox-row compact"><input type="checkbox" checked={editDraft.requiresSpecUpdate} onChange={(e) => setEditDraft({ ...editDraft, requiresSpecUpdate: e.target.checked })} /><span>Requires spec update</span></label>
                <div className="actions-row"><button type="submit">Save task details</button></div>
              </form>
            </DetailSection>
            <DetailSection title="Structured Progress">
              <form className="detail-form" onSubmit={handleProgressSubmit}>
                <label><span>Progress update</span><textarea rows={4} value={progressText} onChange={(e) => setProgressText(e.target.value)} placeholder="What changed?" /></label>
                <label><span>Next step (optional)</span><input value={progressNextStep} onChange={(e) => setProgressNextStep(e.target.value)} /></label>
                <div className="actions-row"><button type="submit">Add progress event</button></div>
              </form>
            </DetailSection>
            <DetailSection title="Plan"><ol>{selectedTask.plan.map((step) => <li key={step.id} className="step-row"><div><span className={`step-state ${step.status}`}>{step.status}</span>{step.label}</div>{step.status !== 'done' && <button type="button" className="secondary small-button" onClick={() => handleCompleteStep(step.id)}>Complete</button>}</li>)}</ol></DetailSection>
            <DetailSection title="Acceptance Criteria"><ul>{selectedTask.acceptanceCriteria.map((item) => <li key={item}>{item}</li>)}</ul></DetailSection>
            <DetailSection title="Progress Log"><ul>{activity.filter((event) => event.taskId === selectedTask.id).map((event) => <li key={event.id}><strong>{event.title}</strong>{event.body ? ` — ${event.body}` : ''}</li>)}</ul></DetailSection>
            <DetailSection title="Result">{selectedTask.status === 'done' ? <p>Completed successfully and surfaced in Done Digest.</p> : selectedTask.status === 'blocked' ? <p>{selectedTask.blockerDetail ?? 'Task is blocked.'}</p> : <p className="muted">Result pending completion.</p>}</DetailSection>
          </div>
        </section>
      )}
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

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="detail-section"><h3>{title}</h3>{children}</section>
}
