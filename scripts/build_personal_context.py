#!/usr/bin/env python3
"""Add OSB reading context to a private notes import, never to published assets.

Usage: python3 scripts/build_personal_context.py extracted-book.html notes.json output.json
Requires beautifulsoup4. The HTML can be extracted from the owner's MOBI with mobi.extract.
"""
import copy
import json
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup

html, notes_path, output = map(Path, sys.argv[1:])
repo = Path(__file__).resolve().parents[1]
if output.resolve().is_relative_to(repo):
    raise SystemExit('Write personal copyrighted content outside the repository.')
soup = BeautifulSoup(html.read_text(), 'html.parser')
children = list(soup.body.children)
positions = {node.get('id'): i for i, node in enumerate(children) if getattr(node, 'get', None) and node.get('id')}

def text(node):
    # Inline tags divide words without representing spaces; preserve source whitespace.
    return re.sub(r'\s+', ' ', node.get_text()).strip()

def article(title, start, end):
    blocks = []
    for node in children[positions[start] + 1:positions[end]]:
        if not getattr(node, 'name', None) or node.name in ('a', 'mbp:pagebreak'):
            continue
        value = text(node)
        if not value or (not blocks and value == title):
            continue
        if node.name == 'table':
            rows = [[text(cell) for cell in row.find_all(['td', 'th'], recursive=False)] for row in node.find_all('tr')]
            blocks.append({'type': 'table', 'rows': rows})
        else:
            heading = any(int(f.get('size', '0')) >= 4 for f in node.find_all('font') if f.get('size', '0').isdigit())
            blocks.append({'type': 'heading' if heading else 'paragraph', 'text': value})
    assert blocks, title
    return {'title': title, 'blocks': blocks}

# The source table of contents lists each full introduction, followed by chapter links.
index_end = positions['filepos164591']
intro_links = [a for node in children[:index_end] if getattr(node, 'find_all', None)
               for a in node.find_all('a', href=True)
               if a.find('i') and a['href'].startswith('#filepos') and int(a['href'][8:]) >= 283443]
ids = '''GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH 1ES EZR NEH TOB JDT EST 1MA 2MA 3MA PSA JOB PRO ECC SNG WIS SIR HOS AMO MIC JOL OBA JON NAM HAB ZEP HAG ZEC MAL ISA JER BAR LAM LJE EZK DAN MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'''.split()
assert len(intro_links) == len(ids) == 76
introductions = {}
for book, link in zip(ids, intro_links):
    next_link = link.find_next('a', href=True)
    assert text(next_link) in ('1', 'Susanna', 'The Prologue'), (book, text(next_link))
    introductions[book] = article(text(link), link['href'][1:], next_link['href'][1:])
# These sections are part of other books in the OSB, but separate entries in LXX2012.
for book, parent in {'PS2':'PSA', 'MAN':'2CH', 'S3Y':'DAN', 'SUS':'DAN', 'BEL':'DAN'}.items():
    introductions[book] = copy.deepcopy(introductions[parent])
    introductions[book]['blocks'].insert(0, {'type':'paragraph', 'text':'This section belongs to the following book in the Orthodox Study Bible. Its full book introduction is provided here for context.'})

wanted = ['How to Use This Bible', 'Introduction to The Orthodox Study Bible',
          'The Old Testament Books Listed and Compared', 'Source Abbreviations',
          'Overview of the Books of the Bible', 'Introducing the Orthodox Church',
          'The Bible: God’s Revelation to Man', 'How to Read the Bible', 'Lectionary', 'Glossary']
toc = [a for node in children[:positions['filepos8056']] if getattr(node, 'find_all', None)
       for a in node.find_all('a', href=True)]
guides = []
for name in wanted:
    link = next(a for a in toc if text(a) == name)
    start = link['href'][1:]
    # Next front/back matter title in physical content, not the TOC's OT chapter index.
    later = sorted((positions[a['href'][1:]], a['href'][1:]) for a in toc if a['href'][1:] in positions and positions[a['href'][1:]] > positions[start])
    end = later[0][1] if later else None
    if name == 'Introducing the Orthodox Church': end = intro_links[0]['href'][1:]
    assert end, name
    guide = article(name, start, end)
    if name == 'Introducing the Orthodox Church' and guide['blocks'][-1].get('text') == 'The Old Testament':
        guide['blocks'].pop()
    guides.append(guide)
data = json.loads(notes_path.read_text())
data.update(version=2, introductions=introductions, guides=guides,
            contextSource='Orthodox Study Bible, personal Thomas Nelson ebook copy. Copyright © 2008 St. Athanasius Academy of Orthodox Theology.')
output.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
print(f'{len(data["notes"])} notes; 76 full introductions covering {len(introductions)} reader entries; {len(guides)} guides; {output.stat().st_size:,} bytes')
for g in guides: print(g['title'], len(g['blocks']), 'blocks')
