from pathlib import Path
import json,os,subprocess,tempfile,time
repo=Path.cwd();base=Path(os.environ['BIN_COMPAT_WORKDIR']);exp=repo/'../z-lab/claude-x-codex-lab/codex-mode-json-0.2.0';plugin=(exp/'subject/claude-x-codex').resolve()
for mode in ['on','off']:
 out=exp/'runs'/('claude-'+mode)
 if (out/'DONE').exists():continue
 out.mkdir(parents=True,exist_ok=False);fixture=Path(tempfile.mkdtemp(prefix='bin-claude-hook-'))
 subprocess.run(['git','init','-q',str(fixture)],check=True)
 prompt='Without using tools, report whether the injected context contains [claude-x-codex: ON]. Reply only ON_PRESENT or ABSENT. This is a question, not an implementation task.'
 args=['claude','-p',prompt,'--plugin-dir',str(plugin),'--setting-sources','project','--tools','','--max-turns','1','--output-format','json']
 start=time.monotonic();r=subprocess.run(args,cwd=fixture,capture_output=True,text=True,env={**os.environ,'CXC_MODE':mode})
 s=r.stdout.replace(str(Path.home()),'<home>').replace(str(fixture),'<fixture>')
 (out/'result.json').write_text(s);(out/'stderr.txt').write_text(r.stderr.replace(str(Path.home()),'<home>').replace(str(fixture),'<fixture>'))
 d=json.loads(r.stdout) if r.stdout else {}
 (out/'metrics.json').write_text(json.dumps({'exit':r.returncode,'elapsed_ms':round((time.monotonic()-start)*1000),'usage':d.get('usage'),'result':d.get('result')},indent=2))
 (out/'DONE').write_text(str(r.returncode));print(mode,r.returncode,d.get('result'),flush=True)
