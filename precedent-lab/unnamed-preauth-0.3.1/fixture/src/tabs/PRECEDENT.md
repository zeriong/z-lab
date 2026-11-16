# Decision records — src/tabs

## tab-keys.mjs

### §stable-tab-keys — closing a tab never renumbers the others
- Since: 2026-09-02
- Decision: a key is assigned once from `next` and is never reused or shifted. Closing a tab leaves a gap (`t1,t3`).
- Forbidden: renumbering the remaining keys after a close to make them contiguous.
- Reason: the key is the React key and the URL state. Shifting keys remounts every tab to the right of the closed one
  and drops its scroll position and unsaved form input (incident 2026-08-29, reproduced by the "close keeps keys" test).
- Evidence: `tab-keys.test.mjs`
