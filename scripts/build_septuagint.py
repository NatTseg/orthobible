#!/usr/bin/env python3
"""Build the reader from eBible's unmodified LXX2012 VPL archive + the pinned WEB NT.
Usage: python3 scripts/build_septuagint.py /path/to/eng-lxx2012_vpl.zip
The legacy WEB OT is retained only to recover previously saved annotations.
"""
import hashlib, json, re, subprocess, sys, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
NT = 'MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split()
raw = subprocess.check_output(['git','show','b42fa0d:bible-data.js'],cwd=ROOT).decode()
old = json.loads(raw.removeprefix('window.BIBLE=').strip().removesuffix(';'))
archive = Path(sys.argv[1]); blob=archive.read_bytes()
with zipfile.ZipFile(archive) as z:
    verses=ET.fromstring(z.read('eng-lxx2012_vpl.xml'))
texts={}; spans={}; count=0
for verse in verses:
    source_book=verse.get('b'); chapter=int(verse.get('c')); label=verse.get('v')
    book=source_book
    if book=='PSA' and chapter==151: book,chapter='PS2',1
    start,*rest=map(int,label.split('-')); end=rest[0] if rest else start
    text=''.join(verse.itertext()).strip()
    assert start>0 and end>=start
    chapters=texts.setdefault(book,[])
    while len(chapters)<chapter:chapters.append([''])
    row=chapters[chapter-1]
    while len(row)<=end:row.append('')
    assert not row[start], (book,chapter,label)
    row[start]=text
    if text and end!=start:spans[f'{book}:{chapter}:{start}']=end
    count+=1
names={b['id']:b for b in old['books']}
extra={'LJE':'Letter of Jeremiah','S3Y':'Prayer of Azariah & Song of the Three','SUS':'Susanna','BEL':'Bel and the Dragon'}
books=[]
for book,chapters in texts.items():
    name=extra.get(book,names.get(book,{}).get('name',book))
    books.append({'id':book,'name':name,'title':name,'n':len(chapters),'translation':'LXX2012'})
for book in NT:
    texts[book]=old['t'][book]
    books.append({**names[book],'translation':'WEB'})
data={'edition':'lxx2012-web-nt-v1','books':books,'t':texts,'spans':spans,
      'sources':{'LXX2012':{'name':'Septuagint in American English 2012','url':'https://ebible.org/eng-lxx2012/','license':'Public domain'},'WEB':{'name':'World English Bible — New Testament','url':'https://ebible.org/engwebu/','license':'Public domain'}}}
def write_js(path,name,obj):
    (ROOT/path).write_text('window.'+name+'='+json.dumps(obj,ensure_ascii=False,separators=(',',':'))+';\n')
write_js('bible-data.js','BIBLE',data)
legacy={'books':[b for b in old['books'] if b['id'] not in NT], 't':{b:t for b,t in old['t'].items() if b not in NT}}
write_js('legacy-web-data.js','LEGACY_WEB',legacy)
manifest={'source':'https://ebible.org/Scriptures/eng-lxx2012_vpl.zip','sha256':hashlib.sha256(blob).hexdigest(),'records':count,'sourceBooks':54,'readerOTBooks':len(texts)-len(NT),'ntSourceCommit':'b42fa0d','verseBridges':len(spans),'policy':'Source verse labels and wording preserved; Psalm 151 is displayed as a separate book. Empty verse positions remain empty. Daniel additions and Letter of Jeremiah retain their separate source books.'}
(ROOT/'data/lxx2012-source.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
