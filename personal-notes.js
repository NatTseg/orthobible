// Personal notes stay in this browser's IndexedDB, separate from app cache updates.
let personalNotesCount = 0;
let personalNotesRevision = 0;
function validatePersonalNotes(data) {
  if (!data || typeof data.notes !== "object" || !data.notes || Array.isArray(data.notes))
    throw new Error("Choose a valid orthobible study-notes JSON file.");
  const notes = {}, preambles = {};
  for (const [key, note] of Object.entries(data.notes)) {
    const match = key.match(/^([A-Z0-9]{3}):(\d+):(\d+)$/);
    if (!match || !window.BIBLE.books.some((b) => b.id === match[1]) ||
        +match[2] < 1 || +match[3] < 1 || !note || typeof note.body !== "string")
      throw new Error("The notes file contains an invalid verse reference or note.");
    notes[key] = {
      kind: typeof note.kind === "string" ? note.kind : "note",
      title: typeof note.title === "string" ? note.title : "",
      body: note.body,
      see: Array.isArray(note.see) ? note.see.filter((v) => typeof v === "string" && /^[A-Z0-9]{3}:\d+:\d+$/.test(v)) : [],
    };
  }
  if (!Object.keys(notes).length) throw new Error("This file has no study notes.");
  for (const [key, intro] of Object.entries(data.preambles || {})) {
    if (!window.BIBLE.books.some((b) => b.id === key) || !intro || typeof intro !== "object") continue;
    preambles[key] = Object.fromEntries(
      ["author", "date", "theme", "body", "outline"].map((name) => [name, typeof intro[name] === "string" ? intro[name] : ""]),
    );
  }
  return { notes, preambles };
}
function personalNotesStore(mode, value) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("orthobible-personal", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("study");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("study", mode);
      const store = tx.objectStore("study");
      const operation = mode === "readwrite" ? store.put(value, "notes") : store.get("notes");
      tx.oncomplete = () => { db.close(); resolve(operation.result); };
      tx.onabort = tx.onerror = () => { db.close(); reject(tx.error || new Error("Could not store notes.")); };
    };
  });
}
function applyPersonalNotes(data) {
  window.STUDY.notes = data.notes;
  window.STUDY.preambles = { ...window.STUDY.preambles, ...data.preambles };
  personalNotesCount = Object.keys(data.notes).length;
  const top = pane.scrollTop;
  if (state.tab === "bible") renderChapter(state.scroll);
  else if (state.tab === "wisdom") renderWisdom();
  pane.scrollTop = top;
}
async function restorePersonalNotes() {
  const revision = personalNotesRevision;
  try {
    const data = await personalNotesStore("readonly");
    if (data && revision === personalNotesRevision) applyPersonalNotes(validatePersonalNotes(data));
  } catch {
    // Built-in notes remain usable when IndexedDB is unavailable.
  }
}
async function importPersonalNotes(event) {
  const input = event.target, file = input.files?.[0];
  if (!file) return;
  input.disabled = true;
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error("Choose a study-notes file smaller than 20 MB.");
    const data = validatePersonalNotes(JSON.parse(await file.text()));
    await personalNotesStore("readwrite", data);
    personalNotesRevision++;
    applyPersonalNotes(data);
    const status = document.getElementById("personalNotesStatus");
    if (status) status.textContent = `${personalNotesCount.toLocaleString()} imported notes stored on this device.`;
    navigator.storage?.persist?.().catch(() => {});
    notify("Study notes saved for offline reading.");
  } catch (error) {
    notify(error instanceof SyntaxError ? "Choose a valid study-notes JSON file." : error.message || "Could not save notes. Check available storage and try again.");
  } finally {
    input.disabled = false;
    input.value = "";
  }
}
