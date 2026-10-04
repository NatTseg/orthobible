# GitHub Pages and offline installation

Live: https://nattseg.github.io/orthobible/

Publish the repository root from `main` using Settings → Pages → Deploy from a branch.

Keep these files together: `index.html`, `app.js`, `swipe.js`, `personal-notes.js`, `styles.css`, `bible-data.js`, `legacy-web-data.js`, `edition.js`, `study-data.js`, `wisdom-data.js`, `prayers-data.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `apple-touch-icon.png`, and `icon-512.png`.

Open the Pages URL while connected, let the first download finish, then use your browser’s “Add to Home Screen” or “Install” command. After the service worker has cached the app, it works offline. Bookmarks, comments, highlights, and progress are stored in this browser.

When changing app files, increment the cache version in `sw.js` so installed readers receive the new assets. Close and reopen the app after an update to use the new version. Do not clear site data to update: that also erases saved verses.

After the lowercase repository rename, open the new URL online once to cache it for offline reading. Existing saved verses and preferences use the same browser storage keys on the same GitHub Pages origin. If a Home Screen shortcut still points to `/OrthoBible/`, add the new address to your Home Screen. Keep site data when updating.

## Personal study notes on your phone

Transfer `orthobible-study-notes.json` from your Mac to Files on your phone (for example, with AirDrop). Open the installed orthobible app, choose Reading settings → Import study notes, and select that file. Wait for the imported note count, then open a chapter. The file is stored in this device’s IndexedDB and is available after offline reloads; app-cache updates do not delete it. Import in the browser or Home Screen app you intend to use, since storage can be separate. Keep the notes file as a backup: clearing browser/site data or removing an app can remove its local data.

The existing extracted note references are preserved. The reader uses LXX2012 for the Old Testament and WEB for the New Testament. Imported OT notes can be read from the notes section below each chapter, using their original reference numbers; they are not automatically attached to LXX2012 verses. Importing notes does not replace the Bible text with the printed OSB translation.
