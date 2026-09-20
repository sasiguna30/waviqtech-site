"""Check all static pages, local references, metadata and preserved legal copy."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from collections import Counter
import re
ROOT = Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self, file):
        super().__init__(convert_charrefs=True)
        self.file, self.ids, self.refs, self.h1, self.title, self.desc = file, [], [], 0, '', []
        self.in_title = False
        self.feed(file.read_text())
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag == 'h1': self.h1 += 1
        if tag == 'title': self.in_title = True
        if tag == 'meta' and a.get('name') == 'description': self.desc.append(a.get('content', ''))
        if tag == 'img' and not a.get('alt'): errors.append(f'{self.file}: image missing descriptive alt')
        for key in ('href', 'src'):
            if key in a: self.refs.append(a[key])
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
    def handle_data(self, text):
        if self.in_title: self.title += text
errors=[]
pages={f.resolve():Page(f) for f in sorted(ROOT.rglob('*.html')) if 'node_modules' not in f.parts}
titles=Counter(p.title for p in pages.values())
descriptions=Counter(d for p in pages.values() for d in p.desc)
checked=0
for f,p in pages.items():
    if p.h1 != 1: errors.append(f'{f}: expected one H1, found {p.h1}')
    if not p.title or titles[p.title] != 1: errors.append(f'{f}: missing or duplicate title')
    if len(p.desc)!=1 or not p.desc[0] or descriptions[p.desc[0]]!=1: errors.append(f'{f}: missing or duplicate description')
    if len(p.ids)!=len(set(p.ids)): errors.append(f'{f}: duplicate IDs')
    for ref in p.refs:
        u=urlsplit(ref)
        if u.scheme or u.netloc: continue
        checked+=1
        target=(ROOT / unquote(u.path).lstrip('/') if u.path.startswith('/') else f.parent/unquote(u.path)).resolve() if u.path else f
        if target.is_dir(): target=target/'index.html'
        if not target.is_file(): errors.append(f'{f.relative_to(ROOT)}: missing target {ref}')
        elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids: errors.append(f'{f.relative_to(ROOT)}: missing fragment {ref}')
    for legal in ('privacy-policy','terms-of-service','data-deletion'):
        if not any(legal+'.html' in ref for ref in p.refs): errors.append(f'{f}: missing legal link {legal}')
    if re.search(r'other countries|worldwide|global coverage|fully compliant',f.read_text(),re.I): errors.append(f'{f}: prohibited claim')
for css in (ROOT/'assets').glob('*.css'):
    for ref in re.findall(r'url\([\'\"]?([^\)\'\"]+)',css.read_text()):
        if not urlsplit(ref).scheme and not (css.parent/ref).is_file(): errors.append(f'{css}: missing asset {ref}')
print(f'Checked {len(pages)} HTML pages and {checked} internal links/assets.')
if errors:
    print('\n'.join(errors))
    raise SystemExit(1)
print('PASS: local targets, fragments, image alt text, unique titles/descriptions, one H1, legal links and excluded claims.')
