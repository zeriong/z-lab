#!/usr/bin/env python3
"""헤드리스(claude -p) 세션 감사 — 메인 세션 + 그 세션이 띄운 서브에이전트 트랜스크립트를 합산한다.

usage: audit_headless.py <session_id> [<session_id> ...] [--json out.json]

세션별: 모델별 토큰(in+cache_creation+cache_read+out, message.id 중복 제거) · output · 도구 호출 수 ·
Agent 호출(subagent_type·model) · 벽시계(첫~끝 타임스탬프) · 주입 검사.
주입 검사는 텍스트가 아니라 **첨부 구조**로 한다 — 프롬프트에 같은 단어가 있어도 오탐하지 않도록
(canary probe에서 실제로 오탐이 났다): instructions 첨부(CLAUDE.md), hook 추가 컨텍스트, advisor 도구 호출.
"""
import glob, json, os, sys
from datetime import datetime

ROOT = os.path.expanduser('~/.claude/projects')


def ts(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00'))


def files_for(session_id):
    main = glob.glob(os.path.join(ROOT, '*', session_id + '.jsonl'))
    if not main:
        raise SystemExit('session not found: ' + session_id)
    subs = sorted(glob.glob(os.path.join(main[0][:-6], 'subagents', 'agent-*.jsonl')))
    return main[0], subs


def audit(session_id):
    main, subs = files_for(session_id)
    msgs, tools, agents, stamps, paths = {}, {}, [], [], set()
    inj = {'claude_md': 0, 'hook_context': 0, 'advisor': 0}
    for f in [main] + subs:
        for line in open(f):
            d = json.loads(line)
            if d.get('timestamp'):
                stamps.append(ts(d['timestamp']))
            a = d.get('attachment') or {}
            if a.get('type') == 'instructions':
                inj['claude_md'] += 1
            if a.get('type') == 'hook_additional_context':
                inj['hook_context'] += 1
            m = d.get('message') or {}
            if d.get('type') != 'assistant':
                continue
            msgs[m['id']] = (m.get('model'), m.get('usage') or {})  # 마지막 줄의 usage가 최종값
            for c in m.get('content', []):
                if c.get('type') != 'tool_use':
                    continue
                tools[c['name']] = tools.get(c['name'], 0) + 1
                i = c.get('input') or {}
                if c['name'] == 'advisor':
                    inj['advisor'] += 1
                if c['name'] == 'Agent':
                    agents.append({'type': i.get('subagent_type'), 'model': i.get('model')})
                if i.get('file_path'):
                    paths.add(i['file_path'])
    by_model = {}
    for model, u in msgs.values():
        t = sum(u.get(k, 0) for k in ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'))
        e = by_model.setdefault(model, {'tokens': 0, 'output': 0})
        e['tokens'] += t
        e['output'] += u.get('output_tokens', 0)
    return {
        'session': session_id, 'subagents': len(subs),
        'tokens': sum(v['tokens'] for v in by_model.values()),
        'output': sum(v['output'] for v in by_model.values()),
        'by_model': by_model, 'tools': tools, 'agents': agents, 'injections': inj,
        'duration_s': round((max(stamps) - min(stamps)).total_seconds()) if stamps else None,
        'paths': sorted(paths),
    }


if __name__ == '__main__':
    args = [a for a in sys.argv[1:]]
    out = None
    if '--json' in args:
        out = args[args.index('--json') + 1]
        args = args[:args.index('--json')]
    rows = [audit(s) for s in args]
    for r in rows:
        print(f"{r['session'][:8]} tok={r['tokens']:>11,} out={r['output']:>8,} t={r['duration_s']}s subagents={r['subagents']} "
              f"models={ {k: v['tokens'] for k, v in r['by_model'].items()} } tools={r['tools']} inj={r['injections']}")
    if out:
        json.dump(rows, open(out, 'w'), ensure_ascii=False, indent=1)
