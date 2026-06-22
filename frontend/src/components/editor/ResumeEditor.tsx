import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import React from "react";
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Undo, Redo, Minus
} from "lucide-react";
import UnderlineExt from "@tiptap/extension-underline";
import HorizontalRule from "@tiptap/extension-horizontal-rule";

interface Props {
  value: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}

function ToolBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`
        p-1.5 rounded-md transition-colors text-sm
        ${active
          ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30"
          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}
        disabled:opacity-25 disabled:cursor-not-allowed
      `}
    >
      {children}
    </button>
  );
}

export default function ResumeEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ horizontalRule: false }),
      UnderlineExt,
      HorizontalRule,
      Placeholder.configure({
        placeholder: placeholder || "Your resume content will appear here…",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        class: [
          "resume-prose",
          "outline-none",
          "w-full h-full px-10 py-8",
          "text-[15px] leading-[1.75]",
          "text-foreground/90",
        ].join(" "),
        spellcheck: "true",
      },
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const sep = <div className="w-px h-4 bg-white/[0.1] mx-0.5" />;

  return (
    <div className="flex flex-col h-full bg-[#0f1117] overflow-hidden">
      {/* Floating toolbar */}
      <div className="shrink-0 flex items-center gap-0.5 px-4 py-1.5 border-b border-white/[0.06] bg-white/[0.02] flex-wrap">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)">
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolBtn>

        {sep}

        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1 — Name">
          <Heading1 className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2 — Section">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3 — Job title">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolBtn>

        {sep}

        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule / divider">
          <Minus className="w-3.5 h-3.5" />
        </ToolBtn>

        {sep}

        <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
          <Undo className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
          <Redo className="w-3.5 h-3.5" />
        </ToolBtn>
      </div>

      {/* Document body — full height, scrollable, paper-feel */}
      <div
        className="flex-1 min-h-0 overflow-y-auto cursor-text"
        onClick={() => editor.commands.focus()}
      >
        {/* Paper container */}
        <div className="max-w-3xl mx-auto my-6 bg-white/[0.025] border border-white/[0.06] rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
          <EditorContent
            editor={editor}
            className="[&_.resume-prose]:block [&_.resume-prose]:min-h-[600px]"
          />
        </div>
      </div>

      <style>{`
        /* Resume document typography */
        .resume-prose h1 {
          font-size: 1.65rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin-bottom: 0.15em;
          color: #f1f5f9;
        }
        .resume-prose h2 {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #a78bfa;
          margin-top: 1.5em;
          margin-bottom: 0.4em;
          padding-bottom: 0.25em;
          border-bottom: 1px solid rgba(167,139,250,0.25);
        }
        .resume-prose h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #e2e8f0;
          margin-top: 0.9em;
          margin-bottom: 0.1em;
        }
        .resume-prose p {
          margin-top: 0.2em;
          margin-bottom: 0.2em;
          color: #cbd5e1;
        }
        .resume-prose ul {
          list-style-type: disc;
          padding-left: 1.4em;
          margin-top: 0.25em;
          margin-bottom: 0.25em;
        }
        .resume-prose ol {
          list-style-type: decimal;
          padding-left: 1.4em;
          margin-top: 0.25em;
          margin-bottom: 0.25em;
        }
        .resume-prose li {
          margin-top: 0.15em;
          margin-bottom: 0.15em;
          color: #cbd5e1;
        }
        .resume-prose hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.08);
          margin: 1.2em 0;
        }
        .resume-prose strong { color: #f1f5f9; }
        .resume-prose em { color: #94a3b8; }
        /* Placeholder */
        .resume-prose.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(148,163,184,0.35);
          pointer-events: none;
          height: 0;
        }
        /* Focus caret */
        .resume-prose .ProseMirror:focus { outline: none; }
      `}</style>
    </div>
  );
}
