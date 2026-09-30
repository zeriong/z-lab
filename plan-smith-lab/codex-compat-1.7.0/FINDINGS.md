# Findings

## S01 — Real isolated writer
The real forge skill and Codex adapter ran on a preconfirmed local JSON-versus-SQLite decision. The parent spawned a fresh writer with fork_turns="none"; the parent did not write the plan itself. The plan was 799 words (3,290 characters), and its full body was present verbatim in the final agent message. The source fixture and bundled plugin remained unchanged. Exit 0; 300,898 ms. The prompt had already supplied user confirmation, so this does not test interactive question UI.

## S02 — Preserved contracts
The source change retains the existing agent body, frame/style library and split script. The final package run's existing split self-test passed 11 cases. Relay, optional divergence and multi-document splits were not run end-to-end in this fixture.

## Not measured

No comparison of model quality, broad platform portability, published remote installation, or complete browser/device coverage is claimed. Agent fixtures are smoke tests. Source snapshots retain the pre-bump metadata used at run time; final native package versions are measured in plugin-platform-lab/codex-final-0.158.0.
