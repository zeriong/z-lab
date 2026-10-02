#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py [V00 R01 R02 R03 R04 R05 R06]

State-aware: a case directory holding DONE is skipped, an existing one without DONE is refused. The helpers come from
../run-0.1.0/run.py, imported read-only, pointed at this directory's subject and runs.
"""
import importlib.util
from pathlib import Path
import sys

LAB = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("free_hands_run_010", LAB.parent / "run-0.1.0" / "run.py")
M = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(M)
M.SUBJECT = LAB / "subject" / "free-hands"
M.RUNS = LAB / "runs"


class Case(M.Case):
    def __init__(self, name):
        super().__init__(name)
        self.base = M.TMP / f"free-hands-lab-r2-{name.lower()}"


def r01(case):
    repo = case.repo()
    M.write_goal(repo, M.goal(2, *M.stop_items()))
    M.claude(case, "stop", M.STOP_PROMPT, repo)
    case.snapshot("after", repo, ("a.txt", "b.txt", "c.txt"))


def r02(case):
    repo = case.repo()
    first = M.claude(case, "turn1", "Reply with the word ok only.", repo)
    M.write_goal(repo, M.goal(5, "- [ ] write a.txt containing 1"))
    case.snapshot("goal-written", repo, ())
    M.claude(case, "compact", "/compact", repo, resume=first["session_id"])
    case.snapshot("after", repo, ("a.txt",))


def r03(case):
    repo = case.repo()
    M.write_goal(repo, M.goal(1, "- [ ] write c.txt with the content the user gives you"))
    M.claude(case, "limit", "Read .free-hands/goal.md and finish it.", repo)
    case.snapshot("after", repo, ("c.txt",))


PANEL_PROMPT = ("Follow step 4 of the free-hands skill for .free-hands/panel/01-cli/brief.json, record the decision, "
                "mark the item done, then stop.")


def r04(case):
    repo, brief_dir = M.panel_repo(case)
    M.claude(case, "panel", PANEL_PROMPT, repo)
    case.snapshot("after", repo, ())
    M.panel_files(case, "panel_files", brief_dir)


def r05(case):
    env, model = M.codex_home(case)
    repo = case.repo("yes")
    first = M.codex(case, "yes-entry", M.ENTRY, repo, env, model)
    M.codex(case, "yes-answer", "응", repo, env, model, resume=first["thread_id"])
    case.snapshot("yes", repo, ("hello.txt", ".free-hands/.gitignore"))


def r06(case):
    env, model = M.codex_home(case)
    repo, brief_dir = M.panel_repo(case)
    M.codex(case, "panel", PANEL_PROMPT, repo, env, model)
    case.snapshot("after", repo, ())
    M.panel_files(case, "panel_files", brief_dir)


CASES = {"V00": M.v00, "R01": r01, "R02": r02, "R03": r03, "R04": r04, "R05": r05, "R06": r06}


def main():
    names = sys.argv[1:] or list(CASES)
    for name in names:
        case = Case(name)
        if (case.dir / "DONE").exists():
            print(f"{name}: DONE, skipped")
            continue
        if case.dir.exists() or case.base.exists():
            sys.exit(f"{name}: incomplete directory exists ({case.dir} or {case.base}); use a new sibling experiment")
        case.dir.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        CASES[name](case)
        case.finish()
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
