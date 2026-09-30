# Product research: Superhuman, Loop and ClickUp

Research completed October 1, 2026. Implementation: writing workspace Review queue.

## Scope and evidence

This is a product and interaction study of public documentation, product pages and official UI examples. It is not a source-code audit of proprietary applications. I inspected ClickUp's documented inbox screenshot in the browser; authenticated product workspaces were not exercised. Behavior below is documented unless explicitly labeled a proposal. Plan availability and enterprise settings can differ.

Our system remains a publishing-focused Tiptap editor. The useful common thread is helping a writer decide what deserves attention, retain source context, and move from notes to action without building an entire project-management suite.

## Distinctive patterns

### Superhuman: attention is a workflow

The website now represents a suite. Coda became Superhuman Docs in July 2026; evaluating only the email product would miss connected document workflows. Announced AI Views are described as a closed beta, so they should not be treated as a stable dependency. [Product announcement](https://blog.superhuman.com/introducing-superhuman-docs/)

Mail's Remind Me separates deferred work from active attention. Users can choose a preset or date, change or remove a reminder, and distinguish pending reminders from messages that have returned. Conditional return on no reply is an email-specific refinement. The transferable idea is to hide future work from the active queue while keeping it inspectable. Our adaptation uses Due/Later, not conditional email delivery. [Remind Me](https://help.superhuman.com/hc/en-us/articles/46005666142733-Remind-Me)

Split inboxes use criteria to produce meaningful views. They do not require copying the underlying messages into unrelated lists. For writing, our existing collections already offer saved filters; adding another parallel collection system would create confusion. [Custom split inboxes](https://help.superhuman.com/hc/en-us/articles/46005853223309-Create-Your-Own-Split-Inbox)

Snippets combine reusable writing with fast insertion and placeholders. Our existing templates cover whole-page reuse; a future small-fragment insertion flow would be more valuable than duplicating the template library. Keep placeholders visible until deliberately filled. [Snippets](https://help.superhuman.com/hc/en-us/articles/46005686571149-Snippets)

Superhuman Docs makes multiple views of the same underlying table explicit. Filtering changes what is shown, while edits still affect the same source records. This reinforces our decision to derive Review queue rows directly from page metadata. [Connected table views](https://help.superhuman.com/hc/en-us/articles/46210143294605-Create-connected-table-views)

Its doc map exposes relationships between tables and views. A writing equivalent could show where a reusable excerpt is used and whether its source has changed. That is a focused future feature, not a reason to adopt a spreadsheet engine. [Doc map](https://help.superhuman.com/hc/en-us/articles/46210310913293-Navigate-your-doc-via-the-doc-map)

### Microsoft Loop: preserve the connection to the source

Loop distinguishes components, pages and workspaces. A component can participate in several contexts without becoming an independent copy. This is useful for reusable research, quotations and shared facts. Our source-linked excerpts already preserve origin information; live editing of embedded public content would need much stronger publication boundaries. [Getting started](https://support.microsoft.com/en-us/loop/get-started-with-microsoft-loop)

An especially important detail: access to a Loop component is separate from access to the email that contains it. An attractive embed is not an authorization model. For us, a public article must never resolve a private draft merely because it contains a page reference. Any future component export needs an explicit published snapshot. [Components in Outlook](https://support.microsoft.com/en-us/loop/use-loop-components-in-outlook)

Saving an existing page as a workspace template gives reuse an obvious origin. We already support page-to-template and template-to-draft. Improve discoverability and preview before adding a second system. [Page templates](https://support.microsoft.com/en-us/loop/save-an-existing-loop-page-as-a-template)

Task lists can connect to Planner rather than requiring people to maintain duplicate action lists. Our equivalent opportunity is linking a review note to its exact page/block and keeping its resolution state in one place. Review reminders and unresolved review notes are distinct: completing one must not silently resolve the other. [Tasks and Planner](https://support.microsoft.com/en-us/loop/manage-your-tasks-from-loop-task-lists-and-collaborative-notes-in-planner)

The published storage architecture depends on creation context: Loop application workspaces use SharePoint Embedded, while other entry points may use OneDrive or SharePoint sites. Ownership and lifecycle matter as much as the editor. This documents storage boundaries, not the entire private backend implementation. Our corresponding rule is to keep private research and editorial metadata out of public article serialization. [Storage overview](https://learn.microsoft.com/en-us/microsoft-365/loop/loop-storage?view=o365-worldwide)

### ClickUp: keep actions next to their context

The inbox distinguishes Primary, Other, Later and Cleared. Its official UI example uses compact rows, simple tabs and contextual actions instead of separate cards for every control. Our queue uses the two states that actually exist in our data model: Due and Later. [Inbox](https://help.clickup.com/hc/en-us/articles/33947959867543-What-is-the-Inbox)

Snoozing supports presets and custom timing, while Later provides a place to inspect postponed work. The important interaction is reversible deferral. We implement explicit timing and one-step Undo; we do not promise notifications or background delivery. [Snooze](https://help.clickup.com/hc/en-us/articles/15643479240599-Snooze-Inbox-notifications)

ClickUp connects documents to tasks and distinguishes explicit relationships from references. That distinction would improve a future dependency feature: mentioning another article is not the same thing as declaring it a publishing prerequisite. Existing backlinks should remain references. [Relationships](https://help.clickup.com/hc/en-us/articles/6304528030743-Intro-to-Relationships), [Doc relationships](https://help.clickup.com/hc/en-us/articles/6325337447063-See-and-create-Doc-Relationships)

Keyboard triage includes undo operations. We should expose actions through existing configurable commands without hijacking ordinary letters while writing. The present queue uses normal keyboard-accessible buttons, the shared workspace selector, and explicit Undo. No new global shortcuts were added. [Shortcuts](https://help.clickup.com/hc/en-us/articles/6304528030743-Use-keyboard-shortcuts)

## Comparison with our system

| Pattern | Existing implementation | Decision |
|---|---|---|
| Saved contextual views | Research collections with rules | Keep and extend, no duplicated storage |
| Deferred attention | Private editorial review date in Details | Implement Due/Later review queue |
| Fast scheduling | Manual UTC field | Add Manila-time presets and custom time in queue |
| Reversible triage | No dedicated review triage | Add version-checked Undo |
| Whole-page templates | Research template library | Already present; improve discoverability later |
| Linked source content | Excerpts with source identity/fingerprint | Future source usage map and refresh comparison |
| Document relationships | Page mentions, incoming/outgoing references | Keep; explicit dependencies would be a separate model |
| Task/project system | Editorial stages and review notes | Avoid replacing publishing with generalized task management |
| Command-driven UI | Search palette and configurable shortcuts | Reuse existing infrastructure |
| Collaboration permissions | Private admin and explicit public publishing | Do not expose drafts through dynamic public embeds |

## Implemented plan

1. Derive a queue from existing non-trashed pages with valid review dates.
2. Sort by due instant and stable page identity; partition exact-now dates into Due.
3. Display Due/Later counts and rows that open the original page.
4. Add Tomorrow and In a week at 9 am Manila, plus a custom date and time.
5. Save UTC instants through the existing authenticated API with the original page version.
6. Keep editorial stage, body, publication schedule and publishing state unchanged.
7. “Reviewed” clears the reminder only. It does not record a review-history event or resolve review notes.
8. Offer one-step Undo using the returned version. Concurrent changes cause a conflict and require reload.
9. Refresh timing every 30 seconds while mounted and on window focus.
10. Refresh the main writing list after closing the workspace.

### UI changes

| Before | After |
|---|---|
| Review dates buried in page metadata | Dedicated workspace view |
| Future and overdue work mixed in lists | Due/Later separation with counts |
| Repeated manual date entry | Two useful presets and custom date/time |
| No direct reversal | Visible Undo after successful changes |
| Scheduling context unclear | Explicit Manila timezone, UTC timestamp on hover |
| Dense card-per-action temptation | Simple rows, restrained separators, inline scheduling form |

Scheduling expands inline so it cannot become a nested popup clipped by the workspace sheet. Controls remain visible on touch screens. Existing admin typography, buttons, colors and selector are reused. No new UI dependency or motion is required.

### Implementation boundaries

- Pure helpers: cms/review-queue.ts.
- UI and guarded writes: app/admin/ui/ReviewQueue.tsx.
- View integration: ResearchWorkspace.tsx.
- List refresh: PostList.tsx.
- Storage: existing editorial.reviewAt, no migration or second reminder database.
- Requests contain only editorial and base; the server already validates metadata and prevents stale saves.
- Writes participate in session pending-work protection.
- Browser tests mock the API; they verify client payloads and handling, not production Cloudflare configuration.
- There is no background notification service. Dates surface when the workspace is open.
- Undo lasts for the current queue session and most recent successful action.
- Unscheduled pages are intentionally absent; set a review date from Details first.

## Next implementation candidates

These are proposals, not shipped features.

### 1. Source usage inspector

Use existing page/block IDs and excerpt fingerprints to list reuse locations, indicate source changes and compare before updating. Support missing or trashed sources explicitly. Keep a snapshot in published output so a draft edit cannot silently change a live article.

Acceptance: updating a source marks dependent excerpts stale; the writer can inspect both versions; accepting refresh preserves surrounding content; no private source appears in public output.

### 2. Reusable fragment insertion

Add template fragments to slash/command search with a short preview and visible placeholders. Insert fresh block IDs and preserve the original fragment. Distinguish inserting a copy from inserting a source reference.

Acceptance: duplicate insertion has no block-ID collisions, one undo reverses insertion, placeholders remain easy to find, links and media pass existing validation.

### 3. Explicit editorial dependencies

Model page A requiring page B as a distinct relation. Show a warning in publication checks; do not automatically publish dependencies. Validate missing targets, cycles and trashed pages. Start with warning-only behavior before considering hard gates.

Acceptance: ordinary mentions never create dependencies; changing a prerequisite is visible; public output does not expose private titles.

### 4. Review history, only if needed

If recurring reviews become important, add reviewedAt and a deliberate recurrence model. Do not infer review completion from updatedAt, since correcting a typo is not the same as reviewing an article.

Acceptance: completion and next occurrence are saved atomically, timezone rules are explicit, Undo reverses the whole transition, and failed saves remain recoverable.

## Deliberate exclusions

No generalized CRM, work timers, email ingestion, autonomous publishing or AI task generation. No copying proprietary assets or claiming knowledge of private backend internals. These products are references for interaction design; the implementation is native to this application.

## Validation

- 81 unit tests passed, including queue partitioning, invalid-date rejection and Manila/UTC year-boundary conversions.
- Desktop and mobile browser tests passed for rescheduling, Undo, conflict feedback, reloading, clearing, custom time conversion and focus restoration.
- Browser assertions verify that writes contain only editorial metadata and the expected version.
- Desktop and mobile screenshots were inspected; inline scheduling stays inside the scrollable workspace sheet.
- Production build passed, including lint/type validation and static export. Existing unrelated lint warnings remain.
