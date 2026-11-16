import type { Register } from 'claude-code'

const LOG = "/private/var/folders/fd/j548rpgd0bz5n99xbntzf0100000gn/T/dashboard-run-030/K1/turn-log.jsonl"
const rows: string[] = []

async function put($: { fs: { write: (path: string, text: string) => Promise<void> } }, event: string): Promise<void> {
  rows.push(JSON.stringify({ at: Date.now(), event }))
  await $.fs.write(LOG, rows.join('\n') + '\n')
}

export const register: Register = on => {
  on('turn.start', async ($, e, next) => {
    await put($, 'turn.start')
    return next(e)
  })
  on('turn.complete', async ($, e, next) => {
    await put($, 'turn.complete')
    return next(e)
  })
}
