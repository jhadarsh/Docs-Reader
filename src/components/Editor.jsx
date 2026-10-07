import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Toolbar from "./Toolbar.jsx";

// `content` is the Tiptap JSON stored in documents.content (used as the initial value).
export default function Editor({ content, editable, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content,
    editable,
    editorProps: { attributes: { class: "tiptap-content", "aria-label": "Document content" } },
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
  });

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
      {editable && <Toolbar editor={editor} />}
      <div className="px-5 py-4 sm:px-10 sm:py-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
