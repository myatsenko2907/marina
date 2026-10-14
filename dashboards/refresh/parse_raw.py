import json,sys,glob,os
# usage: parse_raw.py RAWDIR IDSFILE OUT_TSV -> exits 1 on any problem (missing file, bad JSON, row account_id != file name)
raw,idsf,out=sys.argv[1:4]
ids=open(idsf).read().split()
bad=[];rows=[]
for a in ids:
    f=os.path.join(raw,a+'.json')
    if not os.path.exists(f): bad.append((a,'missing file')); continue
    try:
        d=json.load(open(f,encoding='utf-8')); ents=d['ad_entities']
        ents=json.loads(ents) if isinstance(ents,str) else ents
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
