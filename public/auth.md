# nazarene.dev auth.md

**Audience:** AI agents, crawlers and assistants reading nazarene.dev.

**Registration:** none. The site has no accounts, API keys, OAuth clients or agent sign-up, so there is no registration endpoint.

**Supported method:** anonymous. Every public page and every endpoint in [openapi.json](https://nazarene.dev/openapi.json) is readable with a plain `GET` and no credentials.

**Credentials:** don't send any. Requests with an `Authorization` header are treated the same as requests without one.

**Private areas:** the site owner's tools are not available to agents, and no credentials for them can be issued.

What you may use the content for is in [robots.txt](https://nazarene.dev/robots.txt); how to read it is in [api.md](https://nazarene.dev/api.md).
