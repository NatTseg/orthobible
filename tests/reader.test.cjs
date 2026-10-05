const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
function reader(stored = {}) {
  const element = () => ({
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() {
      return [];
    },
    style: { setProperty() {}, removeProperty() {} },
    classList: { add() {}, remove() {} },
    dataset: {},
  });
  const nodes = new Map();
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, element());
      return nodes.get(id);
    },
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return element();
    },
    addEventListener() {},
    documentElement: element(),
  };
  const context = {
    document,
    console,
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem() {
        return JSON.stringify(stored);
      },
      setItem() {},
    },
    addEventListener() {},
  };
  context.window = context;
  vm.createContext(context);
  for (const file of [
    "bible-data.js",
    "legacy-web-data.js",
    "edition.js",
    "swipe.js",
    "study-data.js",
    "wisdom-data.js",
    "prayers-data.js",
  ])
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "personal-notes.js"), "utf8"), context);
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  // Bind functions and event handlers, without rendering the initial browser view.
  vm.runInContext(
    app.slice(0, app.search(/\nif\s*\(window\.BIBLE\?\.t\)/)),
    context,
  );
  return (expression) => vm.runInContext(expression, context);
}
test("Psalm 151 resolves to its separate book; invalid chapters and verses are rejected", () => {
  const run = reader();
  assert.equal(
    run('JSON.stringify(parseRef("Psalm 151"))'),
    JSON.stringify({ book: "PS2", ch: 1, v: null }),
  );
  assert.equal(run('parseRef("John 99:1")'), null);
  assert.equal(run('parseRef("John 3:999")'), null);
  assert.equal(run('parseRef("John 3:0")'), null);
  assert.equal(run('parseRef("John 3:16-15")'), null);
  assert.equal(run('parseRef("1 Corinthians 13:4").book'), "1CO");
});
test("every curated Wisdom range displays exactly its referenced verses", () => {
  const run = reader();
  const mismatches = run(
    `JSON.stringify(WISDOM.categories.flatMap(c=>c.topics).flatMap(t=>t.refs).filter(([b,c,v,end=v])=>(rangeHtml(b,c,v,end).match(/class="verse[" ]/g)||[]).length!==end-v+1))`,
  );
  assert.equal(mismatches, "[]");
});
test("legacy calendar state migrates to reading without losing saved verses", () => {
  const run = reader({
    tab: "coptic",
    book: "JHN",
    chapter: 3,
    font: 22,
    scroll: 0.45,
    bookmarks: [{ book: "JHN", chapter: 3, verse: 16, ts: 1 }],
    comments: { "JHN:3:16": "Remember <this>" },
    highlights: { "JHN:3:16": "gold" },
    prayed: { old: true },
  });
  run("loadPrefs()");
  assert.equal(run("state.tab"), "bible");
  assert.equal(run("state.chapter"), 3);
  assert.equal(run("state.scroll"), 0.45);
  assert.equal(run("state.bookmarks.length"), 1);
  assert.equal(run('state.comments["JHN:3:16"]'), "Remember <this>");
  assert.equal(run('state.highlights["JHN:3:16"]'), "gold");
  assert.equal(run("state.prayed.old"), true);
});
test("invalid persisted data cannot break reader preferences", () => {
  const run = reader({
    book: "INVALID",
    chapter: null,
    font: 999,
    bookmarks: [null, {}],
    highlights: null,
    comments: [],
  });
  run("loadPrefs()");
  assert.equal(run("state.book"), "JHN");
  assert.equal(run("state.chapter"), 1);
  assert.equal(run("state.font"), 28);
  assert.equal(run("state.bookmarks.length"), 0);
});
test("activation deletes only old orthobible caches", async () => {
  const handlers = {},
    deleted = [];
  let job;
  const context = {
    self: {
      addEventListener(name, fn) {
        handlers[name] = fn;
      },
      clients: { claim() {} },
    },
    caches: {
      keys: async () => [
        "unrelated-app-v1",
        "orthodox-bible-v13",
        "orthodox-bible-v18",
        "orthodox-bible-v20",
        "orthodox-bible-v25",
      ],
      delete: async (key) => deleted.push(key),
    },
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "sw.js"), "utf8"),
    context,
  );
  handlers.activate({
    waitUntil(p) {
      job = p;
    },
  });
  await job;
  assert.deepEqual(deleted, ["orthodox-bible-v13", "orthodox-bible-v18", "orthodox-bible-v20"]);
});

