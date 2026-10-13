#!/usr/bin/env python3
"""runs/*.jsonl + logs/*.hook.jsonl + diffs/*.diff + runs/*.meta -> results.csv (SPEC 「지표」 절).

대상·위반 시그니처·EXPECT 는 10-10 r3 analyze_r3.py 와 같다(비교 가능성).
"""
import csv, json, pathlib, re, sys

BASE = pathlib.Path('/Users/jeonjelyong/.cache/precedent-lab/gate-placement')
LAB = pathlib.Path(__file__).resolve().parent
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
EXPECT = {
    'R1': ['tooling/config-eslint/scoped-navigation.ts', 'use-scoped-navigation', 'pane-registry'],
    'R2': ['requestWorkspaceNavigation', 'user-menu', 'command-palette', 'header-resource-search', 'resource-type-picker', 'notification-bell', 'entry-preferences'],
}
WRITE_BASH = re.compile(r"(sed\s+-i|perl\s+-pi|\btee\b|cat\s*>|>\s*[\w./\[\]@-]+\.(tsx?|css|mjs|sh|json|md)\b|python3?\s+-\s*<<|\.write_text\(|open\([^)]*['\"]w)")


def desc(inp):
    return ' '.join(str(inp.get(k, '')) for k in ('file_path', 'command', 'pattern', 'path', 'skill', 'prompt', 'description'))


def parse(path):
    r = dict(session=None, model='', tools=0, plugins=0, skills_avail=0, mcp=0, first_turn_tokens=None,
             hook_chars={}, hook_count={}, calls=[], result={}, stop_blocks=0, denied=0, tool_results_err=0)
    tok = 0
    for line in open(path, errors='ignore'):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if r['session'] is None and e.get('session_id'):
            r['session'] = e['session_id']
        t, st = e.get('type'), e.get('subtype')
        if t == 'system' and st == 'init':
            r['model'] = e.get('model', '')
            r['tools'] = len(e.get('tools', []))
            r['plugins'] = len(e.get('plugins', []))
            r['skills_avail'] = len(e.get('skills', []))
            r['mcp'] = sum(1 for m in e.get('mcp_servers', []) if m.get('status') == 'connected')
        elif t == 'system' and st == 'hook_response':
            ev = e.get('hook_event', '?')
            out = e.get('output') or ''
            r['hook_chars'][ev] = r['hook_chars'].get(ev, 0) + len(out)
            r['hook_count'][ev] = r['hook_count'].get(ev, 0) + (1 if out.strip() and out.strip() != '{}' else 0)
            if ev == 'Stop' and ('"decision"' in out and 'block' in out or e.get('exit_code') == 2):
                r['stop_blocks'] += 1
        elif t == 'result':
            r['result'] = e
        msg = e.get('message') if isinstance(e.get('message'), dict) else None
        if not msg:
            continue
        u = msg.get('usage') or {}
        if t == 'assistant' and u:
            this = (u.get('input_tokens') or 0) + (u.get('cache_read_input_tokens') or 0) + (u.get('cache_creation_input_tokens') or 0)
            if r['first_turn_tokens'] is None:
                r['first_turn_tokens'] = this
            tok += this
        for b in msg.get('content') or []:
            if not isinstance(b, dict):
                continue
            if b.get('type') == 'tool_use':
                inp = b.get('input') or {}
                r['calls'].append(dict(idx=len(r['calls']) + 1, id=b.get('id'), name=b.get('name'), desc=desc(inp), inp=inp, tok=tok))
            elif b.get('type') == 'tool_result':
                c = b.get('content')
                s = json.dumps(c, ensure_ascii=False) if not isinstance(c, str) else c
                if b.get('is_error'):
                    r['tool_results_err'] += 1
                    if re.search(r'not allowed|disallowed|denied|permission', s, re.I):
                        r['denied'] += 1
    return r


def hook_log(rid):
    p = BASE / 'logs' / f'{rid}.hook.jsonl'
    if not p.exists():
        return []
    return [json.loads(l) for l in p.open() if l.strip()]


