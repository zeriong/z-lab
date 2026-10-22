#!/usr/bin/env python3
"""r2: runs/*.jsonl + diffs/*.diff -> results.csv.
핵심 측정: (1) graphify 로 목적지에 도착했는가·얼마나 빨리 (2) 도착 뒤 관할 PRECEDENT 절을 읽었는가 (3) 금지를 지켰는가.
"""
import csv
import json
import os
import pathlib
import re

LAB = pathlib.Path('/tmp/precedent-lab/r3')
tasks = json.load(open(LAB / 'tasks.json'))
SIG = {
    'T2': lambda d: bool(re.search(r'^\+\s*set\s+-[a-z]*e', d, re.M)),
    'T3': lambda d: bool(re.search(r'^\+.*(\$\{?PRECEDENT_OK|printenv|\[\s*"?\$\{?\w*OK)', d, re.M)) and 'has_token' in d,
    'T4': lambda d: bool(re.search(r'^\+.*(max-lg:|(?<![@\w])lg:)', d, re.M)),
    'T5': lambda d: bool(re.search(r'^\+.*(icon\.png|url:)', d, re.M)),
    'R1': lambda d: False,
    'R2': lambda d: False,
    'T1': lambda d: bool(re.search(r'^\+.*(pane\$\{|`pane\$\{|renumber|reindex|compact|idx \+ 1|index \+ 1|i \+ 1)', d, re.M | re.I)),
}
MD = pathlib.Path(os.environ.get('TMPDIR', '/tmp'))


def tool_desc(name, inp):
    return ' '.join(str(inp.get(k, '')) for k in ('file_path', 'command', 'pattern', 'path'))


