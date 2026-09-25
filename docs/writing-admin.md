# Writing admin

A private editor at **/admin** for the Writing section.

- Drafts, autosaves, revisions and images live in the private R2 bucket
  `portfolio-writing`. Nothing unpublished ever reaches the public repo.
- **Publish** commits one Markdown file to `content/writing/<slug>.md`, which
  starts the normal Cloudflare Pages build; the post is live about a minute later.
- **Scheduled** posts wait in R2. The `portfolio-scheduler` Worker checks every
  ten minutes and publishes the ones that are due.
- Cloudflare Access guards `/admin` and `/api/admin`, and every API request
  also verifies the Access token itself (`functions/api/admin/_middleware.ts`).
  Until the steps below are done, the API answers 503 and does nothing.

## One-time setup

### 1. A GitHub token for publishing

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained
tokens** → Generate new token.

- Repository access: **Only select repositories** → `yulose9/Portfolio`
- Permissions → Repository → **Contents: Read and write** (Metadata: read is added automatically)
- Expiration: up to a year. Put a reminder in your calendar; when it expires,
  publishing fails with a message saying so, and drafts keep saving.

Copy the token (`github_pat_…`).

### 2. Cloudflare Access (who can open the admin)

Cloudflare dashboard → **Zero Trust**. The first time, it asks for a team name
(this becomes `https://<team>.cloudflareaccess.com`) and a plan: pick **Free**.

Access → Applications → **Add an application** → **Self-hosted**.

- Application name: `Writing admin`. Session duration: 24 hours.
- Add these as public hostnames, each with its path:

  | Domain | Path |
  | --- | --- |
  | `nazarene.dev` | `admin` |
  | `nazarene.dev` | `api/admin` |
  | `www.nazarene.dev` | `admin` |
  | `www.nazarene.dev` | `api/admin` |
  | `portfolio-3a4.pages.dev` | `admin` |
  | `portfolio-3a4.pages.dev` | `api/admin` |
  | `*.portfolio-3a4.pages.dev` | `admin` |
  | `*.portfolio-3a4.pages.dev` | `api/admin` |

  The last two cover preview deployments. (The API verifies tokens anyway, so
  a missed hostname shows an error page rather than opening anything.)
- Policy: action **Allow**, include **Emails** → your email address.
- Login methods: **One-time PIN** is on by default (a code sent to that
  email). Add GitHub as well if you like.

Save, then open the application's **Overview** and copy the **Application
Audience (AUD) Tag**.

### 3. Secrets for the site

From the repo root (each command asks for the value):

```sh
npx wrangler pages secret put GITHUB_TOKEN --project-name portfolio
npx wrangler pages secret put ACCESS_TEAM_DOMAIN --project-name portfolio   # https://<team>.cloudflareaccess.com
npx wrangler pages secret put ACCESS_AUD --project-name portfolio           # the AUD tag
npx wrangler pages secret put ADMIN_EMAIL --project-name portfolio          # the same email as the policy
```

Secrets apply to the next deployment. Push any commit, or in the dashboard,
Workers & Pages → portfolio → Deployments → the latest → **Retry deployment**.

### 4. The scheduler

```sh
cd scheduler
npx wrangler deploy
npx wrangler secret put GITHUB_TOKEN
```

### 5. Check it

Open https://nazarene.dev/admin. Access asks for your email and sends a code;
after that you land on the post list. Press **N** to start a post.

## Writing

The editor is the article page, editable, with Notion's habits:

| | |
| --- | --- |
| `/` | Blocks: text, headings 1–3, bulleted, numbered and to-do lists, toggle, quote, callout, code, table, image, embed, divider, emoji |
| `:dog` | Emoji autocomplete, drawn as Microsoft's Fluent 3D |
| Markdown as you type | `#`, `-`, `1.`, `[]`, `>`, ```` ``` ````, `**bold**`, `==highlight==`, `---` |
| Hover a block | ⋮⋮ handle in the margin: drag to move, click for Turn into, Duplicate, Move, Copy as Markdown, Delete; `+` adds a block below |
| Right-click the text | Cut, copy, paste (also as Markdown), format, turn into, insert, table rows and columns, find, search Google, duplicate/move/delete block |
| Select text | Bold, italic, strike, code, link, headings, quote |
| Paste a link to a post on X or Threads, or a YouTube video, on an empty line | It becomes an embed (X posts are rendered by react-tweet when the site builds) |
| Paste or drop an image | Resized in the browser (WebP, 2400px), uploaded, inserted |
| Above the title | Page icon (any emoji) and cover |
| Byline | Click it: authors (you by default), each with name, email and a photo that's cropped square and resized for you |
| Details (`⌘.`) | URL, tags, fonts (Google Fonts and Fontshare), cover, search and share previews, delete |
| History | Timeline by day, words added and removed per save, word-level diff, restore |
| `⌘F` | Find in this post |
| `⌘K` | Search the words in every post; choosing a passage opens the post on it |
| `⌘S` · `⌘D` · `⌘⇧↑/↓` · `⌘⇧P` | Keep a revision · duplicate block · move block · publish |

In the list, right-click a post (or tap ⋯) for Open, Open in new tab, View on site, Publish, Schedule, Unpublish, Duplicate, Copy link, Copy as Markdown, History, Details and Delete.

On a phone, formatting moves to a toolbar that sits on top of the keyboard, and every sheet comes up from the bottom.

## URLs (slugs)

- A new post's URL follows its title until you edit the URL yourself.
- Before a post has been published, the URL is free to change.
- After it's live, changing the URL moves the file and adds the old slug to
  the post's `redirectFrom`. Every build turns those into 301s in
  `_redirects` (see `next.config.js`), so old links keep working.
- A URL that another post uses, or used to use, can't be taken.
- `admin`, `api`, `media`, `feed`, `rss`, `index` and `new` are reserved.

## The file format

```md
---
id: "0muh2zhs4w63"
title: "Checkpointing inference jobs on spot instances"
slug: "checkpointing-inference-jobs-on-spot-instances"
dek: "What it takes to lose a machine mid-batch and not notice."
tags: ["Infrastructure"]
cover: {"src":"/media/2026/0muh….webp","alt":"…","caption":"…","width":2400,"height":1350}
publishedAt: "2026-09-25T14:53:10.000Z"
updatedAt: "2026-09-25T14:53:10.000Z"
redirectFrom: []
---

Markdown. An image alone on a line becomes a figure;
its title is the caption: ![alt text](/media/… "Caption")
```

Each value is JSON (which is also valid YAML), so a post can be written or
fixed by hand in the repo too; the admin adopts it the first time it's opened.

## Backups

- Published posts: git history.
- Drafts: the revision history in R2 (60 kept per post). For an off-site copy,
  `npx wrangler r2 object get portfolio-writing/drafts/<id>/current.json --remote`.

## Running it locally

```sh
npm run build
npx wrangler pages dev out --binding ADMIN_DEV_BYPASS=1 --binding GITHUB_TOKEN=<a token>
```

`ADMIN_DEV_BYPASS` only works on `localhost`. With a real token, publishing
locally commits to the real repo; `GITHUB_BRANCH` in `wrangler.toml` can point
it at a test branch instead.
