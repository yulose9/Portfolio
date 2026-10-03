"use client";
import { useEffect, useState } from "react";
import { Button } from "@cloudflare/kumo/components/button";
import { call, type PostSummary } from "./api";
import type { Destination } from "./ControlShell";
import type { WebsiteDraft } from "../../../cms/website";

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
    <section className="control-panel" aria-label="Publishing overview">
      <div className="control-panel-heading">
        <div>
          <h2>Your content</h2>
          <p>Continue editing, or review what is ready to publish.</p>
        </div>
      </div>
      {error && <p role="alert">Content status is unavailable. {error}</p>}
      <div className="control-report-grid">
        {(
          [
            ["writing", "Writing"],
            ["projects", "Projects"],
          ] as const
        ).map(([key, title]) => {
          const pages = counts?.[key].filter((page) => !page.trashedAt);
          return (
            <div key={key}>
              <h3>{title}</h3>
              <p>
                {pages
                  ? `${pages.filter((page) => page.liveSlug).length} published · ${pages.filter((page) => !page.liveSlug || page.dirty).length} awaiting publication`
                  : "Status loading…"}
              </p>
              <Button onClick={() => onNavigate(key)}>
                Manage {title.toLowerCase()}
              </Button>
            </div>
          );
        })}
        <div>
          <h3>Website</h3>
          <p>
            {counts?.website.receipt
              ? `Last submitted ${new Date(counts.website.receipt.at).toLocaleDateString()}`
              : counts
                ? "Profile, sections, tools and sharing"
                : "Status loading…"}
          </p>
          <Button onClick={() => onNavigate("website")}>Edit website</Button>
        </div>
      </div>
    </section>
  );
}
