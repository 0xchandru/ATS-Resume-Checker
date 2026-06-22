import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Undo, Redo, Minus, AlignLeft, AlignCenter, AlignRight,
  Type, Eraser as ClearIcon
} from "lucide-react";

interface Props {
  value: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  editorKey?: number;
}

export interface ResumeEditorHandle {
  getHTML: () => string;
  focus: () => void;
}

function Sep() {
  return <div className="w-px h-4 bg-white/[0.08] mx-0.5 shrink-0" />;
}

function ToolBtn({
  onClick, active, disabled, title, children, danger,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`
        p-1.5 rounded transition-all text-sm shrink-0
        ${active
          ? "bg-violet-500/25 text-violet-300 ring-1 ring-violet-500/35"
          : danger
          ? "text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.07]"}
        disabled:opacity-20 disabled:cursor-not-allowed
      `}
    >
      {children}
    </button>
  );
}

const ResumeEditor = forwardRef<ResumeEditorHandle, Props>(
  function ResumeEditor({ value, onChange, placeholder }, ref) {
    const suppressNextUpdate = useRef(false);
    const prevValue = useRef(value);

    const editor = useEditor({
      extensions: [
        // StarterKit v3 includes: Bold, Italic, Underline, Heading, BulletList,
        // OrderedList, HorizontalRule, History, etc. — don't add duplicates.
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Placeholder.configure({
          placeholder: placeholder || "Your resume content will appear here…",
        }),
      ],
      content: value,
      onUpdate: ({ editor }) => {
        if (suppressNextUpdate.current) {
          suppressNextUpdate.current = false;
          return;
        }
        const html = editor.getHTML();
        prevValue.current = html;
        onChange?.(html);
      },
      editorProps: {
        attributes: {
          class: [
            "resume-prose",
            "outline-none",
            "w-full px-12 py-10",
            "text-[14.5px] leading-[1.8]",
            "text-foreground/90",
            "min-h-[700px]",
          ].join(" "),
          spellcheck: "true",
        },
      },
    });

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() ?? "",
      focus: () => editor?.commands.focus(),
    }));

    // External value updates (AI Optimize, AI Clean, initial load).
    // We use a ref-based comparison with text normalization to avoid
    // false mismatches from Tiptap's HTML serialization quirks in v3.
    useEffect(() => {
      if (!editor || !value) return;
      if (value === prevValue.current) return;
      prevValue.current = value;
      suppressNextUpdate.current = true;
      editor.commands.setContent(value, false);
    }, [value, editor]);

    if (!editor) return null;

    const can = editor.can().chain().focus();

    return (
      <div className="flex flex-col h-full bg-[#0d0f16] overflow-hidden">
        {/* ── Formatting toolbar ── */}
        <div className="shrink-0 flex items-center gap-0.5 px-3 py-1.5 border-b border-white/[0.05] bg-black/20 flex-wrap">

          {/* History */}
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
            <Undo className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
            <Redo className="w-3.5 h-3.5" />
          </ToolBtn>

          <Sep />

          {/* Headings */}
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1 — Your name">
            <Heading1 className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2 — Section header (EXPERIENCE, SKILLS…)">
            <Heading2 className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3 — Job title / company">
            <Heading3 className="w-3.5 h-3.5" />
          </ToolBtn>

          <Sep />

          {/* Inline formatting */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
            <Bold className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
            <Italic className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)">
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolBtn>

          <Sep />

          {/* Lists */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
            <List className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Section divider (—)">
            <Minus className="w-3.5 h-3.5" />
          </ToolBtn>

          <Sep />

          {/* Alignment */}
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
            <AlignLeft className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center — good for name/contact line">
            <AlignCenter className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
            <AlignRight className="w-3.5 h-3.5" />
          </ToolBtn>

          <Sep />

          {/* Quick section insert */}
          <div className="relative group">
            <ToolBtn onClick={() => {}} title="Insert resume section">
              <Type className="w-3.5 h-3.5" />
            </ToolBtn>
            <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:flex flex-col bg-card border border-border rounded-xl shadow-2xl overflow-hidden min-w-[160px]">
              {[
                ["EXPERIENCE", 2],
                ["SKILLS", 2],
                ["EDUCATION", 2],
                ["CERTIFICATIONS", 2],
                ["PROJECTS", 2],
                ["SUMMARY", 2],
              ].map(([label, level]) => (
                <button
                  key={label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().insertContent(`<h${level}>${label}</h${level}><p></p>`).run();
                  }}
                  className="px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors"
                >
                  {label as string}
                </button>
              ))}
            </div>
          </div>

          {/* Clear formatting */}
          <ToolBtn
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            title="Clear all formatting"
            danger
          >
            <ClearIcon className="w-3.5 h-3.5" />
          </ToolBtn>
        </div>

        {/* ── Document body ── */}
        <div
          className="flex-1 min-h-0 overflow-y-auto cursor-text"
          onClick={() => editor.commands.focus()}
        >
          <div className="max-w-[780px] mx-auto my-6 bg-white/[0.02] border border-white/[0.05] rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
            <EditorContent
              editor={editor}
              className="[&_.resume-prose]:block"
            />
          </div>
        </div>

        <style>{`
          .resume-prose {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          .resume-prose h1 {
            font-size: 1.7rem;
            font-weight: 800;
            letter-spacing: -0.025em;
            line-height: 1.15;
            color: #f1f5f9;
            margin-top: 0.1em;
            margin-bottom: 0.2em;
          }
          .resume-prose h2 {
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #a78bfa;
            margin-top: 1.8em;
            margin-bottom: 0.5em;
            padding-bottom: 0.3em;
            border-bottom: 1.5px solid rgba(167,139,250,0.2);
          }
          .resume-prose h3 {
            font-size: 0.92rem;
            font-weight: 700;
            color: #e2e8f0;
            margin-top: 1em;
            margin-bottom: 0.05em;
          }
          .resume-prose p {
            margin-top: 0.1em;
            margin-bottom: 0.1em;
            color: #94a3b8;
            line-height: 1.75;
          }
          .resume-prose p:empty::after {
            content: '';
            display: inline-block;
          }
          .resume-prose ul {
            list-style-type: disc;
            padding-left: 1.4em;
            margin-top: 0.3em;
            margin-bottom: 0.3em;
          }
          .resume-prose ol {
            list-style-type: decimal;
            padding-left: 1.4em;
            margin-top: 0.3em;
            margin-bottom: 0.3em;
          }
          .resume-prose li {
            margin-top: 0.18em;
            margin-bottom: 0.18em;
            color: #94a3b8;
            line-height: 1.65;
          }
          .resume-prose li::marker {
            color: #a78bfa;
            font-size: 0.75em;
          }
          .resume-prose hr {
            border: none;
            border-top: 1px solid rgba(255,255,255,0.06);
            margin: 1.4em 0;
          }
          .resume-prose strong { color: #e2e8f0; }
          .resume-prose em { color: #7c8ea8; font-style: italic; }
          .resume-prose u { text-decoration-color: rgba(167,139,250,0.4); }
          .resume-prose a { color: #818cf8; text-decoration: underline; }
          /* Placeholder */
          .resume-prose p.is-empty:first-child::before,
          .resume-prose.is-editor-empty > p:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: rgba(148,163,184,0.25);
            pointer-events: none;
            height: 0;
          }
          /* Selection */
          .resume-prose ::selection {
            background: rgba(139,92,246,0.25);
          }
          /* Focus ring */
          .resume-prose.ProseMirror-focused { outline: none; }
        `}</style>
      </div>
    );
  }
);

export default ResumeEditor;
