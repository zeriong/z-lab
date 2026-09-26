#!/usr/bin/env python3
"""real-skill-tco 지표 — evidence/ 의 CLI JSON(계획·구현·수리)에서 SPEC의 사전 등록 지표를 계산한다.

usage: metrics.py [--json out.json]
토큰 = CLI modelUsage 의 input + output + cache_read + cache_creation 합(서브에이전트 포함 — 카나리에서 트랜스크립트와 일치 확인).
시간 = CLI duration_ms 합. 수리 JSON은 evidence/<체인>_repair<k>.json 이 있으면 자동으로 합산한다.
"""
import glob, json, os, sys

EV = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'evidence')
MODELS = ['opus-5.5', 'fable-5.1']
ARMS = ['base-plan', 'plan-smith']


def stage(path):
    if not os.path.exists(path) or os.path.getsize(path) == 0:  # 빈 파일 = 진행 중
        return None
    d = json.load(open(path))
    mu = d.get('modelUsage') or {}
    tok = sum(v.get('inputTokens', 0) + v.get('outputTokens', 0) + v.get('cacheReadInputTokens', 0)
              + v.get('cacheCreationInputTokens', 0) for v in mu.values())
    return {'tokens': tok, 'output': sum(v.get('outputTokens', 0) for v in mu.values()),
            'ms': d.get('duration_ms') or 0, 'usd': d.get('total_cost_usd') or 0.0,
            'error': bool(d.get('is_error')), 'models': sorted(mu), 'session': d.get('session_id')}


def chain(m, a, r):
    cid = f'{m}_{a}_r{r}'
    st = {'plan': stage(f'{EV}/{cid}_plan.json'), 'impl': stage(f'{EV}/{cid}_impl.json')}
    for p in sorted(glob.glob(f'{EV}/{cid}_repair*.json')):
        st[os.path.basename(p)[len(cid) + 1:-5]] = stage(p)
    done = [v for v in st.values() if v]
    return {'id': cid, 'stages': st,
            'tokens': sum(v['tokens'] for v in done), 'output': sum(v['output'] for v in done),
            'ms': sum(v['ms'] for v in done), 'usd': sum(v['usd'] for v in done),
            'complete': bool(st['plan'] and st['impl']), 'repairs': len(st) - 2,
            'resumed': [s for s in ('plan', 'impl') if os.path.exists(f'{EV}/{cid}_{s}.resumed')]}


def ratio(b, a):
    return round(b / a, 4) if a else None


if __name__ == '__main__':
    out = {}
    for m in MODELS:
        arms = {a: [chain(m, a, r) for r in (1, 2, 3)] for a in ARMS}
        agg = {a: {k: sum(c[k] for c in cs) for k in ('tokens', 'output', 'ms', 'usd')} for a, cs in arms.items()}
        b, s = agg['base-plan'], agg['plan-smith']
        out[m] = {'chains': arms, 'sum': agg,
                  'R_tok': ratio(s['tokens'], b['tokens']), 'R_time': ratio(s['ms'], b['ms']),
                  'R_usd': ratio(s['usd'], b['usd']), 'R_out': ratio(s['output'], b['output'])}
        print(f'== {m}')
        for a, cs in arms.items():
            for c in cs:
                p, i = c['stages']['plan'], c['stages']['impl']
                fmt = lambda x: f"{x['tokens']:>11,} tok {x['ms']/1000:>6.0f}s ${x['usd']:>7.2f}" if x else '   (none)'
                print(f"  {c['id']:<26} plan {fmt(p)} | impl {fmt(i)} | repairs {c['repairs']} {'RESUMED ' + str(c['resumed']) if c['resumed'] else ''}")
        print(f"  SUM base {b['tokens']:,} tok {b['ms']/60000:.1f}min ${b['usd']:.2f} | smith {s['tokens']:,} tok {s['ms']/60000:.1f}min ${s['usd']:.2f}")
        print(f"  R_tok={out[m]['R_tok']}  R_time={out[m]['R_time']}  R_usd={out[m]['R_usd']}  R_out={out[m]['R_out']}")
    if '--json' in sys.argv:
        json.dump(out, open(sys.argv[sys.argv.index('--json') + 1], 'w'), ensure_ascii=False, indent=1)
