# eta-corpus-large

Larger goals for the free-hands ETA experiments: four tasks each, sized like the maintainer's real items (15–60 minutes
for an agent, where `../eta-corpus/` goals were 1–3 minutes per item). The fixtures are `../eta-corpus/fixtures/`
(unchanged); only the goals are new. Each goal file has `## Prompt` (passed verbatim after `/free-hands:run `),
`## Checks` and `## Categories`, as in `../eta-corpus/`.

| Goal | Fixture | Tasks |
|---|---|---|
| `goals/p3-orders-L1.md` | p3-orders (Python package, sqlite3, 1814 lines) | returns and refunds; schema migrations; monthly revenue report; architecture review |
| `goals/p2-shelf-L2.md` | p2-shelf (Node HTTP API, 836 lines) | token authentication; search endpoint; repository refactor; OpenAPI spec with a checker |

The goals were written for this corpus on 2026-11-17 and are not changed once an experiment that uses them is frozen.
