#!/usr/bin/env python3
"""precedent-write-gate v2 — gate-placement 실험 H arm (2026-10-13). v1(plan-rail)의 실측 결함 3건을 고친 판.

PreToolUse(Edit|Write|MultiEdit|Bash). 기록된 결정을 이 세션 안에서 바꾸지 못하게 한다.
- Edit/MultiEdit/Write 의 대상이 PRECEDENT.md 이면 편집을 적용해 본 결과를 계산한다.
  - 기존 결정 블록(`### §slug` ~ 다음 `###`/`##` 직전)의 줄이 바뀌거나 지워지거나 그 안에 줄이 끼면 거부.
  - [v2] 새 블록이 같은 파일의 기존 slug 를 언급하거나 `무효화`·`§24` 를 쓰면 거부(새 블록으로 뒤집기 — plan-rail F3).
  - 그 밖의 새 블록 추가는 통과.
- [v2] Bash 는 PRECEDENT.md 가 **쓰기 대상**인 명령 조각만 거부한다(리다이렉트 대상 · sed/perl -i · tee · rm/mv/truncate ·
  cp 목적지 · git checkout/restore 경로). 명령에 `PRECEDENT.md` 문자열이 있기만 한 경우(포인터 주석을 넣는 스크립트,
  읽기 명령)는 통과 — plan-rail F4 오탐 4/4. 감수: python·node 등 인터프리터가 PRECEDENT.md 를 직접 쓰는 우회는 막지 않는다.
- [v2] 거부 문구에 되돌리는 법을 넣는다 — plan-rail F3 의 불완전 손수 복구.
- 통과 수단은 없다. 사용자 확인을 받으라고만 안내한다. 판정 오류는 통과(fail-open).
- 로그: $PRECEDENT_LAB_LOG 에 JSON 한 줄(gate=deny|deny-new|deny-bash|allow).
"""
import json, os, re, sys, time

TAIL = ("바꿔야 한다고 판단하면 작업을 멈추고, 사용자에게 §24 무효화 사유(① 상류 변경 ② 새 실측 반증 ③ 사용자의 결함 지적 "
        "④ 축이 기록과 다름) 중 무엇에 해당하는지와 그 증거를 제시해 확인을 요청하세요. 확인 전에는 이 결정과 충돌하는 소스 변경도 하지 마세요. "
        "이미 바꾼 소스가 있으면 `git checkout -- <파일>` 로 되돌리고 `git status` 로 확인하세요.")
MSG = "PRECEDENT 게이트: 기록된 결정 블록({slugs})은 이 세션에서 바꿀 수 없습니다 — 사용자 확인이 필요합니다. " + TAIL
MSG_NEW = "PRECEDENT 게이트: 새 블록({slugs})이 기존 결정({refs})을 언급하거나 무효화를 주장합니다 — 기존 결정을 바꾸는 것과 같아 사용자 확인이 필요합니다. " + TAIL
BASH_MSG = "PRECEDENT 게이트: PRECEDENT.md 는 Bash 로 쓰지 않습니다(읽기는 그대로 가능). 고쳐야 하면 Edit 로 고치세요 — 기록된 결정 블록의 변경은 사용자 확인이 필요합니다."
SEG = re.compile(r"\n|;|&&|\|\||\|")
WRITE_SEG = [re.compile(p) for p in (
    r">>?\s*[\"']?[^\s;&|<>]*PRECEDENT\.md",
    r"\b(sed|perl)\s+(-\S+\s+)*-[a-zA-Z]*i",
    r"\btee\b", r"\b(rm|mv|truncate)\b",
    r"\bcp\b.*PRECEDENT\.md[\"']?\s*$",
    r"\bgit\s+(checkout|restore)\b",
)]


def bash_writes_precedent(cmd):
    return any("PRECEDENT.md" in seg and any(p.search(seg) for p in WRITE_SEG) for seg in SEG.split(cmd))


def log(rec):
    p = os.environ.get("PRECEDENT_LAB_LOG")
    if p:
        rec["ts"] = time.time()
        try:
            with open(p, "a") as f:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        except OSError:
            pass


def deny(reason):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                                             "permissionDecisionReason": reason}}, ensure_ascii=False))


def blocks(text):
    """결정 블록: slug -> 블록 줄 목록(제목 포함)."""
    out, cur, buf = {}, None, []
    for l in text.split("\n"):
        if l.startswith("### ") or l.startswith("## "):
            if cur:
                out[cur] = buf
            cur, buf = (l.split()[1] if l.startswith("### §") else None), ([l] if l.startswith("### §") else [])
            continue
        if cur:
            buf.append(l)
    if cur:
        out[cur] = buf
    return out


def strip_tail(b):
    while b and not b[-1].strip():
        b = b[:-1]
    return b


def judge(before, after):
    """(changed_existing, {new_slug: refs}) — refs 는 언급한 기존 slug(없고 무효화·§24 만 있으면 ['무효화'])."""
    a, b = blocks(before), blocks(after)
    changed = [s for s, lines in a.items() if s not in b or strip_tail(b[s]) != strip_tail(lines)]
    flagged = {}
    for s, lines in b.items():
        if s in a:
            continue
        text = "\n".join(lines[1:])
        refs = sorted(set(re.findall(r"§[A-Za-z0-9-]+", "\n".join(lines))) & set(a) - {s})
        if refs or re.search(r"무효화|§24", text):
            flagged[s] = refs or ["무효화"]
    return changed, flagged


def main():
    raw = sys.stdin.read()
    try:
        d = json.loads(raw)
    except ValueError:
        return
    tool = d.get("tool_name", "")
    ti = d.get("tool_input") or {}
    cwd = d.get("cwd") or os.getcwd()
    rec = {"session": d.get("session_id") or "nosession", "tool": tool, "tool_use_id": d.get("tool_use_id")}
    if tool == "Bash":
        cmd = str(ti.get("command", ""))
        if "PRECEDENT.md" in cmd and bash_writes_precedent(cmd):
            log({**rec, "gate": "deny-bash", "cmd": cmd[:200]})
            deny(BASH_MSG)
        return
    if tool not in ("Edit", "Write", "MultiEdit"):
        return
    fp = str(ti.get("file_path", ""))
    if not fp.endswith("PRECEDENT.md"):
        return
    path = fp if os.path.isabs(fp) else os.path.join(cwd, fp)
    before = open(path, encoding="utf-8").read() if os.path.isfile(path) else ""
    if tool == "Write":
        after = str(ti.get("content", ""))
    else:
        after = before
        for e in (ti.get("edits") if tool == "MultiEdit" else [ti]) or []:
            old, new = str(e.get("old_string", "")), str(e.get("new_string", ""))
            if old:
                after = after.replace(old, new) if e.get("replace_all") else after.replace(old, new, 1)
    changed, flagged = judge(before, after)
    rel = os.path.relpath(path, cwd)
    if changed:
        log({**rec, "gate": "deny", "file": rel, "slugs": changed})
        deny(MSG.format(slugs=", ".join(changed[:4])))
    elif flagged:
        log({**rec, "gate": "deny-new", "file": rel, "slugs": list(flagged), "refs": sorted({r for v in flagged.values() for r in v})})
        deny(MSG_NEW.format(slugs=", ".join(list(flagged)[:4]), refs=", ".join(sorted({r for v in flagged.values() for r in v})[:4])))
    else:
        log({**rec, "gate": "allow", "file": rel})


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # fail-open
        log({"gate_error": repr(e)})
