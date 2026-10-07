import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// Turn plain text (or simple markdown headings) into Tiptap JSON.
function textToDoc(text, isMarkdown) {
  const nodes = text.split(/\r?\n/).map((line) => {
    if (!line.trim()) return { type: "paragraph" };
    if (isMarkdown) {
      const m = line.match(/^(#{1,2})\s+(.*)$/);
      if (m && m[2].trim()) {
        return { type: "heading", attrs: { level: m[1].length }, content: [{ type: "text", text: m[2] }] };
      }
    }
    return { type: "paragraph", content: [{ type: "text", text: line }] };
  });
  return { type: "doc", content: nodes.length ? nodes : EMPTY_DOC.content };
}

function DocCard({ doc, owned, ownerEmail }) {
  return (
    <Link
      to={`/document/${doc.id}`}
      className={`block rounded-lg border bg-neutral-900 p-4 hover:bg-neutral-800/70 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        owned ? "border-neutral-800 border-l-2 border-l-indigo-500" : "border-neutral-800 border-l-2 border-l-neutral-600"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="truncate text-sm font-medium text-white">{doc.title}</h3>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
            owned ? "bg-indigo-500/15 text-indigo-300" : "bg-neutral-700/50 text-neutral-300"
          }`}
        >
          {owned ? "Owner" : "Shared"}
        </span>
      </div>
      <p className="mt-2 text-xs text-neutral-400">Updated {formatDate(doc.updated_at)}</p>
      {!owned && ownerEmail && <p className="mt-0.5 truncate text-xs text-neutral-500">Shared by {ownerEmail}</p>}
      <p className="mt-3 text-xs text-indigo-300">{owned ? "Open and edit" : "Open to read"}</p>
    </Link>
  );
}

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [owned, setOwned] = useState([]);
  const [shared, setShared] = useState([]);
  const [ownerEmails, setOwnerEmails] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(""); // "", "creating", "uploading"
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      const { data: mine, error: mineError } = await supabase
        .from("documents")
        .select("id, title, updated_at, owner_id")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });

      const { data: shares, error: sharesError } = await supabase
        .from("document_shares")
        .select("document_id")
        .eq("user_id", user.id);

      let sharedDocs = [];
      if (!sharesError && shares?.length) {
        const { data } = await supabase
          .from("documents")
          .select("id, title, updated_at, owner_id")
          .in("id", shares.map((s) => s.document_id))
          .order("updated_at", { ascending: false });
        sharedDocs = data || [];
      }

      // Best effort: show who shared each document.
      if (sharedDocs.length) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", [...new Set(sharedDocs.map((d) => d.owner_id))]);
        if (!cancelled && owners) setOwnerEmails(Object.fromEntries(owners.map((o) => [o.id, o.email])));
      }

      if (cancelled) return;
      if (mineError || sharesError) setError("Unable to load your documents. Please refresh and try again.");
      setOwned(mine || []);
      setShared(sharedDocs);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  async function createDocument(title = "Untitled Document", content = EMPTY_DOC) {
    const { data, error } = await supabase
      .from("documents")
      .insert({ title, content, owner_id: user.id })
      .select("id")
      .single();
    if (error) throw error;
    navigate(`/document/${data.id}`);
  }

  async function handleNew() {
    setBusy("creating");
    setError("");
    try {
      await createDocument();
    } catch (err) {
      console.error(err);
      setError("Unable to create the document. Please try again.");
      setBusy("");
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setError("");

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".txt") && !lower.endsWith(".md")) {
      setError("Unsupported file. Please upload a .txt or .md file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large. The limit is 1 MB.");
      return;
    }

    setBusy("uploading");
    try {
      const text = await file.text();

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const title = file.name.replace(/\.(txt|md)$/i, "") || "Untitled Document";
      await createDocument(title, textToDoc(text, lower.endsWith(".md")));
    } catch (err) {
      console.error(err);
      setError("Unable to upload the file. Please try again.");
      setBusy("");
    }
  }

  const btnBase =
    "rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-300";

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800 bg-neutral-900/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm font-semibold text-white">Ajaia Docs</span>
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate text-xs text-neutral-400" title={user.email}>{user.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="shrink-0 rounded-md border border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-white">My Documents</h1>
          <div className="flex gap-2">
            <button
              onClick={handleNew}
              disabled={!!busy}
              className={`${btnBase} bg-indigo-500 text-white hover:bg-indigo-400`}
            >
              {busy === "creating" ? "Creating document..." : "+ New Document"}
            </button>
            <button
              onClick={() => fileInput.current?.click()}
              disabled={!!busy}
              className={`${btnBase} border border-neutral-700 text-neutral-200 hover:bg-neutral-800`}
            >
              {busy === "uploading" ? "Uploading..." : "Upload File"}
            </button>
            <input ref={fileInput} type="file" accept=".txt,.md" onChange={handleFile} className="hidden" aria-label="Upload a .txt or .md file" />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-neutral-400">Loading documents...</p>
        ) : (
          <>
            <section className="mt-5">
              {owned.length === 0 ? (
                <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
                  You don't have any documents yet. Create one or upload a .txt or .md file.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {owned.map((d) => <DocCard key={d.id} doc={d} owned />)}
                </div>
              )}
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-semibold text-white">Shared With Me</h2>
              <div className="mt-4">
                {shared.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
                    Nothing has been shared with you yet.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {shared.map((d) => <DocCard key={d.id} doc={d} owned={false} ownerEmail={ownerEmails[d.owner_id]} />)}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
