# Build Together — Implementation Roadmap & Execution Plan

**Version:** 1.1.0  
**Status:** Approved Master Roadmap  
**Total Phases:** 10 (Phase 0 through Phase 9)  
**Execution Rule:** Sequential execution; each phase must satisfy all verification criteria before progressing. **Phase 1 starts only upon explicit instruction.**

---

## 1. Roadmap Overview & Timeline

```mermaid
gantt
    title Build Together Implementation Roadmap
    dateFormat  X
    axisFormat  Day %d

    section Foundations
    Phase 0: Setup, Tooling & Schema Migrations :active, p0, 0, 3
    Phase 1: Auth, Profiles & Experience History :p1, 3, 6

    section Discovery & Teams
    Phase 2: Project Wizard, Deterministic Matching & Discovery :p2, 6, 9
    Phase 3: Contribution Requests & Team Formation :p3, 9, 12

    section Workspace Core
    Phase 4: Goals, Roadmap, Milestones & Kanban Tasks :p4, 12, 16
    Phase 5: Canvas Sticky Notes, Discussions, Notes & Files :p5, 16, 19

    section Code & Shipping
    Phase 6: Code Workspace & In-Platform Reviews :p6, 19, 23
    Phase 7: User GitHub Repository Integration :p7, 23, 27

    section Community & Launch
    Phase 8: Community Feed, Connections & Realtime Sync :p8, 27, 30
    Phase 9: Hardening, E2E Testing & Vercel Launch :p9, 30, 34
```

---

## 2. Phase-by-Phase Execution Details

### Phase 0: Project Setup, Tooling & Core Infrastructure
- **Objective:** Establish the clean Next.js 15+ App Router codebase, configure TypeScript, Tailwind CSS, Supabase local environment, and execute the foundational PostgreSQL database migrations.
- **Key Deliverables:**
  - `package.json` with locked dependencies (`next`, `react`, `react-dom`, `@supabase/ssr`, `@supabase/supabase-js`, `tailwindcss`, `zod`, `lucide-react`, `octokit`).
  - Strict TypeScript config (`tsconfig.json`), ESLint, and Prettier configurations.
  - Tailwind CSS design token setup with dark/light themes (`tailwind.config.ts`, `globals.css`).
  - `.env.example` documenting all configuration variables.
  - Supabase client utilities:
    - `src/lib/supabase/client.ts` (Browser)
    - `src/lib/supabase/server.ts` (RSC & Server Actions with cookies)
    - `src/lib/supabase/middleware.ts` (Edge session token refresh)
    - `src/lib/supabase/admin.ts` (Service role client for serverless webhooks)
  - Initial PostgreSQL migration (`supabase/migrations/20261003000000_initial_schema.sql`) containing all 28 tables, custom enums, automated triggers, deterministic matching function, and full Row Level Security policies.
  - Seed script (`supabase/seed.sql`) with baseline skills, tech taxonomy, and test projects.
- **Verification Criteria:**
  - `npm run build` succeeds with zero TypeScript or ESLint errors.
  - Local Supabase instance runs migrations without SQL errors; RLS enabled on all tables.

---

### Phase 1: Authentication, Onboarding & Developer Profiles
- **Objective:** Deliver the identity layer, GitHub OAuth and magic link flows, profile editing, experience history, and verified developer portfolio showcase.
- **Key Deliverables:**
  - Route groups: `app/(auth)/login`, `app/(auth)/register`, `app/(auth)/callback`.
  - Next.js Edge Middleware route guarding unauthenticated users.
  - User onboarding flow: username selection, headline, weekly availability commitment, and skill tagging.
  - Professional experience timeline (`profile_experiences`).
  - Public developer profile page (`/developers/[username]`) with verified contribution badges and portfolio links.
  - Profile settings page (`/settings/profile`) powered by `updateProfileAction` and `addProfileExperienceAction`.
- **Verification Criteria:**
  - User can register via GitHub OAuth or magic link.
  - Profile automatically creates via database trigger on auth registration.
  - Users can update only their own profile; unauthorized mutations are blocked by RLS.

---

