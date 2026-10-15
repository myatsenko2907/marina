import json,sys,glob,os
# usage: parse_raw.py RAWDIR IDSFILE OUT_TSV -> exits 1 on any problem (missing file, bad JSON, row account_id != file name)
raw,idsf,out=sys.argv[1:4]
ids=open(idsf).read().split()
bad=[];rows=[]
for a in ids:
    # one response per file: <id>.json, or several parts <id>.<part>.json for big accounts fetched in pieces
    files=sorted(glob.glob(os.path.join(raw,a+'.*.json')))+([os.path.join(raw,a+'.json')] if os.path.exists(os.path.join(raw,a+'.json')) else [])
    if not files: bad.append((a,'missing file')); continue
    ents=[]
    try:
        for f in files:
            d=json.load(open(f,encoding='utf-8')); e=d['ad_entities']
            ents+=json.loads(e) if isinstance(e,str) else e
    except Exception as e: bad.append((a,'parse '+str(e)[:80])); continue
    for r in ents:
        if str(r.get('account_id'))!=a: bad.append((a,'account_id mismatch '+str(r.get('account_id')))); break
        nm=r['name'].replace('\t',' ').replace('\n',' ').replace('\r',' ')
        lead=r.get('lead'); lead='' if lead is None else str(lead)
        rows.append([a,r['date_start'][:7],str(r['amount_spent']['value']),r['amount_spent']['unit'],lead,nm])
if bad:
    for b in bad: print('BAD',*b)
    sys.exit(1)
open(out,'w',encoding='utf-8').write(''.join('\t'.join(r)+'\n' for r in rows))
print('ok',len(ids),'accounts',len(rows),'rows')
