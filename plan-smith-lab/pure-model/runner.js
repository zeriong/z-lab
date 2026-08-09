// pure-model 계열 실행 스크립트 — 새 세션에서 Workflow({script: <이 파일의 내용>}) 로 실행한다.
// 이 세션에서 실행하지 않는 이유: 커스텀 에이전트 정의(.claude/agents/bare-model.md)는 세션 중
// 핫로드되지 않으므로, 정의를 만든 세션에서는 agentType 'bare-model' 을 쓸 수 없다.

export const meta = {
  name: 'pure-model-ab',
  description: 'pure-model: 4 models x {plan, plan-smith}, bare agent (Read/Write only, no persona), plan -> implement',
  phases: [
    { title: 'Plan', detail: '8 cells write a plan — baseline sees only the requirement, plan-smith also sees the skill docs' },
    { title: 'Implement', detail: 'a fresh bare agent implements from plan.md alone' },
  ],
}

const LAB = '/Users/jeonjelyong/Desktop/WorkSpace/Z-Work/z-lab/plan-smith-lab'
const PM = LAB + '/pure-model'
const GAME = LAB + '/test/game-prompt.md'
const PS = '/Users/jeonjelyong/Desktop/WorkSpace/Z-Work/plan-smith/plugins/plan-smith/skills/plan-smith'

const MODELS = [
  { dir: 'opus-5', model: 'opus' },
  { dir: 'fable-5', model: 'fable' },
  { dir: 'sonnet-5', model: 'sonnet' },
  { dir: 'haiku-4.5', model: 'haiku' },
]

const PLAN_SCHEMA = {
  type: 'object',
  properties: { path: { type: 'string' }, note: { type: 'string' } },
  required: ['path', 'note'],
}
const IMPL_SCHEMA = {
  type: 'object',
  properties: { files_written: { type: 'integer' }, entry: { type: 'string' }, note: { type: 'string' } },
  required: ['files_written', 'entry', 'note'],
}

// 대조군 — 처치 없음. 분량·구성·형식 지시 없음.
function planPrompt(cellDir) {
  return [
    '아래 요구사항 파일을 읽고, 이 게임을 구현하기 위한 계획서를 작성하라.',
    '',
    '- 요구사항: ' + GAME,
    '- 출력: ' + cellDir + '/plan.md 에 Write',
    '',
    '계획서의 구성·분량·형식은 전부 네가 정한다.',
    '이 단계에서는 코드를 작성하지 않는다.',
  ].join('\n')
}

// 처치군 — 유일한 차이는 스킬 문서를 함께 읽는다는 것.
function planSmithPrompt(cellDir) {
  return [
    '아래 요구사항 파일을 읽고, 이 게임을 구현하기 위한 계획서를 작성하라.',
    '',
    '- 요구사항: ' + GAME,
    '- 출력: ' + cellDir + '/plan.md 에 Write',
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

// 구현 — 입력은 plan.md 단독. 원 요구사항을 주지 않는다(플랜이 담지 못한 것은 메울 수 없다).
function implPrompt(cellDir) {
  return [
    '아래 계획서를 읽고, 그 계획대로 소스코드를 작성하라.',
    '',
    '- 계획서: ' + cellDir + '/plan.md',
    '- 출력: ' + cellDir + '/result/ 아래에 Write (하위 경로를 포함해 Write하면 폴더는 자동 생성된다)',
    '',
    '파일 구성·개수·분량은 전부 네가 정한다.',
    '너에게는 파일을 읽고 쓰는 도구만 있다. 설치·빌드·실행·테스트는 할 수 없다.',
  ].join('\n')
}

phase('Plan')
const CELLS = []
for (const m of MODELS) {
  CELLS.push({ cell: m.dir + '/plan', model: m.model, smith: false })
  CELLS.push({ cell: m.dir + '/plan-smith', model: m.model, smith: true })
}

const results = await pipeline(
  CELLS,
  (c) => {
    const dir = PM + '/' + c.cell
    return agent(c.smith ? planSmithPrompt(dir) : planPrompt(dir), {
      label: 'plan:' + c.cell, phase: 'Plan', model: c.model,
      agentType: 'bare-model', schema: PLAN_SCHEMA,
    }).then((r) => ({ ...c, plan: r }))
  },
  async (w) => {
    if (!w.plan) return { cell: w.cell, status: 'plan-failed' }
    const dir = PM + '/' + w.cell
    const impl = await agent(implPrompt(dir), {
      label: 'impl:' + w.cell, phase: 'Implement', model: w.model,
      agentType: 'bare-model', schema: IMPL_SCHEMA,
    })
    return {
      cell: w.cell,
      plan_note: w.plan.note,
      files: impl ? impl.files_written : null,
      entry: impl ? impl.entry : null,
      impl_note: impl ? impl.note : null,
      status: impl ? 'ok' : 'impl-failed',
    }
  }
)

const done = results.filter(Boolean)
done.forEach((r) => log(r.cell + ': ' + r.status + ' | files ' + r.files + ' | entry ' + r.entry))
return { cells: done }
