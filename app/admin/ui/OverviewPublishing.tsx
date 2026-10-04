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
    <section className="control-panel overview-content-panel" aria-label="Publishing overview">
      <div className="control-panel-heading">
        <div>
          <h2>Your content & publishing hub</h2>
          <p>Real-time status of your articles, showcase projects, and homepage presentation.</p>
        </div>
      </div>
      {error && <p role="alert" className="control-notice">Content status is unavailable. {error}</p>}

      <div className="control-report-grid overview-cards-grid">
        {(
          [
            {
              key: "writing" as const,
              title: "Writing",
              icon: PenNib,
              manageText: "Manage writing",
            },
            {
              key: "projects" as const,
              title: "Projects",
              icon: FolderSimple,
              manageText: "Manage projects",
            },
          ] as const
        ).map(({ key, title, icon: Icon, manageText }) => {
          const pages = counts?.[key].filter((page) => !page.trashedAt);
          const publishedCount = pages?.filter((p) => p.liveSlug).length ?? 0;
          const awaitingCount = pages?.filter((p) => !p.liveSlug || p.dirty).length ?? 0;

          return (
            <div key={key} className="overview-card">
              <div className="overview-card-header">
                <div className="overview-card-title-wrap">
                  <span className="overview-card-icon" aria-hidden="true">
                    <Icon size={18} weight="duotone" />
                  </span>
                  <h3>{title}</h3>
                </div>
                {pages ? (
                  awaitingCount > 0 ? (
                    <span className="overview-pill overview-pill-pending">
                      <Clock size={11} aria-hidden="true" />
                      {awaitingCount} awaiting
                    </span>
                  ) : (
                    <span className="overview-pill overview-pill-clean">
                      <CheckCircle size={11} aria-hidden="true" />
                      Up to date
                    </span>
                  )
                ) : null}
              </div>

              <div className="overview-card-body">
                <p className="overview-card-stats">
                  {pages
                    ? `${publishedCount} published · ${awaitingCount} awaiting publication`
                    : "Status loading…"}
                </p>
              </div>

              <div className="overview-card-footer">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onNavigate(key);
                    playSound("select");
                  }}
                  className="overview-card-action"
                >
                  {manageText}
                  <ArrowRight size={13} aria-hidden="true" />
                </Button>
              </div>
            </div>
          );
        })}

        <div className="overview-card">
          <div className="overview-card-header">
            <div className="overview-card-title-wrap">
              <span className="overview-card-icon" aria-hidden="true">
                <Globe size={18} weight="duotone" />
              </span>
              <h3>Website</h3>
            </div>
            {counts?.website ? (
              <span className="overview-pill overview-pill-clean">
                <CheckCircle size={11} aria-hidden="true" />
                Live
              </span>
            ) : null}
          </div>

          <div className="overview-card-body">
            <p className="overview-card-stats">
              {counts?.website.receipt
                ? `Last submitted ${new Date(counts.website.receipt.at).toLocaleDateString()}`
                : counts
                  ? "Profile, homepage sections & metadata"
                  : "Status loading…"}
            </p>
          </div>

          <div className="overview-card-footer">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onNavigate("website");
                playSound("select");
              }}
              className="overview-card-action"
            >
              Edit website
              <ArrowRight size={13} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
