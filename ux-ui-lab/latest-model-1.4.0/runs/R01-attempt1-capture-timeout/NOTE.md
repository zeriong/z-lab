Attempt 1 of R01 (2026-09-30) stopped before any measured step: headless Chrome did not exit within 60 s
while preparing the fixture's screenshot, and the runner raised TimeoutExpired, so no agent ran and no file
was written here. The runner now continues when the PNG exists after the timeout (as codex-parity-1.3.0 did
with a separate runner). SPEC unchanged; R01 was then run again.
