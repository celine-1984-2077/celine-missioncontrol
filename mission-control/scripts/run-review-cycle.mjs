import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const options = {
  kind: 'qa_review',
  taskId: 'MC-1',
  title: 'Untitled task',
  objective: '',
  targetUrl: 'http://127.0.0.1:4173/',
  outDir: '/tmp/mission-control-browser-review',
}

for (let i = 0; i < args.length; i += 1) {
  const key = args[i]
  const value = args[i + 1]
  if (!key?.startsWith('--')) continue
  options[key.slice(2)] = value
}

fs.mkdirSync(options.outDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_')

execFileSync('bash', [
  './mission-control/scripts/browser-review.sh',
  options.targetUrl,
  options.outDir,
], { stdio: 'inherit', cwd: process.cwd() })

const latestJson = path.join(options.outDir, 'latest.json')
const ingestRaw = execFileSync('node', [
  './mission-control/scripts/ingest-browser-review.mjs',
  latestJson,
], { cwd: process.cwd(), encoding: 'utf8' })
const ingest = JSON.parse(ingestRaw)

const reviewPacket = {
  generatedAt: new Date().toISOString(),
  kind: options.kind,
  taskId: options.taskId,
  taskTitle: options.title,
  objective: options.objective,
  targetUrl: options.targetUrl,
  artifact: ingest,
  autoDraft: {
    summary:
      options.kind === 'qa_review'
        ? `Auto-captured browser evidence for ${options.taskId}. Manual QA verdict still required.`
        : `Auto-captured browser evidence for ${options.taskId}. Manual UX interpretation still required.`,
    findings:
      options.kind === 'qa_review'
        ? 'Review packet generated. Inspect screenshot/snapshot and record pass/fail against acceptance criteria.'
        : 'Review packet generated. Inspect screenshot/snapshot and record UX issues, hierarchy problems, and polish opportunities.',
  },
  suggestedFollowups:
    options.kind === 'qa_review'
      ? ['bug', 'spec_update']
      : ['improvement', 'spec_update'],
}

const packetPath = path.join(options.outDir, `${options.taskId}-${options.kind}-${stamp}.review.json`)
fs.writeFileSync(packetPath, JSON.stringify(reviewPacket, null, 2))

const markdown = `# ${options.kind} packet — ${options.taskId}\n\n- Generated at: ${reviewPacket.generatedAt}\n- Task: ${options.taskId} ${options.title}\n- Objective: ${options.objective || 'n/a'}\n- Target URL: ${options.targetUrl}\n- Screenshot: ${ingest.screenshotPath || 'n/a'}\n- Snapshot ID: ${ingest.snapshotId || 'n/a'}\n\n## Auto draft summary\n\n${reviewPacket.autoDraft.summary}\n\n## Auto draft findings\n\n${reviewPacket.autoDraft.findings}\n\n## Evidence links\n\n${(ingest.evidenceLinks || []).map((link) => `- ${link}`).join('\n') || '- none'}\n`
const markdownPath = packetPath.replace(/\.json$/, '.md')
fs.writeFileSync(markdownPath, markdown)

process.stdout.write(JSON.stringify({
  ok: true,
  packetPath,
  markdownPath,
  screenshotPath: ingest.screenshotPath,
  snapshotId: ingest.snapshotId,
}, null, 2))
