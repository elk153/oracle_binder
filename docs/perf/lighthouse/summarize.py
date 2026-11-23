import json, glob, os, sys, statistics as st
d=sys.argv[1]; rows={}
for f in sorted(glob.glob(d+'/*.json')):
    name=os.path.basename(f)[:-5]; build,*prof,run=name.split('-'); prof='-'.join(prof)
    r=json.load(open(f)); a=r['audits']
    if r.get('runtimeError'): print('ERR',name,r['runtimeError']); continue
    reqs=a['network-requests']['details']['items']
    imgs=sorted(x['networkEndTime'] for x in reqs if 'cards.scryfall.io' in x['url'])
    search=[x['networkEndTime'] for x in reqs if '/cards/search' in x['url']]
    hand=imgs[6] if len(imgs)>=7 else None
    data=search[0] if search else None
    def before(t): return [x for x in reqs if t is not None and x['networkRequestTime']<=t]
    m={'FCP':a['first-contentful-paint']['numericValue'],'LCP':a['largest-contentful-paint']['numericValue'],
       'SI':a['speed-index']['numericValue'],'TBT':a['total-blocking-time']['numericValue'],
       'handData':data,'handVisible':hand,
       'jsKB':sum(x['transferSize'] for x in before(data) if x.get('resourceType')=='Script')/1024,
       'reqBeforeData':len(before(data)),'kbBeforeData':sum(x['transferSize'] for x in before(data))/1024,
       'bgStart':min([x['networkRequestTime'] for x in reqs if 'card-names' in x['url']] or [0]),
       'score':r['categories']['performance']['score']*100}
    rows.setdefault((prof,build),[]).append(m)
keys=['handData','handVisible','FCP','SI','TBT','jsKB','reqBeforeData','kbBeforeData','bgStart','score']
print('| Profile | Build | runs | '+' | '.join(keys)+' |'); print('|'+'---|'*(len(keys)+3))
for (prof,build),ms in sorted(rows.items()):
    def med(k):
        v=[m[k] for m in ms if m[k] is not None]; return round(st.median(v)) if v else '–'
    print(f'| {prof} | {build} | {len(ms)} | '+' | '.join(str(med(k)) for k in keys)+' |')
