#!/usr/bin/env python3
"""Publish runs/ as runs-public/ — reuses ../platform-2.1.306-0.163.0/redact.py (see its REDACTION.md).

usage: REDACT_FORBIDDEN=<regex> python3 redact.py <scratch-dir>
"""
import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("base", HERE.parent / "platform-2.1.306-0.163.0" / "redact.py")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
base.HERE = HERE

if __name__ == "__main__":
    base.main()
