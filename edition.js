// Reference handling and a non-destructive transition from the previous WEB reader.
function isSeptuagint(book) {
  return window.BIBLE.books.find((b) => b.id === book)?.translation === "LXX2012";
}
function psalmFromHebrew(chapter) {
  if (chapter <= 9) return chapter;
  if (chapter <= 113) return chapter - 1;
  if (chapter <= 115) return 113;
  if (chapter === 116) return 114;
  if (chapter <= 146) return chapter - 1;
  if (chapter === 147) return 146;
  return chapter;
}
function migrateEdition(preferences) {
  if (preferences.edition === window.BIBLE.edition) return preferences;
  const result = { ...preferences, edition: window.BIBLE.edition };
  const archived = new Map((Array.isArray(preferences.legacySaved) ? preferences.legacySaved : []).map((x) => [x.key, x]));
  const legacy = window.LEGACY_WEB?.t || {};
  const archive = (book, chapter, verse) => {
    if (!legacy[book]) return null;
    const key = `${book}:${chapter}:${verse}`;
    if (!archived.has(key)) archived.set(key, {
      key, book, chapter, verse, text: legacy[book]?.[chapter - 1]?.[verse] || "",
      name: window.LEGACY_WEB.books.find((b) => b.id === book)?.name || book,
      source: "WEB",
    });
    return archived.get(key);
  };
  result.bookmarks = (Array.isArray(preferences.bookmarks) ? preferences.bookmarks : []).filter((item) => {
    if (!item) return false;
    const saved = archive(item.book, item.chapter, item.verse);
    if (saved) { saved.bookmark = true; saved.ts = item.ts; return false; }
    return true;
  });
  for (const [field, target] of [["comments", "comment"], ["highlights", "highlight"]]) {
    result[field] = {};
    for (const [key, value] of Object.entries(preferences[field] || {})) {
      const [book, ch, v] = key.split(":");
      const saved = archive(book, +ch, +v);
      if (saved) saved[target] = value;
      else result[field][key] = value;
    }
  }
  result.legacySaved = [...archived.values()];
  if (legacy[result.book]) {
    if (result.book === "ESG") result.book = "EST";
    if (result.book === "DAG") result.book = "DAN";
    if (result.book === "2ES") result.book = "1ES";
    result.chapter = result.book === "PSA" ? psalmFromHebrew(result.chapter || 1) : 1;
    result.scroll = 0;
  }
  return result;
}
function sourceVerseStart(book, chapter, verse) {
  if (window.BIBLE.t[book]?.[chapter - 1]?.[verse]) return verse;
  const prefix = `${book}:${chapter}:`;
  for (const [key, end] of Object.entries(window.BIBLE.spans || {})) {
    if (!key.startsWith(prefix)) continue;
    const start = +key.split(":")[2];
    if (verse >= start && verse <= end) return start;
  }
  return verse;
}
function sourceVerseLabel(book, chapter, verse) {
  const end = window.BIBLE.spans?.[`${book}:${chapter}:${verse}`];
  return end ? `${verse}–${end}` : String(verse);
}
function legacySavedHtml() {
  const entries = (state.legacySaved || []).filter((entry) =>
    savedFilter === "all" || (savedFilter === "bookmarks" ? entry.bookmark : savedFilter === "comments" ? entry.comment : entry.highlight),
  );
  if (!entries.length) return "";
  return `<section><h2 class="section-label">Saved before the Septuagint update</h2><p class="helper">Your earlier Old Testament saves retain their original WEB text, references, and comments.</p>${entries.map((entry) => `<button class="result" data-legacy-key="${esc(entry.key)}"><strong>${esc(entry.name)} ${entry.chapter}:${entry.verse} · WEB</strong><p>${esc(entry.text)}</p>${entry.comment ? `<small>Your note: ${esc(entry.comment)}</small>` : ""}</button>`).join("")}</section>`;
}
function showLegacySaved(key) {
  const entry = (state.legacySaved || []).find((item) => item.key === key);
  if (!entry) return;
  openDialog(`${entry.name} ${entry.chapter}:${entry.verse} · WEB`,
    `<p class="helper">Saved before the Septuagint update. This is the original text you saved.</p><blockquote>${esc(entry.text)}</blockquote>${entry.comment ? `<h3>Your comment</h3><p>${esc(entry.comment)}</p>` : ""}${entry.highlight ? `<p class="helper">Highlight: ${esc(entry.highlight)}</p>` : ""}`);
}
function originalStudyBooks(book) {
  if (book === "EST") return ["ESG", "EST"];
  if (["DAN", "S3Y", "SUS", "BEL"].includes(book)) return ["DAG", "DAN"];
  if (book === "LJE") return ["BAR"];
  return [book];
}
function legacyStudyNotesHtml(book) {
  const books = originalStudyBooks(book);
  const found = books.find((id) => Object.keys(window.STUDY?.notes || {}).some((key) => key.startsWith(id + ":")));
  if (!found) return "";
  return `<section class="footnotes"><h2 class="section-label">${personalNotesCount ? "Your Orthodox Study Bible notes" : "Study notes"}</h2><p class="helper">These notes retain their original references. Their verse alignment with LXX2012 has not been verified.</p><button class="secondary" data-study-book="${found}">Read notes for this book</button></section>`;
}
function originalBookName(book) {
  return window.LEGACY_WEB?.books.find((item) => item.id === book)?.name || displayName(book);
}
function showOriginalStudyNotes(book, chapter = null) {
  const all = window.STUDY?.notes || {};
  const books = [...new Set(Object.keys(all).map((key) => key.split(":")[0]))];
  if (!books.includes(book)) book = books[0];
  if (!book) return;
  const chapters = [...new Set(Object.keys(all).filter((key) => key.startsWith(book + ":")).map((key) => +key.split(":")[1]))].sort((a, b) => a - b);
  if (!chapters.includes(chapter)) chapter = chapters[0];
  const entries = Object.entries(all).filter(([key]) => key.startsWith(`${book}:${chapter}:`)).sort((a, b) => parseKey(a[0]).v - parseKey(b[0]).v);
  openDialog(personalNotesCount ? "Orthodox Study Bible notes" : "Original study notes",
    `<p class="helper">Original reference numbers from your notes file. These references have not been verified against LXX2012 and may differ from the passage currently open.</p><label for="originalNoteBook">Book</label><select id="originalNoteBook">${books.map((id) => `<option value="${esc(id)}" ${id === book ? "selected" : ""}>${esc(originalBookName(id))}</option>`).join("")}</select><label for="originalNoteChapter">Original chapter</label><select id="originalNoteChapter">${chapters.map((ch) => `<option ${ch === chapter ? "selected" : ""}>${ch}</option>`).join("")}</select>${entries.map(([key, n]) => `<article class="footnote"><small>Original reference: ${esc(originalBookName(book))} ${chapter}:${parseKey(key).v}</small><h3>${esc(n.title || "")}</h3><p>${esc(n.body)}</p></article>`).join("")}`);
  $("originalNoteBook").onchange = (event) => showOriginalStudyNotes(event.target.value);
  $("originalNoteChapter").onchange = (event) => showOriginalStudyNotes(book, +event.target.value);
}
