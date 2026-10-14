#!/usr/bin/env python3
"""precedent-inject v2 — plan-rail 실험의 도착 훅 (2026-10-13). v1(real-env-rail) 대비 바뀐 점 하나:
관할 PRECEDENT 에 그 파일 절이 없으면 디렉터리 목차(≤2,500자) 대신 한 줄 안내만, PRECEDENT 파일당 1회 낸다(plan 이슈 1).

v1 설명:

현행 precedent-context.sh 는 도착 시 "몇 번째 줄을 읽어라" 는 포인터(≤400B)만 낸다.
이 시제품은 그 자리에서 **해당 파일의 PRECEDENT 절 본문**을 additionalContext 로 넣는다.

- 이벤트: PostToolUse(Read|Edit|Write|MultiEdit|Bash)
- Bash 는 cat/sed/head/tail/awk/less/grep/rg/nl 명령에서 .ts/.tsx/.css/.mjs/.sh 경로를 뽑는다
  (`cd X &&` 상대 경로 보정 — 3라운드 precedent-context-bash.sh 와 같은 규칙).
- 관할 PRECEDENT.md 가 없는 파일은 원 훅(precedent-context.sh)에 그대로 위임한다(규칙 파일 안내 유지).
- 본문 상한 6,000자(훅 additionalContext 는 10,000자에서 통째로 버려진다 — 1차 실험 evidence/hook-cap).
  넘으면 `### ` 제목 + `- 결정:`·`- 금지:` 줄만 남긴 압축본, 그래도 넘으면 남은 슬러그만 나열.
- 같은 (session, 파일) 은 1회만. Edit/Write 의 첫 1회 리마인더 문구는 원 훅과 같다.
- 로그: $PRECEDENT_LAB_LOG 에 JSON 한 줄(세션·도구·tool_use_id·파일·모드·글자 수).
"""
import json, os, re, subprocess, sys, time

CAP = 6000
READ_VERBS = re.compile(r"\b(cat|sed|head|tail|awk|less|grep|rg|nl)\b")
PATH_RE = re.compile(r"[A-Za-z0-9_./\[\]@-]+\.(?:tsx?|css|mjs|sh)\b")


# v3 (gate-placement A arm): 결정 원문을 낼 때 게이트 거부 문구의 핵심을 도착 시점에 함께 낸다 — 구현 전에 멈추는지 잰다.
STOP = ("⚠ 이 절의 결정·금지는 사용자 확인 없이 바꿀 수 없습니다. 바꿔야 한다고 판단하면 작업을 멈추고, 사용자에게 "
        "§24 무효화 사유(① 상류 변경 ② 새 실측 반증 ③ 사용자의 결함 지적 ④ 축이 기록과 다름) 중 무엇에 해당하는지와 "
        "그 증거를 제시해 확인을 요청하세요. 확인 전에는 이 결정과 충돌하는 소스 변경도, PRECEDENT.md 수정도 하지 마세요.")


def log(rec):
    p = os.environ.get("PRECEDENT_LAB_LOG")
    if not p:
        return
    rec["ts"] = time.time()
    try:
        with open(p, "a") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    except OSError:
        pass


def emit(text):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": text}}, ensure_ascii=False))


def repo_root(start):
    d = start
    while d and d != "/":
        if os.path.exists(os.path.join(d, ".git")):
            return d
        d = os.path.dirname(d)
    return None


def nearest_precedent(path, root):
    d = os.path.dirname(path)
    while d and d.startswith(root):
        p = os.path.join(d, "PRECEDENT.md")
        if os.path.isfile(p):
            return p
        if d == root:
            break
        d = os.path.dirname(d)
    return None


def sections(precedent, basename):
    lines = open(precedent, encoding="utf-8").read().split("\n")
    pat = re.compile(r"^## (.*([\s/]|·))?" + re.escape(basename) + r"(\s|·|$)")
    h2 = [i for i, l in enumerate(lines) if l.startswith("## ")]
    out = []
    for i, l in enumerate(lines):
        if pat.match(l):
            e = next((n for n in h2 if n > i), len(lines))
            out.append((i + 1, e, lines[i:e]))
    return out, lines


def compact(block):
    keep = []
    for l in block:
        if l.startswith("## ") or l.startswith("### "):
            keep.append(l)
        elif re.match(r"^- (결정|금지|기각|기준):", l):
            keep.append(l if len(l) <= 350 else l[:347] + "…")
    return keep