test("offline HTML fallback is reserved for navigation within this app", async () => {
  const handlers = {};
  const fallback = { html: true };
  const context = {
    URL,
    Response,
    self: {
      addEventListener(name, fn) {
        handlers[name] = fn;
      },
      location: { origin: "https://example.com" },
      registration: { scope: "https://example.com/orthobible/" },
    },
    caches: {
      open: async () => ({
        match: async (key) => (key === "./index.html" ? fallback : null),
      }),
    },
    fetch: async () => {
      throw new Error("Offline");
    },
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "sw.js"), "utf8"),
    context,
  );
  let response;
  const fire = (url, mode) => {
    response = undefined;
    handlers.fetch({
      request: { method: "GET", url, mode },
      respondWith(value) {
        response = value;
      },
    });
    return response;
  };
  assert.equal(
    await fire("https://example.com/orthobible/unknown", "navigate"),
    fallback,
  );
  assert.equal(
    (await fire("https://example.com/orthobible/missing.js", "cors")).type,
    "error",
  );
  assert.equal(fire("https://example.com/OtherApp/", "navigate"), undefined);
});

test("chapter drawer book navigation respects the displayed canon and its boundaries", () => {
  const run = reader();
  assert.equal(run('neighboringBook("GEN", -1)'), null);
  assert.equal(run('neighboringBook("REV", 1)'), null);
  assert.equal(run('neighboringBook("JHN", -1)'), "LUK");
  assert.equal(run('neighboringBook("JHN", 1)'), "ACT");
  assert.equal(run('neighboringBook("UNKNOWN", 1)'), null);
});
test("chapter swipe requires a deliberate horizontal movement", () => {
  const run = reader();
  assert.equal(run("swipeDirection(-100, 10)"), -1);
  assert.equal(run("swipeDirection(100, 10)"), 1);
  assert.equal(run("swipeDirection(-30, 0)"), 0);
  assert.equal(run("swipeDirection(-80, 100)"), 0);
  assert.equal(run("swipeDirection(-80, 60)"), 0);
});

test("viewport fit uses CSS full height except during keyboard input, preserving zoom", () => {
  const run = reader();
  run(`document.documentElement.style.setProperty = (name, value) => window.testHeight = value;
    document.documentElement.style.removeProperty = () => window.testHeight = null;
    window.innerHeight = 844; window.visualViewport = {height: 766, scale: 1}; fitViewport();`);
  assert.equal(run("window.testHeight"), null, "safe-area exclusions must not shrink the app");
  run(`document.activeElement = {tagName:'INPUT'}; window.visualViewport.height = 360; fitViewport();`);
  assert.equal(run("window.testHeight"), "360px");
  run("window.visualViewport = {height: 180, scale: 2}; fitViewport();");
  assert.equal(run("window.testHeight"), "360px", "pinch zoom leaves the layout alone");
  run("window.visualViewport = {height: 766, scale: 1}; fitViewport();");
  assert.equal(run("window.testHeight"), null, "keyboard dismissal restores CSS viewport sizing");
  run("window.visualViewport.height = 360; fitViewport(); document.activeElement = null; fitViewport();");
  assert.equal(run("window.testHeight"), null, "blur releases a stale keyboard height");
});

test('prayer book entries have unique IDs and available text', () => {
  const run = reader();
  assert.equal(run('PRAYERS.length'), 8);
  assert.equal(run('new Set(PRAYERS.map(p => p.id)).size'), 8);
  assert.equal(run('PRAYERS.every(p => p.title && (p.text?.trim() || chapterText(p.book, p.chapter).length > 1))'), true);
});

test('footer navigation always opens the main section and clears nested return state', () => {
  const run = reader();
  for (const tab of ['wisdom', 'prayers', 'saved', 'bible']) {
    run(`wisdomTopic = WISDOM.categories[0].topics[0]; selectedPrayer = PRAYERS[0].id; prayerListTop = 180; wisdomListTop = 120; savedFilter = 'comments'; returnPlace = {tab:'wisdom'}; openTab('${tab}');`);
    assert.equal(run('state.tab'), tab);
    assert.equal(run('wisdomTopic'), null);
    assert.equal(run('selectedPrayer'), null);
    assert.equal(run('savedFilter'), 'all');
    assert.equal(run('returnPlace'), null);
  }
});

