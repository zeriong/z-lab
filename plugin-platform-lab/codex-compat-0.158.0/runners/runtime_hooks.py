from pathlib import Path
import json,os,subprocess,sys,tempfile,time
repo=Path.cwd();base=Path(os.environ['BIN_COMPAT_WORKDIR'])
case=sys.argv[1]; variant=sys.argv[2] if len(sys.argv)>2 else ''; plugin=repo/'plugins'/('claude-x-codex' if case=='mode' else 'ux-ui')
exp=repo/'../z-lab'/('claude-x-codex-lab/codex-compat-0.2.0' if case=='mode' else 'ux-ui-lab/codex-compat-1.3.0')
if variant=='-json': exp=repo/'../z-lab/claude-x-codex-lab/codex-mode-json-0.2.0'
out=exp/'runs'/('runtime-'+case+variant)
if (out/'DONE').exists():raise SystemExit('Already completed')
out.mkdir(parents=True,exist_ok=False)
fixture=Path(tempfile.mkdtemp(prefix='bin-runtime-hook-'));subprocess.run(['git','init','-q',str(fixture)],check=True)
if case=='mode':
 if variant:
  (fixture/'.claude-x-codex').mkdir();(fixture/'.claude-x-codex/mode').write_text('mode=on\n')
 event='UserPromptSubmit';command='bash '+json.dumps(str(plugin/'hooks/mode-context.sh'))
 prompt='Without using tools, report whether the injected context contains [claude-x-codex: ON]. Reply only ON_PRESENT or ABSENT. This is a question, not an implementation task.'
 hook={'hooks':[{'type':'command','command':command}]}
else:
 (fixture/'screen.html').write_text('<main>Fixture</main>');subprocess.run(['git','-C',str(fixture),'add','screen.html'],check=True)
 event='PreToolUse';command='bash '+json.dumps(str(plugin/'scripts/ui-commit-gate.sh'))
 prompt='Run exactly git commit --dry-run once using your shell tool, then report whether a pre-tool hook blocked it. Do not attempt a real commit, do not approve the diff, do not modify files, and do not retry or bypass a refusal. The dry-run would never create a commit.'
 hook={'matcher':'Bash','hooks':[{'type':'command','command':command}]}
def toml(v):
 if isinstance(v,str):return json.dumps(v)
 if isinstance(v,list):return '['+','.join(map(toml,v))+']'
 return '{'+','.join(k+'='+toml(x) for k,x in v.items())+'}'
cmd=['codex','exec','--ignore-user-config','--ephemeral','--json','--dangerously-bypass-hook-trust','-s','read-only','-c','features.hooks=true','-c',f'hooks.{event}='+toml([hook]),'-C',str(fixture),'-']
# All hook source was read and vetted above. This flag is invocation-local and changes no persisted trust.
start=time.monotonic();raw=base/(case+variant+'-hook-raw.jsonl');err=base/(case+variant+'-hook-err.txt')
with raw.open('w') as stdout,err.open('w') as stderr:
 p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=stdout,stderr=stderr,text=True,env={**os.environ,'CXC_MODE':'on','CLAUDE_PLUGIN_ROOT':str(plugin),'CLAUDE_PROJECT_DIR':''})
 print(case,'pid',p.pid,flush=True);p.stdin.write(prompt);p.stdin.close();rc=p.wait()
def scrub(s):
 for a,b in [(str(fixture),'<fixture>'),(str(repo),'<repo>'),(str(base),'<temp>'),(str(Path.home()),'<home>')]:s=s.replace(a,b)
 return s
(out/'prompt.txt').write_text(prompt);(out/'command.json').write_text(scrub(json.dumps(cmd)))
(out/'events.jsonl').write_text(scrub(raw.read_text()));(out/'stderr.txt').write_text(scrub(err.read_text()))
usage=[]
for l in raw.read_text().splitlines():
 try:d=json.loads(l)
 except ValueError:continue
 if d.get('usage'):usage.append(d['usage'])
(out/'metrics.json').write_text(json.dumps({'exit':rc,'elapsed_ms':round((time.monotonic()-start)*1000),'usage':usage,'real_commit_created':subprocess.run(['git','rev-parse','--verify','HEAD'],cwd=fixture,capture_output=True).returncode==0},indent=2))
(out/'DONE').write_text(str(rc));print(case,'exit',rc,flush=True)
