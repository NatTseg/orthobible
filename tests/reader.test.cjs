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
    style: { setProperty() {} },
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
        "orthodox-bible-v19",
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
  assert.deepEqual(deleted, ["orthodox-bible-v13", "orthodox-bible-v18"]);
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

test("viewport fit follows the keyboard and restores responsive height without overriding zoom", () => {
  const run = reader();
  run(
    "document.documentElement.style.setProperty = (name, value) => window.testHeight = value; window.innerHeight = 844; window.visualViewport = {height: 360, scale: 1}; fitViewport();",
  );
  assert.equal(run("window.testHeight"), "360px");
  run("window.visualViewport.height = 844; fitViewport();");
  assert.equal(run("window.testHeight"), "844px");
  run("window.visualViewport = {height: 422, scale: 2}; fitViewport();");
  assert.equal(run("window.testHeight"), "844px");
});

test('prayer book entries have unique IDs and available text', () => {
  const run = reader();
  assert.equal(run('PRAYERS.length'), 8);
  assert.equal(run('new Set(PRAYERS.map(p => p.id)).size'), 8);
  assert.equal(run('PRAYERS.every(p => p.title && (p.text?.trim() || chapterText(p.book, p.chapter).length > 1))'), true);
});
