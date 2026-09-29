#!/usr/bin/env python3
"""z-lab 공개 저장 전 호스트 정보 가림 — 경로 인자 아래 텍스트 파일을 제자리에서 바꾼다.

usage: scrub.py <path> [<path> ...]      (환경변수 SCRUB_EXTRA_RE 로 추가 패턴 지정 가능)
가림: 이메일 → <EMAIL> · 랩 절대경로 → <LAB> · 홈 디렉터리 → <HOME> · 임시 픽스처 → <FIXTURE>.
측정값은 바꾸지 않는다. 바꾼 파일 수를 출력하고, 가린 뒤에도 남은 민감 패턴이 있으면 exit 1.
"""
import os, re, sys

HOME = os.path.expanduser('~')
LAB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RULES = [
    (re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}'), '<EMAIL>'),
    (re.compile(re.escape(LAB)), '<LAB>'),
    (re.compile(r'/(private/)?var/folders/[^\s"\'`)]+'), '<FIXTURE>'),
    (re.compile(r'/(private/)?tmp/[^\s"\'`)]+'), '<FIXTURE>'),
    (re.compile(re.escape(HOME)), '<HOME>'),
]
LEFT = re.compile('|'.join([re.escape(os.path.basename(HOME)), r'@[A-Za-z0-9-]+\.[A-Za-z]{2,}'] +
                           ([os.environ['SCRUB_EXTRA_RE']] if os.environ.get('SCRUB_EXTRA_RE') else [])))
SKIP_DIRS = {'node_modules', 'dist', '.git'}


def files(paths):
    for p in paths:
        if os.path.isfile(p):
            yield p
        for root, dirs, fs in os.walk(p):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for f in fs:
                yield os.path.join(root, f)


if __name__ == '__main__':
    changed, left = 0, []
    for f in files(sys.argv[1:]):
        try:
            s = open(f, encoding='utf-8').read()
        except (UnicodeDecodeError, OSError):
            continue
        t = s
        for rx, rep in RULES:
            t = rx.sub(rep, t)
        if t != s:
            open(f, 'w', encoding='utf-8').write(t)
            changed += 1
        if LEFT.search(t):
            left.append(f)
    print(f'scrubbed {changed} file(s)')
    if left:
        print('SENSITIVE LEFT:', *left, sep='\n  ')
        sys.exit(1)
