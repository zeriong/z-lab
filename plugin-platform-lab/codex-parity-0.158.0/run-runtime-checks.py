from pathlib import Path
import argparse, hashlib, html, json, re, selectors, shutil, subprocess, tempfile, time, urllib.parse
import yaml
parser=argparse.ArgumentParser();parser.add_argument('repo',type=Path);parser.add_argument('out',type=Path);args=parser.parse_args();repo=args.repo.resolve();out=args.out.resolve();out.mkdir(exist_ok=True,parents=True)
if (out/'DONE').exists():raise SystemExit('SKIP completed')
start=time.monotonic();temp=Path(tempfile.mkdtemp(prefix='bin-final-')).resolve();subprocess.run(['git','init','-q',str(temp)],check=True)
def scrub(s):
 for p,label in [(str(repo),'<repo>'),(str(temp),'<temp>'),(str(Path.home()),'<home>')]:s=s.replace(p,label)
 return s
def save(name,data):
 s=data if isinstance(data,str) else json.dumps(data,ensure_ascii=False,indent=2)+'\n'
 (out/name).write_text(scrub(s))
checks=[]
def command(label,cmd):
 t=time.monotonic();r=subprocess.run(cmd,cwd=repo,capture_output=True,text=True);checks.append({'check':label,'exit':r.returncode,'elapsed_ms':round((time.monotonic()-t)*1000),'stdout':r.stdout,'stderr':r.stderr});return r
catalog=json.loads((repo/'.claude-plugin/marketplace.json').read_text());(temp/'.claude-plugin').mkdir();(temp/'.claude-plugin/marketplace.json').write_text(json.dumps(catalog));shutil.copytree(repo/'plugins',temp/'plugins',ignore=shutil.ignore_patterns('__pycache__'))
shutil.copytree(repo/'plugins/claude-x-codex/skills/mode',temp/'.agents/skills/cxc-mode')
# This local read uses only temporary plugin folders plus the marketplace catalog.
p=subprocess.Popen(['codex','app-server'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,bufsize=1,cwd=temp)
sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ)
def request(i,method,params):
 p.stdin.write(json.dumps({'id':i,'method':method,'params':params})+'\n');p.stdin.flush();deadline=time.monotonic()+40
 while time.monotonic()<deadline:
  if not sel.select(1):continue
  line=p.stdout.readline()
  if not line:raise RuntimeError('app-server ended')
  d=json.loads(line)
  if d.get('id')==i:
   if 'error' in d:raise RuntimeError(d)
   return d
 raise TimeoutError(method)
try:
 request(1,'initialize',{'clientInfo':{'name':'compat-check','version':'1.0'},'capabilities':{'experimentalApi':True}})
 p.stdin.write('{"method":"initialized"}\n');p.stdin.flush()
 for i,entry in enumerate(catalog['plugins'],2):
  d=request(i,'plugin/read',{'marketplacePath':str(temp/'.claude-plugin/marketplace.json'),'pluginName':entry['name']});save(entry['name']+'-runtime.json',d)
  plug=d['result']['plugin'];assert plug['summary']['localVersion']==entry['version'];assert plug['skills']
  if entry['name']=='ux-ui':assert sorted(plug['mcpServers'])==['chrome-devtools','flutter','ios-simulator','mobile-mcp'];assert len(plug['hooks'])==1
  if entry['name']=='claude-x-codex':assert len(plug['hooks'])==1
 d=request(10,'skills/list',{'cwds':[str(temp)],'forceReload':True})
 entries=d['result']['data'];fixture=next(x for x in entries if x['cwd']==str(temp));modes=[s for s in fixture['skills'] if s['path'].startswith(str(temp))];save('mode-discovery.json',{'skills':modes,'errors':fixture['errors']});assert len(modes)==1 and modes[0]['enabled'];assert not fixture['errors']
finally:
 p.terminate();p.wait(timeout=10)
