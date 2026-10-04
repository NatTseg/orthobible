# orthobible

Live: https://nattseg.github.io/orthobible/

A simple, offline Scripture reader. World English Bible with deuterocanon in Orthodox Study Bible book order, original study notes, bookmarks, highlights, comments, and passages for everyday life.

- **Read:** choose any book and chapter; tap a verse number to save or annotate it.
- **Search:** enter a reference such as John 3:16 or a phrase such as “love one another.”
- **Wisdom:** browse passages by topic.
- **Prayers:** a simple prayer book with eight prayers and Psalm text, available offline.
- **Personal study notes:** import your `orthobible-study-notes.json` in Reading settings to store your notes and introductions on this device for offline use. Notes appear beneath each chapter and link from the corresponding verses.
- **Saved:** filter your bookmarks, highlights, and comments.
- **Go back:** swipe right from a prayer, Wisdom topic, reading guide, book picker, or linked passage to return to its parent view.
- **Reading settings:** change text size, light/dark appearance, introductions, and notes.

Footer buttons always open their section’s main view. Preferences, saved verses, and imported study notes remain in this browser. Existing `obible3` data is preserved across the redesign. Calendar and Hours sections have been removed.

The printed Orthodox Study Bible (NKJV / St. Athanasius Academy Septuagint and copyrighted notes) is not copied here. Built-in introductions and verse notes are original; users can import notes from their own copy without uploading them to this repository.

## Local preview

Run `python3 -m http.server 8080` in this directory, then open http://localhost:8080. No build step or external dependencies are required. Use an HTTP server rather than opening index.html as a file.

See `GITHUB.md` for GitHub Pages and offline installation. Run regression checks with `node --test tests/*.test.cjs`.
