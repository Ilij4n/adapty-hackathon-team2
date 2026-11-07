import json,subprocess,sys
d=json.load(open('spec.json'))
for i in range(int(sys.argv[1]) if len(sys.argv)>1 else 0, len(d["scenes"])):
    s=dict(d['scenes'][i]); s.pop('board',None); s['board_js']='RUN({bg:(g,t)=>{g.fillStyle="#123";g.fillRect(0,0,1280,720)}})'
    e={k:v for k,v in d.items() if k!='scenes'}; e['js']=[]; e['three']=False; e['scenes']=[s]
    json.dump(e,open('spec-warm.json','w'))
    r=subprocess.run([sys.executable,'/home/agent/work/projects/video-explainer/vx.py','build','spec-warm.json','--words','--out','/tmp/out-warm'],capture_output=True,text=True)
    lines=[l for l in (r.stdout+r.stderr).splitlines() if 'scene' in l.lower() or 'WARN' in l or 'gap' in l.lower() or 'rror' in l]
    print(i+1,r.returncode,*lines[-8:],sep='\n  ',flush=True)
