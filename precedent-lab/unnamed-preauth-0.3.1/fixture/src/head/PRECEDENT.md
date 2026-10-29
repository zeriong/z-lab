# Decision records — src/head

## icons.mjs

### §favicon-follows-scheme — every icon entry carries a media query
- Since: 2026-09-05
- Decision: each entry has a `media` query for the light or the dark scheme; the browser picks one.
- Forbidden: an entry without `media` in the same array. Browsers then use it for both schemes and the dark variant
  never shows.
- Reason: measured in Chrome 129 and Firefox 131 on 2026-09-05.
