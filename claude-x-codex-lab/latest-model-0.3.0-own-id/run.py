#!/usr/bin/env python3
"""Run SPEC.md's W04 with the sibling's W03 function. Usage: python3 run.py <product-checkout>"""
import importlib.util
from pathlib import Path
import sys

LAB = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("wired", LAB.parent / "latest-model-0.3.0" / "run.py")
wired = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(wired)
wired.LAB, wired.RUNS = LAB, LAB / "runs"
wired.SUBJECT, wired.MANIFEST = LAB / "subject" / "claude-x-codex", LAB / "subject" / "MANIFEST.sha256"
wired.CASES = {"W04": wired.w03}

if __name__ == "__main__":
    wired.main()
