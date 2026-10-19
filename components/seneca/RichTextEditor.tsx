// @ts-nocheck
"use client";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import { FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Plus,
  Quote,
  Strikethrough,
  Type,
  Underline as UnderlineIcon,
  Video,
} from "lucide-react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// Slash Command
import Commands from "@/components/seneca/editor/Commands";
import { FADE, FADE_EXIT, TAP, TAP_TRANSITION } from "@/lib/seneca/constants/motion";
import EditorBubbleMenu from "@/components/seneca/editor/EditorBubbleMenu";
import suggestion from "@/components/seneca/editor/suggestion";

import { storageService } from "@/lib/seneca/services/storageService";

const HIGHLIGHT_COLORS = [
  "#FFFF00",
  "#FF6B6B",
  "#51CF66",
  "#339AF0",
  "#CC5DE8",
  "#20C997",
];

const ToolbarButton = ({ onClick, isActive, disabled, children, title }) => (
  <motion.button
    type="button"
    whileTap={disabled ? undefined : TAP}
    transition={TAP_TRANSITION}
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    aria-pressed={isActive}
    className={clsx(
      "w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-150 shrink-0",
      isActive
        ? "bg-accent text-white"
        : "bg-transparent text-ink-2 hover:bg-fill",
      disabled && "opacity-30 cursor-not-allowed",
    )}
  >
    {children}
  </motion.button>
);

const RichTextEditor = forwardRef(function RichTextEditor(
  {
    content = "",
    onChange,
    placeholder = "Type / for commands...",
    className,
    autoSaveKey = "journal-draft",
    /** "document": no toolbar or frame, like the Writing editor — "/" and the selection bubble do the formatting. */
    variant = "card",
  },
  ref,
) {
  const fileInputRef = useRef(null);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFloatingActions, setShowFloatingActions] = useState(false);

  const saveDraft = useCallback(
    (htmlContent) => {
      try {
        if (autoSaveKey) {
          localStorage.setItem(
            autoSaveKey,
            JSON.stringify({
              content: htmlContent,
              timestamp: Date.now(),
            }),
          );
        }
      } catch (e) {
        console.warn("Draft save failed:", e);
      }
    },
    [autoSaveKey],
  );

  const handleFile = async (file, editorInstance) => {
    if (!editorInstance || !file) return;

    if (file.type.startsWith("image/")) {
      try {
        const url = await storageService.uploadImage(file, "uploads");
        editorInstance.chain().focus().setImage({ src: url }).run();
      } catch (e) {
        console.error("Image upload failed", e);
      }
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => handleFile(f, editor));
    e.target.value = "";
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // The Commands extension provides its own slash command functionality
        // So we don't need to worry about it in StarterKit
      }),
      Underline, // StarterKit doesn't include underline by default
      Typography,
      Image.configure({ inline: true }),
      Link.configure({ openOnClick: false }), // Using enhanced Link
      Youtube.configure({ controls: true }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: placeholder || "Type / for commands...",
      }),
      Commands.configure({ suggestion }), // Custom slash command extension
    ],
    content,
    editorProps: {
      attributes: {
        class: clsx(
          "prose prose-base max-w-none focus:outline-none min-h-[120px] text-body text-ink prose-img:rounded-lg prose-img:outline prose-img:outline-1 prose-img:-outline-offset-1 prose-img:outline-[oklch(0_0_0/0.1)]",
          variant === "document" ? "sn-doc-prose" : "px-4 py-8",
          className,
        ),
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length > 0) {
          Array.from(event.dataTransfer.files).forEach((file) =>
            handleFile(file, editor),
          );
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON();
      onChange?.(json);
      saveDraft(JSON.stringify(json));
    },
  });

  // Expose focus method to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        if (editor) {
          editor.chain().focus().run();
        }
      },
    }),
    [editor],
  );

  useEffect(() => {
    if (editor && content !== undefined) {
      // Compare JSON content to check if update is needed
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson =
        typeof content === "string" ? content : JSON.stringify(content);
      if (currentJson !== newJson) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  useEffect(() => {
    const handleMediaUpload = (e) => {
      if (e.detail?.type === "image" && fileInputRef.current) {
        fileInputRef.current.click();
      }
    };
    window.addEventListener("editor-media-upload", handleMediaUpload);
    return () =>
      window.removeEventListener("editor-media-upload", handleMediaUpload);
  }, []);

  if (!editor) return null;

  const addYoutube = () => {
    const url = prompt("Enter YouTube URL");
    if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div
      className={
        variant === "document"
          ? "relative rich-text-editor sn-doc-editor"
          : "flex flex-col h-full bg-surface rounded-xl overflow-hidden relative rich-text-editor border border-separator"
      }
    >
      {/* Toolbar (hidden in document mode; its file input still serves "/image") */}
      <div className="rte-toolbar flex items-center gap-0.5 p-2 border-b border-separator overflow-x-auto no-scrollbar bg-canvas/60 sticky top-0 z-10">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="Code"
        >
          <Code size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-separator mx-1 shrink-0" />

        <div className="relative">
          <ToolbarButton
            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
            isActive={editor.isActive("highlight")}
            title="Highlight"
          >
            <Highlighter size={16} />
          </ToolbarButton>
          <AnimatePresence>
          {showHighlightPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: FADE_EXIT }}
              transition={FADE}
              style={{ transformOrigin: "top left" }}
              className="absolute top-full left-0 mt-2 bg-surface shadow-float rounded-lg p-2 flex gap-1 z-50 border border-separator">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color: c }).run();
                    setShowHighlightPicker(false);
                  }}
                  aria-label={`Highlight ${c}`}
                  className="w-6 h-6 rounded-full border border-separator active:scale-[0.96] transition-[scale] duration-150"
                  style={{ backgroundColor: c }}
                />
              ))}
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        <div className="w-px h-5 bg-separator mx-1 shrink-0" />

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading"
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")}
          title="Task List"
        >
          <CheckSquare size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Quote"
        >
          <Quote size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-separator mx-1 shrink-0" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-separator mx-1 shrink-0" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          <Minus size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive("link")}
          title="Link"
        >
          <LinkIcon size={16} />
        </ToolbarButton>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
        />
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="Image"
        >
          <ImageIcon size={16} />
        </ToolbarButton>

        <ToolbarButton onClick={addYoutube} title="YouTube">
          <Video size={16} />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />

      {/* Bubble Menu - appears on text selection */}
      <EditorBubbleMenu editor={editor} />
    </div>
  );
});

export default RichTextEditor;
