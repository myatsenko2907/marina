import sys,collections,os
W,N=sys.argv[1],sys.argv[2]
MONTHS=tuple(sys.argv[3:])
al=open(f'{W}/al_{N}.txt').read().split()
bad=[]
def rows(p):
    return [l.rstrip('\n').split('\t') for l in open(p,encoding='utf-8') if l.strip()] if os.path.exists(p) else []
errs={(r[0],r[1]) for r in rows(f'{W}/err_{N}.tsv')}
P=collections.defaultdict(list)
for r in rows(f'{W}/plan_{N}.tsv'):
    if len(r)!=5: bad.append('plan bad line '+'|'.join(r)); continue
    P[(r[0],r[1])].append(r)
for a in al:
    for m in MONTHS:
        rs=P.get((a,m))
        if not rs:
            if (a,'plan-'+m) not in errs: bad.append(f'missing plan {a} {m}')
            continue
        keys=[r[2] for r in rs]
        if len(keys)!=len(set(keys)): bad.append(f'dup plan rows {a} {m}'); continue
        tot=[r for r in rs if r[2]=='total']
        if len(tot)!=1: bad.append(f'no total {a} {m}'); continue
        for i,nm in ((3,'plan'),(4,'fact')):
            s=sum(float(r[i]) for r in rs if r[2]!='total')
            if abs(s-float(tot[0][i]))>0.01: bad.append(f'{nm} sum {a} {m}: {s} vs total {tot[0][i]}')
R=collections.defaultdict(list)
for r in rows(f'{W}/req_{N}.tsv'):
    if len(r)!=7: bad.append('req bad line '+'|'.join(r)); continue
    R[(r[0],r[1])].append(r)
for a in al:
    for m in MONTHS:
        rs=R.get((a,m))
        if not rs:
            if (a,'req-'+m) not in errs: bad.append(f'missing req {a} {m}')
            continue
        keys=[r[2] for r in rs]
        if len(keys)!=len(set(keys)): bad.append(f'dup req rows {a} {m}'); continue
        tot=[r for r in rs if r[2]=='ALL']
        if len(tot)!=1:
            if len(rs)>0 and all(float(r[3])==0 for r in rs): continue
            bad.append(f'no ALL {a} {m}'); continue
        for i,nm in ((3,'total_requests'),(4,'deleted'),(6,'total_contracts')):
            s=sum(float(r[i]) for r in rs if r[2]!='ALL')
            if abs(s-float(tot[0][i]))>0.01: bad.append(f'{nm} sum {a} {m}: {s} vs ALL {tot[0][i]}')
print('\n'.join(bad) if bad else f'ok batch {N}: {len(al)} aliases')
