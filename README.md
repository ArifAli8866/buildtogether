# Cofound

**Post the project you can't build alone.** Cofound is a platform for student
developers to share startup/project ideas, pull in contributors, run the work
in a shared team workspace, and build a public profile that doubles as a
resume.

It's a mix of three things you already know:
- **LinkedIn** → public profile people can treat as a resume
- **GitHub** → each project links to a real repo, tracks status
- **Discord/Trello** → each project gets a private team space: discussion +
  task board + progress feed, unlocked only once you're on the team

Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS +
Supabase (Postgres, Auth, Realtime) + Framer Motion**, ready to push to
**GitHub** and deploy on **Vercel**.

---

## 1. What's inside

```
cofound/
├── app/
│   ├── page.tsx                 Landing page + public feed of all projects
│   ├── login/page.tsx           Google / GitHub sign-in
│   ├── new/page.tsx             Post a new project idea
│   ├── project/[id]/page.tsx    Project page: overview, team, discussion, workspace
│   ├── profile/[id]/page.tsx    Public resume-style profile
│   ├── dashboard/page.tsx       "My projects", "My requests", edit profile
│   └── auth/callback/route.ts   OAuth callback handler
├── components/                  Navbar, ProjectCard, Discussion, TaskBoard, etc.
├── lib/
│   ├── supabase/client.ts       Supabase client for the browser
│   ├── supabase/server.ts       Supabase client for server components
│   └── types.ts                 Shared TypeScript types
├── middleware.ts                Keeps the Supabase session fresh on every request
├── supabase/schema.sql          Full database schema + Row Level Security policies
└── .env.local.example           Environment variables you need to fill in
```

### Core features implemented
- **Feed** — every posted project, searchable by title/description/tags
- **Post an idea** — title, tagline, description, tags, status, repo link
- **Request to join** — anyone can request to contribute with a message
- **Owner accepts/rejects requests** — accepting auto-adds the person to the
  project's team (`team_members` table, via a Postgres trigger)
- **Team workspace** (visible only to team members + owner):
  - **Discussion** — realtime group chat per project
  - **Tasks** — simple kanban (To do / In progress / Done) with assignment
  - **Progress updates** — a lightweight activity feed for sharing progress
- **Public profile** — bio, skills, socials, founded projects, projects
  contributed to. Has a "Share as resume" button that copies the profile URL.
- **Auth** — Google and GitHub OAuth via Supabase Auth. A profile row and
  username are created automatically the first time someone signs in.

This is a solid, working MVP scaffold — not a finished commercial product.
Treat it as your starting point and keep building on it (notifications,
image uploads for avatars/covers, richer permissions, etc).

---

## 2. Before you start

You'll need free accounts on:
1. **GitHub** — to host your code — https://github.com
2. **Supabase** — database, auth, realtime — https://supabase.com
3. **Vercel** — hosting/deployment — https://vercel.com
4. **Node.js 18+** installed locally — https://nodejs.org

---

## 3. Set up Supabase

### 3.1 Create the project
1. Go to https://supabase.com/dashboard → **New project**.
2. Pick an organization, name it (e.g. `cofound`), set a database password
   (save it somewhere), pick a region close to you, and click **Create**.
3. Wait ~2 minutes while Supabase provisions the project.

### 3.2 Run the database schema
1. In your Supabase project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/schema.sql` from this folder, copy its entire contents,
   and paste it into the SQL editor.
3. Click **Run**. This creates:
   - Tables: `profiles`, `projects`, `team_members`, `join_requests`,
     `discussion_messages`, `tasks`, `progress_updates`
   - Triggers: auto-create a profile on signup, auto-add the owner as the
     first team member, auto-add a contributor to the team when their
     request is accepted
   - Row Level Security (RLS) policies so:
     - profiles and projects are publicly readable
     - only the project owner can accept/reject requests or delete a project
     - only team members (+ owner) can read/write discussion, tasks, and
       progress updates for that specific project
   - Realtime is enabled on `discussion_messages`, `progress_updates`,
     `tasks`, and `join_requests`

If you ever change your mind about the schema, just edit `schema.sql` and
re-run it — every statement is written to be safely re-run.

### 3.3 Turn on Google and GitHub sign-in

**GitHub:**
1. Go to https://github.com/settings/developers → **New OAuth App**.
2. Application name: `Cofound` (anything works).
3. Homepage URL: your Vercel URL once you have one, or `http://localhost:3000` for now.
4. Authorization callback URL — copy this from Supabase: go to your Supabase
   project → **Authentication** → **Providers** → **GitHub**, and copy the
   **Callback URL** shown there (looks like
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`).
5. Click **Register application**, then **Generate a new client secret**.
6. Back in Supabase → **Authentication → Providers → GitHub**: toggle it on,
   paste the **Client ID** and **Client Secret**, click **Save**.

**Google:**
1. Go to https://console.cloud.google.com/apis/credentials.
2. Create a project (or pick an existing one).
3. **Create Credentials → OAuth client ID**. If asked, configure the consent
   screen first (External, fill in app name + your email, save).
4. Application type: **Web application**.
5. Authorized redirect URIs: paste the same Supabase callback URL as above,
   but from **Authentication → Providers → Google** in Supabase (same
   pattern: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`).
