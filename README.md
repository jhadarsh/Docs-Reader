# Ajaia Docs

A lightweight collaborative document editor, loosely inspired by Google Docs. I built it for the Ajaia LLC Full Stack Product Engineer assessment.

The brief was to show I can ship a working product end to end under a time limit, so I deliberately kept it small. It does a handful of things and does them reliably: write, format, save, upload, and share documents.

## What it does

- **Sign in** with email and password (Supabase Auth). Logged-out users are redirected to the login page.
- **Create and rename documents.** New documents open straight in the editor. The title is editable inline.
- **Rich text editing** with Tiptap: bold, italic, underline, H1/H2 headings, bulleted lists and numbered lists.
- **Autosave.** Edits are saved about 700ms after you stop typing, with a small status indicator (`Saving...`, `Saved ✓`, `Unable to save`). Anything still pending is flushed when you leave the page.
- **Persistence.** The editor stores the full Tiptap JSON in the database, not plain text, so formatting survives refreshes and reopening.
- **Upload `.txt` or `.md` files.** The original file goes to Supabase Storage, and its text becomes a new editable document. For `.md` files, `#` and `##` lines become headings.
- **Share by email.** The owner enters another user's email and they get read-only access. The owner can see and remove who a document is shared with.
- **Owned vs shared.** The dashboard has two sections, "My Documents" and "Shared With Me". Cards are visually distinct (Owner / Shared badges and a different accent). Shared documents open read-only: no toolbar, no title editing, no Share or Delete buttons.

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 18 + Vite (JavaScript, no TypeScript) |
| Styling | Tailwind CSS v4 |
| Routing | React Router |
| Editor | Tiptap (StarterKit + Underline) |
| Backend | Supabase: Auth, PostgreSQL, Storage, Row Level Security |

There is no custom server. The browser talks to Supabase directly through `@supabase/supabase-js`. I intentionally avoided extra libraries such as Redux, React Query and Axios because the app doesn't need them.

## How security works

The React UI hides the Edit, Share and Delete controls for shared documents, but that is only a convenience. **Row Level Security in Supabase is the real boundary.**

- An owner can read, update, delete and share their documents.
- A user a document is shared with can only read it.
- The app only ever uses the public anon key. No service-role key is used anywhere.
- `owner_id` is always taken from the authenticated session, never from user input.
- Updates and deletes check that a row was actually affected, so a request silently rejected by RLS shows up as an error instead of a fake "Saved".

If a user opens a document URL they don't have access to, RLS returns nothing and the app shows "Document not found, or you don't have access to it."

## Database (already set up in Supabase)

The app is built against an existing schema. It never creates or alters tables or policies.

- `profiles` (id, email, full_name, created_at): filled automatically by a trigger when an auth user is created. Used to look up users by email when sharing.
- `documents` (id, title, content JSONB, owner_id, created_at, updated_at): `content` holds the Tiptap JSON.
- `document_shares` (id, document_id, user_id, created_at): unique on `(document_id, user_id)`.
- Storage bucket `uploads` (private): authenticated users can upload and read.

## Project structure

```
src/
├── components/
│   ├── Editor.jsx       Tiptap editor (loads/emits JSON)
│   ├── Toolbar.jsx      Formatting buttons with active states
│   └── ShareModal.jsx   Share by email, list and remove shares
├── pages/
│   ├── Login.jsx        Email/password sign in
│   ├── Dashboard.jsx    My Documents, Shared With Me, New, Upload
│   └── Document.jsx     Load, rename, autosave, share, delete
├── lib/
│   └── supabase.js      Supabase client (reads env vars)
├── App.jsx              Session handling + routes
└── main.jsx
```

I kept logic next to the component that uses it instead of adding hooks, services or context layers. The app is small enough that this stays easy to follow.

## Running it locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Add your Supabase credentials to `.env.local` (see `.env.example`):
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-anon-key
   ```
   Use only the public anon/publishable key.
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Sign in with one of the seeded Supabase accounts.

To build for production, run `npm run build`. The output goes to `dist/`.

## Deploying

It's a static Vite app, so it works on Vercel, Netlify and similar hosts.

- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables on the host.
- Routes like `/dashboard` and `/document/:id` need a fallback to `index.html`. `vercel.json` already handles this for Vercel. On Netlify, add a `_redirects` file with `/* /index.html 200`.

## How to try the main flows

1. **Create and format:** sign in, click **+ New Document**, type something, apply formatting, refresh. Content and formatting are still there.
2. **Rename:** edit the title, wait for "Saved ✓", refresh. The new title stays.
3. **Upload:** click **Upload File**, pick a `.txt` or `.md` file. A new document opens with the text, and the original file is in the `uploads` bucket.
4. **Share:** as user A, open a document, click **Share**, enter user B's email. Sign in as user B. The document appears under **Shared With Me** and opens read-only.
5. **Access control:** as user B, open the URL of a document that isn't shared with them. You get a "not found or no access" message.
6. **Logout:** click **Logout** on the dashboard and you're back on the login page.

## Known limitations

These are deliberate scope choices, not oversights.

- No signup screen. It uses seeded accounts.
- No real-time collaboration, comments or version history. Autosave is last-write-wins and shared users are read-only.
- Only `.txt` and `.md` uploads, up to 1 MB. There is no DOCX parsing. Markdown import only converts `#` and `##` headings, and everything else becomes plain paragraphs.
- Uploaded originals are stored but there is no file manager screen.
- Deleting a document relies on the database cascading to `document_shares`. If your schema doesn't cascade, a delete of a shared document may fail and the app will show an error.
- Removing a share only works if your RLS policies let the owner delete share rows. If not, the app shows an error.
- The sharing lookup matches the email exactly, so it expects the email as stored in `profiles` (lowercase).
