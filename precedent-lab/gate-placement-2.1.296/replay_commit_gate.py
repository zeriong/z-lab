#!/usr/bin/env python3
"""③ commit-gate 백스톱 결정론 재생 -> commit_gate_replay.csv (회사 소스 없음: 런 ID·판정·참/거짓만).

각 런의 최종 diff(추적 파일 변경분)를 깨끗한 clone(wt-G, fd3ef0c1)에 적용·stage 하고, 그 clone 의
`.claude/hooks/commit-gate.sh` 에 PreToolUse 입력 `git commit -m x` 를 넣어 precedent 게이트(📚)가 막는지 본다.
- plain: 토큰 없이.  token: `PRECEDENT_OK=1 git commit -m x`.
- noop: 관할 PRECEDENT.md 가 stage 되지 않은 런에만, 그 PRECEDENT.md 끝에 무관한 새 블록 하나를 덧붙여 stage 한 뒤 토큰 없이.
한계: diff 에 없는 미추적 새 파일(.status 의 ??)은 재생하지 않는다 — untracked_new 열에 개수를 남긴다.
"""
import csv, json, pathlib, subprocess

WT = '/Users/jeonjelyong/.cache/precedent-lab/real-env-rail/wt-G'
LAB = pathlib.Path(__file__).resolve().parent
SRC = {
    'plan-rail': (pathlib.Path('/Users/jeonjelyong/.cache/precedent-lab/plan-rail'), LAB.parent / 'plan-rail-2.1.296' / 'judgments.csv'),
    'real-env-rail': (pathlib.Path('/Users/jeonjelyong/.cache/precedent-lab/real-env-rail'), LAB.parent / 'real-env-rail-2.1.296' / 'judgments.csv'),
}
NOOP = '\n### §replay-noop — 재생용 무관 블록\n\n- 결정: 없음.\n'


def git(*a, inp=None):
    return subprocess.run(['git', '-C', WT, *a], capture_output=True, text=True, input=inp)


def reset():
    git('reset', '-q')
    git('checkout', '-q', '--', '.')
    git('clean', '-fdq', '-e', 'graphify-out')


def gate(cmd):
    p = subprocess.run(['bash', f'{WT}/.claude/hooks/commit-gate.sh'], capture_output=True, text=True, cwd=WT,
                       input=json.dumps({'tool_name': 'Bash', 'hook_event_name': 'PreToolUse', 'cwd': WT, 'tool_input': {'command': cmd}}),
                       env={'PATH': '/opt/homebrew/bin:/usr/bin:/bin', 'HOME': str(pathlib.Path.home()), 'CLAUDE_PROJECT_DIR': WT})
    return '📚' in p.stdout + p.stderr


def governing_unstaged():
    """stage 된 관할 소스 중 PRECEDENT.md 가 함께 stage 되지 않은 디렉터리의 PRECEDENT.md 경로들."""
    staged = set(git('diff', '--cached', '--name-only').stdout.split())
    out = set()
    for f in staged:
        if not f.endswith(('.ts', '.tsx', '.css', '.mjs', '.sh')):
            continue
        d = pathlib.PurePosixPath(f).parent
        while str(d) not in ('.', '/'):
            if pathlib.Path(WT, d, 'PRECEDENT.md').is_file():
                if f'{d}/PRECEDENT.md' not in staged:
                    out.add(f'{d}/PRECEDENT.md')
                break
            d = d.parent
    return sorted(out)


rows = []
reset()
for src, (base, jpath) in SRC.items():
    for j in csv.DictReader(open(jpath)):
        if j['task'] not in ('T1', 'T2', 'T3', 'T4', 'T5'):
            continue
        rid = j['run']
        dpath = base / 'diffs' / f'{rid}.diff'
        spath = base / 'diffs' / f'{rid}.status'
        diff = dpath.read_text(errors='ignore') if dpath.exists() else ''
        untracked = sum(1 for l in (spath.read_text().splitlines() if spath.exists() else []) if l.startswith('??'))
        row = dict(source=src, run=rid, task=j['task'], outcome=j['outcome'], untracked_new=untracked, apply_ok='', staged=0,
                   precedent_staged='', plain_blocked='', token_blocked='', noop_blocked='')
        if not diff.strip():
            row['apply_ok'] = 'empty'
            rows.append(row)
            continue
        ap = git('apply', '--whitespace=nowarn', '-', inp=diff)
        row['apply_ok'] = 'yes' if ap.returncode == 0 else 'no'
        if ap.returncode == 0:
            git('add', '-u')
            staged = git('diff', '--cached', '--name-only').stdout.split()
            row.update(staged=len(staged), precedent_staged=any(f.endswith('PRECEDENT.md') for f in staged),
                       plain_blocked=gate('git commit -m x'), token_blocked=gate('PRECEDENT_OK=1 git commit -m x'))
            miss = governing_unstaged()
            if miss:
                for m in miss:
                    with open(pathlib.Path(WT, m), 'a', encoding='utf-8') as fh:
                        fh.write(NOOP)
                    git('add', m)
                row['noop_blocked'] = gate('git commit -m x')
        rows.append(row)
        reset()
with open(LAB / 'commit_gate_replay.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0]))
    w.writeheader()
    w.writerows(rows)
import collections
c = collections.Counter((r['outcome'], r['apply_ok'], str(r['plain_blocked']), str(r['token_blocked']), str(r['noop_blocked'])) for r in rows)
for k, v in sorted(c.items()):
    print(v, k)
