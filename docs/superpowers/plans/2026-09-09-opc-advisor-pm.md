# OPC Advisor PM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Greenfield Next.js 15 + Supabase PM app in `opc-advisor`: projects, issues, labels, comments, one-level subtasks, four views, cycles.

**Architecture:** Pure domain functions in `lib/` (Vitest). Next App Router + Supabase SSR/RLS for persistence. Views are routes over the same issue rows. Career-advisor is a pattern source only.

**Tech Stack:** Next 15, React 19, TypeScript, Tailwind 4, `@supabase/ssr`, `@dnd-kit/core`, Vitest, Zod.

## Global Constraints

- Code only in `opc-advisor` (MIT). Do not copy itsaplan source. Do not modify career-advisor.
- UI copy is Chinese. Assignee v1 is owner or null.
- No Agent/MCP, payments, docs/dashboard/initiatives, checklist, attachments, Playwright.
- Do not git commit unless the user explicitly asks.

---

### Task 1: Domain — project key and issue key

**Files:**
- Create: `lib/project-key.ts`
- Test: `lib/project-key.test.ts`

**Interfaces:**
- Produces: `normalizeProjectKey(raw: string): { ok: true; key: string } | { ok: false; error: string }`; `formatIssueKey(projectKey: string, sequence: number): string`

- [x] Tests + implementation (executed inline)

### Task 2: Domain — columns, subtasks, cycle carry, views, delete-column

**Files:**
- Create: `lib/columns.ts`, `lib/columns.test.ts`, `lib/subtasks.ts`, `lib/subtasks.test.ts`, `lib/cycle-carry.ts`, `lib/cycle-carry.test.ts`, `lib/view-filters.ts`, `lib/view-filters.test.ts`

**Interfaces:**
- `defaultColumns(): Array<{ name: string; stateType: StateType; position: number }>`
- `canDeleteColumn(params: { issueCount: number; columnCount: number }): { ok: true } | { ok: false; error: string }`
- `assertCanSetParent(params: { parentId: number | null; parentHasParent: boolean; childHasChildren: boolean }): void` throws `Error`
- `shouldCarryIssue(stateType: StateType): boolean`
- `applyCycleCarry<T extends { id: number; stateType: StateType; cycleId: number | null }>(issues: T[], nextCycleId: number | null): T[]`
- `issuesForCalendar<T extends { dueDate: string | null }>(issues: T[]): T[]`
- `timelineBucket<T extends { startDate: string | null; dueDate: string | null }>(issue: T): 'scheduled' | 'unscheduled'`

- [x] Tests + implementation (executed inline)

### Task 3: Next app scaffold, Supabase clients, migration, auth, PM UI

**Files:** package.json through `app/projects/[key]/**`, `components/**`, `supabase/migrations/**`, README

- [x] Scaffold + UI (executed inline)

### Task 4: Verify

- [ ] `npx vitest run`
- [ ] `npx next build` (may need env placeholders)
- [ ] `npx tsc --noEmit` if configured

---

## Spec coverage

Keys, default columns, subtask depth, cycle carry, calendar/timeline rules, refuse delete column, auth/RLS, four views, comments, labels, settings, Chinese UI — Tasks 1–3.
