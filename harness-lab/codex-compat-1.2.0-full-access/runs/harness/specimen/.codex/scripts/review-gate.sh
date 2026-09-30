#!/usr/bin/env bash
# 전체 src JavaScript 파일의 단일 사용자 규칙과 확정된 npm 검사를 실행한다.
# exit 0: 통과, 1: 규칙/검사 실패, 2: 인자/검사 환경 오류.
set -euo pipefail
MODE=full
for arg in "$@"; do
  case "$arg" in
    --mode=full|--mode=refs-only) MODE="${arg#--mode=}" ;;
    --rule=no-literal-todo) ;;
    -h|--help) printf '%s\n' 'Usage: review-gate.sh [--mode=full|--mode=refs-only] [--rule=no-literal-todo]'; exit 0 ;;
    *) printf 'Invalid argument: %s\n' "$arg" >&2; exit 2 ;;
  esac
done
ROOT="$(cd "$(dirname "$0")/../.." && pwd)" || exit 2
cd "$ROOT" || exit 2
command -v python3 >/dev/null || exit 2
status=0
# 내부 코드 3만 규칙 위반으로 처리하고 검사 시작 실패는 exit 2로 구분한다.
python3 -c 'from pathlib import Path
import os
import sys

def fail(error):
    raise error

try:
    root = Path("src")
    if not root.is_dir():
        raise OSError("src directory missing")
    violations = []
    for directory, dirs, files in os.walk(root, onerror=fail, followlinks=False):
        dirs.sort()
        for name in dirs:
            if (Path(directory) / name).is_symlink():
                raise OSError(f"cannot safely inspect symlink directory: {Path(directory) / name}")
        for name in sorted(files):
            path = Path(directory) / name
            if path.suffix not in {".js", ".jsx", ".mjs", ".cjs"}:
                continue
            data = path.read_bytes()
            for line, value in enumerate(data.split(b"\n"), 1):
                if b"TODO" in value:
                    violations.append(f"{path}:{line}: P2 no-literal-todo")
    for violation in violations:
        print(violation)
    print("no-literal-todo: " + ("FAIL" if violations else "PASS"))
    sys.exit(3 if violations else 0)
except OSError as error:
    print(f"Inspection error: {error}", file=sys.stderr)
    sys.exit(2)' || status=$?
case "$status" in
  0) ;;
  3) status=1 ;;
  *) exit 2 ;;
esac
if [[ "$MODE" == full ]]; then
  command -v npm >/dev/null || exit 2
  for check in lint typecheck; do
    if npm run "$check"; then
      printf '%s: PASS\n' "$check"
    else
      printf '%s: FAIL\n' "$check"
      status=1
    fi
  done
fi
printf 'Gate exit: %s\n' "$status"
exit "$status"
