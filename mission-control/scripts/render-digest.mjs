#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const defaultExportPath = '/tmp/mission-control/state.json'
const sampleStatePath = path.join(repoRoot, 'docs', 'sample-state.json')
const requestedPath = process.argv[2] ? path.resolve(process.argv[2]) : undefined
const statePath = requestedPath ?? (fs.existsSync(defaultExportPath) ? defaultExportPath : sampleStatePath)

function buildFallbackState() {
  return {
    tasks: [
      {
        id: 'MC-1',
        title: 'Build Mission Control app skeleton',
        status: 'in_progress',
        priority: 'high',
        type: 'code',
        nextStep: 'Wire sample events and doc-sync badges',
        blockerDetail: '',
        needsUiTest: true,
        requiresUxReview: true,
      },
      {
        id: 'MC-4',
        title: 'Connect Discord notification pipeline',
        status: 'blocked',
        priority: 'high',
        type: 'ops',
        blockerDetail: 'Waiting for app-side notification implementation in a later phase.',
        needsUiTest: false,
        requiresUxReview: false,
      },
    ],
    activity: [
      { taskId: 'MC-1', title: 'App skeleton implementation started' },
      { taskId: 'MC-4', title: 'Notification pipeline blocked' },
      { taskId: 'MC-1', title: 'MC-1 UX review submitted' },
    ],
    runs: [
      {
        id: 'RUN-UX-1',
        taskId: 'MC-1',
        kind: 'ux_review',
        status: 'passed',
        startedAt: '2026-03-16T07:00:00.000Z',
        endedAt: '2026-03-16T07:05:00.000Z',
        heartbeatAt: '2026-03-16T07:05:00.000Z',
        summary: 'UX review submitted with notes but no captured evidence yet.',
        artifact: {
          reviewSummary: 'Navigation labels still feel rough; refine after next pass.',
          capturedAt: '2026-03-16T07:05:00.000Z',
        },
      },
    ],
  }
}

function loadState(file) {
  if (!fs.existsSync(file)) {
    return buildFallbackState()
  }

  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function hasPassingReview(state, taskId, kind) {
  return state.runs.some((run) => run.taskId === taskId && run.kind === kind && run.status === 'passed')
}

function getReviewEvidenceSummary(state, taskId, kind) {
  const reviewRuns = state.runs
    .filter((run) => run.taskId === taskId && (run.kind === 'qa_review' || run.kind === 'ux_review') && (!kind || run.kind === kind))
    .sort((a, b) => {
      const aTime = a.endedAt || a.startedAt || ''
      const bTime = b.endedAt || b.startedAt || ''
      return bTime.localeCompare(aTime)
    })

  const latestCompletedRun = reviewRuns.find((run) => run.status !== 'running')
  const latestArtifact = latestCompletedRun?.artifact
  const latestEvidenceAt = latestArtifact?.capturedAt || latestCompletedRun?.endedAt || latestCompletedRun?.startedAt
  const latestEvidenceLabel = latestArtifact?.snapshotId || latestArtifact?.screenshotPath || latestArtifact?.evidenceLinks?.[0]
  const missingEvidence = Boolean(
    latestCompletedRun &&
    !latestArtifact?.screenshotPath &&
    !latestArtifact?.snapshotId &&
    !(latestArtifact?.evidenceLinks?.length)
  )

  return { latestCompletedRun, latestArtifact, latestEvidenceAt, latestEvidenceLabel, missingEvidence }
}

function getBoardNotificationDigest(state) {
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
  const evidenceReadyTasks = state.tasks
    .map((task) => ({ task, review: getReviewEvidenceSummary(state, task.id) }))
    .filter(({ review }) => review.latestEvidenceLabel)
  const latestEvents = state.activity.slice(0, 3).map((event) => `${event.taskId}: ${event.title}`)

  const nextAction = blocked[0]?.blockerDetail
    ? `Resolve blocker on ${blocked[0].id}`
    : pendingUx[0]
      ? `Run UX review for ${pendingUx[0].id}`
      : missingEvidence[0]
        ? `Attach evidence for ${missingEvidence[0].taskId} ${missingEvidence[0].kind}`
        : inProgress[0]?.nextStep
          ? `${inProgress[0].id}: ${inProgress[0].nextStep}`
          : undefined

  return {
    headline: 'Mission Control overnight digest',
    lines: [
      `source=${fileHint(statePath, requestedPath)}`,
      `in_progress=${inProgress.length} blocked=${blocked.length} pending_ux=${pendingUx.length} missing_evidence=${missingEvidence.length}`,
      ...blocked.slice(0, 2).map((task) => `blocked: ${task.id} ${task.blockerDetail || task.title}`),
      ...pendingUx.slice(0, 2).map((task) => `ux gate: ${task.id} awaiting UX review pass`),
      ...missingEvidence.slice(0, 2).map((run) => `missing evidence: ${run.taskId} ${run.kind} ${run.id}`),
      ...evidenceReadyTasks.slice(0, 2).flatMap(({ task, review }) => [
        `latest evidence: ${task.id} ${review.latestEvidenceLabel}`,
        ...(review.latestEvidenceAt ? [`latest evidence captured_at: ${task.id} ${review.latestEvidenceAt}`] : []),
      ]),
      ...inProgress.slice(0, 2).map((task) => `active: ${task.id} next=${task.nextStep || 'unset'}`),
      ...latestEvents,
    ],
    nextAction,
  }
}

function fileHint(file, requested) {
  if (requested) return file
  if (file === defaultExportPath) return `${file} (export)`
  if (file === sampleStatePath) return `${file} (sample)`
  return file
}

const state = loadState(statePath)
const digest = getBoardNotificationDigest(state)
console.log(`**${digest.headline}**`)
for (const line of digest.lines) {
  console.log(`- ${line}`)
}
if (digest.nextAction) {
  console.log(`- next_action: ${digest.nextAction}`)
}