### Phase 2: Project Creation, Deterministic Matching & Discovery
- **Objective:** Enable users to define and publish projects with structured contributor roles, deterministic matching recommendations, and a faceted discovery engine.
- **Key Deliverables:**
  - Multi-step project creation wizard (`/projects/new`) capturing problem statement, solution, tech stack, and open contributor roles.
  - Deterministic matching calculation engine (`calculate_project_match_score` / `getPersonalizedProjectsAction`).
  - Public project showcase page (`/projects/[slug]`) displaying project pitch, active members, and open roles with match scores.
  - Searchable discovery directory (`/explore`) with faceted filtering for development stage, category, and technologies.
  - Dedicated Open Roles directory (`/explore/roles`).
  - Developer directory (`/explore/developers`).
  - Full-text search using PostgreSQL `tsvector` generated columns and GIN indexes.
- **Verification Criteria:**
  - Project creator is automatically assigned `owner` role in `project_members`.
  - Open roles display correct remaining capacity.
  - Deterministic match score updates based on user's profile skills and availability.

---

### Phase 3: Contribution Workflow & Team Formation
- **Objective:** Implement the application process allowing contributors to apply for open project roles, maintainers to review applicants, and automatically provision workspace access upon acceptance.
- **Key Deliverables:**
  - "Apply to Contribute" modal on project and role showcase pages.
  - `submitContributionRequestAction` capturing pitch, proof of work, and weekly hours.
  - Application review UI in Project Workspace (`/projects/[slug]/workspace/team`).
  - `reviewContributionRequestAction` state machine (`pending` &rarr; `under_review` &rarr; `accepted` / `rejected` / `info_requested`).
  - Database trigger `trg_contribution_accepted` automatically adding accepted applicants to `project_members`.
  - Contributor withdrawal action (`withdrawContributionRequestAction`).
- **Verification Criteria:**
  - Non-members cannot access workspace.
  - Upon acceptance, member gains immediate workspace access without manual invite links.
  - Role capacity count increments and status updates to `filled` when capacity is reached.

---

### Phase 4: Project Workspace Core (Goals, Roadmap & Kanban Tasks)
- **Objective:** Build the core execution engine of the workspace: strategic planning and day-to-day task tracking.
- **Key Deliverables:**
  - Workspace sidebar layout with responsive mobile navigation drawer.
  - Workspace Overview (`/workspace`): Milestone progress bar, upcoming deadlines, team roster, quick actions.
  - Goals and Milestones manager (`/workspace/goals`, `/workspace/roadmap`, `/workspace/milestones`).
  - Full-featured Kanban task board (`/workspace/tasks`):
    - 5 columns: `Backlog`, `Todo`, `In Progress`, `Review`, `Done`.
    - Drag-and-drop card movement with optimistic updates (`useOptimistic`).
    - Filter by assignee, priority, milestone, and label.
  - Task detail sheet/modal with rich Markdown description, checklists, and threaded comments.
- **Verification Criteria:**
  - Dragging a task updates its position and status via `updateTaskStatusAction`.
  - Non-project members are blocked by RLS from reading or modifying tasks.

---

### Phase 5: Collaboration, Project Canvas Sticky Notes, Notes & Files
- **Objective:** Provide asynchronous team communication, knowledge sharing, and visual ideation.
- **Key Deliverables:**
  - Project Canvas (`/workspace/canvas`) with freeform draggable, color-coded sticky notes and decision cards.
  - Categorized discussion forum (`/workspace/discussions`) for architectural decisions, RFCs, and ideas.
  - Threaded comment system with markdown support and syntax highlighting.
  - Collaborative documentation module (`/workspace/notes`).
  - Asset and file manager (`/workspace/files`) integrated with Supabase Storage bucket `workspace-files`.
  - Presigned upload URL route handler (`/api/storage/presigned-upload`) enforcing file size and MIME constraints.
- **Verification Criteria:**
  - Sticky notes create, drag, and persist positions across sessions.
  - File uploads succeed directly to Supabase Storage with storage policies enforcing project membership.

---

### Phase 6: Code Workspace & In-Platform Code Reviews
- **Objective:** Give teams an integrated environment to draft snippets and perform peer reviews before exporting to GitHub.
- **Key Deliverables:**
  - Code workspace (`/workspace/code`) for browsing and editing project snippets.
  - Code review submission wizard allowing authors to bundle changed files with base/target branches.
  - Multi-file diff viewer with split and unified views (`/workspace/reviews/[reviewId]`).
  - Inline line-by-line comment threads on diff lines.
  - Review decision state machine: `Approve` or `Request Changes`.
