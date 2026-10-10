# synolink-ehr 재수정(rework) 측정 — 장부 전 / PASS 장부 / PRECEDENT.md

- 레포: `/Users/jeonjelyong/WorkSpace/CloudHospital/synolink-ehr`, 브랜치 `dev`, HEAD `fd3ef0c1`
- 측정일: 2026-10-10. 읽기 전용(`git log`, `git show`, `git ls-tree` 만 사용). 원시 수치는 `/tmp/precedent-lab/churn.json`.

## 방법

- **커밋 집합**: `git log --no-merges -M --date=iso-strict --format=… --name-only --since='2026-06-01'` 로 한 번 덤프하고 Python 으로 집계했습니다. 창 분류는 **author date**(`%ad`, 커밋 자체의 시간대)의 날짜 부분으로 했습니다. git 의 `--since/--until` 은 committer date 를 쓰므로 교차검증에만 썼습니다 — 비병합 커밋 수는 W0 141 / W1 46 / W2 139 로 두 기준이 같고, P0 는 author 319 vs committer 318, P1 은 353 vs 354 로 경계의 1건이 갈립니다. 제외된 병합 커밋 수는 W0 102 / W1 48 / W2 99 / P0 102 / P1 244 / P2 99 입니다.
- **소스 파일**: `apps/ packages/ .claude/ scripts/ tooling/` 아래 `*.ts *.tsx *.css *.mjs *.sh`. `node_modules`·`history/`·`graphify-out` 경로 제외, `*.md` 는 확장자 조건에서 제외됩니다. 표의 파일 수는 전부 이 필터 뒤의 수이고, 일괄 수정 커밋 목록(표 5)에만 전체 파일 수를 병기했습니다. 이름 변경은 git 기본 감지(`-M`)를 따라 순수 이름 변경은 새 경로 1건으로 셉니다.
- **통계**: median 은 짝수 개면 가운데 두 값의 평균, p90 은 nearest-rank(정렬 후 ⌈0.9n⌉번째). **재수정률** = 창 안에서 서로 다른 커밋 3개 이상이 건드린 소스 파일 수 ÷ 창 안에서 건드린 소스 파일 수. **일괄 수정** = 소스 파일 100개 이상을 건드린 커밋. `[일괄 제외]` 행은 그 커밋들을 뺀 뒤 다시 센 값입니다.
- **동반 갱신**: `.claude/hooks/commit-gate.sh` 의 `gate_precedent` 와 같은 규칙으로 셌습니다 — 소스 파일에서 **가장 가까운 상위 디렉터리**의 `PRECEDENT.md` 가 관할이고, 그 파일이 같은 커밋에 없으면 훅이 차단합니다(`PRECEDENT_OK=1` 토큰이 있으면 통과). 관할 집합은 HEAD 트리(요청 기준)와 각 커밋 시점 트리(`git ls-tree -r <sha>`) 두 가지로 계산했습니다. "후보"는 상한입니다: 훅은 Claude Code 의 PreToolUse(Bash) 훅이고 fail-open 이라, Claude Code 밖(일반 셸·Orca 터미널·다른 에이전트)에서 만든 커밋에는 걸리지 않습니다. 따라서 후보 수 = 「`PRECEDENT_OK=1` 로 통과한 커밋 + 훅 밖에서 만든 커밋」의 합입니다.
- **장부 원문 수치의 재현 여부**: 장부 생성 커밋 `b257597c` 의 `.claude/pass-ledger.md` 5~8행은 `observation-vitals` 55건, `use-vitals-entry-form.ts` 24회, 상위 14커밋 1800·569·392… 파일을 적고 있습니다. 같은 경로를 현재 `dev` 에서 2026-08-20 까지 세면 슬라이스 **29건**(병합 포함 29, `--all` 29), `use-vitals-entry-form.ts` **14회**(`--follow`, 병합 포함 14, `--all` 13)이고, 전체 이력에서 파일 수가 가장 큰 커밋은 `21044b0e`(2026-05-15) **1054 파일**로 1800 파일 커밋은 어떤 ref 에도 없습니다(569 는 `86ea8f49` 07-31, 392 는 `80381c89` 05-19 로 존재). 장부가 그 수를 어떻게 셌는지는 원문에 없어 재도출하지 않았고, 이 보고서의 수치는 전부 위 필터로 새로 센 값입니다.

