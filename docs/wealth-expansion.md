# Wealth expansion — implementation and release status

13 October 2026. Bills and AI are deliberately excluded from this pass.

## Implemented

- **Accounts:** create, rename, balance adjustment, archive/restore, exclusion from totals. Balances use pesos; foreign transaction amounts retain their recorded conversion rates.
- **Records:** expenses, income, transfers with fees, debt payments, borrowing, lending and collection. Edit, duplicate, delete, descriptions, people, categories, event tags, report exclusion and manual receipt-upload control.
- **Integrity:** monetary changes share one reducer. Edits reverse the old effect before applying the new one. Deletion restores linked balances. Insufficient balances and invalid precision are rejected. Older records without account IDs cannot safely be reversed; the UI reports this instead of guessing.
- **Reports:** date range, account/event filters, prior-period comparison, category spending bars, category search drilldown with optional parent grouping, CSV export with spreadsheet-formula escaping. Transfers do not inflate income/spending; fees count as spending.
- **Planning:** savings targets linked to actual account balances; fund them using transfers. Recurring income/expenses support daily, weekly, monthly and yearly schedules, pause, end dates and review-before-posting. Occurrence IDs prevent duplicate posting.
- **Organization:** custom categories with parent relationships, grouped reports, rename/merge propagation, and event/trip records; archive rather than erase account history.
- **Budgets:** custom date ranges, multiple categories, account scope, historical budgets, matching-scope rollover, 75% warning, overspend display and simple pace projection. Budget warnings appear in the app; no push notifications are claimed.

## Frontend and backend

Existing Seneca dialogs, AdminSelect, NumberFlow, buttons and design tokens are reused. No new packages.

Authenticated ledger mutations use a Firestore transaction against `users/{uid}/global_data/wealth`, reading the server version and committing assets, liabilities, records, plans and budgets together. Pending legacy saves must finish first. These operations require a connection; failed saves retain the dialog and display an error.

Local sessions use the same reducer and a recovery record before replacing cached fields. The recovery record is read on reload if interrupted. This is local persistence, not cloud synchronization.

Planning data is additive in `planningV1`. Existing assets, liabilities and transactions retain their fields. Existing monthly budgets remain readable. Unlinked legacy transactions are not silently assigned accounts. Budget writes now use the same transactional mutation path.

Receipts use the existing authenticated Firebase Storage upload service. Files are restricted to JPG/PNG/WebP under 8 MB before compression. Upload and unlinking are separate from financial posting; unlinking does not delete the storage object. Storage lifecycle cleanup and live rules verification remain release work.

## Explicitly unfinished

| Feature | Remaining requirement |
|---|---|
| Shared wallets | Membership/invitation backend, owner/editor permissions, security rules and emulator authorization tests. No sharing controls were added without access enforcement. |
| Bank linking | User-selected provider with Philippine coverage, credentials in server configuration, consent flow and webhook reconciliation. |
| Native biometrics/widgets/payment shortcuts | Platform choice and native application integration; browser controls are not equivalents. |
| Google Sheets direct export | OAuth and Sheets integration; CSV export is implemented. |
| Automatic FX rates | Trusted rate provider; this pass stores an explicitly entered historical rate. |
| Background recurring posting | Durable scheduler and operational monitoring; current implementation requires review and posting in-app. |
| Push alerts | In-app warnings are implemented; push delivery requires a notification service. |
| Full credit-card servicing | Account balance and repayment records exist; statement cycles and interest calculation do not. Bills are excluded by request. |
| Proprietary Money Insider parity | Period comparisons exist; no claim of reproducing the separate paid service. |

## Validation and design review

19 monetary unit tests passed, covering reversals, transfers/fees, borrowing/lending, invalid amounts, duplicate IDs, CSV escaping, recurrence, report filters and budget boundaries. Six desktop/mobile browser checks passed, including the earlier Journal/expense regression flows plus account creation/edit, transfers, recurrence, reload and downloads. Final TypeScript/lint results are recorded separately in `.audit/workbench-*`.

Before: unrelated transaction changes could leave balances behind; tools were limited to monthly summaries. After: new money operations use the same validated ledger and the workbench exposes focused views. Flat category bars show actual proportions, dividers separate the three monetary totals, and mobile tabs scroll rather than squeeze. Reduced-motion CSS is retained; NumberFlow respects motion preference.

Not verified: live Firestore/Storage authorization, real-device biometrics, actual receipt upload, 10%-speed motion review, keyboard-only traversal of every dialog, cross-device concurrency against production data. Existing migration audit still applies, especially private-cache isolation. Nothing is deployed and full Money Lover parity is not complete.

Final verification: all 19 monetary unit tests, six desktop/mobile browser tests, targeted ESLint and full TypeScript checks passed. The browser flow also verifies category rename propagation into a posted recurring transaction. Screenshots are in `.audit/workbench-results/`.

Storage ceiling: Wealth still uses one Firestore document, subject to Firestore's document-size limit. A high-volume ledger should move to per-record documents before large imports. This implementation does not remove that existing architectural limit.