for path in ['.','plugins/plan-smith','plugins/harness','plugins/ux-ui','plugins/claude-x-codex']:command('claude validate '+path,['claude','plugin','validate',path])
command('compatibility tests',['python3','-m','unittest','discover','-s','tests','-v'])
command('plan split self-test',['python3','plugins/plan-smith/scripts/split-check.py','--self-test'])
for script in [repo/'install.sh',*repo.glob('plugins/**/*.sh')]:command('bash syntax '+str(script.relative_to(repo)),['bash','-n',str(script)])
frontmatter=[]
for skill in repo.glob('plugins/**/SKILL.md'):
 body=skill.read_text();meta=yaml.safe_load(body.split('---',2)[1]);assert isinstance(meta['description'],str);frontmatter.append(str(skill.relative_to(repo)))
links=[];failures=[]
def anchors(path):
 s=path.read_text();result=set();counts={}
 for heading in re.findall(r'^#{1,6}\s+(.+?)\s*#*$',s,re.M):
  heading=re.sub(r'\[([^]]+)\]\([^)]+\)',r'\1',heading);heading=re.sub(r'<[^>]*>','',heading);slug=re.sub(r'[^\w\- ]','',html.unescape(heading).lower()).replace(' ','-');n=counts.get(slug,0);counts[slug]=n+1;result.add(slug+(('-'+str(n)) if n else ''))
 result.update(re.findall(r'<(?:a|h\d)[^>]*(?:id|name)="([^"]+)"',s))
 return result
for readme in [*repo.glob('README*.md'),*repo.glob('plugins/*/README*.md')]:
 targets=re.findall(r'\]\(([^)]+)\)',readme.read_text())+re.findall(r'(?:href|src)="([^"]+)"',readme.read_text())
 for target in targets:
  if re.match(r'^[a-zA-Z][\w+.-]*:',target):continue
  target=urllib.parse.unquote(target);p,_,anchor=target.partition('#');dest=(readme.parent/p).resolve() if p else readme
  err=None
  if not dest.exists():err='missing path'
  elif anchor and dest.suffix=='.md' and anchor not in anchors(dest):err='missing anchor'
  links.append({'file':str(readme.relative_to(repo)),'target':target,'error':err})
  if err:failures.append(links[-1])
versions=[]
for entry in catalog['plugins']:
 name,version=entry['name'],entry['version'];ps=[repo/f'plugins/{name}/.claude-plugin/plugin.json',repo/f'plugins/{name}/.codex-plugin/plugin.json'];assert all(json.loads(p.read_text())['version']==version for p in ps)
 for p in repo.glob(f'plugins/{name}/README*.md'):assert 'version-'+version+'-' in p.read_text()
 for p in repo.glob('README*.md'):assert re.search(r'^### .*\['+re.escape(name)+r'\].*`v'+re.escape(version)+r'`',p.read_text(),re.M)
 versions.append({'plugin':name,'version':version,'locations':13})
save('static.json',{'frontmatter':frontmatter,'links':links,'link_failures':failures,'versions':versions})
save('commands.json',checks)
save('source-sha256.json',{str(p.relative_to(repo)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [repo/'install.sh',repo/'.claude-plugin/marketplace.json',*repo.glob('plugins/**/*')] if p.is_file() and '__pycache__' not in p.parts})
passed=not failures and all(c['exit']==0 for c in checks)
save('metrics.json',{'exit':0 if passed else 1,'elapsed_ms':round((time.monotonic()-start)*1000),'tokens':None,'deterministic_commands':len(checks),'readme_links':len(links),'yaml_skills':len(frontmatter),'plugin_reads':4})
save('DONE','0\n' if passed else '1\n');print(json.dumps({'passed':passed,'failures':failures,'commands':[(c['check'],c['exit']) for c in checks]},ensure_ascii=False));raise SystemExit(0 if passed else 1)
