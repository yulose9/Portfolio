"use client";

import { useEffect, useState } from "react";
import { Button } from "@cloudflare/kumo/components/button";
import {
  PenNib,
  FolderSimple,
  Globe,
  ArrowRight,
  CheckCircle,
  Clock,
} from "@phosphor-icons/react";
import { call, type PostSummary } from "./api";
import type { Destination } from "./ControlShell";
import type { WebsiteDraft } from "../../../cms/website";
import { playSound } from "../../components/ui/sound";

export default function OverviewPublishing({
  onNavigate,
}: {
  onNavigate: (destination: Destination) => void;
}) {
  const [counts, setCounts] = useState<{
    writing: PostSummary[];
    projects: PostSummary[];
    website: WebsiteDraft;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    void Promise.all([
      call<{ posts: PostSummary[] }>("/posts", options),
      call<{ posts: PostSummary[] }>("/projects/posts", options),
      call<WebsiteDraft>("/website", options),
    ])
      .then(([writing, projects, website]) =>
        setCounts({
          writing: writing.posts,
          projects: projects.posts,
          website,
        }),
      )
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="cc-overview-hero" aria-label="Publishing overview">
      <div className="cc-overview-hero-top">
        <div className="cc-overview-hero-heading">
          <h1>What are we building today?</h1>
          <p>Quick access to your writing, showcase case studies, and live site configuration.</p>
        </div>
        <div className="cc-overview-quick-chips">
          <button
            type="button"
            className="cc-overview-quick-chip"
            onClick={() => {
              onNavigate("writing");
              playSound("tap");
            }}
          >
            <PenNib size={14} weight="bold" />
            <span>New post</span>
          </button>
          <button
            type="button"
            className="cc-overview-quick-chip"
            onClick={() => {
              onNavigate("projects");
              playSound("tap");
            }}
          >
            <FolderSimple size={14} weight="bold" />
            <span>New project</span>
          </button>
          <button
            type="button"
            className="cc-overview-quick-chip"
            onClick={() => {
              onNavigate("website");
              playSound("tap");
            }}
          >
            <Globe size={14} weight="bold" />
            <span>Edit website</span>
          </button>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="cc-overview-quick-chip"
            onClick={() => playSound("tap")}
          >
            <span>Live site</span>
            <ArrowRight size={13} />
          </a>
        </div>
      </div>

      {error && <p role="alert" className="control-notice">Content status is unavailable. {error}</p>}

      <div className="cc-overview-hub-grid">
        {(
          [
            {
              key: "writing" as const,
              title: "Writing & Articles",
              icon: PenNib,
              manageText: "Manage writing",
              desc: "Draft articles, essays, and notes with markdown & rich media support.",
            },
            {
              key: "projects" as const,
              title: "Projects & Work",
              icon: FolderSimple,
              manageText: "Manage projects",
              desc: "Engineering case studies, interactive tools, and portfolio highlights.",
            },
          ] as const
        ).map(({ key, title, icon: Icon, manageText, desc }) => {
          const pages = counts?.[key].filter((page) => !page.trashedAt);
          const publishedCount = pages?.filter((p) => p.liveSlug).length ?? 0;
          const awaitingCount = pages?.filter((p) => !p.liveSlug || p.dirty).length ?? 0;

          return (
            <div key={key} className="cc-hub-card">
              <div>
                <div className="cc-hub-card-header">
                  <div className="cc-hub-card-title-group">
                    <span className="cc-hub-card-icon" aria-hidden="true">
                      <Icon size={18} weight="duotone" />
                    </span>
                    <h3>{title}</h3>
                  </div>
                  {pages ? (
                    awaitingCount > 0 ? (
                      <span className="overview-pill overview-pill-pending">
                        <Clock size={11} aria-hidden="true" />
                        {awaitingCount} draft
                      </span>
                    ) : (
                      <span className="overview-pill overview-pill-clean">
                        <CheckCircle size={11} aria-hidden="true" />
                        Up to date
                      </span>
                    )
                  ) : null}
                </div>
                <p className="cc-hub-card-desc">{desc}</p>
              </div>

              <div className="cc-hub-card-footer">
                <span className="cc-hub-card-stat">
                  {pages
                    ? `${publishedCount} published · ${awaitingCount} pending`
                    : "Loading status…"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(key);
                    playSound("select");
                  }}
                  className="cc-hub-card-action"
                >
                  <span>{manageText}</span>
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}

        <div className="cc-hub-card">
          <div>
            <div className="cc-hub-card-header">
              <div className="cc-hub-card-title-group">
                <span className="cc-hub-card-icon" aria-hidden="true">
                  <Globe size={18} weight="duotone" />
                </span>
                <h3>Website & Edge</h3>
              </div>
              <span className="overview-pill overview-pill-clean">
                <CheckCircle size={11} aria-hidden="true" />
                Live
              </span>
            </div>
            <p className="cc-hub-card-desc">
              Custom domain, profile metadata, navigation tabs, and SEO search tags.
            </p>
          </div>

          <div className="cc-hub-card-footer">
            <span className="cc-hub-card-stat">
              {counts?.website.receipt
                ? `Published ${new Date(counts.website.receipt.at).toLocaleDateString()}`
                : "nazarene.dev · SSL Active"}
            </span>
            <button
              type="button"
              onClick={() => {
                onNavigate("website");
                playSound("select");
              }}
              className="cc-hub-card-action"
            >
              <span>Website settings</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
