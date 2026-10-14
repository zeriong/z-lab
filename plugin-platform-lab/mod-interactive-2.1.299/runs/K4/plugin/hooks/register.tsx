import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const LOG = "/private/var/folders/jx/81xz9_xj7x31h6mwxd7qrlj40000gn/T/mod-interactive-2299/K4/repo/.probe/module.jsonl"
const five = atom({ plugin: 'ask-probe', key: 'five' } as const, 'n/a')
const rows: string[] = []

type Writer = { fs: { write: (path: string, text: string) => Promise<void> } }

async function put($: Writer, row: Record<string, unknown>): Promise<void> {
  rows.push(JSON.stringify({ at: Date.now(), ...row }))
  await $.fs.write(LOG, rows.join('\n') + '\n')
}

export const register: Register = on => {
  let turnId: string | undefined
  let asking: Promise<string> | undefined

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await put($, { event: 'session.start' })
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const value = await read($, five)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text>probe-band five_hour={value}</Text>
      </Box>
    )
  })

  on('session.measure', async ($, e, next) => {
    const window = e.rateLimits.find(r => r.kind === 'five_hour')
    const value = window ? String(window.percentUsed) : 'none'
    await update($, five, () => value)
    $.ui.status(`probe-status ${value}`)
    await put($, { event: 'session.measure', rateLimits: e.rateLimits })
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    turnId = e.turnId
    await put($, { event: 'turn.start', turnId })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await put($, { event: 'turn.complete' })
    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    asking ??= $.ui.ask('probe: continue?', ['예', '아니오'])
    let answer: string
    try {
      answer = await asking
    } catch (error) {
      answer = `rejected: ${String(error)}`
    }
    await put($, { event: 'tool.call', command: e.command, agentId: e.agentId ?? null, answer })
    if (answer === '아니오') {
      if (turnId) {
        try {
          await $.turn.abort({ turnId })
          await put($, { event: 'abort', ok: true })
        } catch (error) {
          await put($, { event: 'abort', error: String(error) })
        }
      }
      return { deny: 'ask-probe: the user answered no' }
    }
    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'ask-probe: its guard failed' }))
}
