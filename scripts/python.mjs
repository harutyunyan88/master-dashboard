// Runs Python from the project's virtualenv so npm scripts work the same on Windows and macOS/Linux.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const python = process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python'

if (!existsSync(python)) {
  console.error('Python virtualenv not found. Create it first:')
  console.error('  python -m venv .venv')
  console.error(`  ${python} -m pip install -r requirements-dev.txt`)
  process.exit(1)
}

const result = spawnSync(python, process.argv.slice(2), { stdio: 'inherit' })
process.exit(result.status ?? 1)
