# Seneca's Firebase rules

`firestore.rules` and `storage.rules` are copies of the rules live on the
`seneca-web` project, pulled on 2026-10-19 (Firestore ruleset
`d535f295-6ac4-447f-b6bc-7fa90ed72ede`, Storage ruleset
`9ef3db95-307a-43f3-bb50-bf3711486727`). They're the record of what protects
the data: the Firebase web config in `.env.production` is public by design.

Both are owner-only. A signed-in account with a verified email can read and
write its own `users/{uid}/…` tree and nothing else.

These files aren't deployed from here. To change the rules, edit them in the
Firebase console (or deploy with the Firebase CLI), then copy the result back
here so the two stay the same.

## Repeatable verification

On 2026-11-12, both rule files were fetched again through Firebase MCP and
matched these copies. No production records were read or changed by the tests.

Install Node 22 and Java 21, then from the repository root:

```sh
npm ci
npm ci --prefix firebase --ignore-scripts
npm run test:firebase
```

The isolated test tools have their own pinned lockfile. The suite starts only
Firestore and Storage on loopback, using `demo-seneca-verification`. It rejects
unexpected emulator addresses; a demo project cannot fall back to live services.
The CLI downloads emulator binaries on the first run. CI runs the same suite.

Tests cover verified-owner CRUD, anonymous/unverified/cross-owner denial,
collection queries, unknown paths, forged daily-log ownership, image types and
upload size limits. They also run the actual `dataLogger.ts` through the Firebase
SDK to check concurrent field edits, selected-day writes, undo after reload,
offline reconnection, and queued-write isolation on account switching.

These are integration tests with synthetic auth claims and browser lifecycle
adapters. They do not prove real Google login, browser IndexedDB persistence,
mobile interactions, or every simultaneous-edit conflict. The rules restrict
owners and basic write shape; `data.size()` counts top-level fields, and the date
rule validates shape rather than real calendar dates. The client validates dates.
Storage checks declared content type and size, not image bytes; the app's upload
pipeline decodes/re-encodes images before upload.
