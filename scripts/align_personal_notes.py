#!/usr/bin/env python3
"""Extract actual OSB verse-note links and conservatively match source verse text.
Private input and output must stay outside the public repository.
Usage: python align_personal_notes.py book.html existing-context.json output.json
Requires beautifulsoup4. Unmatched source notes remain accessible without pinning.
"""
from pathlib import Path
from bs4 import BeautifulSoup
from difflib import SequenceMatcher
from collections import defaultdict, Counter
import json,re,sys,unicodedata
html_path,import_path,output=map(Path,sys.argv[1:])
root=Path(__file__).resolve().parents[1]
if output.resolve().is_relative_to(root):raise SystemExit('Personal output must stay outside the repository.')
raw=html_path.read_text(); soup=BeautifulSoup(raw,'html.parser')
ids='GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH 1ES EZR NEH TOB JDT EST 1MA 2MA 3MA PSA JOB PRO ECC SNG WIS SIR HOS AMO MIC JOL OBA JON NAM HAB ZEP HAG ZEC MAL ISA JER BAR LAM LJE EZK DAN MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split()
index=[]
for a in soup.find_all('a',href=True):
 if a.get('href')=='#filepos164591':continue
 # Every source introduction in the first table of contents is italicized.
 if a.find('i') and a['href'].startswith('#filepos') and int(a['href'][8:])>=283443:
  index.append(a)
  if len(index)==76:break
assert len(index)==76
anchors={m.group(1):m.start() for m in re.finditer(r'<a id="(filepos\d+)"',raw)}
source_verses={}; verse_ids={}; note_links=defaultdict(set); book_bounds={}
for i,(book,intro) in enumerate(zip(ids,index)):
 chapters=[]
 for a in intro.find_all_next('a',href=True):
  if i+1<len(index) and a is index[i+1]:break
  if int(a['href'][8:])<283443:break
  label=a.get_text().strip()
  if label.isdigit() or label in ('Susanna','Bel and the Serpent'):
   chapters.append((label,a['href'][1:]))
  elif label=='The Prologue':continue
  else:break
 assert chapters,book
 start=anchors[chapters[0][1]]
 end=anchors[index[i+1]['href'][1:]] if i+1<len(index) else anchors['filepos15111853']
 book_bounds[book]=(start,end)
 # Notes are linked from superscript verse numbers, and printed after the verses.
 sup_notes=[]
 for m in re.finditer(r'<sup>(.*?)</sup>',raw[start:end],re.S):
  fragment=BeautifulSoup(m.group(1),'html.parser')
  a=fragment.find('a',href=True)
  if a and fragment.get_text().strip().isdigit() and a['href'][1:] in anchors:
   pos=anchors[a['href'][1:]]
   if pos>start+m.start():sup_notes.append(pos)
 notes_start=min(sup_notes) if sup_notes else end
 for n,(label,anchor) in enumerate(chapters):
  b=book;c=int(label) if label.isdigit() else 1
  if label=='Susanna':b='SUS'
  if label=='Bel and the Serpent':b='BEL'
  if b=='PSA' and c==151:b='PS2';c=1
  chunk=raw[anchors[anchor]:anchors[chapters[n+1][1]] if n+1<len(chapters) else notes_start]
  matches=[]
  for m in re.finditer(r'<sup>(.*?)</sup>',chunk,re.S):
   fragment=BeautifulSoup(m.group(1),'html.parser');labeltext=fragment.get_text().strip()
   if labeltext.isdigit():matches.append((m,fragment,int(labeltext)))
  for j,(m,fragment,v) in enumerate(matches):
   # Exclude headings from the verse text used to establish an alignment.
   tail=chunk[m.end():matches[j+1][0].start() if j+1<len(matches) else len(chunk)]
   body=BeautifulSoup(tail,'html.parser')
   for heading in body.find_all(['p'],attrs={'align':'center'}):heading.decompose()
   text=re.sub(r'\s+',' ',body.get_text()).strip()
   key=f'{b}:{c}:{v}'
   if key in source_verses:continue # e.g. a separate embedded canticle, reviewed separately
   source_verses[key]=text
   for a in fragment.find_all('a',id=True):verse_ids[a['id']]=key
   # In this ebook a verse anchor may precede its superscript.
   preceding=chunk[max(0,m.start()-90):m.start()]
   ids_before=re.findall(r'<a id="(filepos\d+)"></a>\s*$',preceding)
   for aid in ids_before:verse_ids[aid]=key
   for a in fragment.find_all('a',href=True):
    aid=a['href'][1:]
    if aid in anchors and notes_start<=anchors[aid]<end:note_links[aid].add(key)
 print(book,'verses',sum(1 for k in source_verses if k.startswith(book+':')),flush=True)