6. Click **Create**, copy the **Client ID** and **Client Secret**.
7. Back in Supabase → **Authentication → Providers → Google**: toggle it on,
   paste both values, click **Save**.

### 3.4 Set the site URL (important for OAuth redirects)
In Supabase → **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000` while developing. Change this to
  your real Vercel URL after you deploy (step 6).
- **Redirect URLs**: add both `http://localhost:3000/**` and, later, your
  Vercel URL with `/**` appended (e.g. `https://cofound.vercel.app/**`).

### 3.5 Grab your API keys
Go to **Settings → API** in Supabase. You need:
- **Project URL**
- **anon / public key**

Keep this tab open, you'll paste these into `.env.local` next.

---

## 4. Run it locally

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file
cp .env.local.example .env.local

# 3. Open .env.local and paste in your Supabase Project URL and anon key
#    (from step 3.5 above)

# 4. Start the dev server
npm run dev
```

Visit http://localhost:3000 — you should see the landing page. Click
**Sign in**, try Google or GitHub, and you should land back on the site
logged in with a profile auto-created for you.

---

## 5. Push the code to GitHub

```bash
cd cofound
git init
git add .
git commit -m "Initial commit: Cofound"

# Create a new empty repo on GitHub first (github.com/new), then:
git remote add origin https://github.com/YOUR-USERNAME/cofound.git
git branch -M main
git push -u origin main
```

`.env.local` is already in `.gitignore`, so your Supabase keys won't be
pushed to GitHub. You'll add them separately as Vercel environment variables
in the next step.

---

## 6. Deploy to Vercel

1. Go to https://vercel.com/new and import the GitHub repo you just pushed.
2. Vercel auto-detects Next.js — leave the build settings as default.
3. Before deploying, expand **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your Supabase anon key
   - `NEXT_PUBLIC_SITE_URL` → leave blank for now, you'll fill this in after
     the first deploy once you know your `.vercel.app` URL
4. Click **Deploy**. Wait for the build to finish.
5. Once deployed, copy your live URL (e.g. `https://cofound-yourname.vercel.app`).
6. Go back to **Project Settings → Environment Variables** in Vercel and set
   `NEXT_PUBLIC_SITE_URL` to that URL, then redeploy (Vercel → Deployments →
   ⋯ → Redeploy) so it takes effect.
7. Update Supabase **Authentication → URL Configuration**:
   - **Site URL** → your Vercel URL
   - **Redirect URLs** → add `https://YOUR-VERCEL-URL/**`
8. Update your GitHub and Google OAuth app settings (steps 3.3) to also
   allow your Vercel URL as a homepage/authorized origin if they ask for one.

From now on, every `git push` to `main` auto-deploys on Vercel.

---

## 7. How the pieces fit together

- **Auth** — Supabase Auth handles Google/GitHub OAuth. A Postgres trigger
  (`handle_new_user` in `schema.sql`) automatically creates a row in
  `profiles` the moment someone signs up, generating a unique username from
  their GitHub/Google name.
- **Posting a project** inserts a row into `projects`. A trigger
  (`handle_new_project`) automatically adds the owner as the first
  `team_members` row with the role `Founder`.
- **Requesting to join** inserts a row into `join_requests` with status
  `pending`. The project owner sees it under the **Requests** tab on their
  own project page.
- **Accepting a request** updates its status to `accepted`, which triggers
  `handle_request_accepted`, automatically inserting the requester into
  `team_members`.
- **Discussion, Tasks, and Progress updates** are all scoped per-project and
  protected by Row Level Security: the policies use a helper SQL function,
  `is_project_member`, so only the owner and accepted team members can read
  or write them. Everyone else sees the tab greyed out on the project page.
- **Realtime** — the discussion thread subscribes to Postgres changes on
  `discussion_messages` via `supabase.channel(...)`, so messages appear
  instantly for everyone viewing that project.
- **Profile as resume** — `/profile/[username]` is a public page (no login
  required to view) listing founded projects and projects contributed to,
  built entirely from the same tables above.

---

## 8. Where to go next

Ideas for extending this scaffold:
- Avatar/cover image uploads via **Supabase Storage**
- Email or in-app notifications when someone requests to join or gets accepted
- Drag-and-drop task board (e.g. with `@dnd-kit/core`)
- Comment threads on individual tasks
- "Explore by tag/skill" filters on the feed
- A public API or "export as PDF" for the resume profile
- Company-facing search/discovery view (the "how companies find projects"
  half of the original idea)

---

## 9. Troubleshooting

- **OAuth redirects to an error page** — double check the callback URL in
  your GitHub/Google OAuth app exactly matches the one Supabase shows you,
  and that your Supabase **Redirect URLs** include the domain you're testing
  from (localhost or Vercel).
- **"new row violates row-level security policy"** — you're trying to
  insert/update something you don't have permission for (e.g. posting to a
  team's discussion without being a member). This is expected behavior, not
  a bug — check the RLS policies in `schema.sql`.
- **Profile not created after signup** — check **Supabase → Database →
  Triggers** that `on_auth_user_created` exists and is enabled; re-run
  `schema.sql` if not.
- **Local build fails on fonts** — the app loads Google Fonts (`Space
  Grotesk`, `Inter`, `JetBrains Mono`) at build time via `next/font/google`,
  which requires internet access. This works fine on Vercel; if it fails in
  a sandboxed/offline environment, that's expected.
