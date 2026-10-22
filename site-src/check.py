import os, re, json, sys
root = sys.argv[1]; bad = []; n = 0
for d, _, fs in os.walk(root):
    for f in fs:
        if not f.endswith('.html'): continue
        p = os.path.join(d, f); s = open(p).read(); n += 1
        for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
            json.loads(m)
        for u in re.findall(r'(?:href|src)="(/[^"#?]*)', s) + [x.split()[0] for x in re.findall(r'(/images/[^ ,"]+\.webp)', s)]:
            t = root + u + ('index.html' if u.endswith('/') else '')
            if not os.path.exists(t): bad.append((p.replace(root, ''), u))
        if s.count('<h1') != 1: bad.append((p, 'h1 count %d' % s.count('<h1')))
print(n, 'pages checked; problems:', sorted(set(bad)) or 'none')