## 창별 일자 분포 (비병합 전체 / 소스 커밋)

| 창 | 일자별 (요일: 전체/소스) | 커밋이 있는 날 |
|---|---|---:|
| W0 | 08-08(토) 0/0  08-09(일) 0/0  08-10(월) 24/22  08-11(화) 8/8  08-12(수) 35/33  08-13(목) 28/27  08-14(금) 12/10  08-15(토) 0/0  08-16(일) 0/0  08-17(월) 0/0  08-18(화) 18/18  08-19(수) 16/10 | 7 |
| W1 | 09-17(목) 8/6  09-18(금) 21/14  09-19(토) 0/0  09-20(일) 0/0  09-21(월) 0/0  09-22(화) 2/2  09-23(수) 4/4  09-24(목) 0/0  09-25(금) 0/0  09-26(토) 0/0  09-27(일) 0/0  09-28(월) 11/7 | 5 |
| W2 | 09-29(화) 18/9  09-30(수) 7/5  10-01(목) 3/1  10-02(금) 22/19  10-03(토) 3/3  10-04(일) 0/0  10-05(월) 0/0  10-06(화) 33/30  10-07(수) 32/31  10-08(목) 21/20  10-09(금) 0/0  10-10(토) 0/0 | 8 |

## 표

### 표 1. 커밋 규모 (W0/W1/W2 = 12일 창)

| 지표 | W0 장부 전 (08-08~08-19) | W1 장부 (09-17~09-28) | W2 PRECEDENT (09-29~10-10) |
|---|---:|---:|---:|
| 비병합 커밋 수 (전체) | 141 | 46 | 139 |
| 소스 파일을 건드린 커밋 수 | 128 | 33 | 118 |
| (참고) committer date 기준 소스 커밋 수 | 128 | 33 | 118 |
| 커밋당 소스 파일 수 median / p90 / max | 4.5 / 15 / 58 | 2 / 15 / 42 | 4 / 16 / 156 |
| 커밋당 소스 파일 수 (일괄 제외) median / p90 / max | 4.5 / 15 / 58 | 2 / 15 / 42 | 4 / 16 / 39 |
| 일괄 수정 커밋 (소스 ≥100 파일) | 0 | 0 | 2 |
| 일괄 수정 커밋 (9e8445dc 제외) | 0 | 0 | 1 |

### 표 2. 파일 재수정 (W0/W1/W2)

| 지표 | W0 | W1 | W2 |
|---|---:|---:|---:|
| [전체] 건드린 소스 파일 수 | 455 | 146 | 614 |
| [전체] 파일당 수정 횟수 median / p90 / max | 1 / 4 / 9 | 1 / 2 / 6 | 1 / 3 / 9 |
| [전체] 3회 이상 수정된 파일 수 | 95 | 4 | 102 |
| [전체] 재수정률 (3회 이상 / 전체) | 20.9% | 2.7% | 16.6% |
| [일괄 제외] 건드린 소스 파일 수 | 455 | 146 | 474 |
| [일괄 제외] 파일당 수정 횟수 median / p90 / max | 1 / 4 / 9 | 1 / 2 / 6 | 1 / 3 / 8 |
| [일괄 제외] 3회 이상 수정된 파일 수 | 95 | 4 | 60 |
| [일괄 제외] 재수정률 (3회 이상 / 전체) | 20.9% | 2.7% | 12.7% |

### 표 3. 전체 기간 P0/P1/P2 (일 단위 정규화)

| 지표 | P0 장부 전 (07-01~08-19, 50일) | P1 장부 (08-20~09-28, 40일) | P2 PRECEDENT (09-29~10-10, 12일) |
|---|---:|---:|---:|
| 비병합 커밋 수 (전체) | 319 | 353 | 139 |
| 소스 커밋 수 | 297 | 235 | 118 |
| 소스 커밋 / 일 | 5.94 | 5.875 | 9.833 |
| 커밋당 소스 파일 median / p90 / max | 5 / 17 / 554 | 2 / 12 / 59 | 4 / 16 / 156 |
| 일괄 수정 커밋 (≥100) | 1 | 0 | 2 |
| 일괄 수정 커밋 / 일 | 0.020 | 0.000 | 0.167 |
| 건드린 소스 파일 수 | 1215 | 596 | 614 |
| 건드린 소스 파일 / 일 | 24.3 | 14.9 | 51.167 |
| 파일당 수정 횟수 median / p90 / max | 1 / 5 / 18 | 1 / 4 / 15 | 1 / 3 / 9 |
| 재수정률 (3회 이상) | 26.8% | 21.1% | 16.6% |
| [일괄 제외] 건드린 소스 파일 수 | 936 | 596 | 474 |
| [일괄 제외] 파일당 수정 횟수 median / p90 / max | 1 / 5 / 17 | 1 / 4 / 15 | 1 / 3 / 8 |
| [일괄 제외] 재수정률 (3회 이상) | 29.2% | 21.1% | 12.7% |

