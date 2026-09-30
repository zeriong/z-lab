from pathlib import Path
import hashlib,json,shutil,subprocess,tempfile,time
repo=Path.cwd();exp=(repo/'../z-lab/harness-lab/codex-bypass-1.2.0').resolve()
for arm,source in [('before',exp/'before-inject-context.sh'),('after',repo/'plugins/harness/skills/build/assets/inject-context.sh')]:
 out=exp/arm
 if (out/'DONE').exists():continue
 if out.exists():raise SystemExit('Incomplete arm exists')
 out.mkdir();shutil.copy2(source,out/'inject-context.sh');rows=[];start=time.monotonic()
 with tempfile.TemporaryDirectory(prefix='bin-bypass-') as tmp:
  root=Path(tmp)
  for host in ['claude','codex']:
   agent=root/('.'+host);hook=agent/'hooks/inject-context.sh';hook.parent.mkdir(parents=True);shutil.copy2(source,hook)
   skills=root/'.agents/skills' if host=='codex' else agent/'skills'
   for name,body in [('project-rules','RULE_SENTINEL'),('harness-engineering','WORKFLOW_SENTINEL')]:
    p=skills/name/'SKILL.md';p.parent.mkdir(parents=True,exist_ok=True);p.write_text('---\nname: '+name+'\ndescription: fixture\n---\n\n'+body+'\n')
   cases=[('normal','implement'),*[('bypass',s) for s in ['!skip','harness 빼고 해줘','without harness','SKIP HARNESS','no harness']],('missing','!skip')]
   for kind,prompt in cases:
    if kind=='missing':(skills/'project-rules/SKILL.md').unlink()
    t=time.monotonic();r=subprocess.run(['bash',str(hook)],input=json.dumps({'prompt':prompt}),text=True,capture_output=True)
    c=json.loads(r.stdout)['hookSpecificOutput']['additionalContext'];passed=r.returncode==0
    if kind=='normal':passed &= 'RULE_SENTINEL' in c and 'WORKFLOW_SENTINEL' in c
    elif kind=='bypass':passed &= 'RULE_SENTINEL' in c and 'WORKFLOW_SENTINEL' not in c and 'BYPASS MODE' in c
    else:passed &= 'HARNESS SETUP INCOMPLETE' in c and 'BYPASS MODE' in c
    rows.append({'host':host,'kind':kind,'prompt':prompt,'exit':r.returncode,'stdout':r.stdout.replace(tmp,'<fixture>'),'stderr':r.stderr.replace(tmp,'<fixture>'),'passed':bool(passed),'elapsed_ms':round((time.monotonic()-t)*1000)})
 (out/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');(out/'metrics.json').write_text(json.dumps({'elapsed_ms':round((time.monotonic()-start)*1000),'tokens':None,'passed':sum(r['passed'] for r in rows),'total':len(rows),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'attempt':'one-shot'},indent=2)+'\n');(out/'DONE').write_text('complete\n');print(arm,sum(r['passed'] for r in rows),len(rows))
