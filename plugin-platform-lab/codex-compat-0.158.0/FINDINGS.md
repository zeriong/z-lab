# Findings

## P01 — Existing catalog is readable
Codex 0.158.0 plugin/read discovered all four original Claude-format plugins, seven namespaced skills, the UX MCP declarations and the two plugins' hook declarations. Native manifests add explicit packaging and interface metadata; they are not a claim that the old catalog could not load. Baseline and candidate JSON are preserved. The baseline metadata probe elapsed 49 ms; no model token use.

## P02–P04 — Final evidence
See ../codex-final-0.158.0/FINDINGS.md for final versions, deterministic installer routing and copied-folder package checks. Candidate JSON here predates the final version bump and UI MCP inline declaration.

## Not measured

No comparison of model quality, broad platform portability, published remote installation, or complete browser/device coverage is claimed. Agent fixtures are smoke tests. Source snapshots retain the pre-bump metadata used at run time; final native package versions are measured in plugin-platform-lab/codex-final-0.158.0.
