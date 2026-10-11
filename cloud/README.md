# Optional cloud sync

Phone persistence, offline reading, and file backups work with `window.ORTHOBIBLE_CLOUD = null`. This is the default. No cloud requests are sent and no cloud setup is shown to readers.

The optional adapter uses Supabase Auth and Postgres. It has been tested with mocked HTTP responses and a local Postgres-compatible PGlite database, but has not been connected to a live project.

To enable it in a future deployment:

1. Create a project and run `schema.sql` in its SQL editor. Keep row-level security enabled.
2. Create the intended user's email/password account through the project's authentication administration. The app supplies sign-in, not public account registration.
3. Set the project's public URL and publishable key in `cloud-config.js`. Never use a service-role or secret key.
4. Increment the service worker cache version and deploy. Sign in through Reading settings → Cloud sync on each device.
5. Verify with two separate accounts that each can access only its own row, then test offline edits and conflict recovery before relying on it.

One row per user stores reading data and optional imported study material. Authentication and row-level security restrict access; this is not end-to-end encryption. Only enable it if storing that personal material with the backend is acceptable. Access and refresh tokens stay in local IndexedDB and are excluded from file backups.

Sync merges independent changes, including deletions, against the last shared snapshot. Competing changes pause for an explicit choice and retain recovery copies. A revision check prevents stale writes. Unchanged study material is not uploaded on every reading-position update. Disconnecting retains the device's reading data and does not delete the remote row.

Run application checks with `node --test tests/*.test.cjs`. For database checks, install `@electric-sql/pglite` in a temporary directory and run `ORTHOBIBLE_PGLITE_MODULE=/absolute/path/to/node_modules/@electric-sql/pglite/dist/index.js node scripts/test_cloud_schema.mjs`. The test checks owner-only access, anonymous denial, stale revisions, and retention of unchanged study material.
