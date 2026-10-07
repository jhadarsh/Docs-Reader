import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Editor from "../components/Editor.jsx";
import ShareModal from "../components/ShareModal.jsx";

const SAVE_DELAY = 700;

export default function Document({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [showShare, setShowShare] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  const pending = useRef({}); // changes waiting to be saved
  const timer = useRef(null);

  const isOwner = doc?.owner_id === user.id;

  // Load the document. RLS decides whether this user can see it at all.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error(error);
        setLoadError("Unable to load this document, or you don't have access to it.");
      } else if (!data) {
        setLoadError("Document not found, or you don't have access to it.");
      } else {
        setDoc(data);
        setTitle(data.title);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function flush() {
    clearTimeout(timer.current);
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};

    // .select() lets us detect a silently-rejected update (RLS) as a failure.
    const { data, error } = await supabase.from("documents").update(patch).eq("id", id).select("id");
    if (error || !data?.length) {
      console.error(error);
      pending.current = { ...patch, ...pending.current }; // keep for retry
      setStatus("error");
    } else if (!Object.keys(pending.current).length) {
      setStatus("saved");
    }
  }

  function queueSave(patch) {
    pending.current = { ...pending.current, ...patch };
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  }

  // Save anything still pending when leaving the page.
  useEffect(() => () => { flush(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTitleChange(e) {
    setTitle(e.target.value);
    queueSave({ title: e.target.value.trim() || "Untitled Document" });
  }

  function handleTitleBlur() {
    if (!title.trim()) setTitle("Untitled Document");
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeleting(true);
    setActionError("");
    clearTimeout(timer.current);
    pending.current = {};
    const { data, error } = await supabase.from("documents").delete().eq("id", id).select("id");
    if (error || !data?.length) {
      console.error(error);
      setActionError("Unable to delete the document. Please try again.");
      setDeleting(false);
      return;
    }
    navigate("/dashboard");
  }

  const statusText = { saving: "Saving...", saved: "Saved ✓", error: "Unable to save", idle: "" }[status];

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-neutral-400">Loading document...</div>;
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p role="alert" className="text-sm text-neutral-300">{loadError}</p>
        <Link to="/dashboard" className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800 bg-neutral-900/60">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <Link to="/dashboard" className="shrink-0 rounded px-1 text-sm text-neutral-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            ← Documents
          </Link>

          <div className="min-w-0 flex-1 basis-48">
            {isOwner ? (
              <input
                aria-label="Document title"
                value={title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                maxLength={150}
                className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-white hover:border-neutral-700 focus:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <h1 className="truncate px-2 py-1 text-base font-semibold text-white">{title}</h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isOwner ? (
              <span role="status" className={`text-xs ${status === "error" ? "text-red-300" : "text-neutral-400"}`}>
                {statusText}
              </span>
            ) : (
              <span className="rounded bg-neutral-700/50 px-1.5 py-0.5 text-xs text-neutral-300">Shared · read-only</span>
            )}
            {isOwner && (
              <>
                <button
                  onClick={() => setShowShare(true)}
                  className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  Share
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:border-red-900 hover:text-red-300 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {actionError && (
          <p role="alert" className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {actionError}
          </p>
        )}
        <Editor
          key={doc.id}
          content={doc.content}
          editable={isOwner}
          onChange={(json) => queueSave({ content: json })}
        />
      </main>

      {showShare && <ShareModal doc={{ id: doc.id, title }} userId={user.id} onClose={() => setShowShare(false)} />}
    </div>
  );
}
