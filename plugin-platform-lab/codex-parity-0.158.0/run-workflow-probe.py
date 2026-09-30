from pathlib import Path
import hashlib,json,os,re,shutil,subprocess,tempfile,time
repo=Path.cwd();out=(repo/'../z-lab/harness-lab/codex-parity-1.2.0/runs/workflow').resolve()
if (out/'DONE').exists():raise SystemExit('SKIP completed')
if out.exists():raise SystemExit('Incomplete run exists; inspect before resuming')
out.mkdir(parents=True);fixture=Path(tempfile.mkdtemp(prefix='bin-parity-workflow-')).resolve();subprocess.run(['git','init','-q',str(fixture)],check=True)
(fixture/'AGENTS.md').write_text('Generate only the requested workflow document. No application source edits or git mutations.\n')
resources={n:(repo/'plugins/harness/skills/build/references'/n).read_text() for n in ['workflow.md','host-codex.md']}
(out/'inputs').mkdir()
for n,s in resources.items():(out/'inputs'/n).write_text(s)
prompt='''Render only the generated harness-engineering skill from the two actual bundled references below for a Codex project. This is a narrow document-generation probe, not a request to build an entire harness or run its implementation workflow. Write draft/harness-engineering/SKILL.md; do not create protected directories. Target installed paths are .agents/skills/project-rules/SKILL.md, .agents/skills/harness-engineering/SKILL.md and .codex/scripts/review-gate.sh. No project-specific rules need to be invented. The main session model is gpt-6-astra and reasoning effort xhigh; default the role settings to these, retain all four explicit HARNESS_CODEX_* overrides. This fixture only has the CLI route for future reviewers: embed the concrete fresh read-only command for each role and the JSON shape. Include the eleven workflow phases, gate exits, scoring threshold, regression cap, and bypass. The generated skill must be self-contained with no references to this builder or its Phase 6.2. Do not dispatch reviewers now, change user configuration, create approvals, or commit. Report the written path only.\n\n'''+''.join('\n## '+n+'\n'+s for n,s in resources.items())
cmd=['codex','exec','--ignore-user-config','--ephemeral','--json','-s','workspace-write','-c','features.hooks=false','-C',str(fixture),'-']
start=time.monotonic()
with (fixture/'events.jsonl').open('w') as stdout,(fixture/'stderr.txt').open('w') as stderr:
 p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=stdout,stderr=stderr,text=True,env={**os.environ,'CXC_MODE':'off'});print('pid',p.pid,flush=True);p.stdin.write(prompt);p.stdin.close();rc=p.wait()
def scrub(s):
 for a,b in [(str(fixture),'<fixture>'),(str(repo),'<repo>'),(str(Path.home()),'<home>')]:s=s.replace(a,b)
 return re.sub(r'(?:/private)?/var/folders/[^/\s]+/[^/\s]+/T/','<temp-root>/',s)
usage=[]
raw=(fixture/'events.jsonl').read_text()
for line in raw.splitlines():
 try:d=json.loads(line)
 except ValueError:continue
 if d.get('usage'):usage.append(d['usage'])
for n,s in [('events.jsonl',raw),('stderr.txt',(fixture/'stderr.txt').read_text()),('prompt.txt',prompt),('command.json',json.dumps(cmd))]:(out/n).write_text(scrub(s))
for f in (fixture/'draft').rglob('*'):
 if f.is_file():
  d=out/'specimen'/f.relative_to(fixture);d.parent.mkdir(parents=True,exist_ok=True);d.write_text(scrub(f.read_text()))
(out/'metrics.json').write_text(json.dumps({'exit':rc,'elapsed_ms':round((time.monotonic()-start)*1000),'usage':usage,'attempt':'one-shot','source_sha256':{n:hashlib.sha256(s.encode()).hexdigest() for n,s in resources.items()}},indent=2)+'\n');(out/'DONE').write_text(str(rc)+'\n');print('complete',rc,flush=True)
