---
name: build-together-engineering
description: Project-specific engineering rules for Build Together, a collaborative developer platform for discovering projects, finding contributors, forming teams, collaborating in project workspaces, reviewing code, and connecting approved work to GitHub.
---

# Build Together Engineering

## Product

Build Together helps developers turn ideas into real products by finding other developers and specialists to collaborate with.

Core journey:

Idea
→ Project
→ Find Contributors
→ Contribution Request
→ Team
→ Plan
→ Build
→ Review
→ GitHub
→ Ship
→ Contribution History

Build Together is not simply:

- GitHub
- Discord
- Jira
- Trello
- a freelancer marketplace
- a social network

It combines useful parts of these products into one developer-focused collaboration platform.

The primary goal is BUILDING.

---

# Infrastructure

Production stack:

- Next.js
- TypeScript
- React
- Tailwind CSS
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime where appropriate
- GitHub
- Vercel

The application must be compatible with Vercel.

Do not introduce a separate Express/Nest/Fastify backend unless there is a strong architectural reason.

Use Next.js server-side functionality and Supabase appropriately.

---

# GitHub

GitHub has two roles.

## Build Together repository

The Build Together source code lives in GitHub.

Vercel deploys the application from GitHub.

## User project repositories

Users may connect their own GitHub repositories to Build Together.

These must be treated as a separate integration.

Never expose GitHub secrets or OAuth credentials to the browser.

GitHub actions must be explicitly authorized.

Never automatically push code without the required approval.

Verify GitHub webhooks.

---

# Supabase

Use Supabase PostgreSQL as the primary database.

Use Supabase Auth for authentication.

Use Supabase Storage for appropriate user/project files.

Use Supabase Realtime only where realtime behavior provides meaningful value.

Use migrations for schema changes.

Use foreign keys, constraints and indexes appropriately.

---

# Security

Supabase Row Level Security is required for protected data.

Never rely only on frontend authorization.

Every protected operation must enforce authorization server-side and/or through appropriate Supabase policies.

Never expose:

- service role keys
- GitHub secrets
- database passwords
- private tokens

Use environment variables.

Never commit `.env.local`.

Create `.env.example` without real credentials.

---

# Core Domains

The product includes:

- Authentication
- Developer Profiles
- Skills
- Technologies
- Projects
- Project Roles
- Contribution Requests
- Project Membership
- Goals
- Roadmaps
- Milestones
- Tasks
- Discussions
- Meetings
- Notes
- Files
- Code Workspace
- Code Reviews
- GitHub Integration
- Community Feed
- Connections
- Notifications
- Search
- Audit Logs

Keep these domains organized.

Do not place all business logic inside React components.

---

# Contribution Lifecycle

Project Proposal
→ Contribution Request
→ Request Review
→ Acceptance
→ Project Membership
→ Role Assignment
→ Workspace Access
→ Task Assignment
→ Code Contribution
→ Code Review
→ Approval
→ GitHub Integration
→ Finalization
→ Contribution History

Every transition must have explicit state.

---

# Developer Profiles

Profiles may contain:

- avatar
- banner
- name
- username
- headline
- bio
- location
- timezone
- skills
- technologies
- experience
- projects
- contributions
- posts
- connections
- GitHub
- portfolio
- social links
- activity

Do not invent meaningless reputation scores.

---

# Projects

Projects should contain:

- name
- logo
- tagline
- description
- problem
- proposed solution
- category
- skills
- required roles
- technologies
- stage
- availability requirements
- collaboration type
- goals
- roadmap
- visibility

Project owners can manage project settings and contribution requests.

---

# Project Workspace

Workspace sections:

- Overview
- Goals
- Roadmap
- Tasks
- Board
- Discussions
- Meetings
- Notes
- Files
- Code
- Code Review
- Activity
- Team
- Settings
- GitHub

Workspace permissions must be based on project membership and roles.

---

# Tasks

Tasks contain:

- title
- description
- creator
- assignee
- status
- priority
- labels
- due date
- estimate
- goal
- milestone
- comments
- attachments
- activity

Statuses:

- Backlog
- Todo
- In Progress
- Review
- Done

Priorities:

- Low
- Medium
- High
- Urgent

---

# Code

Build Together does not replace GitHub.

The internal code area should initially support:

- code viewing
- lightweight editing
- snippets
- change submissions
- discussions
- reviews

Keep it intentionally smaller than a full IDE.

---

# Code Review

Support:

- draft
- review
- changes requested
- approved
- merged

Reviewers can comment on code.

Maintain review history.

---

# UI

Build Together should feel:

- modern
- premium
- technical
- clean
- professional
- focused
- fast

Avoid:

- excessive gradients
- excessive glassmorphism
- unnecessary cards
- excessive rounded containers
- meaningless animations
- visual clutter
- generic AI dashboard aesthetics

Prioritize:

- typography
- spacing
- hierarchy
- accessibility
- interaction quality
- responsive behavior

---

# Responsive Design

The entire application must work on:

- phones
- tablets
- laptops
- desktops
- large monitors

Do not simply shrink desktop layouts.

Use intentional responsive layouts.

Avoid accidental horizontal scrolling.

---

# Accessibility

Use:

- semantic HTML
- keyboard navigation
- accessible labels
- visible focus states
- appropriate contrast
- screen-reader support
- reduced-motion support

---

# Design System

Use centralized design tokens for:

- colors
- typography
- spacing
- borders
- radius
- shadows
- breakpoints
- transitions

Build reusable components.

---

# Performance

Consider:

- lazy loading
- code splitting
- pagination
- caching
- optimized images
- efficient database queries
- virtualization for large lists

Avoid premature optimization.

---

# Testing

Test important flows including:

- authentication
- authorization
- project creation
- contribution requests
- project membership
- tasks
- code review
- GitHub integration

Run tests, type checking and linting before considering work complete.

---

# Agent Rules

Before implementing:

1. Inspect the repository.
2. Understand the architecture.
3. Reuse existing code where appropriate.
4. Do not destroy existing work.
5. Check permissions.
6. Check responsive behavior.
7. Check loading states.
8. Check empty states.
9. Check error states.

Never:

- hardcode secrets
- invent credentials
- create fake integrations
- pretend incomplete functionality works
- bypass authorization
- introduce unnecessary dependencies

When requirements are ambiguous, choose the simplest production-safe solution.

---

# Skill Responsibilities

ui-ux-pro-max:
UX, information architecture, interaction patterns and design systems.

design-taste-frontend:
Visual quality, UI polish, spacing, hierarchy and distinctive frontend design.

frontend-developer:
React implementation, components, state and frontend architecture.

responsive-design:
Responsive layouts and mobile behavior.

modern-web-guidance:
Modern web standards, accessibility and performance.

build-together-engineering:
Build Together-specific architecture, business rules, workflows, permissions and product decisions.

When skills overlap, this skill defines Build Together-specific decisions.
