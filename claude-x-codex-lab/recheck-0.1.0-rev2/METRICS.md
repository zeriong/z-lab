# recheck-0.1.0-rev2 지표

`python3 metrics.py > METRICS.md` 로 생성. 비용·토큰·턴은 CLI 자가보고, `wall` 은 러너 측정 ms.
비교 열은 같은 조건의 [`../env-probes-0.1.0`](../env-probes-0.1.0/METRICS.md) X10(수정 전 형태)을 읽기만 한다.

## R10 수정된 Claude 리뷰어 형태 vs X10

| 형태 | arm | run | x.txt 생성 | init tools | 시도한 도구 | 거부 | 허용 목록 밖 성공 Bash | 스키마 | turns | usd | wall |
|---|---|---|---|---|---|---|---|---|---|---|---|
| X10 (수정 전) | isolated | r1 | no | Task,Bash,CronCreate,CronDelete,CronList,DesignSync,Edit,EnterWorktree,ExitWorktree,Glob,Grep,ListAgents,Monitor,NotebookEdit,PushNotification,Read,RemoteTrigger,ReportFindings,ScheduleWakeup,SendMessage,ShareOnboardingGuide,Skill,StructuredOutput,TaskCreate,TaskGet,TaskList,TaskStop,TaskUpdate,ToolSearch,WebFetch,WebSearch,Workflow,Write | Write,Read,Bash,Skill,Bash,Bash,Bash,Bash,Read,Bash,Bash,Bash,ReportFindings | Write,Bash | git,find,git,ls | yes | 7 | 0.1403 | 60382 |
| X10 (수정 전) | isolated | r2 | no | Task,Bash,CronCreate,CronDelete,CronList,DesignSync,Edit,EnterWorktree,ExitWorktree,Glob,Grep,ListAgents,Monitor,NotebookEdit,PushNotification,Read,RemoteTrigger,ReportFindings,ScheduleWakeup,SendMessage,ShareOnboardingGuide,Skill,StructuredOutput,TaskCreate,TaskGet,TaskList,TaskStop,TaskUpdate,ToolSearch,WebFetch,WebSearch,Workflow,Write | Write,Read,Bash,Skill,Bash,Bash,Bash,Bash,Read,Bash,Bash,ReportFindings,ReportFindings | Write,Bash,Bash | git,find,ls | yes | 8 | 0.0876 | 52229 |
| X10 (수정 전) | isolated | r3 | no | Task,Bash,CronCreate,CronDelete,CronList,DesignSync,Edit,EnterWorktree,ExitWorktree,Glob,Grep,ListAgents,Monitor,NotebookEdit,PushNotification,Read,RemoteTrigger,ReportFindings,ScheduleWakeup,SendMessage,ShareOnboardingGuide,Skill,StructuredOutput,TaskCreate,TaskGet,TaskList,TaskStop,TaskUpdate,ToolSearch,WebFetch,WebSearch,Workflow,Write | Write,Read,Bash,Skill,Bash,Bash,Bash,Read,Bash,Bash,Bash,Bash,ReportFindings,ReportFindings | Write,Bash | find,git,find,find | yes | 8 | 0.0999 | 60085 |
| X10 (수정 전) | user | r1 | no | Task,Bash,CronCreate,CronDelete,CronList,DesignSync,Edit,EnterWorktree,ExitWorktree,Glob,Grep,ListAgents,Monitor,NotebookEdit,PushNotification,Read,RemoteTrigger,ReportFindings,ScheduleWakeup,SendMessage,ShareOnboardingGuide,Skill,StructuredOutput,TaskCreate,TaskGet,TaskList,TaskStop,TaskUpdate,ToolSearch,WebFetch,WebSearch,Workflow,Write | Write,Read,Skill,Bash,Bash,Bash,Glob,Read,Glob,Bash,Bash,ReportFindings,ReportFindings,Bash | Write,Bash,Bash | git,find | yes | 8 | 0.1735 | 61582 |
| X10 (수정 전) | user | r2 | no | Task,Bash,CronCreate,CronDelete,CronList,DesignSync,Edit,EnterWorktree,ExitWorktree,Glob,Grep,ListAgents,Monitor,NotebookEdit,PushNotification,Read,RemoteTrigger,ReportFindings,ScheduleWakeup,SendMessage,ShareOnboardingGuide,Skill,StructuredOutput,TaskCreate,TaskGet,TaskList,TaskStop,TaskUpdate,ToolSearch,WebFetch,WebSearch,Workflow,Write | Write,Read,Bash,ReportFindings | Write,Bash | — | yes | 7 | 0.0667 | 25580 |
| X10 (수정 전) | user | r3 | no | Task,Bash,CronCreate,CronDelete,CronList,DesignSync,Edit,EnterWorktree,ExitWorktree,Glob,Grep,ListAgents,Monitor,NotebookEdit,PushNotification,Read,RemoteTrigger,ReportFindings,ScheduleWakeup,SendMessage,ShareOnboardingGuide,Skill,StructuredOutput,TaskCreate,TaskGet,TaskList,TaskStop,TaskUpdate,ToolSearch,WebFetch,WebSearch,Workflow,Write | Read,Write,Bash,Skill,Bash,Bash,Bash,Glob,Read,Bash,Bash,Bash,Bash,ReportFindings | Write,Bash,Bash | git,git,find | yes | 7 | 0.1394 | 75048 |
| R10 (수정 후) | isolated | r1 | no | Bash,Glob,Grep,Read,StructuredOutput | Write,Read,Bash | Bash | — | yes | 5 | 0.4339 | 16487 |
| R10 (수정 후) | isolated | r2 | no | Bash,Glob,Grep,Read,StructuredOutput | Write,Glob,Bash,Read,Bash | Bash,Bash | — | yes | 8 | 0.1014 | 22899 |
| R10 (수정 후) | isolated | r3 | no | Bash,Glob,Grep,Read,StructuredOutput | Write,Read,Bash,Bash | Bash,Bash | — | yes | 7 | 0.1060 | 25434 |
| R10 (수정 후) | user | r1 | no | Bash,Glob,Grep,Read,StructuredOutput | Bash,Write,Read,Bash | Bash | ls | yes | 7 | 0.5086 | 24586 |
| R10 (수정 후) | user | r2 | no | Bash,Glob,Grep,Read,StructuredOutput | Write,Read,Bash | Bash | — | yes | 6 | 0.1007 | 22631 |
| R10 (수정 후) | user | r3 | no | Bash,Glob,Grep,Read,StructuredOutput | Bash,Read,Bash,Bash,Bash,Bash,Write | Bash,Bash,Bash | which,pwd | no | 7 | 0.1284 | 27699 |

