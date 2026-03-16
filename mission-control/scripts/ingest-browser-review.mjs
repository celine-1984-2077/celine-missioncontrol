import fs from 'node:fs'
import path from 'node:path'

const input = process.argv[2]
if (!input) {
  console.error('Usage: node mission-control/scripts/ingest-browser-review.mjs <review-json>')
  process.exit(1)
}

const raw = fs.readFileSync(input, 'utf8')
const parsed = JSON.parse(raw)
const screenshotPath = parsed?.data?.screenshot_path ?? parsed?.screenshotPath ?? ''
const snapshotId = parsed?.data?.snapshot_id ?? parsed?.snapshotId ?? ''
const targetUrl = parsed?.url ?? parsed?.targetUrl ?? ''

const result = {
  sourceFile: path.resolve(input),
  targetUrl,
  screenshotPath,
  snapshotId,
  evidenceLinks: [path.resolve(input)].filter(Boolean),
}

process.stdout.write(JSON.stringify(result, null, 2))
