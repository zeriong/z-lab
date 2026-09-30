from pathlib import Path
import subprocess,json,tempfile,shutil,hashlib,os
root=Path(__file__).resolve().parent.parent
results=[]
def run(label,args,expected=0,cwd=root,input=None,env=None):
 p=subprocess.run(args,cwd=cwd,input=input,text=True,capture_output=True,env=env)
 results.append({'check':label,'expected':expected,'exit':p.returncode,'stdout':p.stdout,'stderr':p.stderr})
 assert p.returncode==expected,(label,p.returncode,p.stdout,p.stderr)
 return p
for f in ['.codex/hooks/inject-context.sh','.codex/scripts/review-gate.sh']: run('bash syntax '+f,['bash','-n',f])
run('full gate',['.codex/scripts/review-gate.sh','--mode=full'])
run('refs only gate',['.codex/scripts/review-gate.sh','--mode=refs-only','--rule=no-literal-todo'])
for arg in ['--mode=invalid','--rule=unknown','--unknown']: run('invalid '+arg,['.codex/scripts/review-gate.sh',arg],2)
hook=str(root/'.codex/hooks/inject-context.sh')
p=run('normal injection from src',['bash',hook],cwd=root/'src',input=json.dumps({'prompt':'sanity'}))
context=json.loads(p.stdout)['hookSpecificOutput']['additionalContext']
assert '## §1' in context and '10. **Delivery:**' in context and 'HARNESS SETUP INCOMPLETE' not in context
for prompt in ['!skip','harness 빼고','without harness','skip harness','no harness','문서의 "skip harness" 문구 설명']:
 p=run('bypass '+prompt,['bash',hook],input=json.dumps({'prompt':prompt}))
 assert 'BYPASS MODE' in json.loads(p.stdout)['hookSpecificOutput']['additionalContext']
with tempfile.TemporaryDirectory(prefix='isolated-fixture-',dir=root/'.harness-build') as tmp:
 t=Path(tmp); (t/'.codex/scripts').mkdir(parents=True); (t/'src/nested').mkdir(parents=True)
 shutil.copy2(root/'.codex/scripts/review-gate.sh',t/'.codex/scripts/review-gate.sh')
 (t/'src/greet.js').write_text('export const ok = true;\n')
 run('separate fixture clean',['.codex/scripts/review-gate.sh','--mode=refs-only'],cwd=t)
 for ext in ['js','jsx','mjs','cjs']:
  sample=t/f'src/nested/untracked spaced name.{ext}'
  sample.write_text('// '+''.join(['TO','DO'])+' deliberate isolated sample\n')
  run('isolated violation '+ext,['.codex/scripts/review-gate.sh','--mode=refs-only'],1,cwd=t)
  sample.unlink()
 (t/'src/nested/broken.js').symlink_to(t/'missing')
 run('unreadable source fails closed',['.codex/scripts/review-gate.sh','--mode=refs-only'],2,cwd=t)
 (t/'src/nested/broken.js').unlink()
 (t/'src/nested/linked').symlink_to(t/'src',target_is_directory=True)
 run('symlink directory fails closed',['.codex/scripts/review-gate.sh','--mode=refs-only'],2,cwd=t)
 fake=t/'fake-bin'; fake.mkdir()
 interpreter=fake/'python3'; interpreter.write_text('#!/bin/sh\nexit 1\n'); interpreter.chmod(0o755)
 env=dict(os.environ,PATH=str(fake)+os.pathsep+os.environ['PATH'])
 run('interpreter start failure maps to exit 2',['.codex/scripts/review-gate.sh','--mode=refs-only'],2,cwd=t,env=env)
bundle=Path('<plugin>/skills/build/assets/inject-context.sh')
assert bundle.read_bytes()==Path(hook).read_bytes()
for p,h in json.loads((root/'.harness-build/original-sha256.json').read_text()).items(): assert hashlib.sha256((root/p).read_bytes()).hexdigest()==h,p
results.append({'check':'source, AGENTS, package, request unchanged and bundled hook byte identical','result':'PASS'})
(root/'.harness-build/validation.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('PASS:',len(results),'validation records')