test('right swipe returns from a prayer and ignores vertical scrolling, short drags, and controls', () => {
  const run = reader();
  run(`beginBackSlide = () => ({width:390,update(){},cancel(){},finish(commit, action){if(commit)action();}}); window.handlers = {}; window.surface = {addEventListener(name, fn) {handlers[name]=fn;}}; bindChapterSwipe(surface, false);
    window.swipe = (dx, dy, control=false) => {
      handlers.touchstart({touches:[{clientX:80,clientY:200}],target:{closest:()=>control}});
      handlers.touchmove({touches:[{clientX:80+dx,clientY:200+dy}],cancelable:true,preventDefault(){}});
      handlers.touchend({changedTouches:[{clientX:80+dx,clientY:200+dy}]});
    }; state.tab='prayers'; selectedPrayer=PRAYERS[0].id; prayerListTop=75;`);
  for (const gesture of ['swipe(20,0)', 'swipe(80,100)', 'swipe(150,5,true)', 'swipe(-150,5)']) {
    run(gesture);
    assert.notEqual(run('selectedPrayer'), null);
  }
  run('swipe(150,5)');
  assert.equal(run('selectedPrayer'), null);
  assert.equal(run('pane.scrollTop'), 75);
});

test('linked passages return to the originating Wisdom topic and saved filter', () => {
  const run = reader();
  run(`window.requestAnimationFrame = () => {}; state.tab='wisdom'; wisdomTopic=WISDOM.categories[0].topics[0]; pane.scrollTop=123; visitPassage('JHN',3,16); backAction()();`);
  assert.equal(run('state.tab'), 'wisdom');
  assert.equal(run('wisdomTopic.id'), run('WISDOM.categories[0].topics[0].id'));
  assert.equal(run('pane.scrollTop'), 123);
  run(`state.tab='saved'; savedFilter='comments'; pane.scrollTop=42; visitPassage('JHN',1,1); backAction()();`);
  assert.equal(run('state.tab'), 'saved');
  assert.equal(run('savedFilter'), 'comments');
  assert.equal(run('pane.scrollTop'), 42);
});

test('nested dialogs use their parent action before dismissing the overlay', () => {
  const run = reader();
  run(`dialog.open=true; window.returned=false; dialogBack=()=>{window.returned=true;}; backAction()();`);
  assert.equal(run('window.returned'), true);
  run('dialogBack=null');
  assert.equal(run('backAction() === closeDialog'), true);
});

test('personal notes validate data, render safely, and leave saved verses untouched', () => {
  const run = reader({bookmarks:[{book:'JHN',chapter:3,verse:16}],comments:{'JHN:3:16':'My note'}});
  run(`loadPrefs(); window.imported = validatePersonalNotes({notes:{'JHN:1:1':{body:'<script>alert(1)</script>\\nSecond paragraph', title:'Personal note'}},preambles:{JHN:{body:'Introduction'}}}); applyPersonalNotes(imported);`);
  assert.equal(run('personalNotesCount'), 1);
  assert.equal(run('state.bookmarks.length'), 1);
  assert.equal(run('state.comments["JHN:3:16"]'), 'My note');
  assert.match(run('notesHtml()'), /&lt;script&gt;/);
  assert.match(run('verseHtml("JHN",1,1)'), /Study note for verse 1/);
  assert.throws(() => run(`validatePersonalNotes({notes:{'BAD:1:1':{body:'Invalid'}}})`));
  assert.throws(() => run(`validatePersonalNotes({notes:{}})`));
});


test('app updates bypass stale HTTP assets when filling the offline cache', async () => {
  const handlers = {};
  let job, assets;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), {
    Request: class { constructor(url, options) { this.url = url; this.cache = options.cache; } },
    self: {addEventListener(name, fn) {handlers[name] = fn;}, skipWaiting() {}},
    caches: {open: async () => ({addAll: async requests => {assets = requests;}})},
  });
  handlers.install({waitUntil(p) {job = p;}});
  await job;
  assert.ok(assets.every(request => request.cache === 'reload'));
  assert.ok(assets.some(request => request.url === './personal-notes.js'));
  assert.ok(assets.some(request => request.url === './bible-data.js'));
});