# Only use known note destinations as boundaries, preserving continuation paragraphs.
notes={}
ordered=sorted(note_links,key=anchors.get)
for i,aid in enumerate(ordered):
 keys=sorted(note_links[aid]); key=keys[0]
 pos=anchors[aid];end=anchors[ordered[i+1]] if i+1<len(ordered) else anchors['filepos15111853']
 sourcebook=key.split(':')[0]
 bounds=book_bounds.get(sourcebook,book_bounds['DAN'] if sourcebook in ('SUS','BEL') else book_bounds['PSA'])
 end=min(end,bounds[1])
 fragment=BeautifulSoup(raw[pos:end],'html.parser')
 text=re.sub(r'\s+',' ',fragment.get_text(' ',strip=True)).strip()
 if not text:continue
 refs=list(dict.fromkeys(verse_ids[a['href'][1:]] for a in fragment.find_all('a',href=True) if a['href'][1:] in verse_ids and verse_ids[a['href'][1:]]!=key))
 for k in keys:
  if k in notes:notes[k]['body']+='\n\n'+text
  else:notes[k]={'kind':'OSB source note','title':k,'body':text,'see':refs}
# A match must be distinctive and very close; no verse is attached solely by number.
bible=json.loads((root/'bible-data.js').read_text().split('=',1)[1].rstrip(';\n'))
replace={'thee':'you','thou':'you','thy':'your','thine':'your','hath':'has','doth':'does','saith':'said','unto':'to','shalt':'shall','art':'are'}
stop=set('the and of to in a that is for with he his shall be it they them all as was on from but by not you your i my'.split())
def tokens(text):return [replace.get(w,w) for w in re.findall(r"[a-z]+",unicodedata.normalize('NFKD',text).lower())]
targets={}; target_words={}; inverted=defaultdict(lambda:defaultdict(set))
for book,chapters in bible['t'].items():
 for ch,verses in enumerate(chapters,1):
  for v,text in enumerate(verses):
   if not text or v==0:continue
   key=f'{book}:{ch}:{v}';tok=tokens(text);targets[key]=tok;target_words[key]=set(tok)-stop
   for w in target_words[key]:inverted[book][w].add(key)
matched={}; evidence={}; candidates={}
for key,text in source_verses.items():
 book=key.split(':')[0];books=[book]
 if book=='DAN':books+=['S3Y']
 if book=='2CH':books+=['MAN']
 tok=tokens(text);words=set(tok)-stop
 if len(words)<4:continue
 hits=Counter()
 for b in books:
  for word in words:
   group=inverted[b].get(word,())
   if len(group)<400:hits.update(group)
 options=[k for k,n in hits.most_common(12) if n>=min(4,len(words))]
 scores=[]
 for candidate in options:
  other=targets[candidate]; otherwords=target_words[candidate]
  seq=SequenceMatcher(None,tok,other,autojunk=False).ratio()
  dice=2*len(words&otherwords)/(len(words)+len(otherwords))
  score=.65*seq+.35*dice
  scores.append((score,candidate,seq,dice))
 scores.sort(reverse=True)
 if not scores:continue
 best=scores[0];margin=best[0]-(scores[1][0] if len(scores)>1 else 0)
 if best[0]>=.91 and margin>=.10 and best[2]>=.86 and best[3]>=.90:
  matched[key]=best[1];evidence[key]={'score':round(best[0],4),'margin':round(margin,4),'method':'source-link-and-distinctive-verse-text'}
 elif key in notes:candidates[key]={'target':best[1],'score':round(best[0],4)}
# Keep all earlier extracted notes unchanged; source-linked notes are a separate layer.
for key,note in notes.items(): note['sourceVerse']=source_verses.get(key,'')
data=json.loads(import_path.read_text())
data.update(sourceNotes=notes,alignment={'edition':bible['edition'],'version':1,'notes':{k:v for k,v in matched.items() if k in notes},'verses':matched,'evidence':{k:evidence[k] for k in notes if k in evidence},'candidates':candidates})
output.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
report=output.with_suffix('.alignment-review.json')
report.write_text(json.dumps({'sourceVerses':len(source_verses),'sourceNotes':len(notes),'matchedNotes':len(data['alignment']['notes']),'unmatchedNotes':{k:v for k,v in candidates.items()},'sourceText':{k:source_verses[k] for k in notes if k in source_verses}},ensure_ascii=False))
print(json.dumps({'oldNotesPreserved':len(data['notes']),'sourceVerses':len(source_verses),'sourceNotes':len(notes),'matchedNotes':len(data['alignment']['notes']),'mappedVerses':len(matched),'outputBytes':output.stat().st_size}),flush=True)
