import type { Register } from 'claude-code'

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const all = await $.config.list()
    const rows = all.filter(row => JSON.stringify(row.provider).includes('pcmod'))
    const ran = await $.process.run(['sh', '-c', 'env | grep -c "^CLAUDE_CONFIG_DIR=" || true'])
    await $.fs.write('mod-probe.json', JSON.stringify({ options, count: all.length, rows, configDirVars: ran.stdout.trim() }, null, 1))
    return result
  })
}
