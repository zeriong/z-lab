// model-bump/tco 실행 스크립트 — 2a impl-swap(구현 12) + 2b planner-swap(플랜 2 → 구현 8).
// 구현 프롬프트는 transfer/runner.js 의 implPrompt와 문안 동일.
// 계획 프롬프트는 pure-model/runner.js 문안 + 구현자 고지(재구성본 — SPEC.md 참조).

export const meta = {
  name: 'model-bump-tco',
  description: 'model-bump tco: 2a strong implementers on fixed v1.4 plans (12) + 2b opus-5.5 planner for haiku (2 plans, 8 impl)',
  phases: [
    { title: 'Impl-swap', detail: 'opus-5.5 / fable-5.1 implement the two fixed plans, n=3 each' },
    { title: 'Planner-swap plan', detail: 'opus-5.5 writes informed-baseline and plan-smith 1.4.2 plans for a haiku implementer' },
    { title: 'Planner-swap impl', detail: 'haiku implements each new plan, n=4' },
  ],
}

const M = '/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/model-bump/tco'
const GAME = M + '/inputs/game-prompt.md'
const PS = M + '/inputs/skill-v1.4.2'

const IMPL_SCHEMA = {
  type: 'object',
  properties: { files_written: { type: 'integer' }, entry: { type: 'string' }, note: { type: 'string' } },
  required: ['files_written', 'entry', 'note'],
}
const PLAN_SCHEMA = {
  type: 'object',
  properties: { path: { type: 'string' }, note: { type: 'string' } },
  required: ['path', 'note'],
}

const NOTICE = [
  '이 계획서의 구현자는 claude-haiku-4-5다. 구현자는 이 계획서 하나만 읽고, 파일을 읽고 쓰는 도구만으로',
  '작업한다(설치·빌드·실행·테스트 불가).',
]

function planPrompt(cellDir) {
  return [
    '아래 요구사항 파일을 읽고, 이 게임을 구현하기 위한 계획서를 작성하라.',
    '',
    '- 요구사항: ' + GAME,
    '- 출력: ' + cellDir + '/plan.md 에 Write',
    '',
    ...NOTICE,
    '',
    '계획서의 구성·분량·형식은 전부 네가 정한다.',
    '이 단계에서는 코드를 작성하지 않는다.',
  ].join('\n')
}

function planSmithPrompt(cellDir) {
  return [
    '아래 요구사항 파일을 읽고, 이 게임을 구현하기 위한 계획서를 작성하라.',
    '',
    '- 요구사항: ' + GAME,
    '- 출력: ' + cellDir + '/plan.md 에 Write',
    '',
    ...NOTICE,
    '',
    '작성 방법은 아래 문서들이 규정한다. 전부 읽고 그 방법론을 따르라',
    '(사용자 확인 게이트가 나오면 배치 실행이므로 스스로 승인하고 진행한다).',
    '- ' + PS + '/SKILL.md',
    '- ' + PS + '/references/frames.md',
    '- ' + PS + '/references/styles.md',
    '- ' + PS + '/references/packet-template.md',
    '',
    '이 단계에서는 코드를 작성하지 않는다.',
  ].join('\n')
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

const ARMS_2A = ['informed-baseline', 'plan-smith-1.4']
const IMPLS_2A = [{ dir: 'opus-5.5', model: 'opus' }, { dir: 'fable-5.1', model: 'fable' }]
const ARMS_2B = [{ arm: 'informed-baseline', smith: false }, { arm: 'plan-smith-1.4.2', smith: true }]

// 2a — 셀 간 의존 없음
const run2a = []
for (const im of IMPLS_2A) for (const arm of ARMS_2A) for (const r of [1, 2, 3]) {
  const cell = 'impl-swap/' + im.dir + '/' + arm + '/r' + r
  run2a.push(() =>
    agent(implPrompt(M + '/inputs/fixed-plans/' + arm + '.md', M + '/' + cell + '/result'), {
      label: 'impl:' + cell, phase: 'Impl-swap', model: im.model, agentType: 'bare-model', schema: IMPL_SCHEMA,
    }).then((x) => ({ cell, ok: !!x, ...(x || {}) }))
  )
}

// 2b — 플랜이 끝난 arm부터 곧바로 구현 4개 (배리어 없음)
const run2b = ARMS_2B.map((a) => async () => {
  const dir = M + '/planner-swap/' + a.arm
  const plan = await agent(a.smith ? planSmithPrompt(dir) : planPrompt(dir), {
    label: 'plan:planner-swap/' + a.arm, phase: 'Planner-swap plan', model: 'opus', agentType: 'bare-model', schema: PLAN_SCHEMA,
  })
  if (!plan) return [{ cell: 'planner-swap/' + a.arm, ok: false, note: 'plan-failed' }]
  return parallel([1, 2, 3, 4].map((r) => () => {
    const cell = 'planner-swap/' + a.arm + '/r' + r
    return agent(implPrompt(dir + '/plan.md', M + '/' + cell + '/result'), {
      label: 'impl:' + cell, phase: 'Planner-swap impl', model: 'haiku', agentType: 'bare-model', schema: IMPL_SCHEMA,
    }).then((x) => ({ cell, ok: !!x, ...(x || {}) }))
  }))
})

const all = await parallel([...run2a, ...run2b])
const cells = all.flat().filter(Boolean)
cells.forEach((c) => log(c.cell + ': ' + (c.ok ? 'ok' : 'FAILED') + ' | files ' + c.files_written + ' | entry ' + c.entry))
return { cells }
