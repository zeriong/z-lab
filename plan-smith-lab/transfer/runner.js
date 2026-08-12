// transfer 계열 실행 스크립트 — 9셀(3 arm × 3 rep), 구현자는 전부 haiku + bare-model.
// 구현 프롬프트는 pure-model의 것과 문안 동일(플랜 경로·출력 경로만 다름) — 하니스 변수 통제.

export const meta = {
  name: 'transfer-ab',
  description: 'Asymmetric transfer: haiku implements 3x from each of three frozen plans (haiku-self / opus-baseline / opus-smith)',
  phases: [
    { title: 'Implement', detail: '9 cells, haiku + bare-model (Read/Write only), plan.md is the only input' },
  ],
}

const T = '/Users/jeonjelyong/Desktop/WorkSpace/Z-Work/z-lab/plan-smith-lab/transfer'

const ARMS = [
  { arm: 'haiku-self', plan: T + '/plans/haiku-self.md' },
  { arm: 'opus-baseline', plan: T + '/plans/opus-baseline.md' },
  { arm: 'opus-smith', plan: T + '/plans/opus-smith.md' },
]

const IMPL_SCHEMA = {
  type: 'object',
  properties: {
    files_written: { type: 'integer' },
    entry: { type: 'string' },
    note: { type: 'string' },
  },
  required: ['files_written', 'entry', 'note'],
}

function implPrompt(planPath, outDir) {
  return [
    '아래 계획서를 읽고, 그 계획대로 소스코드를 작성하라.',
    '',
    '- 계획서: ' + planPath,
    '- 출력: ' + outDir + '/ 아래에 Write (하위 경로를 포함해 Write하면 폴더는 자동 생성된다)',
    '',
    '파일 구성·개수·분량은 전부 네가 정한다.',
    '너에게는 파일을 읽고 쓰는 도구만 있다. 설치·빌드·실행·테스트는 할 수 없다.',
  ].join('\n')
}

phase('Implement')
const cells = []
for (const a of ARMS) for (const r of [1, 2, 3]) {
  cells.push({ cell: a.arm + '/r' + r, plan: a.plan, out: T + '/' + a.arm + '/r' + r + '/result' })
}

const results = await parallel(
  cells.map((c) => () =>
    agent(implPrompt(c.plan, c.out), {
      label: c.cell,
      phase: 'Implement',
      model: 'haiku',
      agentType: 'bare-model',
      schema: IMPL_SCHEMA,
    }).then((r) => ({ cell: c.cell, ok: !!r, ...(r || {}) }))
  )
)

const done = results.filter(Boolean)
log('implemented ' + done.filter((r) => r.ok).length + '/9 cells')
return {
  cells: done.map((r) => ({
    cell: r.cell, ok: r.ok,
    files_written: r.files_written ?? null,
    entry: r.entry ?? null,
    note: r.note ?? null,
  })),
}
