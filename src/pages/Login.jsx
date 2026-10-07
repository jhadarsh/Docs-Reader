import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      const invalid = error.message?.toLowerCase().includes("invalid login credentials");
      setError(invalid ? "Incorrect email or password." : "Unable to sign in. Please try again.");
      setLoading(false);
    }
    // On success, onAuthStateChange in App.jsx redirects to /dashboard.
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">Ajaia Docs</h1>
          <p className="mt-1 text-sm text-neutral-400">Lightweight collaborative document workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-neutral-300 mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-neutral-300 mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
