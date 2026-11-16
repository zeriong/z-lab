import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const LOG = "/private/var/folders/fd/j548rpgd0bz5n99xbntzf0100000gn/T/fh-eta-probes-r4/Q4/repo/.probe/module.jsonl"
const GOAL = "/private/var/folders/fd/j548rpgd0bz5n99xbntzf0100000gn/T/fh-eta-probes-r4/Q4/repo/.free-hands/goal.md"
const calls = atom({ plugin: 'mod-probe', key: 'calls' } as const, 0)
const rows: string[] = []

type Host = {
  fs: { write: (path: string, text: string) => Promise<void>; read: (path: string) => Promise<string> }
}

async function put($: Host, row: Record<string, unknown>): Promise<void> {
  rows.push(JSON.stringify({ at: Date.now(), ...row }))
  await $.fs.write(LOG, rows.join('\n') + '\n')
}

async function goalText($: Host): Promise<string> {
  try {
    return await $.fs.read(GOAL)
  } catch (error) {
    return `unreadable: ${String(error)}`
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await put($, { event: 'session.start' })
    return result
  })

  on('turn.start', async ($, e, next) => {
    await put($, { event: 'turn.start', turnId: e.turnId })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await put($, { event: 'turn.complete' })
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await put($, { event: 'session.measure', changed: e.changed })
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const before = Date.now()
    const result = await next(e)
    const after = Date.now()
    const goal = await goalText($)
    const n = (await read($, calls)) + 1
    await update($, calls, () => n)
    const spawnStart = Date.now()
    let spawnMs: number | string
    try {
      await $.process.run(['python3', '-c', 'pass'])
      spawnMs = Date.now() - spawnStart
    } catch (error) {
      spawnMs = `failed: ${String(error)}`
    }
    await put($, { event: 'tool.call', tool: e.tool, agentId: e.agentId ?? null, before, after, n, spawnMs,
      goalOpen: (goal.match(/^- \[ \]/gm) ?? []).length, goalDone: (goal.match(/^- \[x\]/gm) ?? []).length })
    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const n = await read($, calls)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text>probe-band calls={n}</Text>
      </Box>
    )
  })
}