### 표 4. 파일당 수정 횟수 상위 8 (전체 커밋 기준)

**W0** (2026-08-08 ~ 2026-08-19)

| 순위 | 파일 | 수정 횟수 |
|---:|---|---:|
| 1 | `apps/ehr-admin/features/diagnostic-report-list/ui/diagnostic-report-form.tsx` | 9 |
| 2 | `apps/ehr-admin/features/patient-create/ui/patient-create-form.tsx` | 9 |
| 3 | `apps/ehr-admin/features/patient-detail/ui/patient-summary-panel.tsx` | 9 |
| 4 | `apps/ehr-admin/features/service-request-list/ui/service-request-form.tsx` | 8 |
| 5 | `tooling/config-tailwind/style.css` | 7 |
| 6 | `apps/ehr-admin/features/patient-detail/ui/patient-details.tsx` | 7 |
| 7 | `apps/ehr-admin/features/patient-detail/model/hooks/use-patient-summary.ts` | 7 |
| 8 | `apps/ehr-admin/features/patient-create/ui/address-fields.tsx` | 6 |

**W1** (2026-09-17 ~ 2026-09-28)

| 순위 | 파일 | 수정 횟수 |
|---:|---|---:|
| 1 | `.claude/hooks/commit-gate.sh` | 6 |
| 2 | `apps/ehr-admin/features/settings/ui/tenant-info-dialog.tsx` | 3 |
| 3 | `apps/ehr-admin/features/patient-detail/ui/patient-tabs.tsx` | 3 |
| 4 | `apps/ehr-admin/features/patient-detail/ui/patient-summary-panel.tsx` | 3 |
| 5 | `apps/ehr-admin/features/patient-detail/model/hooks/use-patient-summary.ts` | 2 |
| 6 | `apps/ehr-admin/features/appointment/ui/appointment-dialog.tsx` | 2 |
| 7 | `apps/ehr-admin/features/appointment/ui/appointment-list.test.tsx` | 2 |
| 8 | `apps/ehr-admin/features/schedule-calendar/ui/appointment-dialog.tsx` | 2 |

**W2** (2026-09-29 ~ 2026-10-10)

| 순위 | 파일 | 수정 횟수 |
|---:|---|---:|
| 1 | `apps/ehr-admin/features/pane-workspace/model/hooks/use-pane-workspace.ts` | 9 |
| 2 | `apps/ehr-admin/features/smart-search/ui/smart-search-page.tsx` | 8 |
| 3 | `apps/ehr-admin/shared/lib/auth.config.ts` | 7 |
| 4 | `apps/ehr-admin/features/patient-timeline/ui/timeline-entry-card.tsx` | 6 |
| 5 | `packages/ehr/src/widgets/fhir-search-table/ui/column-header/column-header-menu.tsx` | 6 |
| 6 | `apps/ehr-admin/features/practitioner-list/model/hooks/use-practitioner-form.test.ts` | 6 |
| 7 | `apps/ehr-admin/features/practitioner-list/model/utils/build-practitioner-command.ts` | 6 |
| 8 | `apps/ehr-admin/features/task-create/ui/create-task-dialog.tsx` | 5 |

**P0** (2026-07-01 ~ 2026-08-19)

| 순위 | 파일 | 수정 횟수 |
|---:|---|---:|
| 1 | `apps/ehr-admin/features/patient-create/ui/patient-create-form.tsx` | 18 |
| 2 | `apps/ehr-admin/features/diagnostic-report-list/ui/diagnostic-report-form.tsx` | 17 |
| 3 | `apps/ehr-admin/features/service-request-list/ui/service-request-form.tsx` | 16 |
| 4 | `apps/ehr-admin/features/coverage/ui/coverage-list-row.tsx` | 15 |
| 5 | `apps/ehr-admin/features/patient-detail/ui/patient-summary-panel.tsx` | 15 |
| 6 | `apps/ehr-admin/features/schedule-calendar/ui/appointment-dialog.tsx` | 15 |
| 7 | `apps/ehr-admin/features/service-request-detail/ui/service-request-details.tsx` | 14 |
| 8 | `apps/ehr-admin/features/patient-detail/ui/patient-details.tsx` | 13 |

