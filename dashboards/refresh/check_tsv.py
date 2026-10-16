import sys,os
# usage: check_tsv.py TSVDIR IDSFILE OUT  — each TSVDIR/<id>.tsv line: account_id, YYYY-MM, spend, unit, lead, campaign name
d,idsf,out=sys.argv[1:4]; bad=[]; rows=[]
for a in open(idsf).read().split():
    f=os.path.join(d,a+'.tsv')
    if os.path.exists(os.path.join(d,a+'.err')): continue
    if not os.path.exists(f): bad.append((a,'missing file')); continue
    for n,l in enumerate(open(f,encoding='utf-8')):
        l=l.rstrip('\n')
        if not l.strip(): continue
        p=l.split('\t')
        if len(p)!=6: bad.append((a,f'line {n+1}: {len(p)} fields')); continue
        if p[0]!=a: bad.append((a,f'line {n+1}: account_id {p[0]}')); continue
        try: float(p[2]); int(p[4] or 0)
        except: bad.append((a,f'line {n+1}: bad number')); continue
        if len(p[1])!=7: bad.append((a,f'line {n+1}: month {p[1]}')); continue
        rows.append(p)
if bad:
    for b in bad: print('BAD',*b)
    sys.exit(1)
open(out,'w',encoding='utf-8').write(''.join('\t'.join(r)+'\n' for r in rows))
print('ok',len(open(idsf).read().split()),'accounts',len(rows),'rows')
