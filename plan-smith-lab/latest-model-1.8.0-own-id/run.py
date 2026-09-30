#!/usr/bin/env python3
"""Run SPEC.md's N03 with the sibling's N01 function. Usage: python3 run.py <product-checkout>"""
import importlib.util
from pathlib import Path

LAB = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("wired", LAB.parent / "latest-model-1.8.0" / "run.py")
wired = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(wired)
wired.LAB, wired.RUNS = LAB, LAB / "runs"
wired.SUBJECT, wired.MANIFEST = LAB / "subject" / "plan-smith", LAB / "subject" / "MANIFEST.sha256"
wired.CASES = {"N03": wired.n01}

if __name__ == "__main__":
    wired.main()
