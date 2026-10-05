"use client";

import { useEffect, useState } from "react";
import { Users, Star, GitFork, CheckCircle, ChatCircleDots } from "@phosphor-icons/react";
import type { GithubData, GithubEmbed } from "../../../cms/embeds";

function IssuesIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
    </svg>
  );
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function formatCount(num: number | undefined): string {
  if (num === undefined || num === null) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return num.toLocaleString();
}

const memoryCache = new Map<string, GithubData>();

function getInitialData(url: string): GithubData | null {
  const mem = memoryCache.get(url);
  if (mem) return mem;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`gh-embed-${url}`);
    if (raw) {
      const parsed = JSON.parse(raw) as GithubData;
      memoryCache.set(url, parsed);
      return parsed;
    }
  } catch {
    // sessionStorage disabled or unavailable
  }
  return null;
}

export default function GithubEmbedCard({ embed, inEditor = false }: { embed: GithubEmbed; inEditor?: boolean }) {
  const [data, setData] = useState<GithubData | null>(() => getInitialData(embed.url));
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (data) return;

    let isAlive = true;
    const cacheKey = `gh-embed-${embed.url}`;

    const fallback: GithubData = {
      type: embed.format,
      owner: embed.owner,
      repo: embed.repo,
      name: embed.repo,
      fullName: `${embed.owner}/${embed.repo}`,
      description: "",
      ownerAvatar: `https://github.com/${embed.owner}.png?size=160`,
      url: embed.url,
      languageColor: "#24292e",
    };

    fetch(`/api/github?url=${encodeURIComponent(embed.url)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("HTTP error");
        return (await res.json()) as GithubData;
      })
      .catch(async () => {
        // Fallback: direct public GitHub API query
        try {
          const r = await fetch(`https://api.github.com/repos/${embed.owner}/${embed.repo}`, {
            headers: { Accept: "application/vnd.github+json" },
          });
          if (r.ok) {
            const d = (await r.json()) as {
              name?: string;
              full_name?: string;
              description?: string;
              stargazers_count?: number;
              forks_count?: number;
              open_issues_count?: number;
              language?: string;
              owner?: { avatar_url?: string };
            };
            const rawAvatar = d.owner?.avatar_url || `https://github.com/${embed.owner}.png`;
            const ownerAvatar = rawAvatar.includes("?") ? `${rawAvatar}&size=160` : `${rawAvatar}?size=160`;
            return {
              type: "repo",
              owner: embed.owner,
              repo: d.name || embed.repo,
              name: d.name || embed.repo,
              fullName: d.full_name || `${embed.owner}/${embed.repo}`,
              description: d.description || "",
              ownerAvatar,
              stars: d.stargazers_count ?? 0,
              forks: d.forks_count ?? 0,
              issues: d.open_issues_count ?? 0,
              contributors: 1,
              language: d.language,
              languageColor: d.language === "TypeScript" ? "#3178c6" : d.language === "JavaScript" ? "#f1e05a" : d.language === "Python" ? "#3572A5" : "#24292e",
              url: embed.url,
            } as GithubData;
          }
        } catch {
          // ignore
        }
        return fallback;
      })
      .then((result) => {
        if (!isAlive) return;
        memoryCache.set(embed.url, result);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {
          // ignore
        }
        setData(result);
        setLoading(false);
      });

    return () => {
      isAlive = false;
    };
  }, [embed.url, embed.owner, embed.repo, embed.format, data]);

  const resolved = data ?? {
    type: embed.format,
    owner: embed.owner,
    repo: embed.repo,
    name: embed.repo,
    fullName: `${embed.owner}/${embed.repo}`,
    description: "",
    ownerAvatar: `https://github.com/${embed.owner}.png?size=160`,
    url: embed.url,
    languageColor: "#24292e",
    stars: 0,
    forks: 0,
    issues: 0,
    contributors: 1,
  };

  const isIssueOrPR = resolved.type === "issue" || resolved.type === "pull" || resolved.type === "discussion";

  return (
    <a
      href={embed.url}
      target="_blank"
      rel="noreferrer"
      className={`github-embed-card ${loading ? "is-loading" : ""}`}
      data-in-editor={inEditor ? "true" : undefined}
      aria-label={`GitHub repository ${resolved.fullName}`}
    >
      <div className="github-embed-inner">
        {/* Top Header Row */}
        <div className="github-embed-head">
          <div className="github-embed-titles">
            {isIssueOrPR ? (
              <>
                <span className="github-embed-category">{resolved.owner}</span>
                <h3 className="github-embed-title github-embed-title-issue">
                  <span className="github-embed-number">#{resolved.number ?? embed.number ?? ""}</span>{" "}
                  {resolved.title || resolved.description || resolved.name}
                </h3>
              </>
            ) : (
              <>
                <div className="github-embed-owner">
                  <span>{resolved.owner}</span>
                  <span className="github-embed-slash">/</span>
                </div>
                <h3 className="github-embed-repo">{resolved.repo}</h3>
              </>
            )}
            {resolved.description && !isIssueOrPR ? (
              <p className="github-embed-desc">{resolved.description}</p>
            ) : null}
          </div>

          <div className="github-embed-avatar-wrap" aria-hidden="true" style={{ width: 76, height: 76, minWidth: 76, minHeight: 76, maxWidth: 76, maxHeight: 76, flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolved.ownerAvatar}
              alt=""
              width={76}
              height={76}
              className="github-embed-avatar"
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = `https://github.com/${resolved.owner}.png?size=160`;
              }}
            />
          </div>
        </div>

        {/* Bottom Metrics Bar */}
        <div className="github-embed-foot">
          {isIssueOrPR ? (
            <div className="github-embed-issue-meta">
              <span className={`github-embed-status-badge is-${resolved.state || "open"}`}>
                <CheckCircle size={15} weight="fill" />
                <span>{resolved.state === "closed" ? "Closed" : resolved.state === "merged" ? "Merged" : resolved.state === "answered" ? "Answered" : "Open"}</span>
              </span>
              {resolved.comments !== undefined ? (
                <span className="github-embed-stat">
                  <ChatCircleDots size={16} />
                  <span>{resolved.comments} {resolved.comments === 1 ? "comment" : "comments"}</span>
                </span>
              ) : null}
              {resolved.author ? (
                <span className="github-embed-author">
                  opened by <strong>@{resolved.author}</strong>
                </span>
              ) : null}
            </div>
          ) : (
            <div className="github-embed-stats">
              <div className="github-embed-stat">
                <div className="github-embed-stat-top">
                  <Users size={16} weight="regular" />
                  <span className="github-embed-stat-val">{formatCount(resolved.contributors || 1)}</span>
                </div>
                <span className="github-embed-stat-label">
                  {(resolved.contributors || 1) === 1 ? "Contributor" : "Contributors"}
                </span>
              </div>

              <div className="github-embed-stat">
                <div className="github-embed-stat-top">
                  <IssuesIcon size={16} />
                  <span className="github-embed-stat-val">{formatCount(resolved.issues ?? 0)}</span>
                </div>
                <span className="github-embed-stat-label">Issues</span>
              </div>

              <div className="github-embed-stat">
                <div className="github-embed-stat-top">
                  <Star size={16} weight="regular" />
                  <span className="github-embed-stat-val">{formatCount(resolved.stars ?? 0)}</span>
                </div>
                <span className="github-embed-stat-label">
                  {(resolved.stars ?? 0) === 1 ? "Star" : "Stars"}
                </span>
              </div>

              <div className="github-embed-stat">
                <div className="github-embed-stat-top">
                  <GitFork size={16} weight="regular" />
                  <span className="github-embed-stat-val">{formatCount(resolved.forks ?? 0)}</span>
                </div>
                <span className="github-embed-stat-label">
                  {(resolved.forks ?? 0) === 1 ? "Fork" : "Forks"}
                </span>
              </div>
            </div>
          )}

          <div className="github-embed-brand">
            <GithubMark className="github-embed-octocat" />
          </div>
        </div>
      </div>

      {/* Dynamic Colored Stripe at the Very Bottom (Pink, Green, Yellow, etc.) */}
      <div
        className="github-embed-stripe"
        style={{
          backgroundColor: resolved.languageColor || "#24292e",
        }}
      />
    </a>
  );
}