test('all Old Testament books use LXX2012 and all 27 New Testament books retain WEB', () => {
  const run = reader();
  assert.equal(run('BIBLE.books.filter(b=>b.translation === "LXX2012").length'), 55);
  assert.equal(run('BIBLE.books.filter(b=>b.translation === "WEB").length'), 27);
  assert.equal(run('bookOrder().length'), run('BIBLE.books.length'));
  assert.equal(run('new Set(bookOrder()).size'), run('BIBLE.books.length'));
  assert.equal(run('bookMeta("ESG")'), undefined);
  assert.equal(run('bookMeta("2ES")'), undefined);
  assert.match(run('verseText("GEN",5,3)'), /two hundred and thirty/i);
  assert.match(run('verseText("PSA",22,1)'), /Lord.*(tends|shepherd)/i);
  assert.match(run('verseText("PSA",50,1)'), /Have mercy/i);
  assert.match(run('verseText("JER",38,31)'), /new covenant/i);
  assert.match(run('verseText("EST",1,1)'), /saw a vision/i);
  assert.ok(run('verseText("SUS",1,1).length') > 0);
  assert.ok(run('verseText("BEL",1,1).length') > 0);
  assert.ok(run('verseText("S3Y",1,1).length') > 0);
  assert.ok(run('verseText("LJE",1,1).length') > 0);
});

test('Septuagint verse bridges render once and accept references within their range', () => {
  const run = reader();
  assert.equal(run('sourceVerseStart("GEN",37,2)'), 1);
  assert.equal(run('sourceVerseLabel("GEN",37,1)'), '1–2');
  assert.equal(run('verseText("GEN",37,2)'), run('verseText("GEN",37,1)'));
  assert.equal(run('(rangeHtml("GEN",37,1,2).match(/class="verse[" ]/g)||[]).length'), 1);
  assert.match(run('rangeHtml("GEN",37,2,2)'), /data-verse="1"/);
  assert.equal(run('parseRef("Proverbs 22:6")'), null, 'omitted source verses cannot silently resolve elsewhere');
});

test('the edition migration preserves prior Old Testament saves verbatim and is idempotent', () => {
  const run = reader({book:'PSA',chapter:23,bookmarks:[{book:'PSA',chapter:23,verse:1,ts:1},{book:'JHN',chapter:3,verse:16,ts:2}],comments:{'PSA:23:1':'My original note','ESG:1:1':'Greek Esther note'},highlights:{'PSA:23:1':'gold'}});
  run('loadPrefs()');
  assert.equal(run('state.chapter'), 22);
  assert.equal(run('state.bookmarks.length'), 1);
  assert.equal(run('state.legacySaved.length'), 2);
  assert.equal(run('state.legacySaved[0].text'), run('LEGACY_WEB.t.PSA[22][1]'));
  assert.equal(run('state.legacySaved[0].comment'), 'My original note');
  assert.equal(run('state.legacySaved[0].highlight'), 'gold');
  assert.equal(run('state.legacySaved[1].comment'), 'Greek Esther note');
  const before = run('JSON.stringify(state)');
  run('Object.assign(state,migrateEdition(state))');
  assert.equal(run('JSON.stringify(state)'), before);
});

test('unaligned original OT notes stay available without being attached to LXX verses', () => {
  const run = reader();
  run(`applyPersonalNotes(validatePersonalNotes({notes:{'PSA:23:1':{body:'Original Hebrew-numbered note'},'DAG:3:24':{body:'Daniel note'}},preambles:{}})); state.book='PSA'; state.chapter=22;`);
  assert.equal(run('personalNotesCount'), 2);
  assert.equal(run('noteAt("PSA",22,1)'), null);
  assert.match(run('notesHtml()'), /Read notes for this book/);
  assert.match(run('notesHtml()'), /has not been verified/);
  assert.equal(run('STUDY.notes["DAG:3:24"].body'), 'Daniel note');
});

test('back commit requires distance and rejects a deliberate reversal', () => {
  const run = reader();
  assert.equal(run('shouldCommitBack(60,60,390)'), false);
  assert.equal(run('shouldCommitBack(150,150,390)'), true);
  assert.equal(run('shouldCommitBack(180,260,390)'), false);
  assert.equal(run('shouldCommitBack(200,210,390)'), true);
  assert.equal(run('shouldCommitBack(150,150,1000)'), false);
});