def render(precedent, root, basename):
    srel = os.path.relpath(precedent, root)
    secs, lines = sections(precedent, basename)
    if not secs:
        return "noline", f"PRECEDENT: {srel} 에 `## {basename}` 절 없음 — 이 파일에서 결정을 만들면 그 절을 신설."
    ranges = " · ".join(f"L{s}-L{e}" for s, e, _ in secs)
    full = "\n".join("\n".join(b) for _, _, b in secs)
    head = f"PRECEDENT 주입 — {srel} ({ranges}). 이 파일에 기록된 결정 원문이다. 바꾸려면 §24 무효화 사유가 있어야 한다.\n"
    if len(head) + len(full) <= CAP:
        return "full", head + full
    comp = "\n".join("\n".join(compact(b)) for _, _, b in secs)
    head = f"PRECEDENT 주입(압축: 제목·결정·금지 줄만, 원문 {ranges}) — {srel}. 바꾸려면 §24 무효화 사유가 있어야 한다.\n"
    if len(head) + len(comp) <= CAP:
        return "compact", head + comp
    cut = comp[: CAP - len(head) - 200]
    rest = re.findall(r"^### (§\S+)", comp[len(cut):], re.M)
    return "compact-cut", head + cut + f"\n…(잘림) 남은 결정: {' '.join(rest)} — 원문 {ranges}"


def main():
    raw = sys.stdin.read()
    try:
        d = json.loads(raw)
    except ValueError:
        return
    tool = d.get("tool_name", "")
    ti = d.get("tool_input") or {}
    cwd = d.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    proj = os.environ.get("CLAUDE_PROJECT_DIR") or cwd
    files = []
    if tool in ("Read", "Edit", "Write", "MultiEdit"):
        fp = str(ti.get("file_path", ""))
        if fp:
            files.append(fp if os.path.isabs(fp) else os.path.join(cwd, fp))
    elif tool == "Bash":
        cmd = str(ti.get("command", ""))
        if not READ_VERBS.search(cmd):
            return
        m = re.search(r"\bcd\s+([^\s;&|]+)", cmd)
        base = cwd
        if m:
            base = m.group(1) if os.path.isabs(m.group(1)) else os.path.join(cwd, m.group(1))
        for tok in PATH_RE.findall(cmd):
            p = tok if os.path.isabs(tok) else os.path.normpath(os.path.join(base, tok))
            if p not in files and os.path.isfile(p):
                files.append(p)
    files = [f for f in files if re.search(r"\.(tsx?|css|mjs|sh)$", f)][:3]
    if not files:
        return
    session = d.get("session_id") or "nosession"
    agent = d.get("agent_id") or "main"
    mdir = os.path.join(os.environ.get("TMPDIR", "/tmp"), f"claude-precedent-inject-{session}", agent)
    os.makedirs(mdir, exist_ok=True)
    for f in files:
        root = repo_root(os.path.dirname(f)) or proj
        precedent = nearest_precedent(f, root)
        if not precedent:
            # 관할 기록이 없는 파일은 원 훅에 위임(규칙 파일 안내 유지) — Read 이벤트로만
            if tool == "Bash":
                continue
            orig = os.path.join(proj, ".claude", "hooks", "precedent-context.sh")
            if os.path.isfile(orig):
                r = subprocess.run(["bash", orig], input=raw, capture_output=True, text=True)
                if r.stdout.strip():
                    print(r.stdout.strip())
                    log({"session": session, "tool": tool, "tool_use_id": d.get("tool_use_id"), "file": os.path.relpath(f, root), "mode": "delegated", "chars": len(r.stdout)})
                    return
            continue
        key = re.sub(r"[^A-Za-z0-9]", "_", os.path.relpath(f, root))[-150:]
        marker = os.path.join(mdir, "r-" + key)
        msgs = []
        if tool != "Read" and tool != "Bash":
            wkey = os.path.join(mdir, "w-" + re.sub(r"[^A-Za-z0-9]", "_", os.path.relpath(precedent, root)))
            if not os.path.exists(wkey):
                open(wkey, "w").close()
                sdir = os.path.dirname(os.path.relpath(precedent, root))
                msgs.append(f"PRECEDENT 관할 — 결정 생성/반증 시 같은 커밋에 {sdir}/PRECEDENT.md 갱신, 영향 없으면 PRECEDENT_OK=1.")
        mode = "none"
        if not os.path.exists(marker):
            open(marker, "w").close()
            mode, text = render(precedent, root, os.path.basename(f))
            if mode in ("full", "compact", "compact-cut"):
                text += "\n" + STOP
            pkey = os.path.join(mdir, "n-" + re.sub(r"[^A-Za-z0-9]", "_", os.path.relpath(precedent, root)))
            if mode == "noline" and os.path.exists(pkey):
                mode, text = "none", ""
            elif mode == "noline":
                open(pkey, "w").close()
            if text:
                msgs.append(text)
        if msgs:
            out = "\n".join(msgs)
            emit(out)
            log({"session": session, "tool": tool, "tool_use_id": d.get("tool_use_id"), "file": os.path.relpath(f, root), "mode": mode, "chars": len(out)})
            return


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # fail-open: 훅 오류가 작업을 막지 않는다
        log({"error": repr(e)})
