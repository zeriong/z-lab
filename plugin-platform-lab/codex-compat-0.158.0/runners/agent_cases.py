from pathlib import Path
import json, os, shutil, subprocess, sys, time

base=Path(os.environ['BIN_COMPAT_WORKDIR'])
repo=Path.cwd();lab=(repo/'../z-lab').resolve()
case=sys.argv[1]
suffix=sys.argv[2] if len(sys.argv)>2 else ''
meta={'plan':('plan-smith','1.7.0'),'harness':('harness','1.2.0'),'audit':('claude-x-codex','0.2.0'),'ui':('ux-ui','1.3.0')}
name,version=meta[case];exp=lab/f'{name}-lab/codex-compat-{version}{suffix}';plugin=exp/'subject'/name;fixture=base/(case+suffix)
out=exp/'runs'/case
if (out/'DONE').exists():print('SKIP completed',case);sys.exit(0)
if out.exists():raise SystemExit('Incomplete record exists; inspect live process before restarting')
out.mkdir(parents=True)
if case=='plan':
 (fixture/'source.txt').write_text('A local single-user note app; records have title and body. No synchronization or concurrent writers.\n')
 prompt=f'''Use the real plan-smith forge skill at {plugin}/skills/forge/SKILL.md. Task: choose a JSON file or SQLite for this tiny offline note app. I confirm the goal is a concise decision document, implementation is by a human, constraints are one local user and no synchronization or concurrency, rejected alternative is a hosted database, and style is opus (writing style only). These essentials are already approved; record them in the packet and proceed without asking again. Choose an appropriate frame and record why. Read source.txt. Execute the actual isolated-writer route in the Codex adapter; do not write the plan yourself. Keep the plan under 1500 words. Do not implement app code or commit. Report writer evidence and paths. Do not edit source.txt or the plugin.'''
elif case=='harness':
 (fixture/'src').mkdir(exist_ok=True)
 (fixture/'src/greet.js').write_text('export function greet(name) { return `Hello, ${name}`; }\n')
 (fixture/'package.json').write_text(json.dumps({'name':'compat-fixture','private':True,'type':'module','scripts':{'lint':'node --check src/greet.js','typecheck':'node --check src/greet.js'}}))
 prompt=f'''Use the real harness build skill at {plugin}/skills/build/SKILL.md to generate a Codex harness in this fixture. Intake is already confirmed: npm, single package, lint=npm run lint, typecheck=npm run typecheck, user rule=no literal TODO marker in src JavaScript files. Derive that one rule from my request and cite src/greet.js; do not invent extra rules. Use the bundled workflow and injection source. Preserve source and existing AGENTS.md. Do not install packages, stage, commit, or edit plugin sources. Complete the real two independent reviews and direct verification; runtime hook trust is pending and must be reported separately. Any deliberately violating test sample must stay in a separate disposable fixture. Finish with generated paths and actual validation evidence.'''
elif case=='audit':
 (fixture/'.codex').mkdir(exist_ok=True)
 (fixture/'.codex/hooks.json').write_text(json.dumps({'hooks':{'UserPromptSubmit':[{'hooks':[{'type':'command','command':'echo CODEX-FIXTURE'}]}]}}))
 (fixture/'.claude').mkdir(exist_ok=True)
 (fixture/'.claude/settings.json').write_text(json.dumps({'hooks':{'UserPromptSubmit':[{'hooks':[{'type':'command','command':'echo CLAUDE-FIXTURE'}]}]}}))
 prompt=f'''Use the real audit skill at {plugin}/skills/audit/SKILL.md on this fixture. Run the bundled source script, interpret the two hosts' hook coverage and uncommitted context. Do not change configuration. Only the skill's audit artifact and git exclude addition are authorized. Then read {plugin}/skills/run/SKILL.md and its Codex host reference and report which vendor reviews a Codex main author's work. This second part is an explanation, not an orchestration request; do not start workers. Report absolute script path used and actual evidence.'''
else:
 prompt=f'''Read the real UX/UI build skill at {plugin}/skills/build/SKILL.md and its Codex host adapter. Perform only the independent art-director review stage on the measurement fixture .ux-ui/measure/missing. User requested this limited review. Dispatch an independent read-only reviewer with the real agent definition and rubric. The fixture has no screenshots, so follow the actual missing-measurement protocol. Do not implement or capture a UI, stage, commit, change source, or write approval. Return the actual reviewer verdict and evidence of independent dispatch.'''
 m=fixture/'.ux-ui/measure/missing';m.mkdir(parents=True)
 (m/'context.md').write_text('A button UI on a local web page. No screenshots have been captured.\n')
 (m/'snapshots.md').write_text('No captured states.\n');(m/'signals.md').write_text('No measurements available.\n')
(fixture/'request.txt').write_text(prompt)
cmd=['codex','exec','--ignore-user-config','--ephemeral','--json','-s',('danger-full-access' if suffix else 'workspace-write'),'-c','features.hooks=false','-c','agents.enabled=true','-C',str(fixture),'-']
raw=base/(case+suffix+'-raw.jsonl');err=base/(case+suffix+'-stderr.txt')
start=time.monotonic()
with raw.open('w') as stdout,err.open('w') as stderr:
 p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=stdout,stderr=stderr,text=True)
 (base/(case+suffix+'-pid')).write_text(str(p.pid))
 p.stdin.write(prompt);p.stdin.close()
 print(case,'pid',p.pid,flush=True)
 rc=p.wait()
def scrub(s):
 for a,b in [(str(plugin),'<plugin>'),(str(fixture),'<fixture>'),(str(repo),'<repo>'),(str(lab),'<lab>'),(str(base),'<temp>'),(str(Path.home()),'<home>')]:s=s.replace(a,b)
 return s
(out/'prompt.txt').write_text(scrub(prompt))
(out/'events.jsonl').write_text(scrub(raw.read_text()))
(out/'stderr.txt').write_text(scrub(err.read_text()))
usage=[]
for line in raw.read_text().splitlines():
 try:d=json.loads(line)
 except ValueError:continue
 if d.get('usage'):usage.append(d['usage'])
(out/'metrics.json').write_text(json.dumps({'exit':rc,'elapsed_ms':round((time.monotonic()-start)*1000),'usage':usage,'attempt':'one-shot'},indent=2)+'\n')
for f in fixture.rglob('*'):
 if f.is_file() and '.git' not in f.parts and f.name!='request.txt':
  rel=f.relative_to(fixture);dest=out/'specimen'/rel;dest.parent.mkdir(parents=True,exist_ok=True)
  try:dest.write_text(scrub(f.read_text()))
  except UnicodeError:shutil.copy2(f,dest)
(out/'DONE').write_text(str(rc)+'\n')
print(case,'exit',rc,'elapsed',round(time.monotonic()-start),flush=True)