- **Verification Criteria:**
  - Reviewers can comment on specific line numbers of diffs.
  - Review status updates to `approved` only when approved by maintainers.

---

### Phase 7: GitHub Integration for User Repositories & PR Export
- **Status:** Completed
- **Objective:** Connect user-owned GitHub repositories and enable one-click export of approved Build Together reviews to GitHub Pull Requests.
- **Key Deliverables:**
  - GitHub App / OAuth connection flow (`/projects/[slug]/workspace/github`, `/settings/connections`).
  - Encrypted storage of user and repository OAuth tokens using authenticated AES-256-GCM.
  - Server-only GitHub API client for branch creation, file commits via Git Trees API, and Pull Request generation.
  - "Export Approved Review to GitHub PR" action (`createGitHubPullRequestFromReviewAction`) with explicit confirmation dialog and no automatic pushes.
  - Webhook Route Handler (`/api/github/webhooks`) verifying HMAC-SHA256 constant-time signatures to listen for merged PRs, closed/reopened PRs, reviews, and push syncs with delivery idempotency.
- **Verification Criteria:**
  - Plaintext GitHub tokens never appear in database or client bundles.
  - Webhook accurately transitions Build Together review to `merged` and logs activity.
  - 100% tests passing, zero TypeScript errors, zero ESLint warnings, production build successful.

---

### Phase 8: Community Feed, Connections Network & Realtime Sync
- **Status:** Completed
- **Objective:** Public technical discourse, peer developer networking, mention dispatch, and in-app notifications.
- **Key Deliverables:**
  - Developer community feed (`/feed`) supporting 7 post types (`project_announcement`, `recruitment`, `technical_discussion`, `project_update`, `question`, `achievement`, `learning`).
  - Threaded post discussion views (`/feed/[postId]`) with nested replies and `@mentions` parsing.
  - Interactive actions: like/unlike, save/unsave, share link with copy feedback, and author edit/delete dialogs.
  - Project association on posts when authorized (owner or accepted member).
  - Peer developer network (`/network`): incoming requests, sent requests, active connections, and developer discovery with deterministic relevance (shared skills/tech without fake scores).
  - In-app notification bell with live count badge and Realtime channel subscription.
  - Bidirectional unique constraints on peer connections and complete RLS on `community_posts`, `post_comments`, `post_likes`, `post_saves`, `user_connections`, and `notifications`.
- **Verification Criteria:**
  - 100% tests passing (26 test files, 289 passing tests).
  - 0 TypeScript errors (`tsc --noEmit`), 0 ESLint warnings (`next lint`).
  - Production build successful (`next build`).

---

---

### Phase 9: Global Search, Discovery & Command Palette
- **Status:** Completed
- **Objective:** Production-grade global discovery engine and quick command navigation across projects, developers, community discourse, and authorized workspace tasks.
- **Key Deliverables:**
  - Full-text search database migration (`20261003000009_search_phase9.sql`) with PostgreSQL `tsv TSVECTOR` generated columns, `GIN` indexes on `profiles` and `community_posts`, and composite search indexes on `projects` and `tasks`.
  - Server action `globalSearchAction` with Zod validation (`searchQuerySchema`) and query executor `performGlobalSearch`.
  - Strict privacy and visibility protection: workspace tasks and private projects are never leaked to unauthenticated users or non-members.
  - Dedicated search interface (`/search?q=...&type=...`) supporting faceted tabs (`All`, `Projects`, `Developers`, `Community Posts`, `Workspace Tasks`), live URL state synchronization, rich cards, empty states, and no-results suggestions.
  - Global Command Palette modal (`<CommandPalette />`) with `Cmd+K` / `Ctrl+K` shortcut, debounced search, keyboard arrow navigation, enter-to-open, and quick launch links.
  - Desktop navbar search shortcut trigger and mobile drawer search integration.
- **Verification Criteria:**
  - 100% tests passing (29 test files, 305 passing tests).
  - 0 TypeScript errors (`tsc --noEmit`), 0 ESLint warnings (`next lint`).
  - Production build successful (`next build`).

---

> [!IMPORTANT]
> **Execution Gate:** Phase 9 is complete and verified. Ready for user review.

