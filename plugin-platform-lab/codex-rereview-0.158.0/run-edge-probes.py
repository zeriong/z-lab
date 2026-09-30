from pathlib import Path
import hashlib,json,os,shutil,subprocess,sys,tempfile,time
repo=Path.cwd();exp=(repo/'../z-lab/plugin-platform-lab/codex-rereview-0.158.0').resolve();arm=sys.argv[1];out=exp/arm
if (out/'DONE').exists():raise SystemExit('SKIP completed')
if out.exists():raise SystemExit('incomplete output exists')
out.mkdir();source=exp/'before/ux-ui/scripts/ui-commit-gate.sh' if arm=='before-probes' else repo/'plugins/ux-ui/scripts/ui-commit-gate.sh';rows=[];start=time.monotonic()
def run(cmd,cwd,payload=None):return subprocess.run(cmd,cwd=cwd,input=payload,text=True,capture_output=True,env={**os.environ,'CLAUDE_PROJECT_DIR':''})
with tempfile.TemporaryDirectory(prefix='bin-rereview-') as tmp:
 root=Path(tmp)
 for n,case in enumerate(['glob-shadow','unicode','spaces','newline','brackets','other-repo']):
  p=root/str(n);p.mkdir();run(['git','init','-q'],p).check_returncode()
  if case=='glob-shadow':(p/'other.tsx').write_text('untracked shadow');name='src/actual.tsx'
  elif case=='unicode':name='src/화면.tsx'
  elif case=='spaces':name='src/my screen.tsx'
  elif case=='newline':name='src/line\nbreak.tsx'
  elif case=='brackets':name='src/[id].tsx'
  else:name='screen.tsx'
  f=p/name;f.parent.mkdir(exist_ok=True,parents=True);f.write_text('<p>one</p>');run(['git','--literal-pathspecs','add','--',name],p).check_returncode()
  hash1=run(['bash',str(source),'hash'],p);app=run(['bash',str(source),'approve','probe'],p)
  f.write_text('<p>two</p>');run(['git','--literal-pathspecs','add','--',name],p).check_returncode();hash2=run(['bash',str(source),'hash'],p)
  cwd=p;cmd='git commit -m probe'
  if case=='other-repo':
   cwd=root/'caller';cwd.mkdir();run(['git','init','-q'],cwd).check_returncode();cmd='git -C '+str(p)+' commit -m probe'
  payload=json.dumps({'cwd':str(cwd),'tool_input':{'command':cmd}});hook=run(['bash',str(source)],cwd,payload)
  passed=bool(hash1.stdout.strip()) and hash1.stdout!=hash2.stdout and hook.returncode==2
  rows.append({'case':case,'passed':passed,'hash_before':hash1.stdout.strip(),'hash_after':hash2.stdout.strip(),'approve_exit':app.returncode,'hook_exit':hook.returncode,'stderr':hook.stderr.replace(tmp,'<fixture>'),'command':cmd.replace(tmp,'<fixture>')})
(out/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');(out/'metrics.json').write_text(json.dumps({'elapsed_ms':round((time.monotonic()-start)*1000),'passed':sum(r['passed'] for r in rows),'cases':len(rows),'tokens':None,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest()},indent=2)+'\n');(out/'DONE').write_text('complete\n')
print(json.dumps(rows,ensure_ascii=False))
