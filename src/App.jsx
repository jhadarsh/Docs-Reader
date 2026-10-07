import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { isConfigured, supabase } from "./lib/supabase";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Document from "./pages/Document.jsx";

function Centered({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-sm text-neutral-400">
      {children}
    </div>
  );
}

export default function App() {
  // undefined = still checking, null = signed out, object = signed in
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isConfigured) {
    return (
      <Centered>
        <p className="max-w-sm text-center">
          Supabase isn't configured. Add <code className="text-neutral-200">VITE_SUPABASE_URL</code> and{" "}
          <code className="text-neutral-200">VITE_SUPABASE_ANON_KEY</code> to <code className="text-neutral-200">.env.local</code>{" "}
          and restart the dev server.
        </p>
      </Centered>
    );
  }

  if (session === undefined) return <Centered>Loading...</Centered>;

  const user = session?.user;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />} />
      <Route path="/document/:id" element={user ? <Document user={user} /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
