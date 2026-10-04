const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
function reader(stored = {}) {
  const element = () => ({
    addEventListener() {},
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
        "orthodox-bible-v22",
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
  run(`window.handlers = {}; window.surface = {addEventListener(name, fn) {handlers[name]=fn;}}; bindChapterSwipe(surface, false);
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
