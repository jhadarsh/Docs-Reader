import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function ShareModal({ doc, userId, onClose }) {
  const [email, setEmail] = useState("");
  const [shares, setShares] = useState([]); // [{ id, user_id, email }]
  const [loadingList, setLoadingList] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState(null); // { type: "error" | "success", text }

  async function loadShares() {
    const { data, error } = await supabase.from("document_shares").select("id, user_id").eq("document_id", doc.id);
    if (error) {
      setMessage({ type: "error", text: "Unable to load the sharing list." });
      setLoadingList(false);
      return [];
    }
    let list = data || [];
    if (list.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", list.map((s) => s.user_id));
      const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p.email]));
      list = list.map((s) => ({ ...s, email: byId[s.user_id] || "Unknown user" }));
    }
    setShares(list);
    setLoadingList(false);
    return list;
  }

  useEffect(() => {
    loadShares();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleShare(e) {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!target) return;
    setSharing(true);
    setMessage(null);

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", target)
        .maybeSingle();
      if (profileError) throw profileError;

      if (!profile) return setMessage({ type: "error", text: "No user found with this email." });
      if (profile.id === userId) return setMessage({ type: "error", text: "You can't share a document with yourself." });
      if (shares.some((s) => s.user_id === profile.id)) {
        return setMessage({ type: "error", text: "This document is already shared with this user." });
      }

      const { error: insertError } = await supabase
        .from("document_shares")
        .insert({ document_id: doc.id, user_id: profile.id });
      if (insertError) {
        if (insertError.code === "23505") {
          return setMessage({ type: "error", text: "This document is already shared with this user." });
        }
        throw insertError;
      }

      setEmail("");
      setMessage({ type: "success", text: `Shared with ${profile.email}.` });
      await loadShares();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Unable to share the document. Please try again." });
    } finally {
      setSharing(false);
    }
  }

  async function handleRemove(share) {
    setMessage(null);
    const { error } = await supabase.from("document_shares").delete().eq("id", share.id);
    if (error) {
      console.error(error);
      setMessage({ type: "error", text: "Unable to remove access. Please try again." });
      return;
    }
    setShares((prev) => prev.filter((s) => s.id !== share.id));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-xl">
        <h2 id="share-title" className="truncate text-base font-semibold text-white">Share "{doc.title}"</h2>
        <p className="mt-1 text-xs text-neutral-400">People you share with can read this document but can't edit it.</p>

        <form onSubmit={handleShare} className="mt-4">
          <label htmlFor="share-email" className="block text-xs font-medium text-neutral-300 mb-1.5">Email</label>
          <div className="flex gap-2">
            <input
              id="share-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={sharing}
              className="shrink-0 rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {sharing ? "Sharing..." : "Share"}
            </button>
          </div>
        </form>

        {message && (
          <p
            role={message.type === "error" ? "alert" : "status"}
            className={`mt-3 rounded-md border px-3 py-2 text-xs ${
              message.type === "error"
                ? "border-red-900/60 bg-red-950/40 text-red-300"
                : "border-emerald-900/60 bg-emerald-950/40 text-emerald-300"
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="mt-5">
          <h3 className="text-xs font-medium text-neutral-300">Shared with:</h3>
          {loadingList ? (
            <p className="mt-2 text-xs text-neutral-500">Loading...</p>
          ) : shares.length === 0 ? (
            <p className="mt-2 text-xs text-neutral-500">Not shared with anyone yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-800 rounded-md border border-neutral-800">
              {shares.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="truncate text-sm text-neutral-200">{s.email}</span>
                  <button
                    onClick={() => handleRemove(s)}
                    className="shrink-0 rounded px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
