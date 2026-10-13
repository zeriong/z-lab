#!/usr/bin/env python3
"""precedent-write-gate — plan-rail 실험 PG arm 의 쓰기 게이트 시제품 (2026-10-13, plan 이슈 3).

PreToolUse(Edit|Write|MultiEdit|Bash). 기록된 결정을 이 세션 안에서 바꾸지 못하게 한다.
- Edit/MultiEdit/Write 의 대상이 PRECEDENT.md 이면 편집을 적용해 본 결과를 계산하고,
  **기존 결정 블록**(`### §slug` 제목부터 다음 `###`/`##` 제목 직전까지)의 줄이 하나라도 바뀌거나 지워지거나
  그 블록 안에 줄이 끼워 넣어지면 거부한다. 새 `###`/`##` 블록을 덧붙이는 것은 통과한다(결정 신설).
- Bash 명령이 PRECEDENT.md 를 쓰는 형태(sed -i · perl -i · tee · > · mv/cp/rm · python/node 등 인터프리터 ·
  git apply/checkout/restore)이면 거부한다 — Edit/Write 로만 고치게 해서 위 판정을 우회하지 못하게 한다.
- 통과 수단은 없다. 사용자 확인을 받으라고만 안내한다(에이전트가 스스로 붙이는 토큰으로 통과하지 않는다).
- 판정 오류는 통과(fail-open)한다. 로그: $PRECEDENT_LAB_LOG 에 JSON 한 줄(gate=deny|allow).
"""
import json, os, re, sys, time

MSG = ("PRECEDENT 게이트: 기록된 결정 블록({slugs})은 이 세션에서 바꿀 수 없습니다 — 사용자 확인이 필요합니다. "
       "바꿔야 한다고 판단하면 작업을 멈추고, 사용자에게 §24 무효화 사유(① 상류 변경 ② 새 실측 반증 ③ 사용자의 결함 지적 "
       "④ 축이 기록과 다름) 중 무엇에 해당하는지와 그 증거를 제시해 확인을 요청하세요. 확인 전에는 이 결정과 충돌하는 소스 변경도 하지 마세요.")
BASH_MSG = ("PRECEDENT 게이트: PRECEDENT.md 는 Bash 로 쓰지 않습니다(읽기는 cat·sed -n·grep 로 가능). "
            "고쳐야 하면 Edit 로 고치세요 — 기록된 결정 블록의 변경은 사용자 확인이 필요합니다.")
BASH_WRITE = re.compile(r"(sed\s+(-[a-zA-Z]*\s+)*-[a-zA-Z]*i|perl\s+-[a-zA-Z]*i|\btee\b|>>?\s*[\"']?[^\s;&|]*PRECEDENT\.md|"
                        r"\b(mv|cp|rm|truncate|dd)\b|\bpython3?\b|\bnode\b|\bruby\b|\bawk\b[^|;&]*-i\s*inplace|"
                        r"\bgit\s+(apply|checkout|restore|stash)\b|apply_patch)")


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
    """기존 결정 블록: slug -> 블록 줄 목록(제목 포함)."""
    lines = text.split("\n")
    out, cur, buf = {}, None, []
    for l in lines:
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


def changed_slugs(before, after):
    a, b = blocks(before), blocks(after)
    return [s for s, lines in a.items() if s not in b or strip_tail(b[s]) != strip_tail(lines)]


def main():
    raw = sys.stdin.read()
    try:
        d = json.loads(raw)
    except ValueError:
        return
    tool = d.get("tool_name", "")
    ti = d.get("tool_input") or {}
    cwd = d.get("cwd") or os.getcwd()
    session = d.get("session_id") or "nosession"
    if tool == "Bash":
        cmd = str(ti.get("command", ""))
        if "PRECEDENT.md" in cmd and BASH_WRITE.search(cmd):
            log({"session": session, "tool": tool, "tool_use_id": d.get("tool_use_id"), "gate": "deny-bash", "cmd": cmd[:200]})
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
        edits = ti.get("edits") if tool == "MultiEdit" else [ti]
        after = before
        for e in edits or []:
            old, new = str(e.get("old_string", "")), str(e.get("new_string", ""))
            if not old:
                continue
            after = after.replace(old, new) if e.get("replace_all") else after.replace(old, new, 1)
    slugs = changed_slugs(before, after)
    rel = os.path.relpath(path, d.get("cwd") or cwd)
    if slugs:
        log({"session": session, "tool": tool, "tool_use_id": d.get("tool_use_id"), "gate": "deny", "file": rel, "slugs": slugs})
        deny(MSG.format(slugs=", ".join(slugs[:4])))
    else:
        log({"session": session, "tool": tool, "tool_use_id": d.get("tool_use_id"), "gate": "allow", "file": rel})


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # fail-open
        log({"gate_error": repr(e)})
