## icons.mjs

### §favicon-media — every favicon entry carries a `media` query
- Decision: Every favicon entry in `src/head/icons.mjs` carries a `media` query
- Reason: an entry without `media` makes browsers use it for both color schemes, so the dark icon never shows
  (measured in Chrome 129 and Firefox 131, 2026-09-05).
