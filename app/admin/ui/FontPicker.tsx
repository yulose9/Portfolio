"use client";
import { useState } from "react";
import {
  FONT_CATALOG,
  FONT_CATALOG_DATE,
  FONT_SHELF,
  findFont,
} from "../../../cms/fonts";
import type { FontChoice } from "../../../cms/format";
import AdminSelect from "./AdminSelect";
import { loadFont } from "./font-loader";
export default function FontPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (f: FontChoice | null) => void;
}) {
  const [query, setQuery] = useState("");
  const list = query.trim()
    ? FONT_CATALOG.filter((f) =>
        f.family.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : FONT_SHELF;
  const fonts = [
    ...new Map(
      [
        ...(value && findFont(value) ? [findFont(value)!] : []),
        ...list.slice(0, 80),
      ].map((f) => [f.family, f]),
    ).values(),
  ];
  return (
    <div className="font-catalog-picker">
      <input
        type="search"
        aria-label={`Search ${label.toLowerCase()} catalog`}
        placeholder="Search Google Fonts & Fontshare…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <AdminSelect
        label={label}
        value={value}
        options={[
          { value: "", label: "Page font" },
          ...fonts.map((f) => ({
            value: f.family,
            label: `${f.family}${f.source === "fontshare" ? " · Fontshare" : ""}`,
          })),
        ]}
        onValueChange={(family) => {
          const font = findFont(family) ?? null;
          loadFont(font);
          onChange(font);
        }}
      />
      <small>
        {query
          ? `${list.length} results${list.length > 80 ? " · refine to see more" : ""}`
          : `${FONT_CATALOG.length.toLocaleString()} families`}{" "}
        · updated {FONT_CATALOG_DATE.slice(0, 10)}
      </small>
    </div>
  );
}
