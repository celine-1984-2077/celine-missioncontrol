import { activity, tasks } from './sampleData'
import type { ActivityEvent, Task, TaskStatus } from './types'

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
}

function formatStatus(status: TaskStatus) {
  return status.replace('_', ' ')
}

function getNowRunning(tasks: Task[]) {
  return tasks.find((task) => task.status === 'in_progress')
}

function getDoneDigest(tasks: Task[]) {
  return tasks.filter((task) => task.status === 'done').slice(0, 3)
}

export function App() {
  const nowRunning = getNowRunning(tasks)
  const selectedTask = nowRunning ?? tasks[0]
  const doneDigest = getDoneDigest(tasks)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Tony × Celine</p>
          <h1>Mission Control</h1>
          <p className="subtitle">Phase B skeleton: board, activity, detail, and doc-sync visibility.</p>
        </div>
        <div className="topbar-stats">
          <Stat label="Tasks" value={String(tasks.length)} />
          <Stat label="In Progress" value={String(tasks.filter((t) => t.status === 'in_progress').length)} />
          <Stat label="Needs Doc Sync" value={String(tasks.filter((t) => t.docSyncStatus === 'needs_update').length)} />
        </div>
      </header>

      <main className="layout">
        <section className="board-panel card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Board</p>
              <h2>Canonical states</h2>
            </div>
            <span className="pill">Spec v1 aligned</span>
          </div>

          <div className="board-grid">
            {columns.map((column) => (
              <div key={column.key} className="board-column">
                <div className="column-header">
                  <h3>{column.label}</h3>
                  <span>{tasks.filter((task) => task.status === column.key).length}</span>
                </div>
                <div className="column-cards">
                  {tasks
                    .filter((task) => task.status === column.key)
                    .map((task) => (
                      <article key={task.id} className="task-card">
                        <div className="task-card-header">
                          <span className={`pill ${statusTone[task.status]}`}>{formatStatus(task.status)}</span>
                          <span className="task-id">{task.id}</span>
                        </div>
                        <h4>{task.title}</h4>
                        <p>{task.objective}</p>
                        <div className="meta-row">
                          <span>{task.type}</span>
                          <span>{task.priority}</span>
                          {task.needsUiTest && <span>ui test</span>}
                        </div>
                        <div className="meta-row">
                          <span className={`pill ${task.docSyncStatus === 'deferred' ? 'tone-slate' : 'tone-green'}`}>
                            doc: {task.docSyncStatus ?? 'n/a'}
                          </span>
                          {task.requiresApproval && <span className="pill tone-red">approval</span>}
                        </div>
                      </article>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="activity-panel card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Activity</p>
              <h2>Operator visibility</h2>
            </div>
          </div>

          <section className="subpanel now-running">
            <div className="subpanel-header">
              <h3>Now Running</h3>
              {nowRunning ? <span className="pill tone-amber">active</span> : <span className="pill">idle</span>}
            </div>
            {nowRunning ? (
              <>
                <h4>{nowRunning.title}</h4>
                <p>
                  Step {(nowRunning.currentStepIndex ?? 0) + 1}/{nowRunning.plan.length}
                </p>
                <p className="muted">Next: {nowRunning.nextStep}</p>
                <p className="muted">Last event: {nowRunning.lastEventAt}</p>
              </>
            ) : (
              <p className="muted">No active task.</p>
            )}
          </section>

          <section className="subpanel">
            <div className="subpanel-header">
              <h3>Recent Updates</h3>
            </div>
            <div className="timeline">
              {activity.map((event) => (
                <div key={event.id} className="timeline-item">
                  <div className={`timeline-dot ${eventTone[event.type]}`} />
                  <div>
                    <div className="timeline-title-row">
                      <strong>{event.title}</strong>
                      <span className="task-id">{event.taskId}</span>
                    </div>
                    {event.body && <p>{event.body}</p>}
                    <span className="muted small">{event.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="subpanel">
            <div className="subpanel-header">
              <h3>Done Digest</h3>
            </div>
            <div className="digest-list">
              {doneDigest.map((task) => (
                <div key={task.id} className="digest-item">
                  <strong>{task.id}</strong>
                  <span>{task.title}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>

      <section className="detail-panel card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Task Detail</p>
            <h2>{selectedTask.title}</h2>
          </div>
          <div className="meta-row">
            <span className={`pill ${statusTone[selectedTask.status]}`}>{formatStatus(selectedTask.status)}</span>
            <span className="pill">spec: {selectedTask.specVersionSeen}</span>
            <span className="pill">doc sync: {selectedTask.docSyncStatus}</span>
          </div>
        </div>

        <div className="detail-grid">
          <DetailSection title="Objective">
            <p>{selectedTask.objective}</p>
          </DetailSection>

          <DetailSection title="Acceptance Criteria">
            <ul>
              {selectedTask.acceptanceCriteria.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </DetailSection>

          <DetailSection title="Boundaries">
            {selectedTask.boundaries?.length ? (
              <ul>
                {selectedTask.boundaries.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No explicit boundaries set.</p>
            )}
          </DetailSection>

          <DetailSection title="Plan">
            <ol>
              {selectedTask.plan.map((step) => (
                <li key={step.id}>
                  <span className={`step-state ${step.status}`}>{step.status}</span>
                  {step.label}
                </li>
              ))}
            </ol>
          </DetailSection>

          <DetailSection title="Progress Log">
            <ul>
              {activity
                .filter((event) => event.taskId === selectedTask.id)
                .map((event) => (
                  <li key={event.id}>
                    <strong>{event.title}</strong>
                    {event.body ? ` — ${event.body}` : ''}
                  </li>
                ))}
            </ul>
          </DetailSection>

          <DetailSection title="Result">
            {selectedTask.status === 'done' ? (
              <p>Completed successfully and surfaced in Done Digest.</p>
            ) : selectedTask.status === 'blocked' ? (
              <p>{selectedTask.blockerDetail}</p>
            ) : (
              <p className="muted">Result pending completion.</p>
            )}
          </DetailSection>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}