**P1** (2026-08-20 ~ 2026-09-28)

| 순위 | 파일 | 수정 횟수 |
|---:|---|---:|
| 1 | `apps/ehr-admin/app/globals.css` | 15 |
| 2 | `apps/ehr-admin/features/patient-detail/ui/patient-tabs.tsx` | 12 |
| 3 | `apps/ehr-admin/features/appointment/ui/appointment-dialog.tsx` | 11 |
| 4 | `apps/ehr-admin/widgets/dashboard-home/ui/patient-gender-chart.tsx` | 10 |
| 5 | `tooling/config-tailwind/style.css` | 10 |
| 6 | `apps/ehr-admin/features/patient-detail/ui/patient-summary-panel.tsx` | 10 |
| 7 | `apps/ehr-admin/features/patient-detail/ui/patient-detail-shell.tsx` | 10 |
| 8 | `apps/ehr-admin/widgets/dashboard-home/ui/appointment-status-chart.tsx` | 9 |

**P2** (2026-09-29 ~ 2026-10-10)

| 순위 | 파일 | 수정 횟수 |
|---:|---|---:|
| 1 | `apps/ehr-admin/features/pane-workspace/model/hooks/use-pane-workspace.ts` | 9 |
| 2 | `apps/ehr-admin/features/smart-search/ui/smart-search-page.tsx` | 8 |
| 3 | `apps/ehr-admin/shared/lib/auth.config.ts` | 7 |
| 4 | `apps/ehr-admin/features/patient-timeline/ui/timeline-entry-card.tsx` | 6 |
| 5 | `packages/ehr/src/widgets/fhir-search-table/ui/column-header/column-header-menu.tsx` | 6 |
| 6 | `apps/ehr-admin/features/practitioner-list/model/hooks/use-practitioner-form.test.ts` | 6 |
| 7 | `apps/ehr-admin/features/practitioner-list/model/utils/build-practitioner-command.ts` | 6 |
| 8 | `apps/ehr-admin/features/task-create/ui/create-task-dialog.tsx` | 5 |

### 표 5. 일괄 수정 커밋 목록 (소스 ≥100 파일)

| 창 | sha | 날짜 | 소스 파일 수 | 전체 파일 수 | 제목 | 비고 |
|---|---|---|---:|---:|---|---|
| P0 | 86ea8f49 | 2026-07-31 | 554 | 569 | refactor(ehr): project-rules conformance sweep |  |
| P2 / W2 | 82d80e4c | 2026-10-02 | 135 | 147 | feat(panes): render app screens directly in panes |  |
| P2 / W2 | 9e8445dc | 2026-09-29 | 156 | 236 | refactor(harness): rename SSoT.md to PRECEDENT.md | 9e8445dc 이름 변경 커밋 |

### 표 6. observation-vitals 슬라이스

| 지표 | W0 | W1 | W2 | P0 | P1 | P2 |
|---|---:|---:|---:|---:|---:|---:|
| 슬라이스를 건드린 소스 커밋 수 | 7 | 2 | 3 | 17 | 17 | 3 |
| 슬라이스 커밋 수 (일괄 제외) | 7 | 2 | 1 | 16 | 17 | 1 |
| 건드린 파일 수 | 14 | 2 | 7 | 19 | 12 | 7 |
| 파일당 수정 횟수 median / p90 / max | 1 / 3 / 3 | 1 / 1 / 1 | 1 / 2 / 2 | 2 / 6 / 7 | 1.5 / 4 / 4 | 1 / 2 / 2 |
| 3회 이상 수정 파일 수 | 4 | 0 | 0 | 9 | 4 | 0 |
| 재수정률 | 28.6% | 0.0% | 0.0% | 47.4% | 33.3% | 0.0% |
| [일괄 제외] 건드린 파일 수 | 14 | 2 | 1 | 18 | 12 | 1 |
| [일괄 제외] 파일당 수정 횟수 median / p90 / max | 1 / 3 / 3 | 1 / 1 / 1 | 1 / 1 / 1 | 2.5 / 5 / 6 | 1.5 / 4 / 4 | 1 / 1 / 1 |
| [일괄 제외] 재수정률 | 28.6% | 0.0% | 0.0% | 50.0% | 33.3% | 0.0% |

