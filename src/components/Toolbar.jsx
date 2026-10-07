function Btn({ title, active, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={`h-8 min-w-8 rounded px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        active ? "bg-indigo-500/25 text-indigo-200" : "text-neutral-300 hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-neutral-700" aria-hidden="true" />;

export default function Toolbar({ editor }) {
  if (!editor) return null;
  const chain = () => editor.chain().focus();

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-neutral-800 bg-neutral-900 px-2 py-1.5">
      <Btn title="Bold" active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
        <span className="font-bold">B</span>
      </Btn>
      <Btn title="Italic" active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
        <span className="italic">I</span>
      </Btn>
      <Btn title="Underline" active={editor.isActive("underline")} onClick={() => chain().toggleUnderline().run()}>
        <span className="underline">U</span>
      </Btn>
      <Divider />
      <Btn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => chain().toggleHeading({ level: 1 }).run()}>
        H1
      </Btn>
      <Btn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        H2
      </Btn>
      <Divider />
      <Btn title="Bulleted List" active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>
        • List
      </Btn>
      <Btn title="Numbered List" active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
        1. List
      </Btn>
    </div>
  );
}
