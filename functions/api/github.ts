import { parseEmbed, type GithubEmbed, type GithubData } from "../../cms/embeds";

type Env = {
  GITHUB_TOKEN?: string;
  GH_TOKEN?: string;
};

type PagesContext<TEnv = Record<string, unknown>> = {
  request: Request;
  env: TEnv;
  params?: Record<string, string | string[]>;
  waitUntil?: (promise: Promise<unknown>) => void;
  next?: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data?: Record<string, unknown>;
};

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  PHP: "#4F5D95",
  Ruby: "#701516",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Astro: "#ff5a03",
  Shell: "#89e051",
  Lua: "#000080",
  Dart: "#00B4AB",
  Zig: "#ec915c",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Scala: "#c22d40",
  Clojure: "#db5855",
  R: "#198CE7",
  Julia: "#a270ba",
  Markdown: "#083fa1",
};

const reply = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });

export const onRequestGet = async ({ env, request }: PagesContext<Env>) => {
  const reqUrl = new URL(request.url);
  const targetUrl = reqUrl.searchParams.get("url") ?? "";
  const ownerParam = reqUrl.searchParams.get("owner");
  const repoParam = reqUrl.searchParams.get("repo");
  const numberParam = reqUrl.searchParams.get("number");
  const formatParam = reqUrl.searchParams.get("format");

  let embed: GithubEmbed | null = null;
  if (targetUrl) {
    const parsed = parseEmbed(targetUrl);
    if (parsed && parsed.kind === "github") {
      embed = parsed;
    }
  } else if (ownerParam && repoParam) {
    embed = {
      kind: "github",
      format: (formatParam as GithubEmbed["format"]) || "repo",
      owner: ownerParam,
      repo: repoParam,
      number: numberParam || undefined,
      url: `https://github.com/${ownerParam}/${repoParam}${numberParam ? `/${formatParam === "pull" ? "pull" : formatParam === "discussion" ? "discussions" : "issues"}/${numberParam}` : ""}`,
    };
  }

  if (!embed) {
    return reply({ error: "Invalid GitHub URL or repository parameters." }, 400);
  }

  // Cloudflare Cache API lookup
  const cache = caches.default;
  const cacheKey = new Request(reqUrl.toString(), request);
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const token = env.GITHUB_TOKEN || env.GH_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Portfolio-Embed/2.0",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const { owner, repo, format, number, url } = embed;

  // Fallback template in case of GitHub rate limiting or network error
  const fallbackData: GithubData = {
    type: format,
    owner,
    repo,
    name: repo,
    fullName: `${owner}/${repo}`,
    description: "",
    ownerAvatar: `https://github.com/${owner}.png?size=160`,
    url,
    languageColor: "#24292e",
  };

  try {
    if (format === "repo") {
      // 1. Fetch Repository Details
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers,
        redirect: "follow",
      });

      if (!repoRes.ok) {
        return reply(fallbackData);
      }

      const repoJson = (await repoRes.json()) as {
        name?: string;
        full_name?: string;
        description?: string;
        owner?: { avatar_url?: string };
        stargazers_count?: number;
        forks_count?: number;
        open_issues_count?: number;
        language?: string;
        license?: { spdx_id?: string; name?: string };
      };

      // 2. Fetch Contributor count via Link header
      let contributorsCount = 1;
      try {
        const contribRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1&anon=true`,
          { headers, redirect: "follow" }
        );
        if (contribRes.ok) {
          const link = contribRes.headers.get("Link");
          if (link) {
            const match = link.match(/page=(\d+)>;\s*rel="last"/);
            if (match?.[1]) {
              contributorsCount = parseInt(match[1], 10);
            }
          } else {
            const list = (await contribRes.json().catch(() => [])) as unknown[];
            contributorsCount = list.length || 1;
          }
        }
      } catch {
        // Soft fallback
      }

      const language = repoJson.language || undefined;
      const langColor = (language && LANGUAGE_COLORS[language]) || "#24292e";

      const rawAvatar = repoJson.owner?.avatar_url || `https://github.com/${owner}.png`;
      const ownerAvatar = rawAvatar.includes("?")
        ? `${rawAvatar}&size=160`
        : `${rawAvatar}?size=160`;

      const data: GithubData = {
        type: "repo",
        owner,
        repo: repoJson.name || repo,
        name: repoJson.name || repo,
        fullName: repoJson.full_name || `${owner}/${repo}`,
        description: repoJson.description || "",
        ownerAvatar,
        stars: repoJson.stargazers_count ?? 0,
        forks: repoJson.forks_count ?? 0,
        issues: repoJson.open_issues_count ?? 0,
        contributors: contributorsCount,
        language,
        languageColor: langColor,
        license: repoJson.license?.spdx_id || repoJson.license?.name || undefined,
        url,
      };

      const response = reply(data);
      await cache.put(cacheKey, response.clone());
      return response;
    }

    // 3. Issue or PR or Discussion
    const issueRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${number}`, {
      headers,
      redirect: "follow",
    });

    if (!issueRes.ok) {
      return reply(fallbackData);
    }

    const issueJson = (await issueRes.json()) as {
      title?: string;
      number?: number;
      state?: string;
      pull_request?: unknown;
      comments?: number;
      created_at?: string;
      user?: { login?: string; avatar_url?: string };
    };

    const isPR = format === "pull" || Boolean(issueJson.pull_request);
    let state: GithubData["state"] = "open";
    if (issueJson.state === "closed") {
      state = isPR ? "merged" : "closed";
    }

    const rawAuthorAvatar = issueJson.user?.avatar_url || `https://github.com/${issueJson.user?.login || owner}.png`;
    const authorAvatar = rawAuthorAvatar.includes("?")
      ? `${rawAuthorAvatar}&size=160`
      : `${rawAuthorAvatar}?size=160`;

    const data: GithubData = {
      type: isPR ? "pull" : format,
      owner,
      repo,
      name: repo,
      fullName: `${owner}/${repo}`,
      description: issueJson.title || "",
      ownerAvatar: `https://github.com/${owner}.png?size=160`,
      number: issueJson.number || (number ? parseInt(number, 10) : undefined),
      title: issueJson.title || "",
      state,
      author: issueJson.user?.login,
      authorAvatar,
      comments: issueJson.comments ?? 0,
      createdAt: issueJson.created_at,
      languageColor: state === "open" ? "#238636" : state === "merged" ? "#8957e5" : "#da3633",
      url,
    };

    const response = reply(data);
    await cache.put(cacheKey, response.clone());
    return response;
  } catch {
    return reply(fallbackData);
  }
};
