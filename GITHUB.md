# GitHub Pages and offline installation

Live: https://nattseg.github.io/orthobible/

Publish the repository root from `main` using Settings → Pages → Deploy from a branch.

Keep these files together: `index.html`, `app.js`, `styles.css`, `bible-data.js`, `study-data.js`, `wisdom-data.js`, `prayers-data.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `apple-touch-icon.png`, and `icon-512.png`.

Open the Pages URL while connected, let the first download finish, then use your browser’s “Add to Home Screen” or “Install” command. After the service worker has cached the app, it works offline. Bookmarks, comments, highlights, and progress are stored in this browser.

When changing app files, increment the cache version in `sw.js` so installed readers receive the new assets. Close and reopen the app after an update to use the new version. Do not clear site data to update: that also erases saved verses.

After the lowercase repository rename, open the new URL online once to cache it for offline reading. Existing saved verses and preferences use the same browser storage keys on the same GitHub Pages origin. If a Home Screen shortcut still points to `/OrthoBible/`, add the new address to your Home Screen. Keep site data when updating.