test('sliding back previews movement and commits only after the settling callback', () => {
  const run = reader();
  run(`window.handlers={};window.distance=0;window.settled=null;
    beginBackSlide=()=>({width:390,update(x){window.distance=x;},cancel(){},finish(commit,action){window.settled={commit,action};}});
    bindChapterSwipe({addEventListener(name,fn){handlers[name]=fn;}},false);
    state.tab='prayers';selectedPrayer=PRAYERS[0].id;
    window.start=()=>handlers.touchstart({touches:[{clientX:50,clientY:100}],target:{closest:()=>false}});
    window.move=x=>handlers.touchmove({touches:[{clientX:x,clientY:103}],cancelable:true,preventDefault(){}});
    window.end=x=>handlers.touchend({changedTouches:[{clientX:x,clientY:103}]});
    start();move(250);`);
  assert.equal(run('window.distance'), 200);
  assert.notEqual(run('selectedPrayer'), null);
  run('end(250)');
  assert.equal(run('settled.commit'), true);
  assert.notEqual(run('selectedPrayer'), null);
  run('settled.action()');
  assert.equal(run('selectedPrayer'), null);
});

test('short drags, reversing, touch cancellation, and multiple fingers never navigate', () => {
  const run = reader();
  run(`window.handlers={};window.lastCommit=null;
    beginBackSlide=()=>({width:390,update(){},cancel(){},finish(commit){window.lastCommit=commit;}});
    bindChapterSwipe({addEventListener(name,fn){handlers[name]=fn;}},false);
    state.tab='prayers';selectedPrayer=PRAYERS[0].id;
    window.start=()=>handlers.touchstart({touches:[{clientX:50,clientY:100}],target:{closest:()=>false}});
    window.move=x=>handlers.touchmove({touches:[{clientX:x,clientY:103}],cancelable:true,preventDefault(){}});
    window.end=x=>handlers.touchend({changedTouches:[{clientX:x,clientY:103}]});`);
  for (const gesture of [
    'start();move(110);end(110)',
    'start();move(330);move(240);end(240)',
    'start();move(330);handlers.touchcancel()',
    'start();move(330);handlers.touchmove({touches:[{},{}]})',
  ]) {
    run(gesture);
    assert.equal(run('window.lastCommit'), false);
    assert.notEqual(run('selectedPrayer'), null);
  }
});

test('personal context imports full articles safely and preserves v1 compatibility', () => {
  const run = reader();
  run(`window.oldImport = validatePersonalNotes({notes:{'JHN:1:1':{body:'Keep this note'}},preambles:{JHN:{body:'Old introduction'}}});`);
  assert.equal(run('oldImport.guides.length'), 0);
  assert.equal(run('oldImport.preambles.JHN.body'), 'Old introduction');
  run(`window.contextImport = validatePersonalNotes({...oldImport, guides:[{title:'Guide',blocks:[{type:'heading',text:'<img src=x onerror=alert(1)>'},{type:'paragraph',text:'Full text'},{type:'table',rows:[['<script>','Value']]}]}],introductions:{JHN:{title:'John',blocks:[{type:'paragraph',text:'Book context'}]}}}); applyPersonalNotes(contextImport);`);
  assert.equal(run('personalIntroductions.JHN.blocks[0].text'), 'Book context');
  assert.equal(run('personalGuides.length'), 1);
  assert.equal(run('STUDY.notes["JHN:1:1"].body'), 'Keep this note');
  const html = run('studyArticleHtml(personalGuides[0])');
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('<table>'));
  assert.ok(!html.includes('<script>'));
  assert.throws(() => run(`validatePersonalNotes({...oldImport,guides:[{title:'Invalid',blocks:[{type:'html',text:'<script>'}]}]})`));
});

test('chapter lists cover every chapter and mark only the current book and chapter', () => {
  const run = reader();
  run(`state.book='PSA'; state.chapter=100;`);
  const html = run('chapterListHtml("PSA")');
  assert.equal((html.match(/data-chapter=/g) || []).length, 150);
  assert.equal((html.match(/aria-current/g) || []).length, 1);
  assert.ok(html.includes('Chapter 100</span><small>Reading'));
  assert.ok(!run('chapterListHtml("JHN")').includes('aria-current'));
});
