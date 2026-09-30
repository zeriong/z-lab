from pathlib import Path
import json,os,shutil,subprocess,tempfile,time
repo=Path.cwd().resolve();exp=(repo/'../z-lab/plugin-platform-lab/codex-rereview-0.158.0').resolve();out=exp/'native-install'
if (out/'DONE').exists():raise SystemExit('SKIP completed')
if out.exists():raise SystemExit('incomplete output exists')
(exp/'INSTALL-REPEAT-SPEC.md').write_text('''# Native installer repeat probe\n\nFrozen before execution, 2026-09-30. Run the real install.sh with --host codex --all twice against a disposable local marketplace copy. Direct the child CLI to a disposable Codex configuration home, retaining no account credentials and making no changes to the real user configuration. No model calls, MCP startup, commits or publication. Capture both outputs, exits and elapsed time. First install and repeat must preserve a usable four-plugin registration or report an actionable failure. This local-source test does not prove remote network behavior.\n''')
out.mkdir();start=time.monotonic();rows=[]
with tempfile.TemporaryDirectory(prefix='bin-native-install-') as tmp:
 root=Path(tmp);market=root/'marketplace';market.mkdir();(market/'.claude-plugin').mkdir();shutil.copy2(repo/'.claude-plugin/marketplace.json',market/'.claude-plugin/marketplace.json');shutil.copytree(repo/'plugins',market/'plugins')
 # CODEX_HOME is used for its defined purpose: isolate this child CLI's configuration.
 probe_home=root/'codex-config';probe_home.mkdir()
 env={**os.environ,'CODEX_HOME':str(probe_home),'BIN_REPO_URL':str(market)}
 for attempt in [1,2]:
  t=time.monotonic();r=subprocess.run(['bash',str(repo/'install.sh'),'--host','codex','--all'],cwd=root,env=env,stdin=subprocess.DEVNULL,text=True,capture_output=True,timeout=45)
  rows.append({'attempt':attempt,'exit':r.returncode,'elapsed_ms':round((time.monotonic()-t)*1000),'stdout':r.stdout.replace(tmp,'<fixture>').replace(str(repo),'<repo>'),'stderr':r.stderr.replace(tmp,'<fixture>').replace(str(repo),'<repo>')})
(out/'results.json').write_text(json.dumps(rows,indent=2)+'\n');(out/'metrics.json').write_text(json.dumps({'elapsed_ms':round((time.monotonic()-start)*1000),'tokens':None,'passed':sum(r['exit']==0 for r in rows),'cases':len(rows)},indent=2)+'\n');(out/'DONE').write_text('complete\n')
print(json.dumps(rows))