**W0** observation-vitals 상위 파일

| 순위 | 파일 | 수정 횟수 |
|---:|---|---:|
| 1 | `ui/vitals-history-table.tsx` | 3 |
| 2 | `model/hooks/use-vitals-entry-form.ts` | 3 |
| 3 | `ui/vitals-summary-cards.tsx` | 3 |
| 4 | `ui/vitals-entry-form.tsx` | 3 |
| 5 | `ui/vitals-trend-chart.tsx` | 2 |
| 6 | `ui/vitals-entry-dialog.tsx` | 1 |
| 7 | `index.ts` | 1 |
| 8 | `model/hooks/use-vitals-history.ts` | 1 |

**W1** observation-vitals 상위 파일

| 순위 | 파일 | 수정 횟수 |
|---:|---|---:|
| 1 | `model/hooks/use-vitals-history.ts` | 1 |
| 2 | `model/utils/vital-parse.ts` | 1 |

**W2** observation-vitals 상위 파일

| 순위 | 파일 | 수정 횟수 |
|---:|---|---:|
| 1 | `ui/vitals-panel.tsx` | 2 |
| 2 | `ui/vitals-entry-form.tsx` | 1 |
| 3 | `model/hooks/use-vitals-history.ts` | 1 |
| 4 | `model/utils/vital-parse.ts` | 1 |
| 5 | `ui/vitals-panel-skeleton.tsx` | 1 |
| 6 | `ui/vitals-summary-cards.tsx` | 1 |
| 7 | `ui/vitals-trend-chart.tsx` | 1 |

**P0** observation-vitals 상위 파일

| 순위 | 파일 | 수정 횟수 |
|---:|---|---:|
| 1 | `ui/vitals-history-table.tsx` | 7 |
| 2 | `model/hooks/use-vitals-entry-form.ts` | 6 |
| 3 | `ui/vitals-trend-chart.tsx` | 5 |
| 4 | `ui/vitals-summary-cards.tsx` | 5 |
| 5 | `ui/vitals-entry-form.tsx` | 5 |
| 6 | `model/hooks/use-vitals-history.ts` | 5 |
| 7 | `model/utils/vital-view.ts` | 3 |
| 8 | `model/hooks/use-vitals-trends.ts` | 3 |

**P1** observation-vitals 상위 파일

| 순위 | 파일 | 수정 횟수 |
|---:|---|---:|
| 1 | `ui/vitals-history-table.tsx` | 4 |
| 2 | `ui/vitals-summary-cards.tsx` | 4 |
| 3 | `ui/vitals-trend-chart.tsx` | 3 |
| 4 | `ui/vitals-panel.tsx` | 3 |
| 5 | `model/hooks/use-vitals-history.ts` | 2 |
| 6 | `ui/vitals-panel-skeleton.tsx` | 2 |
| 7 | `model/utils/vital-parse.ts` | 1 |
| 8 | `ui/vitals-entry-dialog.tsx` | 1 |

**P2** observation-vitals 상위 파일

| 순위 | 파일 | 수정 횟수 |
|---:|---|---:|
| 1 | `ui/vitals-panel.tsx` | 2 |
| 2 | `ui/vitals-entry-form.tsx` | 1 |
| 3 | `model/hooks/use-vitals-history.ts` | 1 |
| 4 | `model/utils/vital-parse.ts` | 1 |
| 5 | `ui/vitals-panel-skeleton.tsx` | 1 |
| 6 | `ui/vitals-summary-cards.tsx` | 1 |
| 7 | `ui/vitals-trend-chart.tsx` | 1 |

### 표 7. PRECEDENT.md 동반 갱신 (W2 / P2)

