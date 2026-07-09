# Feishu Org Console Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single-machine Next.js console for managing multiple Feishu company tenants, syncing organization data into SQLite, and viewing current users plus change history.

**Architecture:** A Next.js App Router web app serves authenticated pages and JSON APIs. SQLite is accessed directly from server modules. A separate Docker Compose worker service scans schedule settings and runs sync jobs using the same application code.

**Tech Stack:** Next.js, React, TypeScript, Arco Design, SQLite via `better-sqlite3`, Vitest, Docker Compose.

---

### Task 1: Project Foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `Dockerfile`
- Create: `docker-compose.yml`

**Steps:**
1. Define scripts for `dev`, `build`, `start`, `worker`, and `test`.
2. Add dependencies for Next.js, React, Arco Design, SQLite, HTTP client, validation, and tests.
3. Add Docker services for `web` and `scheduler`, sharing a `data` volume.

### Task 2: Auth Gate

**Files:**
- Create: `src/server/auth/session.ts`
- Create: `src/server/auth/guards.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/LoginForm.tsx`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`

**Steps:**
1. Sign a static session cookie with `SESSION_SECRET`.
2. Compare submitted password with `APP_PASSWORD`.
3. Protect dashboard layouts and non-auth APIs.

### Task 3: SQLite Schema

**Files:**
- Create: `src/server/config.ts`
- Create: `src/server/db/schema.sql`
- Create: `src/server/db/migrations.ts`
- Create: `src/server/db/client.ts`
- Create: `src/server/db/repositories/companies.ts`
- Create: `src/server/db/repositories/users.ts`

**Steps:**
1. Open SQLite at `DATABASE_PATH`.
2. Enable WAL and foreign keys.
3. Create tables for companies, sync runs, departments, current users, memberships, and user change events.

### Task 4: Sync Engine

**Files:**
- Create: `tests/sync/diff.test.ts`
- Create: `src/server/feishu/types.ts`
- Create: `src/server/feishu/client.ts`
- Create: `src/server/sync/diff.ts`
- Create: `src/server/sync/service.ts`
- Create: `src/server/sync/scheduler.ts`
- Create: `src/worker.ts`

**Steps:**
1. Write failing tests for user snapshot diff behavior.
2. Implement diff logic for create, update, resign, and restore events.
3. Implement Feishu client based on the original script with pagination hooks.
4. Implement sync service that updates current tables and appends history events.
5. Implement worker loop.

### Task 5: Web Console

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Create: `src/app/companies/page.tsx`
- Create: `src/app/users/page.tsx`
- Create: `src/app/departments/page.tsx`
- Create: `src/features/companies/CompaniesConsole.tsx`
- Create: `src/features/users/UsersConsole.tsx`
- Create: `src/features/departments/DepartmentsConsole.tsx`
- Create: `src/features/shell/AppShell.tsx`
- Create: `src/features/shell/LogoutButton.tsx`

**Steps:**
1. Add Arco Design layout and global styles.
2. Build company management page.
3. Build user list with active/all filter.
4. Build department tree with direct employee panel.
5. Add user history drawer.

### Task 6: APIs

**Files:**
- Create: `src/app/api/companies/route.ts`
- Create: `src/app/api/companies/[id]/sync/route.ts`
- Create: `src/app/api/companies/[id]/users/route.ts`
- Create: `src/app/api/companies/[id]/departments/route.ts`
- Create: `src/app/api/users/[id]/history/route.ts`

**Steps:**
1. Expose authenticated CRUD/list endpoints.
2. Trigger manual sync.
3. Serve company users, department trees, and user histories.

### Task 7: Verification

**Commands:**
- `npm install`
- `npm test`
- `npm run build`
