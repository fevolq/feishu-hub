# User Daily Snapshots Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Store one user snapshot per company, user, and local calendar day while keeping current user state and change events.

**Architecture:** Add `user_daily_snapshots` as an append-by-day/upsert-by-day table. The sync persistence flow continues to update `users_current` and `user_change_events`, then upserts daily snapshots for active users and users marked resigned during that sync. `user_change_events.occurred_at` remains the exact change timestamp.

**Tech Stack:** Next.js, TypeScript, SQLite, better-sqlite3, Vitest.

---

### Task 1: Daily Snapshot Date Helper

**Files:**
- Create: `tests/sync/daily-snapshots.test.ts`
- Create: `src/server/sync/daily-snapshots.ts`

**Steps:**
1. Write tests for Asia/Shanghai snapshot date conversion and snapshot payload construction.
2. Run `npm test` and verify the new test fails because the module is missing.
3. Implement the helper functions.
4. Run `npm test` and verify the tests pass.

### Task 2: SQLite Snapshot Storage

**Files:**
- Modify: `src/server/db/schema.sql`
- Modify: `src/server/sync/persist.ts`

**Steps:**
1. Add `user_daily_snapshots` with unique key `(company_id, user_open_id, snapshot_date)`.
2. In sync persistence, upsert one daily snapshot for each currently fetched user.
3. When a previously active user disappears, upsert that day's resigned snapshot.
4. Keep `user_change_events.occurred_at` as the exact change timestamp.

### Task 3: Verification

**Commands:**
- `npm test`
- `npm run build`

