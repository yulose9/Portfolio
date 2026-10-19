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