| 지표 | W2 (HEAD 기준) | W2 (커밋 시점 트리) | W2 (커밋 시점, 9e8445dc 제외) | P2 (HEAD 기준) | P2 (커밋 시점 트리) | P2 (커밋 시점, 9e8445dc 제외) |
|---|---:|---:|---:|---:|---:|---:|
| 소스 커밋 수 | 118 | 118 | 117 | 118 | 118 | 117 |
| PRECEDENT.md 를 함께 바꾼 커밋 | 109 | 109 | 108 | 109 | 109 | 108 |
| 관할 PRECEDENT.md 가 있는 소스를 건드린 커밋 | 115 | 110 | 109 | 115 | 110 | 109 |
| 그중 관할 PRECEDENT.md 전부 동반 갱신 | 68 | 70 | 69 | 68 | 70 | 69 |
| 그중 하나라도 미갱신 (PRECEDENT_OK=1 후보, 상한) | 47 | 40 | 40 | 47 | 40 | 40 |
| 관할 없음 | 3 | 8 | 8 | 3 | 8 | 8 |

- W2 동반 갱신율 (커밋 시점 트리, 관할 커밋 중): 70/110 = 63.6%
- W2 PRECEDENT.md 를 함께 바꾼 커밋 비율 (소스 커밋 중): 109/118 = 92.4%
- P2 동반 갱신율 (커밋 시점 트리, 관할 커밋 중): 70/110 = 63.6%
- P2 PRECEDENT.md 를 함께 바꾼 커밋 비율 (소스 커밋 중): 109/118 = 92.4%

### 표 8. (참고) SSoT.md 동반 갱신 — W1 / P1, 같은 훅 로직을 옛 파일명으로

| 지표 | W1 | P1 |
|---|---:|---:|
| 소스 커밋 수 | 33 | 235 |
| SSoT.md 를 함께 바꾼 커밋 | 31 | 120 |
| 관할 SSoT.md 가 있는 소스를 건드린 커밋 | 32 | 120 |
| 그중 전부 동반 갱신 | 26 | 90 |
| 그중 하나라도 미갱신 | 6 | 30 |
| 관할 없음 | 1 | 115 |

### 표 9. W2/P2 PRECEDENT_OK=1 후보 커밋 40건 (커밋 시점 트리 기준)

후보 40건 중 **PRECEDENT.md 를 하나도 바꾸지 않은 커밋 4건**, **일부 관할 PRECEDENT.md 는 바꿨지만 전부는 아닌 커밋 36건**입니다. 날짜별: 09-29 1 · 09-30 1 · 10-02 5 · 10-03 2 · 10-06 10 · 10-07 10 · 10-08 11. P2 소스 커밋의 관할 파일 터치 합계는 892건입니다.

