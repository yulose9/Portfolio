"use client";

import { pageIconSrc } from "../../../cms/page-icon";
import { publicArtworkPath } from "../../../cms/social";
import type { Meta } from "./Editor";

type ShareMeta = Pick<Meta, "title" | "dek" | "icon" | "cover" | "ogImage" | "authors">;

/** Draft approximation shared by Details and platform previews. Published PNGs are built separately. */
export default function ShareArtwork({ meta, project = false }: { meta: ShareMeta; project?: boolean }) {
  const source = meta.ogImage && meta.ogImage !== "cover" ? meta.ogImage : meta.cover?.src;
  const artwork = publicArtworkPath(source);
  if (meta.ogImage && artwork) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="share-img" src={artwork} alt={`Share artwork for ${meta.title || "Untitled"}`} />;
  }
  const cover = !meta.ogImage ? artwork : null;
  return (
    <div className={`og-mock${cover ? " og-mock-with-art" : ""}`} role="img" aria-label={`Generated share card preview for ${meta.title || "Untitled"}`}>
      <div className="og-mock-inner" aria-hidden="true">
        <div className="og-mock-main">
          <div className="og-mock-copy">
            {meta.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="og-mock-icon" src={pageIconSrc(meta.icon)} width={64} height={64} alt="" />
            )}
            <div className="og-mock-title">{meta.title || "Untitled"}</div>
            {meta.dek && <div className="og-mock-dek">{meta.dek}</div>}
          </div>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="og-mock-art" src={cover} width={416} height={432} alt="" />
          )}
        </div>
        <div className="og-mock-foot">
          <span>nazarene.dev/{project ? "projects" : "writing"}</span>
          <span>{meta.authors.map(author => author.name).filter(Boolean).join(", ")}</span>
        </div>
      </div>
    </div>
  );
}
