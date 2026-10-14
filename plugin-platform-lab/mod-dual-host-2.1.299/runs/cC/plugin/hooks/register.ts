import type { Register } from 'claude-code'

const LOG = "/private/var/folders/jx/81xz9_xj7x31h6mwxd7qrlj40000gn/T/mod-dual-host-2299/cC/repo/.probe/module.jsonl"
const OUTSIDE = "/private/var/folders/jx/81xz9_xj7x31h6mwxd7qrlj40000gn/T/mod-dual-host-2299/cC/outside.txt"
const rows: string[] = []

type Writer = { fs: { write: (path: string, text: string) => Promise<void> } }

async function put($: Writer, row: Record<string, unknown>): Promise<void> {
  rows.push(JSON.stringify({ at: Date.now(), ...row }))
  await $.fs.write(LOG, rows.join('\n') + '\n')
}

async function attempt<T>(work: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await work()
  } catch (error) {
    return { error: String(error) }
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const home = await attempt(() => $.env.get('HOME'))
    await put($, {
      event: 'session.start',
      root: $.plugin.root,
      enabledPlugins: await attempt(async () => Object.keys((await $.settings.read()).enabledPlugins ?? {})),
      home,
      outside: await attempt(() => $.fs.read(OUTSIDE)),
      peerCodingFlag: await attempt(() => $.fs.exists(`${typeof home === 'string' ? home : ''}/.config/claude-x-codex/mode`)),
      process: await attempt(async () => {
        const ran = await $.process.run(['python3', '-c', 'print(42)'])
        return { exitCode: ran.exitCode, stdout: ran.stdout }
      }),
    })
    return result
  })

  on('prompt.submit', async ($, e, next) => {
    await put($, { event: 'prompt.submit', length: e.text.length })
    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    await put($, { event: 'tool.call', command: e.command })
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await put($, { event: 'session.measure', rateLimits: e.rateLimits, changed: e.changed })
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    const usage = await attempt(async () => (await $.session.usage()).rateLimits)
    await put($, { event: 'session.end', rateLimits: usage })
    return next(e)
  })
}