| sha | 날짜 | 소스 파일 | 관할 PRECEDENT.md 수 | 미갱신 수 | 미갱신 첫 항목 |
|---|---|---:|---:|---:|---|
| 24e7f4a6 | 2026-10-08 | 5 | 2 | 1 | `apps/ehr-admin/shared/hooks/PRECEDENT.md` |
| b7e8c105 | 2026-10-08 | 5 | 5 | 4 | `apps/ehr-admin/e2e/PRECEDENT.md` |
| a0659000 | 2026-10-08 | 5 | 2 | 1 | `apps/ehr-admin/shared/lib/PRECEDENT.md` |
| ef630bc6 | 2026-10-08 | 12 | 9 | 2 | `apps/ehr-admin/features/patient-history-diff/PRECEDENT.md` |
| 56f1ce6d | 2026-10-08 | 16 | 13 | 7 | `apps/ehr-admin/features/allergy/PRECEDENT.md` |
| e36d7f5c | 2026-10-08 | 5 | 4 | 1 | `apps/ehr-admin/shared/ui/PRECEDENT.md` |
| ed46304e | 2026-10-08 | 38 | 20 | 15 | `apps/ehr-admin/app/PRECEDENT.md` |
| 12a8c122 | 2026-10-08 | 8 | 6 | 2 | `apps/ehr-admin/features/questionnaire-list/PRECEDENT.md` |
| 67c63f26 | 2026-10-08 | 21 | 17 | 15 | `apps/ehr-admin/e2e/PRECEDENT.md` |
| cb541b88 | 2026-10-08 | 16 | 9 | 1 | `apps/ehr-admin/shared/lib/PRECEDENT.md` |
| 6b72c4e1 | 2026-10-08 | 14 | 9 | 1 | `apps/ehr-admin/e2e/PRECEDENT.md` |
| d36fd7d9 | 2026-10-07 | 13 | 6 | 2 | `apps/ehr-admin/features/allergy/PRECEDENT.md` |
| b8d91091 | 2026-10-07 | 16 | 7 | 6 | `apps/ehr-admin/features/diagnostic-report-list/PRECEDENT.md` |
| d737d5a5 | 2026-10-07 | 5 | 2 | 1 | `apps/ehr-admin/widgets/tenant-list-section/PRECEDENT.md` |
| 9d568352 | 2026-10-07 | 3 | 2 | 1 | `apps/ehr-admin/shared/lib/PRECEDENT.md` |
| 1cbcfa69 | 2026-10-07 | 14 | 8 | 8 | `apps/ehr-admin/app/PRECEDENT.md` |
| 7fc20994 | 2026-10-07 | 13 | 6 | 3 | `apps/ehr-admin/features/smart-search/PRECEDENT.md` |
| f7d5211e | 2026-10-07 | 1 | 1 | 1 | `apps/ehr-admin/features/waiting-monitor/PRECEDENT.md` |
| db1c80f9 | 2026-10-07 | 1 | 1 | 1 | `apps/ehr-admin/features/realtime-notifications/ui/PRECEDENT.md` |
| 7b939c30 | 2026-10-07 | 5 | 3 | 3 | `apps/ehr-admin/features/allergy/PRECEDENT.md` |
| e2c4e0bb | 2026-10-07 | 2 | 2 | 1 | `apps/ehr-admin/app/PRECEDENT.md` |
| db4a13af | 2026-10-06 | 25 | 11 | 3 | `apps/ehr-admin/app/PRECEDENT.md` |
| b9f63b5c | 2026-10-06 | 1 | 1 | 1 | `apps/ehr-admin/features/practitioner-list/PRECEDENT.md` |
| 49e5b269 | 2026-10-06 | 1 | 1 | 1 | `apps/ehr-admin/shared/ui/PRECEDENT.md` |
| 243639fe | 2026-10-06 | 16 | 7 | 2 | `apps/ehr-admin/entities/task/PRECEDENT.md` |
| 17a84e8f | 2026-10-06 | 20 | 2 | 1 | `apps/ehr-admin/app/PRECEDENT.md` |
| 7173da46 | 2026-10-06 | 18 | 5 | 1 | `apps/ehr-admin/app/PRECEDENT.md` |
| b3a580af | 2026-10-06 | 8 | 2 | 1 | `apps/ehr-admin/app/PRECEDENT.md` |
| af21887e | 2026-10-06 | 15 | 4 | 2 | `apps/ehr-admin/entities/encounter/PRECEDENT.md` |
| e7be858a | 2026-10-06 | 39 | 6 | 4 | `apps/ehr-admin/app/PRECEDENT.md` |
| e50dc858 | 2026-10-06 | 1 | 1 | 1 | `apps/ehr-admin/widgets/tenant-shell/ui/PRECEDENT.md` |
| 11bff2b3 | 2026-10-03 | 7 | 3 | 2 | `apps/ehr-admin/app/PRECEDENT.md` |
| 2643da2d | 2026-10-03 | 11 | 3 | 2 | `apps/ehr-admin/features/realtime-notifications/model/utils/PRECEDENT.md` |
| cc726e1f | 2026-10-02 | 4 | 2 | 1 | `apps/ehr-admin/app/PRECEDENT.md` |
| b0b6561c | 2026-10-02 | 4 | 2 | 1 | `apps/ehr-admin/widgets/tenant-shell/ui/PRECEDENT.md` |
| 585428f0 | 2026-10-02 | 2 | 2 | 1 | `apps/ehr-admin/app/PRECEDENT.md` |
| 9ea529e4 | 2026-10-02 | 28 | 3 | 2 | `apps/ehr-admin/app/PRECEDENT.md` |
| 82d80e4c | 2026-10-02 | 135 | 20 | 12 | `apps/ehr-admin/app/[locale]/[tenantId]/tasks/PRECEDENT.md` |
| 92963d8b | 2026-09-30 | 6 | 4 | 2 | `apps/ehr-admin/app/PRECEDENT.md` |
| 1cb864f5 | 2026-09-29 | 2 | 2 | 1 | `apps/ehr-admin/features/patient-detail/PRECEDENT.md` |

## Orca 터미널 기록