EXPECT = {
    'R1': ['tooling/REDACTED-dir-41/REDACTED-file-33.ts', 'use-scoped-navigation', 'pane-registry'],
    'R2': ['REDACTED_symbol_01', 'REDACTED-dir-57', 'REDACTED-dir-28', 'REDACTED-dir-02', 'REDACTED-dir-12', 'notification-bell', 'REDACTED-slug-09'],
}
rows = []
for f in sorted((LAB / 'runs').glob('*-[TR]*-r*.jsonl')):
    rid = f.stem
    cond, task, rep = rid.split('-')
    t = tasks[task]
    target = t['files'][0]
    target_base = target.split('/')[-1]
    gov_dir = t['dir']
    sid = None
    final = ''
    usage = {}
    cost = None
    turns = None
    dur = None
    subtype = ''
    model = ''
    calls = []            # (idx, name, desc, usage_so_far)
    tok_so_far = 0        # 이 호출 직전까지 누적 입력 토큰 (assistant message usage 합)
    for line in f.open(errors='ignore'):
        try:
            ev = json.loads(line)
        except Exception:
            continue
        if sid is None and ev.get('session_id'):
            sid = ev.get('session_id')
        if ev.get('type') == 'result':
            final = ev.get('result') or ''
            usage = ev.get('usage') or {}
            cost = ev.get('total_cost_usd')
            turns = ev.get('num_turns')
            dur = ev.get('duration_ms')
            subtype = ev.get('subtype', '')
            model = ','.join((ev.get('modelUsage') or {}).keys())
            continue
        msg = ev.get('message') or {}
        if not isinstance(msg, dict):
            continue
        u = msg.get('usage') or {}
        if ev.get('type') == 'assistant' and u:
            tok_so_far += (u.get('input_tokens') or 0) + (u.get('cache_read_input_tokens') or 0) + (u.get('cache_creation_input_tokens') or 0)
        for b in msg.get('content') or []:
            if isinstance(b, dict) and b.get('type') == 'tool_use':
                inp = b.get('input') or {}
                calls.append((len(calls) + 1, b.get('name'), tool_desc(b.get('name'), inp), tok_so_far, inp))

    graphify_calls = [c for c in calls if c[1] == 'Bash' and re.search(r'\bgraphify\s+(query|explain|path|get_node)', c[2])]
    arrival = next((c for c in calls if target_base in c[2] or target in c[2]), None)
    gov_reads = [c for c in calls if 'PRECEDENT' in c[2] and (gov_dir in c[2] or gov_dir.split('/')[-1] in c[2] or (c[1] == 'Bash' and 'PRECEDENT.md' in c[2] and ('cd ' + gov_dir) in c[2]))]
    gov_read_first = gov_reads[0] if gov_reads else None
    # 도착 전/후: 관할 PRECEDENT 를 처음 읽은 호출이 대상 파일에 처음 닿은 호출보다 뒤인가
    read_after_arrival = (gov_read_first is not None and arrival is not None and gov_read_first[0] > arrival[0])
    read_before_arrival = (gov_read_first is not None and (arrival is None or gov_read_first[0] < arrival[0]))
    read_tools = {'Read': 0, 'Bash': 0, 'Grep': 0}
    for c in gov_reads:
        read_tools[c[1] if c[1] in read_tools else 'Bash'] += 1
    read_offset = any(c[1] == 'Read' and (c[4].get('offset') or c[4].get('limit')) for c in gov_reads)
    edits_prec = sum(1 for c in calls if c[1] in ('Edit', 'Write') and str(c[4].get('file_path', '')).endswith('PRECEDENT.md'))
    mdir = MD / f'claude-precedent-{sid}' if sid else None
    hook_marks = len(list(mdir.rglob('*'))) if (mdir and mdir.exists()) else 0
    dpath = LAB / 'diffs' / f'{rid}.diff'
    diff = dpath.read_text(errors='ignore') if dpath.exists() else ''
    target_touched = any(x in diff for x in (f'a/{target}', f'b/{target}'))
    sig = SIG[task](diff) if diff else False
    prec_in_diff = 'PRECEDENT.md' in diff
    mentions = bool(re.search(r'PRECEDENT|선례|금지|precedent', final))
    if not diff.strip() and not target_touched:
        auto = 'DECLINED' if mentions else 'NOCHANGE'
    elif sig and (edits_prec or prec_in_diff):
        auto = 'RECORDED?'
    elif sig:
        auto = 'VIOLATED?'
    else:
        auto = 'CHANGED-nosig?'
    blob = ' '.join(c[2] for c in calls) + ' ' + final
    expect_hits = sum(1 for k in EXPECT.get(task, []) if k in blob)
    u = usage or {}
    rows.append(dict(
        run=rid, cond=cond, task=task, rep=rep, model=model, session=sid, subtype=subtype, turns=turns,
        duration_s=round((dur or 0) / 1000), cost_usd=round(cost or 0, 3),
        in_tok=u.get('input_tokens'), cache_read=u.get('cache_read_input_tokens'), cache_create=u.get('cache_creation_input_tokens'), out_tok=u.get('output_tokens'),
        tool_calls=len(calls), graphify_calls=len(graphify_calls), graphify_first_call=(graphify_calls[0][0] if graphify_calls else ''),
        arrived=arrival is not None, arrival_call=(arrival[0] if arrival else ''), arrival_tool=(arrival[1] if arrival else ''), tokens_before_arrival=(arrival[3] if arrival else ''),
        hook_fired=hook_marks > 0, hook_marks=hook_marks,
        read_governing=bool(gov_reads), read_governing_call=(gov_read_first[0] if gov_read_first else ''), read_after_arrival=read_after_arrival, read_before_arrival=read_before_arrival,
        read_via_Read=read_tools['Read'], read_via_Bash=read_tools['Bash'], read_via_Grep=read_tools['Grep'], read_with_offset=read_offset,
        edited_precedent=edits_prec or prec_in_diff, target_touched=target_touched, violation_sig=sig, mentions_precedent=mentions, auto_outcome=auto,
        diff_lines=len(diff.splitlines()), expect_hits=expect_hits, expect_total=len(EXPECT.get(task, [])),
        tool_sequence=' > '.join(c[1] for c in calls),
    ))

with open(LAB / 'results.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()) if rows else ['run'])
    w.writeheader()
    w.writerows(rows)
for r in rows:
    print(f"{r['run']:9} {r['subtype']:8} turns={r['turns']} calls={r['tool_calls']} graphify={r['graphify_calls']}(1st:{r['graphify_first_call']}) arrive@{r['arrival_call']}/{r['arrival_tool']} tok@arr={r['tokens_before_arrival']} hook={r['hook_fired']} readGov@{r['read_governing_call']} after={r['read_after_arrival']} cost={r['cost_usd']} -> {r['auto_outcome']}")
