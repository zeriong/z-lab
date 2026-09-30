from pathlib import Path
import hashlib, json, shutil, subprocess, tempfile
root = Path(__file__).resolve().parents[2]
ev = root / 'docs/harness-build'
generated = ev / 'generated'
fixture = Path(tempfile.mkdtemp(prefix='harness-verification-'))
shutil.copytree(generated, fixture, dirs_exist_ok=True)
shutil.copytree(root / 'src', fixture / 'src')
shutil.copy2(root / 'package.json', fixture / 'package.json')
records = []
def run(label, args, expected=0, cwd=fixture, stdin=None):
    p = subprocess.run(args, cwd=cwd, input=stdin, text=True, capture_output=True, timeout=30)
    records.append(dict(test=label, exit=p.returncode, expected=expected, passed=p.returncode == expected, stdout=p.stdout, stderr=p.stderr))
    assert p.returncode == expected, (label, p.returncode, p.stdout, p.stderr)
    return p
hook = str(fixture / '.codex/hooks/inject-context.sh')
gate = str(fixture / '.codex/scripts/review-gate.sh')
run('gate shell syntax', ['bash', '-n', gate])
run('hook shell syntax', ['bash', '-n', hook])
run('clean refs-only', [gate, '--mode=refs-only'])
run('clean full npm checks', [gate, '--mode=full'])
run('rule selection', [gate, '--mode=refs-only', '--rule=no-literal-todo'])
run('invalid mode', [gate, '--mode=bogus'], 2)
run('unknown rule', [gate, '--rule=bogus'], 2)
run('unknown argument', [gate, '--bogus'], 2)
run('subdirectory gate', [gate, '--mode=refs-only'], cwd=fixture / 'src')
p = run('normal hook from subdirectory', ['bash', hook], cwd=fixture / 'src', stdin='{"prompt":"sanity"}')
context = json.loads(p.stdout)['hookSpecificOutput']['additionalContext']
assert '## §1' in context and '# Harness Engineering' in context and '10. **Delivery:**' in context
assert not context.startswith('---')
for prompt in ['!skip', '  !hello', 'harness 빼고', 'without harness', 'skip harness', 'no harness']:
    p = run('hook bypass ' + prompt, ['bash', hook], stdin=json.dumps({'prompt': prompt}))
    assert json.loads(p.stdout)['hookSpecificOutput']['additionalContext'].startswith('BYPASS MODE')
for payload in ['{', '{"prompt":2}']:
    p = run('invalid hook payload ' + payload, ['bash', hook], stdin=payload)
    assert p.stdout == ''
p = run('non-object JSON uses empty prompt per bundled source', ['bash', hook], stdin='[]')
assert '## §1' in json.loads(p.stdout)['hookSpecificOutput']['additionalContext']
for name, content in [('untracked.js', b'// TODO: sample\n'), ('space name.mjs', b'export const x="TODO";\n'), ('newline\nname.cjs', b'// TODO\n'), ('view.jsx', b'// TODO\n'), ('binary.js', b'\xff\x00TODO\n')]:
    sample = fixture / 'src' / name
    sample.write_bytes(content)
    run('violation ' + repr(name), [gate, '--mode=refs-only'], 1)
    sample.unlink()
external = fixture / 'outside'
external.mkdir()
(external / 'linked.js').write_text('// TODO\n')
(fixture / 'src/linked-dir').symlink_to(external, target_is_directory=True)
run('symlink directory violation', [gate, '--mode=refs-only'], 1)
(fixture / 'src/linked-dir').unlink()
(fixture / 'src/linked.js').symlink_to(external / 'linked.js')
run('symlink file violation', [gate, '--mode=refs-only'], 1)
(fixture / 'src/linked.js').unlink()
(fixture / 'src/cycle').symlink_to(fixture / 'src', target_is_directory=True)
run('symlink cycle terminates', [gate, '--mode=refs-only'])
(fixture / 'src/cycle').unlink()
(fixture / 'src/broken.js').symlink_to(fixture / 'absent.js')
run('unreadable broken source', [gate, '--mode=refs-only'], 2)
(fixture / 'src/broken.js').unlink()
(fixture / 'src/allowed.js').write_text('// todo is lower case\n')
(fixture / 'src/allowed.txt').write_text('TODO\n')
run('case sensitive and scoped', [gate, '--mode=refs-only'])
(fixture / 'src/allowed.js').unlink()
(fixture / 'src/allowed.txt').unlink()
package = fixture / 'package.json'
saved = package.read_bytes()
data = json.loads(saved)
data['scripts']['lint'] = 'node -e "process.exit(1)"'
package.write_text(json.dumps(data))
run('failed npm check', [gate, '--mode=full'], 1)
package.write_bytes(saved)
(fixture / 'src').rename(fixture / 'saved-src')
run('missing src', [gate, '--mode=refs-only'], 2)
(fixture / 'saved-src').rename(fixture / 'src')
run('final clean full', [gate, '--mode=full'])
run('initialize only disposable hook test repo', ['git', 'init', '--quiet'])
command = json.loads((fixture / '.codex/hooks.json').read_text())['hooks']['UserPromptSubmit'][0]['hooks'][0]['command']
p = run('declared hook command direct invocation', ['bash', '-c', command], cwd=fixture / 'src', stdin='{"prompt":"sanity"}')
assert '## §1' in json.loads(p.stdout)['hookSpecificOutput']['additionalContext']
hashes = json.loads((ev / 'preserved-hashes.json').read_text())
unchanged = all(hashlib.sha256((root / n).read_bytes()).hexdigest() == digest for n, digest in hashes.items())
assert unchanged
base = Path('<plugin>/skills/build')
identical = (generated / '.codex/hooks/inject-context.sh').read_bytes() == (base / 'assets/inject-context.sh').read_bytes()
assert identical
report = dict(test_fixture=str(fixture), tests=records, all_passed=True, preserved_originals=unchanged, injection_source_identical=identical, root_installation='blocked: .codex/.agents creation denied', runtime_hook_trust='pending; direct invocation only', initial_probe_correction='Initial test incorrectly expected [] payload to produce no output. Bundled source maps non-object JSON to empty prompt and injects both bodies. Corrected the test expectation after rereading source; no generated artifact patch.')
(ev / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(dict(test_fixture=str(fixture), tests=len(records), all_passed=True, preserved_originals=unchanged), ensure_ascii=False))
