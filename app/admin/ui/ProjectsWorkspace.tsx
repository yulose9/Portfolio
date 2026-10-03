"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@cloudflare/kumo/components/input";
import { Button } from "@cloudflare/kumo/components/button";
import { Plus, ArrowUpRight, Briefcase } from "@phosphor-icons/react";
import { api, type Draft, type PostSummary } from "./api";
import { cleanProject } from "../../../cms/projects";
import { registerProtection } from "./session";
export default function ProjectsWorkspace({
  onOpen,
}: {
  onOpen: (id: string) => void;
}) {
  const [pages, setPages] = useState<PostSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
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
  return (
    <div className="control-page">
      <header className="control-heading">
        <div>
          <p className="control-eyebrow">nazarene.dev / Selected work</p>
          <h1>Projects</h1>
          <p>
            Tell the story behind your work. Publish supporting pages when
            they’re ready.
          </p>
        </div>
        <Button variant="primary" disabled={busy} onClick={() => void create()}>
          <Plus size={16} /> New project
        </Button>
      </header>
      {error && (
        <div className="control-notice" role="alert">
          {error}
          <Button onClick={reload}>Reload</Button>
        </div>
      )}
      <div className="control-toolbar">
        <label className="website-field" style={{ margin: 0 }}>
          <input
            type="search"
            placeholder="Find a project or page…"
            aria-label="Find projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Publication status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="draft">Drafts</option>
          <option value="published">Published</option>
          <option value="trash">Trash</option>
        </select>
        <a href="/projects" target="_blank" rel="noreferrer">
          View on site <ArrowUpRight size={14} />
        </a>
      </div>
      {loading ? (
        <p role="status">Loading projects…</p>
      ) : !filtered.length ? (
        <section className="control-empty">
          <Briefcase size={30} />
          <h2>
            {query ? "No matching projects" : "Make room for your best work."}
          </h2>
          <p>
            Create a case study, add your role and outcomes, and build
            supporting pages around it.
          </p>
        </section>
      ) : (
        <section className="control-panel">
          <table>
            <thead>
              <tr>
                <th>Project / page</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((page) => (
                <tr key={page.id}>
                  <td>
                    <button
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
                  </td>
                  <td>
                    {page.status}
                    {page.dirty && page.liveSlug ? " · unpublished edits" : ""}
                  </td>
                  <td>
                    <div className="website-actions">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
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
