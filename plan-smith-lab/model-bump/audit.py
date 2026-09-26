#!/usr/bin/env python3
"""model-bump 사후 감사 — 워크플로 트랜스크립트에서 지표·순수성을 직접 센다(자가보고를 쓰지 않는다).

usage: audit.py <transcript_dir> [--json out.json]

셀별: resolved model · 토큰(in+cache_creation+cache_read+out, message.id 중복 제거) · output 단독 ·
도구 호출 수 · 벽시계(첫~끝 타임스탬프) · 주입 검사 5종 · 파일 접근 위반.
접근 허용: 그 에이전트의 과제 텍스트에 적힌 절대경로(파일이면 그 파일, 디렉토리면 그 하위)뿐.
"""
import glob, json, os, re, sys
from datetime import datetime

INJECTIONS = {
    'advisor': re.compile(r'"name":\s*"advisor"'),
    'ponytail': re.compile(r'PONYTAIL'),
    'claude_md': re.compile(r'"type":\s*"instructions"|Behavioral Guidelines|실험 저장소 규칙'),
    'user_relay': re.compile(r'Workflow harness \\u2014 user request|Workflow harness — user request'),
    'computed_frame': re.compile(r'Workflow harness \\u2014 computed task|Workflow harness — computed task'),
}


def ts(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00'))


def audit(tdir):
    labels = {}
    for line in open(os.path.join(tdir, 'journal.jsonl')):
        d = json.loads(line)
        if d.get('type') == 'started':
            labels[d['agentId']] = d['label']
    rows = []
    for f in sorted(glob.glob(os.path.join(tdir, 'agent-*.jsonl'))):
        aid = os.path.basename(f)[6:-6]
        label = labels.get(aid, aid)
        raw = open(f).read()
        msgs, tools, paths, stamps, models = {}, {}, set(), [], set()
        named = []
        for line in raw.splitlines():
            d = json.loads(line)
            c = (d.get('message') or {}).get('content')
            if d.get('type') == 'user' and isinstance(c, str) and not named:
                named = [p.rstrip('.,)') for p in re.findall(r'(/Users/[^\s`\'"]+)', c)]
            if d.get('timestamp'):
                stamps.append(ts(d['timestamp']))
            m = d.get('message') or {}
            if d.get('type') != 'assistant':
                continue
            models.add(m.get('model'))
            msgs[m['id']] = m.get('usage') or {}  # 마지막 줄의 usage가 최종값
            for c in m.get('content', []):
                if c.get('type') == 'tool_use':
                    tools[c['name']] = tools.get(c['name'], 0) + 1
                    p = (c.get('input') or {}).get('file_path')
                    if p:
                        paths.add(p)
        tok = sum(u.get('input_tokens', 0) + u.get('cache_creation_input_tokens', 0)
                  + u.get('cache_read_input_tokens', 0) + u.get('output_tokens', 0) for u in msgs.values())
        out = sum(u.get('output_tokens', 0) for u in msgs.values())
        rows.append({
            'label': label, 'agent': aid, 'models': sorted(x for x in models if x),
            'tokens': tok, 'output': out, 'tools': tools,
            'duration_s': round((max(stamps) - min(stamps)).total_seconds()) if stamps else None,
            'injections': {k: len(p.findall(raw)) for k, p in INJECTIONS.items()},
            'violations': sorted(p for p in paths if not any(p.startswith(a.rstrip('/')) for a in named)),
            'paths': sorted(paths),
            'named': named,
        })
    return rows


if __name__ == '__main__':
    rows = audit(sys.argv[1])
    for r in rows:
        print(f"{r['label']:<28} {','.join(r['models']):<18} tok={r['tokens']:>11,} out={r['output']:>8,} "
              f"t={r['duration_s']}s tools={r['tools']} inj={r['injections']} viol={len(r['violations'])}")
    if '--json' in sys.argv:
        json.dump(rows, open(sys.argv[sys.argv.index('--json') + 1], 'w'), ensure_ascii=False, indent=1)
