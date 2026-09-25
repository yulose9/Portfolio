# nazarene.dev for agents

Everything on this site that a program might want is public, static and read-only. There are no accounts, keys or write endpoints for agents. The machine-readable description is [openapi.json](https://nazarene.dev/openapi.json), listed in the [API catalog](https://nazarene.dev/.well-known/api-catalog).

## Read the site

| What | Where |
| --- | --- |
| A summary of who this is and what's here | [`/llms.txt`](https://nazarene.dev/llms.txt) |
| The full text of every post | [`/llms-full.txt`](https://nazarene.dev/llms-full.txt) |
| Every published post, as a list | [`/writing/index.md`](https://nazarene.dev/writing/index.md) |
| One post, as its Markdown source | `/writing/<slug>/index.md` |
| New posts | [`/feed.xml`](https://nazarene.dev/feed.xml) (RSS) |
| Every public page | [`/sitemap.xml`](https://nazarene.dev/sitemap.xml) |

## Markdown instead of HTML

Send `Accept: text/markdown` to `/`, `/writing` or `/writing/<slug>` and the response is Markdown, with `Content-Type: text/markdown` and an `x-markdown-tokens` estimate. Without that header you get the HTML page.

```sh
curl -H "Accept: text/markdown" https://nazarene.dev/writing
```

## Using the content

[robots.txt](https://nazarene.dev/robots.txt) lists which crawlers are welcome and carries a content signal: search, AI answers that cite the site, and training are all allowed. Please link back to the page you quote.

Questions: jannazarene09@gmail.com
