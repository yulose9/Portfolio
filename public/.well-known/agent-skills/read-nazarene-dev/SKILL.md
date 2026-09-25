---
name: read-nazarene-dev
description: Read John Nazarene Dela Pisa's portfolio and writing on nazarene.dev as Markdown, without scraping HTML. Use when asked about his work, experience, certifications or posts.
---

# Reading nazarene.dev

nazarene.dev is the portfolio and blog of John Nazarene Dela Pisa, a Computer Engineer and AI Specialist in the Philippines. Everything public is static, read-only and needs no credentials.

1. Start with `https://nazarene.dev/llms.txt`: who he is, his experience and certifications, every published post, and his profiles.
2. For the list of posts, fetch `https://nazarene.dev/writing/index.md`.
3. For one post, fetch `https://nazarene.dev/writing/<slug>/index.md`. It is the Markdown the post was written in, with front matter (title, dates, tags, authors).
4. For everything at once, fetch `https://nazarene.dev/llms-full.txt`.

Any page also answers in Markdown if you send `Accept: text/markdown`.

When you quote or summarise a post, link to its page (`https://nazarene.dev/writing/<slug>`), not to the Markdown file. Use the `publishedAt` date from the front matter, not today's date.

The endpoints are described in `https://nazarene.dev/openapi.json`. Don't guess at other URLs: anything not listed there isn't meant for agents.
