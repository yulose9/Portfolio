"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@cloudflare/kumo/components/input";
import { Button } from "@cloudflare/kumo/components/button";
import { Table } from "@cloudflare/kumo/components/table";
import { Plus, Briefcase, MagnifyingGlass, Trash } from "@phosphor-icons/react";
import { api, type Draft, type PostSummary } from "./api";
import { cleanProject } from "../../../cms/projects";
import { registerProtection } from "./session";
import { StatusBadge } from "./bits";
import PageHeader, { EmptyState, PageChip } from "./PageHeader";
import UpdatedAt from "../../components/UpdatedAt";
import { Tabs, TabsList, TabsTrigger } from "../../components/kit/tabs";
import { SlidingNumber } from "../../components/kit/inputs/counter";
import { useShellView } from "./shell-nav";

const FILTERS = [
  ["all", "All"],
  ["draft", "Drafts"],
  ["published", "Published"],
  ["trash", "Trash"],
] as const;
export default function ProjectsWorkspace({
  onOpen,
}: {
  onOpen: (id: string) => void;
}) {
  const [pages, setPages] = useState<PostSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  // The sidebar's Projects sub-items pick the view, and see which one shows.
  useShellView("projects", filter, (view) => setFilter(view as typeof filter));
  const [details, updateDetails] = useState<Draft | null>(null);
  const baseline = useRef("");
  const latestDetails = useRef(details);
  function setDetails(value: Draft | null) {
    latestDetails.current = value;
    updateDetails(value);
  }
  const savingDetails = useRef<Promise<boolean> | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = () => {
    void api
      .list()
      .then((result) => {
        setPages(result.posts);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);
  const saveDetails = useCallback((): Promise<boolean> => {
    if (savingDetails.current) return savingDetails.current;
    const value = latestDetails.current;
    if (!value || JSON.stringify(value.project) === baseline.current)
      return Promise.resolve(true);
    const operation = (async () => {
      try {
        while (
          latestDetails.current &&
          JSON.stringify(latestDetails.current.project) !== baseline.current
        ) {
          const submitted = latestDetails.current;
          const { post } = await api.save(submitted.id, {
            project: cleanProject(submitted.project),
            base: submitted.updatedAt,
          });
          baseline.current = JSON.stringify(post.project);
          const next =
            latestDetails.current === submitted
              ? post
              : { ...post, project: latestDetails.current.project };
          latestDetails.current = next;
          setDetails(next);
        }
        setError("");
        return true;
      } catch (e) {
        setError((e as Error).message);
        return false;
      }
    })();
    savingDetails.current = operation.finally(() => {
      savingDetails.current = null;
    });
    return savingDetails.current;
  }, []);
  useEffect(() => {
    if (!details) return;
    const timer = setTimeout(() => void saveDetails(), 900);
    return () => clearTimeout(timer);
  }, [details, saveDetails]);
  useEffect(
    () =>
      registerProtection(async () => ({
        saved: await saveDetails(),
        recoverable: false,
      })),
    [saveDetails],
  );
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (
        latestDetails.current &&
        JSON.stringify(latestDetails.current.project) !== baseline.current
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);
  async function create(parentId?: string) {
    try {
      if (!(await saveDetails())) return;
      setBusy(true);
      const { post } = await api.create({
        parentId,
        title: parentId ? "Supporting page" : "Untitled project",
      });
      onOpen(post.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function metadata(id: string) {
    try {
      if (!(await saveDetails())) return;
      const result = await api.get(id);
      baseline.current = JSON.stringify(cleanProject(result.post.project));
      setDetails({
        ...result.post,
        project: cleanProject(result.post.project),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const counts = { all: 0, draft: 0, published: 0, trash: 0 };
  for (const p of pages) {
    if (p.trashedAt) counts.trash++;
    else {
      counts.all++;
      if (p.status === "draft" || p.status === "published") counts[p.status]++;
    }
  }
  const filtered = pages
    .filter(
      (p) =>
        (filter === "trash" ? !!p.trashedAt : !p.trashedAt) &&
        p.title.toLowerCase().includes(query.toLowerCase()) &&
        (filter === "all" || filter === "trash" || p.status === filter),
    )
    .sort(
      (a, b) =>
        (a.project?.order ?? 0) - (b.project?.order ?? 0) ||
        a.title.localeCompare(b.title),
    );
  const live = pages.some((p) => !p.trashedAt);
  return (
    <div className="control-page cc-page">
      <PageHeader
        title="Projects"
        chip={<PageChip href="/projects">View on site</PageChip>}
        subtitle="Case studies and their supporting pages. Publish each one when it’s ready."
        actions={
          <Button
            variant="primary"
            icon={<Plus size={16} aria-hidden="true" />}
            disabled={busy}
            onClick={() => void create()}
          >
            New project
          </Button>
        }
      />
      {error && (
        <div className="control-notice" role="alert">
          <p>{error}</p>
          <Button onClick={reload}>Reload</Button>
        </div>
      )}
      <div className="cc-toolbar">
        <label className="admin-search cc-search">
          <MagnifyingGlass size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Filter projects…"
            aria-label="Find projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="admin-toolbar writing-status-toolbar cc-filters">
        <Tabs value={filter} onValueChange={(next) => setFilter(next as typeof filter)}>
          <TabsList aria-label="Publication status">
            {FILTERS.map(([id, label]) => (
              <TabsTrigger key={id} value={id} data-trash={id === "trash" || undefined}>
                {id === "trash" ? <Trash size={13} aria-hidden="true" /> : null}
                {label}
                <span className="admin-segment-count">
                  <SlidingNumber value={counts[id]} />
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {loading ? (
        <div className="cc-card cc-list" role="status" aria-label="Loading projects">
          <ul className="admin-rows" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="admin-row admin-row-skeleton kit-skeleton skeleton-shimmer" />
            ))}
          </ul>
        </div>
      ) : !filtered.length ? (
        filter === "trash" ? (
          <EmptyState compact icon={<Trash size={28} aria-hidden="true" />} title="Trash is empty">
            <p>Projects you move to Trash stay here until you delete them permanently.</p>
          </EmptyState>
        ) : query || live ? (
          <EmptyState compact icon={<MagnifyingGlass size={28} aria-hidden="true" />} title="No matching projects">
            <p>Try another status or a different title.</p>
          </EmptyState>
        ) : (
          <EmptyState icon={<Briefcase size={32} aria-hidden="true" />} title="Make room for your best work.">
            <p>
              Create a case study, add your role and outcomes, and build
              supporting pages around it.
            </p>
          </EmptyState>
        )
      ) : (
        <div className="cc-card cc-table">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Project or page</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head className="cc-col-updated">Updated</Table.Head>
                <Table.Head>
                  <span className="sr-only">Actions</span>
                </Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filtered.map((page) => (
                <Table.Row key={page.id}>
                  <Table.Cell>
                    <button
                      type="button"
                      className="project-title"
                      onClick={async () => {
                        if (await saveDetails()) onOpen(page.id);
                      }}
                    >
                      {page.title || "Untitled"}
                    </button>
                    {page.parentId && (
                      <small className="project-parent">
                        In{" "}
                        {pages.find((parent) => parent.id === page.parentId)
                          ?.title || "project"}
                      </small>
                    )}
                    {page.project?.featured && (
                      <small className="project-parent">Featured</small>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {page.trashedAt ? (
                      <span className="cc-cell-note">In Trash</span>
                    ) : (
                      <StatusBadge post={page} />
                    )}
                  </Table.Cell>
                  <Table.Cell className="cc-col-updated">
                    <UpdatedAt at={page.updatedAt} nested compact />
                  </Table.Cell>
                  <Table.Cell>
                    <div className="cc-row-actions">
                      {page.trashedAt ? (
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await api.untrash(page.id);
                              reload();
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          Restore
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => void metadata(page.id)}
                          >
                            Details
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void create(page.id)}
                          >
                            Add page
                          </Button>
                        </>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
      {!loading && filtered.length ? (
        <div className="cc-footer">
          <span className="cc-footer-count">
            Showing {filtered.length} of {filter === "trash" ? counts.trash : counts.all}{" "}
            {filter === "trash" ? "in Trash" : counts.all === 1 ? "page" : "pages"}
          </span>
        </div>
      ) : null}
      {details && (
        <section className="control-panel" aria-label="Project details">
          <h2>{details.title} · Project details</h2>
          {(
            [
              ["role", "Your role"],
              ["timeframe", "Timeframe"],
            ] as const
          ).map(([key, label]) => (
            <label className="website-field" key={key}>
              {label}
              <Input
                value={details.project![key]}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    project: { ...details.project!, [key]: e.target.value },
                  })
                }
              />
            </label>
          ))}
          <label className="website-field">
            Tools (comma separated)
            <Input
              value={details.project!.tools.join(", ")}
              onChange={(e) =>
                setDetails({
                  ...details,
                  project: {
                    ...details.project!,
                    tools: e.target.value.split(",").map((s) => s.trim()),
                  },
                })
              }
            />
          </label>
          <label className="website-field">
            Outcomes (one per line)
            <textarea
              value={details.project!.outcomes.join("\n")}
              onChange={(e) =>
                setDetails({
                  ...details,
                  project: {
                    ...details.project!,
                    outcomes: e.target.value.split("\n"),
                  },
                })
              }
            />
          </label>
          <label className="website-field">
            Display order
            <input
              type="number"
              min={0}
              value={details.project!.order}
              onChange={(e) =>
                setDetails({
                  ...details,
                  project: {
                    ...details.project!,
                    order: Number(e.target.value),
                  },
                })
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={details.project!.featured}
              onChange={(e) =>
                setDetails({
                  ...details,
                  project: { ...details.project!, featured: e.target.checked },
                })
              }
            />{" "}
            Feature on homepage
          </label>
          {details.project!.links.map((link, index) => (
            <div className="website-entry" key={index}>
              <label className="website-field">
                Link label
                <Input
                  value={link.label}
                  onChange={(e) =>
                    setDetails({
                      ...details,
                      project: {
                        ...details.project!,
                        links: details.project!.links.map((l, i) =>
                          i === index ? { ...l, label: e.target.value } : l,
                        ),
                      },
                    })
                  }
                />
              </label>
              <label className="website-field">
                Destination
                <Input
                  value={link.href}
                  onChange={(e) =>
                    setDetails({
                      ...details,
                      project: {
                        ...details.project!,
                        links: details.project!.links.map((l, i) =>
                          i === index ? { ...l, href: e.target.value } : l,
                        ),
                      },
                    })
                  }
                />
              </label>
              <Button
                variant="ghost"
                onClick={() =>
                  setDetails({
                    ...details,
                    project: {
                      ...details.project!,
                      links: details.project!.links.filter(
                        (_, i) => i !== index,
                      ),
                    },
                  })
                }
              >
                Remove link
              </Button>
            </div>
          ))}
          <div className="website-actions">
            <Button
              onClick={() =>
                setDetails({
                  ...details,
                  project: {
                    ...details.project!,
                    links: [
                      ...details.project!.links,
                      { label: "Website", href: "" },
                    ],
                  },
                })
              }
            >
              Add link
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  if (!(await saveDetails())) return;
                  setDetails(null);
                  reload();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save details
            </Button>
            <Button
              onClick={async () => {
                if (await saveDetails()) setDetails(null);
              }}
            >
              Done
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
