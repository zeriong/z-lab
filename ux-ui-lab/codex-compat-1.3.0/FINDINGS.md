# Findings

## U01 — Real PreToolUse blocking
Codex invoked the actual UI gate and blocked an unapproved staged HTML diff before `git commit --dry-run`. The agent did not retry or approve it. HEAD remained absent: no commit was created. The vetted test hook was trusted invocation-locally, without writing persistent trust settings. Actual installed use still requires /hooks trust.

## U02 — Restricted review dispatch
The real skill's independent reviewer subprocess could not initialize its app-server under the outer workspace-write sandbox. The parent reported that failure and did not invent an approval. The changed outer-permission condition is preserved in a separate sibling experiment, not substituted into this run.

## U03 — Direct gate behavior and measurement limits
The final platform regression checks verify approval bound to a staged diff, stale approval rejection, and non-UI/non-commit fast paths for both host payloads. Mobile doctor found simctl available but no booted simulator; adb/flutter/dart were unavailable. No browser or real mobile screen was captured in this work. Existing screenshot, rubric and agent definitions remain unchanged.

## Not measured

No comparison of model quality, broad platform portability, published remote installation, or complete browser/device coverage is claimed. Agent fixtures are smoke tests. Source snapshots retain the pre-bump metadata used at run time; final native package versions are measured in plugin-platform-lab/codex-final-0.158.0.
