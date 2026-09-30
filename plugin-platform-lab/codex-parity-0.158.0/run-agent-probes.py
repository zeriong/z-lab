from pathlib import Path
import json,os,re,shutil,subprocess,sys,tempfile,time
repo=Path.cwd();lab=(repo/'../z-lab').resolve();case=sys.argv[1]
meta={'plan':('plan-smith','1.7.0'),'hook':('harness','1.2.0'),'web':('ux-ui','1.3.0'),'mobile':('ux-ui','1.3.0')};name,version=meta[case];exp=lab/f'{name}-lab/codex-parity-{version}';out=exp/'runs'/case
if (out/'DONE').exists():raise SystemExit('SKIP completed')
if out.exists():raise SystemExit('Incomplete run exists; inspect it before resuming')
out.mkdir(parents=True);plugin=exp/'subject'/name
if not plugin.exists():shutil.copytree(repo/'plugins'/name,plugin)
fixture=Path(tempfile.mkdtemp(prefix='bin-parity-'+case+'-')).resolve();subprocess.run(['git','init','-q',str(fixture)],check=True)
(fixture/'AGENTS.md').write_text('Do not commit. Do not change application sources. Work only on the explicitly requested planning/review artifact.\n')
env={**os.environ,'CXC_MODE':'off'}
if case=='plan':
 (fixture/'source.txt').write_text('A local offline note app for one person; title and body records, no sync and no concurrency.\n')
 env.update(PLAN_SMITH_CODEX_MODEL='gpt-6-astra',PLAN_SMITH_CODEX_EFFORT='xhigh')
 prompt=f'''Use the actual plan-smith forge skill at {plugin}/skills/forge/SKILL.md for a short decision plan: JSON file versus SQLite for this offline single-user note app. I confirm the task, no sync/concurrency, human implementer, rejected hosted database, frame=backward and style=opus. These inputs are already approved; do not ask again. Keep the plan under 250 words. Execute the real isolated writer route; the main agent must not write the plan itself. Honor the configured PLAN_SMITH_CODEX_MODEL/EFFORT; record effective values. Read source.txt. Do not implement application code or commit. Report the packet, plan and independent dispatch evidence.'''
elif case=='hook':
 skills=fixture/'.agents/skills'
 for n in ['project-rules','harness-engineering']:
  p=skills/n/'SKILL.md';p.parent.mkdir(parents=True);p.write_text(f'---\nname: {n}\ndescription: fixture\n---\n\n## {n} READ_ONLY_PROBE\n')
 subprocess.run(['python3',str(plugin/'skills/build/scripts/install-hooks.py'),'--project',str(fixture),'--host','codex'],check=True,capture_output=True)
 prompt='''You are reviewing a generated harness. Run exactly this command once: printf '%s' '{"prompt":"sanity"}' | bash .codex/hooks/inject-context.sh . Report whether both READ_ONLY_PROBE skill bodies reached additionalContext and the command exit code. Do not create files, fix anything, call other reviewers, or commit. This is only a direct source-hook check in your read-only sandbox, not runtime hook trust verification.'''
else:
 measure=fixture/'.ux-ui/measure/probe';measure.mkdir(parents=True)
 if case=='web':
  html=fixture/'screen.html';html.write_text('<!doctype html><meta charset="utf-8"><title>Review fixture</title><style>body{font:16px sans-serif;background:#fff;color:#aaa}button{width:24px;height:18px;font-size:8px}main{width:220px;overflow:hidden}</style><main><h1>Account</h1><p>550e8400-e29b-41d4-a716-446655440000</p><button>Save</button></main>')
  chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  result=subprocess.run([chrome,'--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--user-data-dir='+str(fixture/'chrome-profile'),'--screenshot='+str(measure/'default__desktop.png'),'--window-size=1440,900',html.as_uri()],capture_output=True,text=True,timeout=45)
  (out/'capture.json').write_text(json.dumps({'exit':result.returncode,'screenshot_exists':(measure/'default__desktop.png').exists()}))
  if result.returncode or not (measure/'default__desktop.png').exists():raise RuntimeError('Chrome capture failed')
  (measure/'context.md').write_text('Web account screen, real Chrome CLI render, default desktop only. No other states captured. Limited independent review, not a complete measurement package.\n')
 else:(measure/'context.md').write_text('React Native screen; no device is booted and no screenshots exist. Limited independent review.\n')
 (measure/'signals.md').write_text('No accessibility, network or console audit was performed.\n');(measure/'snapshots.md').write_text('No structure snapshot captured.\n')
 skill='build' if case=='web' else 'build-mobile';agent='ux-ui-art-director' if case=='web' else 'ux-ui-mobile-art-director';env.update(UX_UI_CODEX_REVIEW_MODEL='gpt-6-astra',UX_UI_CODEX_REVIEW_EFFORT='xhigh')
 prompt=f'''You are reviewing measured UI. Read the actual {plugin}/skills/{skill}/SKILL.md, its Codex adapter, and the role body at {plugin}/agents/{agent}.md plus its rubric. Perform only the art-director review on .ux-ui/measure/probe. You ARE the separate read-only reviewer process, so do not dispatch another reviewer. Open any actual screenshots with the image tool. Follow the real missing-measurement protocol. Do not capture new screens, edit source, create approval, or commit. Return the normal exact verdict format and what artifacts you actually inspected.'''
(fixture/'request.txt').write_text(prompt)
cmd=['codex','exec','--ignore-user-config','--ephemeral','--json','-s','workspace-write' if case=='plan' else 'read-only','-c','features.hooks=false','-c','agents.enabled=true','-C',str(fixture),'-']
start=time.monotonic();raw=fixture/'events.jsonl';err=fixture/'stderr.txt'
with raw.open('w') as stdout,err.open('w') as stderr:
 p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=stdout,stderr=stderr,text=True,env=env);print(case,'pid',p.pid,'fixture',fixture,flush=True);p.stdin.write(prompt);p.stdin.close();rc=p.wait()
def scrub(s):
 for a,b in [(str(plugin),'<plugin>'),(str(fixture),'<fixture>'),(str(repo),'<repo>'),(str(lab),'<lab>'),(str(Path.home()),'<home>')]:s=s.replace(a,b)
 return re.sub(r'(?:/private)?/var/folders/[^/\s]+/[^/\s]+/T/','<temp-root>/',s)
usage=[]
for line in raw.read_text().splitlines():
 try:d=json.loads(line)
 except ValueError:continue
 if d.get('usage'):usage.append(d['usage'])
(out/'events.jsonl').write_text(scrub(raw.read_text()));(out/'stderr.txt').write_text(scrub(err.read_text()));(out/'prompt.txt').write_text(scrub(prompt));(out/'command.json').write_text(scrub(json.dumps(cmd)))
for f in fixture.rglob('*'):
 if not f.is_file() or any(x in f.parts for x in ['.git','chrome-profile']):continue
 if f.name in ['events.jsonl','stderr.txt','request.txt']:continue
 dest=out/'specimen'/f.relative_to(fixture);dest.parent.mkdir(parents=True,exist_ok=True)
 try:dest.write_text(scrub(f.read_text()))
 except UnicodeError:shutil.copy2(f,dest)
(out/'metrics.json').write_text(json.dumps({'exit':rc,'elapsed_ms':round((time.monotonic()-start)*1000),'usage':usage,'attempt':'one-shot','model_overrides':{k:v for k,v in env.items() if k.startswith(('PLAN_SMITH_','UX_UI_CODEX_'))}},indent=2)+'\n');(out/'DONE').write_text(str(rc)+'\n');print(case,'complete',rc,flush=True)