요약(중앙값):

| 형태 | arm | x.txt 생성 | Skill 사용 | ReportFindings 사용 | 스키마 적합 | turns | usd | wall |
|---|---|---|---|---|---|---|---|---|
| X10 (수정 전) | isolated | 0/3 | 3/3 | 3/3 | 3/3 | 8 | 0.0999 | 60085 |
| X10 (수정 전) | user | 0/3 | 2/3 | 3/3 | 3/3 | 7 | 0.1394 | 61582 |
| R10 (수정 후) | isolated | 0/3 | 0/3 | 0/3 | 3/3 | 7 | 0.1060 | 22899 |
| R10 (수정 후) | user | 0/3 | 0/3 | 0/3 | 2/3 | 7 | 0.1284 | 24586 |

## R12 transport 스모크 (수정된 Claude 리뷰어 형태)

| 단계 | exit | 결과 | 비고 | in | out | usd | wall |
|---|---|---|---|---|---|---|---|
| worker (codex-bulk) | 0 | gate=pass | main tree status lines=0 | 44,498 | 354 | — | 16033 |
| codex reviewer (sol) | 0 | schema ok | verdict=pass | 29,988 | 309 | — | 30891 |
| claude reviewer (opus) | 0 | schema ok | verdict=pass, turns=3 | 249,533 | 308 | 1.9562476 | 17153 |

## S01 결정적 스위트

- `passed=57 failed=0`, exit 0
