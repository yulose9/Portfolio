"use client";

import { useState, type ReactNode } from "react";

import { MagneticDropzone } from "../../components/kit/inputs/magnetic-dropzone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/kit/tabs";
import { EmojiPicker } from "./extensions/emoji";
import IconLibrary from "./IconLibrary";
import { uploadInlineLogo } from "./media";
import { beginPendingWork } from "./session";

/*
 * Where a small icon can come from: an emoji, the icon library, or an image
 * of your own. Heading icons and "Logo and text" share it; the callout picker
 * has the same three tabs with its own extras. `onImage` always receives a
 * media-library URL, never a third-party one.
 */

export type IconSource = "emoji" | "icons" | "custom";

export default function IconSources({
  initial = "emoji",
  onEmoji,
  onImage,
  onBusy,
  uploadExtra,
}: {
  initial?: IconSource;
  onEmoji: (emoji: string) => void;
  onImage: (src: string) => void;
  onBusy?: (busy: boolean) => void;
  /** Shown under the drop zone, e.g. a typed-symbol field. */
  uploadExtra?: ReactNode;
}) {
  const [tab, setTab] = useState<string>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const working = (b: boolean) => {
    setBusy(b);
    onBusy?.(b);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const finish = beginPendingWork();
    working(true);
    setError("");
    try {
      onImage(await uploadInlineLogo(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      working(false);
      finish();
    }
  };

  return (
    <Tabs value={tab} onValueChange={(v) => !busy && setTab(String(v))} className="icon-sources">
      <TabsList aria-label="Icon source">
        <TabsTrigger value="emoji">Emoji</TabsTrigger>
        <TabsTrigger value="icons">Icons</TabsTrigger>
        <TabsTrigger value="custom">Custom</TabsTrigger>
      </TabsList>
      <TabsContent value="emoji">
        <EmojiPicker onPick={onEmoji} />
      </TabsContent>
      <TabsContent value="icons">
        <IconLibrary onPick={onImage} onBusy={working} />
      </TabsContent>
      <TabsContent value="custom" className="icon-sources-custom">
        <MagneticDropzone
          className="icon-sources-drop"
          accept="image/svg+xml,image/png,image/jpeg,image/webp,image/heic,image/heif,.svg,.png,.jpg,.jpeg,.webp,.heic,.heif"
          maxSize={20 * 1024 * 1024}
          disabled={busy}
          title={busy ? "Uploading…" : "Drop an image, or choose one"}
          hint="SVG, PNG, JPG, WebP or HEIF. Square works best."
          onFiles={(files) => void upload(files[0])}
        />
        {uploadExtra}
        {error ? (
          <p role="alert" className="field-error">
            {error}
          </p>
        ) : null}
      </TabsContent>
    </Tabs>
  );
}