- 복사: `profile-state.db`, `profile-state.db-wal`, `profile-state.db-shm` → `/tmp/orca-db/`. 원본은 열지 않았고 복사본만 열었습니다(복사본은 WAL 반영을 위해 일반 모드로 열었음).
- 테이블 4개: `profile_state_automation_runs`(0행) · `profile_state_automation_runs_meta`(1행) · `profile_state_documents`(32행, `domain`/`payload` JSON) · `profile_state_meta`(3행). 페이로드 도메인은 `workspaceSession`·`worktreeMeta`·`settings`·`ui`·`repos`·`projects`·`worktreeIdentityAliases`·`claudeLivePtySessionIds` 등으로, 이 DB 는 워크스페이스·워크트리 상태 저장소이고 **터미널 출력(스크롤백)은 담고 있지 않습니다.**
- 모든 TEXT 컬럼 검색: `PRECEDENT_OK=1 git commit` **0행**, `git commit` **0행**. (참고 검색: `PRECEDENT` 1행, `synolink` 7행, `commit` 1행, `terminal` 4행, `scrollback` 0행.)
- 추가로 확인한 곳(복사본, 읽기 전용): `orca/terminal-history/<id>/zsh_history` 81개 디렉터리 중 파일이 있는 20개(총 109줄, 2026-08-22~2026-10-10) — `git commit` **0줄**, `PRECEDENT_OK=1 git commit` **0줄**, `SSOT_OK=1 git commit` 0줄. `orchestration.db`(26 테이블, `worker_terminal_archives` 10행)와 `agent-session-journal.db`(11 테이블, `agent_session_records` 0행·`journal_rows` 0행)의 TEXT 컬럼에서도 두 문자열 0건.
- 워크스페이스 귀속: zsh_history 디렉터리 id 20개는 `profile-state.db` 페이로드 어디에도 나타나지 않아 폴더 매핑을 DB 로 확인하지 못했습니다.
- 정리: Orca 저장소에서 `git commit` 문자열은 0건입니다. 커밋 명령이 Orca zsh 터미널에서 입력된 기록이 없고, 에이전트 세션의 Bash 도구 출력은 이 DB 들에 저장되어 있지 않습니다. 따라서 Orca 기록으로는 `PRECEDENT_OK=1` 사용 횟수를 셀 수 없습니다.

## 교란 요인

세 창의 작업 단계가 다릅니다 — W0 는 폼·패널 반복 수정기(상위 8파일이 전부 `*-form.tsx`·`patient-detail` 계열), W1 은 커밋이 있는 날이 5일(09-19~21·09-24~27 0건, 추석 연휴 09-24~26 포함)이고 소스 커밋 33건으로 표본이 가장 작으며 가장 많이 고친 파일이 `.claude/hooks/commit-gate.sh`(6회) 즉 훅 자체를 손본 기간이고, W2 는 `pane-workspace`·`smart-search` 신규 기능 집중기로 10-06~08 사흘에 소스 커밋 81건이 몰렸습니다. 2026-09-17 의 `1060d016` 「slim the instruction set」(59 파일, +1850/−3080)이 W1 첫날에 있습니다. `9e8445dc`(09-29, 전체 236 파일·소스 156)는 SSoT.md→PRECEDENT.md 이름 변경과 참조 문자열 치환이라 W2/P2 일괄 수정 2건 중 1건이고 제외하면 1건(`82d80e4c` 10-02, 소스 135)입니다 — 이 커밋은 파일당 수정 횟수에도 들어가므로 `[일괄 제외]` 행을 함께 봐야 합니다. SSoT.md 관할 게이트는 2026-08-31(`d10063ea`)부터 있었으므로 W1 은 「장부만」이 아니라 장부 + SSoT.md 게이트 + 훅 정비가 겹친 기간이고, W2 는 같은 게이트의 파일명이 바뀐 뒤입니다(표 8 의 SSoT 동반 갱신 26/32 와 표 7 의 PRECEDENT 동반 갱신 70/110 은 같은 규칙으로 센 값). 창 길이는 12일로 같지만 커밋이 있는 날(7/5/8)과 소스 커밋 수(128/33/118)가 다르고, P2 는 12일로 정의했지만 마지막 커밋이 10-08 이라 실제 데이터는 10일분입니다. 동반 갱신의 "후보" 수는 훅이 Claude Code 안에서만 동작하고 fail-open 이라 상한입니다.
