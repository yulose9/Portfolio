"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@cloudflare/kumo/components/input";
import { Button } from "@cloudflare/kumo/components/button";
import {
  ArrowUp,
  ArrowDown,
  Plus,
  Trash,
  Desktop,
  DeviceMobile,
  UploadSimple,
  FolderOpen,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import { type WebsiteContent, type WebsiteDraft } from "../../../cms/website";
import { call, api, prepareImage } from "./api";
import { registerProtection, beginPendingWork } from "./session";
import PortfolioContent from "../../components/PortfolioContent";
import MediaLibrary from "./MediaLibrary";
import PageHeader, { PageChip } from "./PageHeader";
import { playSound } from "../../components/ui/sound";
import { cn } from "../../lib/cn";
import { MagneticDropzone } from "../../components/kit/inputs/magnetic-dropzone";

const recoveryKey = "admin:website-recovery";
export default function WebsiteEditor() {
  const [record, setRecord] = useState<WebsiteDraft | null>(null);
  const latest = useRef<WebsiteDraft | null>(null);
  const dirty = useRef(false);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const [status, setStatus] = useState("Loading website…");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("profile");
  const [mobile, setMobile] = useState(false);
  const [preview, setPreview] = useState(false);
  const [review, setReview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<"profile" | "sharing" | null>(
    null,
  );
  const [history, setHistory] = useState<{
    items: { version: string; at: string }[];
    cursor: string | null;
  } | null>(null);
  const [recovery, setRecovery] = useState<WebsiteContent | null>(null);
  const remember = useCallback(() => {
    try {
      if (latest.current)
        sessionStorage.setItem(recoveryKey, JSON.stringify(latest.current));
      return true;
    } catch {
      return false;
    }
  }, []);
  useEffect(() => {
    let alive = true;
    void call<WebsiteDraft>("/website")
      .then((value) => {
        if (!alive) return;
        latest.current = value;
        setRecord(value);
        setStatus("Saved privately");
        try {
          const cached = JSON.parse(
            sessionStorage.getItem(recoveryKey) ?? "null",
          ) as WebsiteDraft | null;
          if (
            cached &&
            JSON.stringify(cached.content) !== JSON.stringify(value.content)
          )
            setRecovery(cached.content);
        } catch {
          /* unavailable */
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  const save = useCallback((): Promise<boolean> => {
    if (inFlight.current) return inFlight.current;
    if (!dirty.current || !latest.current) return Promise.resolve(true);
    inFlight.current = (async () => {
      try {
        while (dirty.current && latest.current) {
          const submitted = latest.current;
          setStatus("Saving…");
          const result = await call<WebsiteDraft>("/website", {
            method: "PUT",
            body: JSON.stringify({
              content: submitted.content,
              base: submitted.version,
            }),
          });
          if (latest.current === submitted) {
            latest.current = result;
            dirty.current = false;
          } else
            latest.current = { ...result, content: latest.current.content };
          setRecord(latest.current);
          remember();
          setError("");
        }
        setStatus("Saved privately");
        return true;
      } catch (e) {
        setError((e as Error).message);
        setStatus("Changes kept in this tab");
        return false;
      } finally {
        inFlight.current = null;
      }
    })();
    return inFlight.current;
  }, [remember]);
  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => void save(), 900);
    return () => clearTimeout(timer);
  }, [record, save]);
  useEffect(
    () =>
      registerProtection(async () => ({
        saved: await save(),
        recoverable: remember(),
      })),
    [save, remember],
  );
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        remember();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [remember]);
  function edit(change: (content: WebsiteContent) => void) {
    if (!latest.current) return;
    const next = structuredClone(latest.current);
    change(next.content);
    latest.current = next;
    dirty.current = true;
    remember();
    setRecord(next);
    setStatus("Unsaved changes");
    setReview(false);
  }

  async function upload(file: File | undefined, update: (src: string) => void) {
    if (!file) return;
    const finish = beginPendingWork();
    try {
      setStatus("Uploading image…");
      const { blob, width, height } = await prepareImage(file);
      const result = await api.upload(blob, width, height);
      update(result.src);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      finish();
    }
  }
  async function publish() {
    setPublishing(true);
    setError("");
    try {
      if (!(await save())) return;
      const result = await call<WebsiteDraft>("/website", {
        method: "POST",
        body: JSON.stringify({ base: latest.current?.version }),
      });
      latest.current = result;
      setRecord(result);
      remember();
      setReview(false);
      setStatus("Submitted for publication");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(false);
    }
  }
  const content = record?.content;
  return (
    <div className="control-page cc-page website-page">
      <PageHeader
        title="Website"
        chip={<PageChip href="/">View on site</PageChip>}
        subtitle={
          <>
            Profile, sections and links on your homepage.{" "}
            <span role="status" className="cc-page-status">
              {status}
            </span>
          </>
        }
        actions={
        <>
          <Button
            disabled={!content}
            onClick={async () => {
              try {
                setHistory(await call("/website/revisions"));
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            History
          </Button>
          <Button onClick={() => setPreview(!preview)}>
            {preview ? "Edit content" : "Preview"}
          </Button>
          <Button
            variant="primary"
            disabled={!content || publishing}
            onClick={async () => {
              if (await save()) setReview(true);
            }}
          >
            Review changes
          </Button>
        </>
        }
      />
      {error && (
        <div className="control-notice" role="alert">
          {error}
          <div className="website-actions">
            <Button onClick={() => void save()}>Retry save</Button>
            <Button
              onClick={() => {
                if (!latest.current) return;
                const a = document.createElement("a");
                a.href = URL.createObjectURL(
                  new Blob([JSON.stringify(latest.current.content, null, 2)], {
                    type: "application/json",
                  }),
                );
                a.download = "website-draft.json";
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              Download draft
            </Button>
          </div>
        </div>
      )}
      {history && (
        <section className="control-panel" aria-label="Website history">
          <div className="website-actions">
            <h2>Private revision history</h2>
            <Button variant="ghost" onClick={() => setHistory(null)}>
              Close history
            </Button>
          </div>
          <p>
            Restore an earlier snapshot into your private draft. Review it
            before publishing.
          </p>
          {!history.items.length && <p>No saved revisions yet.</p>}
          {[...history.items]
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((item) => (
              <div className="website-entry" key={item.version}>
                <time dateTime={item.at}>
                  {new Date(item.at).toLocaleString()}
                </time>
                <Button
                  disabled={publishing}
                  onClick={async () => {
                    setPublishing(true);
                    try {
                      if (!(await save())) return;
                      const restored = await call<WebsiteDraft>(
                        "/website/revisions",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            version: item.version,
                            base: latest.current?.version,
                          }),
                        },
                      );
                      latest.current = restored;
                      dirty.current = false;
                      setRecord(restored);
                      remember();
                      setReview(false);
                      setHistory(null);
                      setStatus("Revision restored privately");
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setPublishing(false);
                    }
                  }}
                >
                  Restore draft
                </Button>
              </div>
            ))}
          {history.cursor && (
            <Button
              onClick={async () => {
                try {
                  const next = await call<NonNullable<typeof history>>(
                    `/website/revisions?cursor=${encodeURIComponent(history.cursor!)}`,
                  );
                  setHistory({
                    items: [...history.items, ...next.items],
                    cursor: next.cursor,
                  });
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Load more revisions
            </Button>
          )}
        </section>
      )}
      {recovery && (
        <div className="control-notice">
          <strong>This tab has an earlier unsaved draft.</strong>
          <p>
            Restoring brings that content into the editor. It will not publish
            it.
          </p>
          <Button
            onClick={() => {
              edit((c) => Object.assign(c, recovery));
              setRecovery(null);
            }}
          >
            Restore local draft
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setRecovery(null);
              remember();
            }}
          >
            Keep server version
          </Button>
        </div>
      )}
      {record?.receipt && (
        <div className="website-receipt">
          Publication submitted {new Date(record.receipt.at).toLocaleString()}.{" "}
          <Button
            variant="ghost"
            onClick={async () => {
              try {
                const res = await fetch(`/site-revision.json?t=${Date.now()}`, {
                  cache: "no-store",
                });
                const data = await res.json();
                setStatus(
                  data.revision === record.receipt?.revision
                    ? "Published revision is live"
                    : "Waiting for the site build",
                );
              } catch {
                setStatus("Could not verify the live revision");
              }
            }}
          >
            Check live revision
          </Button>
        </div>
      )}
      {review && content && (
        <section
          className="control-panel"
          aria-label="Review website publication"
        >
          <h2>Publish website changes</h2>
          <p>
            This publishes one snapshot of your profile, homepage sections,
            tools, links, and metadata. Your private drafts and project pages
            are not included.
          </p>
          <ul>
            {Object.keys(content)
              .filter((key) => !["version", "revision"].includes(key))
              .filter((key) => {
                try {
                  return (
                    JSON.stringify(content[key as keyof WebsiteContent]) !==
                    JSON.stringify(JSON.parse(record!.source ?? "{}")[key])
                  );
                } catch {
                  return true;
                }
              })
              .map((key) => (
                <li key={key}>{key}</li>
              ))}
          </ul>
          <div className="website-actions">
            <Button
              variant="primary"
              disabled={publishing}
              onClick={() => void publish()}
            >
              {publishing ? "Submitting…" : "Publish website"}
            </Button>
            <Button onClick={() => setReview(false)}>Keep editing</Button>
          </div>
        </section>
      )}
      {content && (
        <div className="website-workspace" data-preview={preview}>
          <section className="website-controls">
            <div className="website-section-tabs" aria-label="Website sections">
              {[
                ["profile", "Profile"],
                ["sections", "Sections"],
                ...content.tabs
                  .filter((t) => !["writing", "projects"].includes(t.id))
                  .map((t) => [t.id, t.label]),
                ["tools", "Tools"],
                ["seo", "Search & sharing"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={tab === id}
                  onClick={() => {
                    setTab(id);
                    playSound("select");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div key={tab} className="control-panel website-tab-panel">
              {tab === "profile" && (
                <>
                  <ProfileImageManager
                    photo={content.profile.photo}
                    name={content.profile.name}
                    onUpload={(file) =>
                      void upload(file, (src) =>
                        edit((c) => {
                          c.profile.photo = src;
                        })
                      )
                    }
                    onBrowse={() => setMediaTarget("profile")}
                    onChangeUrl={(url) =>
                      edit((c) => {
                        c.profile.photo = url;
                      })
                    }
                  />
                  {(
                    [
                      ["name", "Name"],
                      ["rolePrefix", "Role / title"],
                      ["employer", "Company"],
                      ["employerUrl", "Company website"],
                      ["location", "Location"],
                      ["biography", "Biography"],
                    ] as const
                  ).map(([key, label]) => (
                    <WebsiteField
                      key={label}
                      label={label}
                      value={content.profile[key]}
                      onChange={(value) =>
                        edit((c) => {
                          c.profile[key] = value;
                        })
                      }
                      multiline={key === "biography"}
                    />
                  ))}
                </>
              )}
              {tab === "sections" &&
                content.tabs.map((section, index) => (
                  <div className="website-entry" key={section.id}>
                    {
                      <WebsiteField
                        key={"Section label"}
                        label={"Section label"}
                        value={section.label}
                        onChange={(value) =>
                          edit((c) => {
                            c.tabs[index].label = value;
                          })
                        }
                        multiline={false}
                      />
                    }
                    <label>
                      <input
                        type="checkbox"
                        checked={!section.hidden}
                        onChange={(e) =>
                          edit((c) => {
                            c.tabs[index].hidden = !e.target.checked;
                          })
                        }
                      />{" "}
                      Visible on homepage
                    </label>
                    <div className="website-actions">
                      <Button
                        shape="square"
                        aria-label={`Move ${section.label} up`}
                        disabled={!index}
                        onClick={() =>
                          edit((c) => {
                            [c.tabs[index - 1], c.tabs[index]] = [
                              c.tabs[index],
                              c.tabs[index - 1],
                            ];
                          })
                        }
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        shape="square"
                        aria-label={`Move ${section.label} down`}
                        disabled={index === content.tabs.length - 1}
                        onClick={() =>
                          edit((c) => {
                            [c.tabs[index + 1], c.tabs[index]] = [
                              c.tabs[index],
                              c.tabs[index + 1],
                            ];
                          })
                        }
                      >
                        <ArrowDown />
                      </Button>
                    </div>
                  </div>
                ))}
              {tab === "seo" && (
                <>
                  {
                    <WebsiteField
                      key={"Search title"}
                      label={"Search title"}
                      value={content.seo.title}
                      onChange={(value) =>
                        edit((c) => {
                          c.seo.title = value;
                        })
                      }
                      multiline={false}
                    />
                  }
                  {
                    <WebsiteField
                      key={"Description"}
                      label={"Description"}
                      value={content.seo.description}
                      onChange={(value) =>
                        edit((c) => {
                          c.seo.description = value;
                        })
                      }
                      multiline={true}
                    />
                  }
                  {
                    <WebsiteField
                      key={"Share image URL"}
                      label={"Share image URL"}
                      value={content.seo.image}
                      onChange={(value) =>
                        edit((c) => {
                          c.seo.image = value;
                        })
                      }
                      multiline={false}
                    />
                  }
                  <Button onClick={() => setMediaTarget("sharing")}>
                    Choose share image
                  </Button>
                </>
              )}
              {tab === "tools" && (
                <>
                  {content.tools.map((tool, index) => (
                    <div className="website-entry" key={index}>
                      {
                        <WebsiteField
                          key={"Tool name"}
                          label={"Tool name"}
                          value={tool.label}
                          onChange={(value) =>
                            edit((c) => {
                              c.tools[index].label = value;
                            })
                          }
                          multiline={false}
                        />
                      }
                      {
                        <WebsiteField
                          key={"Image URL"}
                          label={"Image URL"}
                          value={tool.src}
                          onChange={(value) =>
                            edit((c) => {
                              c.tools[index].src = value;
                            })
                          }
                          multiline={false}
                        />
                      }
                      {
                        <WebsiteField
                          key={"Website"}
                          label={"Website"}
                          value={tool.href ?? ""}
                          onChange={(value) =>
                            edit((c) => {
                              c.tools[index].href = value;
                            })
                          }
                          multiline={false}
                        />
                      }
                      <div className="website-actions">
                        <Button
                          disabled={!index}
                          onClick={() =>
                            edit((c) => {
                              [c.tools[index - 1], c.tools[index]] = [
                                c.tools[index],
                                c.tools[index - 1],
                              ];
                            })
                          }
                        >
                          Move up
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            edit((c) => {
                              c.tools.splice(index, 1);
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={() =>
                      edit((c) => {
                        c.tools.push({ label: "New tool", src: "" });
                      })
                    }
                  >
                    <Plus /> Add tool
                  </Button>
                </>
              )}
              {content.tabs
                .filter((t) => t.id === tab)
                .map((section) => (
                  <div key={section.id}>
                    {section.body && (
                      <WebsiteField
                        key={"Content"}
                        label={"Content"}
                        value={section.body.join("\n\n")}
                        onChange={(value) =>
                          edit((c) => {
                            c.tabs.find((t) => t.id === tab)!.body =
                              value.split(/\n\s*\n/);
                          })
                        }
                        multiline={true}
                      />
                    )}
                    {section.items?.map((entry, index) => (
                      <div className="website-entry" key={index}>
                        {(
                          [
                            ["title", "Title"],
                            ["company", "Company / issuer"],
                            ["year", "Dates"],
                            ["href", "Website / credential"],
                            ["image", "Image URL"],
                          ] as const
                        ).map(([key, label]) => (
                          <WebsiteField
                            key={label}
                            label={label}
                            value={entry[key] ?? ""}
                            onChange={(value) =>
                              edit((c) => {
                                c.tabs.find((t) => t.id === tab)!.items![index][
                                  key
                                ] = value;
                              })
                            }
                            multiline={false}
                          />
                        ))}
                        <div className="website-actions">
                          <Button
                            disabled={!index}
                            onClick={() =>
                              edit((c) => {
                                const items = c.tabs.find(
                                  (t) => t.id === tab,
                                )!.items!;
                                [items[index - 1], items[index]] = [
                                  items[index],
                                  items[index - 1],
                                ];
                              })
                            }
                          >
                            Move up
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              edit((c) => {
                                c.tabs
                                  .find((t) => t.id === tab)!
                                  .items!.splice(index, 1);
                              })
                            }
                          >
                            <Trash size={15} /> Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    {section.items && (
                      <Button
                        onClick={() =>
                          edit((c) => {
                            c.tabs
                              .find((t) => t.id === tab)!
                              .items!.push({ title: "New entry", year: "" });
                          })
                        }
                      >
                        <Plus /> Add entry
                      </Button>
                    )}
                    {section.links?.map((link, index) => (
                      <div className="website-entry" key={index}>
                        {
                          <WebsiteField
                            key={"Link label"}
                            label={"Link label"}
                            value={link.label}
                            onChange={(value) =>
                              edit((c) => {
                                c.tabs.find((t) => t.id === tab)!.links![
                                  index
                                ].label = value;
                              })
                            }
                            multiline={false}
                          />
                        }
                        {
                          <WebsiteField
                            key={"Link destination"}
                            label={"Link destination"}
                            value={link.href}
                            onChange={(value) =>
                              edit((c) => {
                                c.tabs.find((t) => t.id === tab)!.links![
                                  index
                                ].href = value;
                              })
                            }
                            multiline={false}
                          />
                        }
                        <Button
                          variant="ghost"
                          onClick={() =>
                            edit((c) => {
                              c.tabs
                                .find((t) => t.id === tab)!
                                .links!.splice(index, 1);
                            })
                          }
                        >
                          Remove link
                        </Button>
                      </div>
                    ))}
                    {section.links && (
                      <Button
                        onClick={() =>
                          edit((c) => {
                            c.tabs
                              .find((t) => t.id === tab)!
                              .links!.push({ label: "New link", href: "" });
                          })
                        }
                      >
                        <Plus /> Add link
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </section>
          <section className="website-preview" aria-label="Website preview">
            <div className="website-preview-toolbar">
              <span>Live draft preview</span>
              <div className="website-actions">
                <Button
                  shape="square"
                  aria-label="Desktop preview"
                  variant={!mobile ? "secondary" : "ghost"}
                  onClick={() => setMobile(false)}
                >
                  <Desktop />
                </Button>
                <Button
                  shape="square"
                  aria-label="Mobile preview"
                  variant={mobile ? "secondary" : "ghost"}
                  onClick={() => setMobile(true)}
                >
                  <DeviceMobile />
                </Button>
              </div>
            </div>
            <div className="website-preview-page" data-mobile={mobile}>
              <PortfolioContent content={content} />
            </div>
          </section>
        </div>
      )}
      <MediaLibrary
        open={mediaTarget !== null}
        onClose={() => setMediaTarget(null)}
        onInsert={(asset) => {
          if (!asset.type.startsWith("image/")) {
            setError("Choose an image for this field.");
            return;
          }
          edit((c) => {
            if (mediaTarget === "profile") c.profile.photo = asset.src;
            else c.seo.image = asset.src;
          });
          setMediaTarget(null);
        }}
      />
    </div>
  );
}

function WebsiteField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="website-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
        />
      ) : (
        <Input
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function ProfileImageManager({
  photo,
  name,
  onUpload,
  onBrowse,
  onChangeUrl,
}: {
  photo: string;
  name: string;
  onUpload: (f: File) => void;
  onBrowse: () => void;
  onChangeUrl: (url: string) => void;
}) {
  return (
    <div className="website-photo-manager">
      <div className="website-photo-header">
        <label htmlFor="profile-photo-url-input">Profile photo</label>
        <span className="website-photo-hint">Avatar on your homepage, header & metadata</span>
      </div>

      <div className="website-photo-box">
        <div className="website-photo-avatar-wrap">
          {photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photo}
              alt={name || "Profile avatar"}
              className="website-photo-avatar-img"
            />
          ) : (
            <div className="website-photo-avatar-empty">
              <ImageIcon size={32} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="website-photo-content">
          <MagneticDropzone
            onFiles={(files) => {
              const f = files[0];
              if (f) {
                onUpload(f);
                playSound("tap");
              }
            }}
            accept="image/*"
            multiple={false}
            title="Drop a new photo here"
            hint="or click to browse from your device"
            className="website-photo-magnetic-zone"
          />

          <div className="website-photo-actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                onBrowse();
                playSound("select");
              }}
            >
              <FolderOpen size={14} aria-hidden="true" />
              Browse media library
            </Button>
          </div>

          <div className="website-photo-url-wrap">
            <label htmlFor="profile-photo-url-input" className="website-photo-url-label">
              URL:
            </label>
            <input
              id="profile-photo-url-input"
              aria-label="Profile image URL"
              className="website-photo-url-field"
              value={photo}
              placeholder="e.g. /avatar-1024.webp or https://…"
              onChange={(e) => onChangeUrl(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
