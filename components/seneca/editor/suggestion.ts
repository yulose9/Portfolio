// @ts-nocheck
"use client";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { ReactRenderer } from "@tiptap/react";

import CommandsList from "./CommandsList";

export default {
  items: ({ query }) => {
    return [
      // Text & Headings
      {
        title: "Text",
        description: "Just start writing with plain text.",
        icon: "📝",
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode("paragraph").run();
        },
      },
      {
        title: "Heading 1",
        description: "Large section heading.",
        icon: "𝗛₁",
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setNode("heading", { level: 1 })
            .run();
        },
      },
      {
        title: "Heading 2",
        description: "Medium section heading.",
        icon: "𝗛₂",
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setNode("heading", { level: 2 })
            .run();
        },
      },
      {
        title: "Heading 3",
        description: "Small section heading.",
        icon: "𝗛₃",
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setNode("heading", { level: 3 })
            .run();
        },
      },
      // Lists
      {
        title: "Bullet List",
        description: "Create a simple bulleted list.",
        icon: "•",
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
      },
      {
        title: "Numbered List",
        description: "Create a numbered list.",
        icon: "1.",
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
      },
      {
        title: "Task List",
        description: "Track tasks with a to-do list.",
        icon: "☑️",
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
      },
      {
        title: "Toggle List",
        description: "Toggles can hide and show content.",
        icon: "▶️",
        command: ({ editor, range }) => {
          // Toggle functionality - wrap in details element
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: "paragraph",
              content: [{ type: "text", text: "▸ Click to toggle content..." }],
            })
            .run();
        },
      },
      // Blocks
      {
        title: "Quote",
        description: "Capture a quote.",
        icon: "❝",
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
      },
      {
        title: "Code Block",
        description: "Add a code snippet.",
        icon: "💻",
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
      },
      {
        title: "Callout",
        description: "Make your writing stand out.",
        icon: "💡",
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .toggleBlockquote()
            .insertContent("💡 ")
            .run();
        },
      },
      {
        title: "Divider",
        description: "Visually divide blocks.",
        icon: "—",
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
      },
      // Media
      {
        title: "Image",
        description: "Upload or embed an image.",
        icon: "🖼️",
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          window.dispatchEvent(
            new CustomEvent("editor-media-upload", {
              detail: { type: "image" },
            })
          );
        },
      },
      {
        title: "YouTube",
        description: "Embed a YouTube video.",
        icon: "📺",
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          const url = prompt("Enter YouTube URL:");
          if (url) {
            editor.chain().focus().setYoutubeVideo({ src: url }).run();
          }
        },
      },
      {
        title: "Link",
        description: "Add a hyperlink.",
        icon: "🔗",
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          const url = prompt("Enter URL:");
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        },
      },
      // Alignment
      {
        title: "Align Left",
        description: "Align text to the left.",
        icon: "⬅️",
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setTextAlign("left").run();
        },
      },
      {
        title: "Align Center",
        description: "Center align text.",
        icon: "↔️",
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setTextAlign("center")
            .run();
        },
      },
      {
        title: "Align Right",
        description: "Align text to the right.",
        icon: "➡️",
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setTextAlign("right").run();
        },
      },
      // Advanced
      {
        title: "Emoji",
        description: "Search and insert an emoji.",
        icon: "😀",
        command: ({ editor, range }) => {
          const emojis = [
            "😊",
            "🎉",
            "🚀",
            "💡",
            "⭐",
            "🔥",
            "💪",
            "✨",
            "🎯",
            "💭",
          ];
          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          editor.chain().focus().deleteRange(range).insertContent(emoji).run();
        },
      },
      {
        title: "Table of Contents",
        description: "Show an outline of your page.",
        icon: "📑",
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: "paragraph",
              content: [{ type: "text", text: "📑 Table of Contents" }],
            })
            .run();
        },
      },
    ]
      .filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10);
  },

  render: () => {
    let component;
    let clickOutsideHandler;

    const cleanup = () => {
      if (clickOutsideHandler) {
        document.removeEventListener("mousedown", clickOutsideHandler);
        clickOutsideHandler = null;
      }
      if (component) {
        component.destroy();
        if (component.element && component.element.parentNode) {
          component.element.remove();
        }
      }
    };

    return {
      onStart: (props) => {
        component = new ReactRenderer(CommandsList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        const virtualElement = {
          getBoundingClientRect: props.clientRect,
        };

        component.element.style.position = "fixed";
        component.element.style.zIndex = "999999";
        document.body.appendChild(component.element);

        clickOutsideHandler = (event) => {
          if (component.element && !component.element.contains(event.target)) {
            cleanup();
            props.editor.commands.focus();
          }
        };
        setTimeout(() => {
          document.addEventListener("mousedown", clickOutsideHandler);
        }, 100);

        computePosition(virtualElement, component.element, {
          placement: "bottom-start",
          strategy: "fixed",
          middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          Object.assign(component.element.style, {
            left: `${x}px`,
            top: `${y}px`,
          });
        });
      },

      onUpdate(props) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        const virtualElement = {
          getBoundingClientRect: props.clientRect,
        };

        computePosition(virtualElement, component.element, {
          placement: "bottom-start",
          strategy: "fixed",
          middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          Object.assign(component.element.style, {
            left: `${x}px`,
            top: `${y}px`,
          });
        });
      },

      onKeyDown(props) {
        if (props.event.key === "Escape") {
          cleanup();
          return true;
        }

        return component.ref?.onKeyDown(props);
      },

      onExit() {
        cleanup();
      },
    };
  },
};
