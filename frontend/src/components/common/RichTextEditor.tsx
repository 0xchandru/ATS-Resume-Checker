import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Undo, Redo } from "lucide-react";
import React from "react";

interface Props {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = "320px", readOnly = false }: Props) {
  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || "Write here..." }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      if (onChange) onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert prose-headings:font-bold prose-p:leading-relaxed prose-a:text-primary max-w-none focus:outline-none w-full px-4 py-3 min-h-full`,
      },
    },
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  if (!editor) return null;

  return (
    <div
      className={`flex flex-col w-full bg-background border border-border rounded-xl overflow-hidden transition-colors ${!readOnly ? "focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50" : ""}`}
      style={{ height: minHeight }}
    >
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center flex-wrap gap-1 p-1 border-b border-border bg-muted/30 flex-shrink-0">
          <button
            onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive("bold") ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive("italic") ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive("heading", { level: 1 }) ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive("heading", { level: 2 }) ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive("bulletList") ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive("orderedList") ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          <button
            onClick={(e) => { e.preventDefault(); editor.chain().focus().undo().run(); }}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground disabled:opacity-30"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); editor.chain().focus().redo().run(); }}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground disabled:opacity-30"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor Content — fixed height, scrollable */}
      <div
        className="flex-1 overflow-y-auto cursor-text text-foreground min-h-0"
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} className="h-full [&_.ProseMirror]:min-h-full" />
      </div>
    </div>
  );
}