rows = []
for f in sorted((BASE / 'runs').glob('*.jsonl')):
    rid = f.stem
    m = re.match(r'^([CHA]-xh)-(T\d)-r(\d+)$', rid)
    if not m:
        continue
    p0v, xr, arm, task, rep = None, None, m.group(1), m.group(2), m.group(3)
    r = parse(f)
    res = r['result']
    u = res.get('usage') or {}
    meta = (BASE / 'runs' / f'{rid}.meta').read_text().strip() if (BASE / 'runs' / f'{rid}.meta').exists() else ''
    mm = dict(re.findall(r'(\w+)=(\S+)', meta))
    calls = r['calls']
    row = dict(run=rid, phase='P0' if p0v else ('X' if xr else 'P1'), arm=('p-' + p0v) if p0v else ((xr + '-' + arm) if xr else arm), task=task, rep=rep,
               model=r['model'], subtype=res.get('subtype', ''), turns=res.get('num_turns'),
               duration_s=round((res.get('duration_ms') or 0) / 1000), cost_usd=round(res.get('total_cost_usd') or 0, 4),
               in_tok=u.get('input_tokens'), cache_read=u.get('cache_read_input_tokens'), cache_create=u.get('cache_creation_input_tokens'), out_tok=u.get('output_tokens'),
               first_turn_tokens=r['first_turn_tokens'], tools_avail=r['tools'], plugins=r['plugins'], skills_avail=r['skills_avail'], mcp_connected=r['mcp'],
               sessionstart_chars=r['hook_chars'].get('SessionStart', 0), userprompt_chars=r['hook_chars'].get('UserPromptSubmit', 0),
               posttool_hook_chars=r['hook_chars'].get('PostToolUse', 0), posttool_hook_nonempty=r['hook_count'].get('PostToolUse', 0),
               stop_blocks=r['stop_blocks'], tool_calls=len(calls), tool_errors=r['tool_results_err'], denied=r['denied'])
    if task == 'ok':
        rows.append(row)
        continue
    t = tasks[task]
    target = t['files'][0]; tbase = target.split('/')[-1]; gov = t['dir']
    gfy = [c for c in calls if c['name'] == 'Bash' and re.search(r'\bgraphify\s+(query|explain|path|affected|god-nodes)', c['desc'])]
    gfy_update = sum(1 for c in calls if c['name'] == 'Bash' and re.search(r'\bgraphify\s+update', c['desc']))
    arrival = next((c for c in calls if tbase in c['desc'] or target in c['desc']), None)
    gov_reads = [c for c in calls if 'PRECEDENT' in c['desc'] and (gov in c['desc'] or gov.split('/')[-1] in c['desc'] or (c['name'] == 'Bash' and 'PRECEDENT.md' in c['desc'] and ('cd ' + gov) in c['desc']))]
    # 주입 훅 로그 → 호출 순번 (tool_use_id)
    hl = hook_log(rid)
    id2idx = {c['id']: c['idx'] for c in calls}
    inj = [h for h in hl if h.get('mode') in ('full', 'compact', 'compact-cut', 'index', 'noline') and h.get('tool_use_id') in id2idx]
    denies = [h for h in hl if str(h.get('gate', '')).startswith('deny') and h.get('tool_use_id') in id2idx]
    first_deny = min((id2idx[h['tool_use_id']] for h in denies), default=None)
    src_after_deny = sum(1 for c in calls if first_deny and c['idx'] > first_deny and c['name'] in ('Edit', 'Write', 'MultiEdit') and not str(c['inp'].get('file_path', '')).endswith('PRECEDENT.md'))
    inj_gov = [h for h in inj if h.get('file', '').startswith(gov) or (gov == '.claude/hooks' and h.get('file', '').startswith('.claude/hooks'))]
    inj_first = min((id2idx[h['tool_use_id']] for h in inj_gov), default=None)
    orig_marks = 0
    edits = [c for c in calls if (c['name'] in ('Edit', 'Write', 'MultiEdit') and not str(c['inp'].get('file_path', '')).endswith('PRECEDENT.md'))
             or (c['name'] == 'Bash' and WRITE_BASH.search(c['desc']) and 'PRECEDENT.md' not in c['desc'] and re.search(r'\.(tsx?|css|mjs|sh)\b', c['desc']))]
    first_edit = edits[0]['idx'] if edits else None
    gov_first = gov_reads[0]['idx'] if gov_reads else None
    prec_idx = min([x for x in (inj_first, gov_first) if x is not None], default=None)
    chain = (prec_idx is not None and (first_edit is None or prec_idx < first_edit) and (arrival is None or prec_idx - arrival['idx'] <= 1))
    dpath = BASE / 'diffs' / f'{rid}.diff'
    diff = dpath.read_text(errors='ignore') if dpath.exists() else ''
    target_touched = f'a/{target}' in diff or f'b/{target}' in diff
    sig = SIG[task](diff) if diff else False
    prec_in_diff = bool(re.search(r'^diff --git a/\S*PRECEDENT\.md ', diff, re.M))
    final = res.get('result') or ''
    mentions = bool(re.search(r'PRECEDENT|선례|금지|precedent', final))
    if not diff.strip():
        auto = 'DECLINED' if mentions else 'NOCHANGE'
    elif sig and prec_in_diff:
        auto = 'RECORDED?'
    elif sig:
        auto = 'VIOLATED?'
    else:
        auto = 'CHANGED-nosig?'
    blob = ' '.join(c['desc'] for c in calls) + ' ' + final
    skills = [str(c['inp'].get('skill', '')) for c in calls if c['name'] == 'Skill']
    row.update(gate_denies=len(denies), gate_deny_edit=sum(1 for h in denies if h.get('gate') in ('deny', 'deny-new')), gate_deny_bash=sum(1 for h in denies if h.get('gate') == 'deny-bash'), first_deny_call=(first_deny or ''), source_edits_after_deny=src_after_deny, graphify_update=gfy_update, graphify_calls=len(gfy), graphify_first_call=(gfy[0]['idx'] if gfy else ''),
               arrival_call=(arrival['idx'] if arrival else ''), arrival_tool=(arrival['name'] if arrival else ''), tokens_before_arrival=(arrival['tok'] if arrival else ''),
               orig_hook_fired=orig_marks > 0, orig_hook_marks=orig_marks,
               inject_events=len(inj), inject_gov_first_call=(inj_first or ''), inject_chars=sum(h.get('chars', 0) for h in inj), inject_modes='/'.join(h.get('mode', '') for h in inj),
               read_governing=bool(gov_reads), read_governing_call=(gov_first or ''), governing_reads=len(gov_reads),
               precedent_in_context_call=(prec_idx or ''), first_edit_call=(first_edit or ''), intended_chain=chain,
               skills_invoked='|'.join(skills), memory_file_reads=sum(1 for c in calls if '/memory/' in c['desc'] or 'MEMORY.md' in c['desc']),
               agent_calls=sum(1 for c in calls if c['name'] in ('Agent', 'Task')), advisor_calls=sum(1 for c in calls if c['name'] == 'advisor'),
               edited_precedent=prec_in_diff, target_touched=target_touched, violation_sig=sig, mentions_precedent=mentions, auto_outcome=auto,
               diff_lines=len(diff.splitlines()), expect_hits=sum(1 for k in EXPECT.get(task, []) if k in blob), expect_total=len(EXPECT.get(task, [])),
               tool_sequence=' > '.join(c['name'] for c in calls))
    rows.append(row)

keys = []
for r in rows:
    for k in r:
        if k not in keys:
            keys.append(k)
with open(LAB / 'results.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=keys)
    w.writeheader()
    w.writerows(rows)
print(f'{len(rows)} rows -> results.csv')
if '-v' in sys.argv:
    for r in rows:
        print(r['run'], r.get('subtype'), 'cost', r.get('cost_usd'), 'first', r.get('first_turn_tokens'), 'calls', r.get('tool_calls'),
              'arr', r.get('arrival_call'), 'prec', r.get('precedent_in_context_call'), 'edit', r.get('first_edit_call'), 'chain', r.get('intended_chain'),
              'gfy', r.get('graphify_calls'), r.get('auto_outcome'))
