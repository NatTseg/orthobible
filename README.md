# orthobible

Live: https://nattseg.github.io/orthobible/

A simple, offline Scripture reader. LXX2012 Septuagint Old Testament with the World English Bible New Testament, original study notes, bookmarks, highlights, comments, and passages for everyday life.

- **Read:** choose any book and chapter; tap a verse number to save or annotate it.
- **Search:** enter a reference such as John 3:16 or a phrase such as “love one another.”
- **Wisdom:** browse passages by topic.
- **Prayers:** a simple prayer book with eight prayers and Psalm text, available offline.
- **Personal study notes:** import your `orthobible-study-notes.json` in Reading settings to store your notes and introductions on this device for offline use. New Testament notes link from verses. Original Old Testament notes remain accessible below chapters in a reference browser; their alignment with LXX2012 is explicitly unverified.
- **Saved:** filter your bookmarks, highlights, and comments.
- **Go back:** drag right from a prayer, Wisdom topic, reading guide, book picker, or linked passage. The current view slides with your finger and reveals its parent. Release beyond roughly one third of the view to go back; a short drag, reversal, or touch cancellation restores the current view.
- **Reading settings:** change text size, light/dark appearance, introductions, and notes.

Footer buttons always open their section’s main view. Preferences, saved verses, and imported study notes remain in this browser. Existing `obible3` data is preserved across the redesign. Calendar and Hours sections have been removed.

The Bible text is LXX2012 + WEB NT, not the printed Orthodox Study Bible’s SAAS/NKJV translation. Built-in introductions and verse notes are original; users can import notes from their own copy without uploading them to this repository.

## Local preview

Run `python3 -m http.server 8080` in this directory, then open http://localhost:8080. No build step or external dependencies are required. Use an HTTP server rather than opening index.html as a file.

See `GITHUB.md` for GitHub Pages and offline installation. Run regression checks with `node --test tests/*.test.cjs`.

## Text and numbering

- Old Testament: [LXX2012](https://ebible.org/eng-lxx2012/), Brenton’s Greek Septuagint translation with language updates by Michael Paul Johnson; public domain.
- New Testament: existing World English Bible text, unchanged; public domain.
- All 28,326 source verse records are preserved, including the source’s combined verse labels and omissions. No missing LXX verses are filled from WEB. Psalm 151 is a separate reader entry. Daniel’s additions and the Letter of Jeremiah retain their separate source books. The earlier Hebrew Esther duplicate and 2 Esdras are no longer in the main reader.
- Psalm numbering follows LXX2012. Wisdom references and the Psalm 50 (51) prayer were updated. A Proverbs 22:6 Wisdom reference was removed because that verse is absent from this edition.
- Existing OT bookmarks, highlights, and comments are preserved under Saved → Saved before the Septuagint update, with their original WEB wording and references. NT saves remain attached. `legacy-web-data.js` is retained solely for this offline migration and reference archive.
- Imported OSB notes are not assumed to share LXX2012 verse numbering. All original note keys and text remain available through the notes browser below OT chapters. They are not pinned to unverified LXX verses.

Rebuild with `python3 scripts/build_septuagint.py /path/to/eng-lxx2012_vpl.zip`. The source URL, SHA-256, and counts are recorded in `data/lxx2012-source.json`. The script takes the unchanged WEB NT and migration archive from commit `b42fa0d`.
