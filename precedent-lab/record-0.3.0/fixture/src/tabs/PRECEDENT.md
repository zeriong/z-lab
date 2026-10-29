## tab-keys.mjs

### §stable-tab-keys — a key is assigned once and never shifted
- Decision: Tab keys (`src/tabs/tab-keys.mjs`): a key is assigned once and never shifted; closing a tab leaves a gap
  (`t1,t3`).
- Forbidden: Do not renumber the remaining keys after a close
- Reason: the key is the React key and the URL state, and shifting keys remounts the tabs to the right and drops their
  unsaved form input (incident 2026-08-29).
