# OPC Advisor — 最小完整项目管理（itsaplan 概念重写）

Date: 2026-09-08  
Status: draft (awaiting user review of this file)  
Repo: `opc-advisor` only (MIT)  
References: `career-advisor` (Auth / shadcn / middleware patterns), `itsaplan` (product concepts, not source)

## Goal

在空仓 `opc-advisor` 用 Next.js 15 + Supabase **重写**一套项目管理应用：交互与领域对齐 itsaplan 的核心 PM（项目、Issue、状态列、标签、评论、一层子任务、看板/表格/时间线/日历、cycles），技术栈对齐 career-advisor。不拷贝 itsaplan 源码，不引入 AGPL。

## Decisions (locked)

| Topic | Choice |
|---|---|
| Product mix | 项目管理为主；AI 建议、支付/积分不做 |
| itsaplan feature band | 较完整 PM，不含 Agent / MCP / runner |
| Delivery | 空仓新建 Next + Supabase；只借 career-advisor 模式，不整仓克隆 |
| Increment | 一份 spec 覆盖下列清单（不做分阶段砍视图） |
| Feature boundary | 做到 cycles 为止；无 checklist、附件、docs、dashboard、initiatives |
| License | 保持 MIT；itsaplan 仅作规格 |
| Assignee v1 | 仅当前用户（项目 owner）或清空 |
| UI language | 中文 |
| Code location | 只改 `opc-advisor` |

## Out of scope

- Agent、MCP、runner、worker、bot、webhook、多 forge PR
- Creem、积分、职业路线图、中文名生成
- 团队、邀请、多成员、RBAC
- checklist、附件、issue types、priority/estimate、归档、公开分享
- docs、notes、dashboard、initiatives、label groups、WIP 限制
- 保存的自定义 view 表、命令面板、快捷键、通知 inbox
- 时间线拖条改期、Issue 侧栏 panel
- Playwright E2E、真实 Supabase CI 集成、错误上报 SaaS
- 修改 `career-advisor` 或 `itsaplan` 仓库

## Architecture

- **Process:** 单一 Next.js 15 App Router 应用。数据经 Supabase JS（RSC + Server Actions）。无独立 API 服务。
- **Auth:** Email/密码；`middleware` → `updateSession`，保护 `/projects` 及以下；未登录跳转 `/sign-in?next=`。
- **Modules:**
  - `auth` — 会话与登录页
  - `projects` — 项目与 `KEY-n` 序号
  - `issues` — Issue、状态列、标签、评论、子任务
  - `views` — 同一查询的四种展示
  - `cycles` — 周期与未完成结转
- **Authz v1:** `projects.owner_id = auth.uid()`；子表经 `project_id` RLS。读他人资源返回 404。

## Data model

Default columns on project create: Backlog, Todo, In Progress, Done  
(`state_type`: `backlog`, `unstarted`, `started`, `completed`).

| Table | Role |
|---|---|
| `projects` | `id`, `owner_id`, `key` (unique, `A-Z0-9`, 2–10 chars), `name`, `description`, `next_sequence` |
| `project_columns` | `name`, `state_type` (includes `canceled` for cycle carry rules), `position`; cannot delete last column; cannot delete column that still has issues |
| `labels` | unique name per project + color; no groups |
| `cycles` | `name`, `goal`, `start_date`, `end_date`, `completed_at`; `end_date >= start_date` |
| `issues` | `sequence_number` (display `KEY-n`), `column_id`, `parent_id` (one level only), `cycle_id`, `assignee_id` (owner or null), `title`, `description`, `start_date`, `due_date`, `position` |
| `issue_labels` | M2M |
| `issue_comments` | `body`, `author_id`, `created_at`; no threads |

Rules:

- Delete project cascades children.
- Complete cycle: issues whose column `state_type` is not `completed` or `canceled` move `cycle_id` to the chosen next cycle, or null if none.
- Timeline uses `start_date` / `due_date`; undated issues go to 「未排期」. No drag-to-reschedule in v1.
- Calendar places issues by `due_date`; issues without `due_date` are omitted.
- Views are routes over `issues`, not stored view rows.

## Pages and interaction

| Path | Behavior |
|---|---|
| `/` | Short landing + 登录/注册 |
| `/sign-in`, `/sign-up` | Email/password |
| `/projects` | List, create (name + key) |
| `/projects/[key]` | Kanban (default) |
| `/projects/[key]/table` | Table |
| `/projects/[key]/timeline` | Timeline |
| `/projects/[key]/calendar` | Calendar |
| `/projects/[key]/cycles` | Cycle list, create, complete + carry |
| `/projects/[key]/settings` | Rename project; CRUD columns and labels |
| `/projects/[key]/issues/[n]` | Full-page issue detail |

Kanban: drag between columns updates `column_id` + `position`; create issue in column.  
Table: title, key, status, labels, cycle, due; row opens detail.  
Issue detail: edit fields, comments, subtasks; subtasks cannot have children. Completing a subtask means moving it to a `completed` column (or equivalent status change on detail).  
Empty states: no projects / no issues / no cycles with a primary CTA.  
Header when logged in: logo 「OPC Advisor」, project switcher, sign out.

## Error handling

- Auth failures: inline Chinese messages; no blank crash page.
- Foreign `key` / issue: **404**.
- RLS write denial: toast 「没有权限」, keep previous data.
- Validation: duplicate key 「Key 已被使用」; empty title; `end < start` on issue or cycle — field errors, no write.
- Delete column with issues: toast, keep column.
- Complete cycle with unfinished issues and no next cycle: confirm empty `cycle_id` or cancel.
- Drag failure: card snaps back; toast 「未能更新状态」; server list wins.
- Supabase down: retry banner; submit buttons disable while in flight.
- Unknown route: 404 「页面不存在」 → `/projects` or home.

## Testing

- Vitest for domain helpers; `npm run lint` and `npm run build` as smoke.
- Required unit tests: key/`KEY-n`; default four columns; one-level subtasks; cycle carry; calendar omit undated; timeline undated bucket; refuse delete column with issues.
- Manual AC: sign up → create project → same issue in four views → kanban drag → detail labels/comments/subtasks/dates → create and complete cycle with carry → sign out/in data persists.
- No Playwright, no live-Supabase CI in this spec.

## Files to create (indicative)

All under `opc-advisor/`:

- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind`/`postcss`, `.env.example`
- `middleware.ts`, `app/layout.tsx`, `app/globals.css`, route pages listed above
- `utils/supabase/{client,server,middleware}.ts` (pattern from career-advisor, rewritten)
- `supabase/migrations/` for tables + RLS
- `lib/` domain: keys, columns, subtasks, cycle-carry, view filters
- `components/` shadcn-style UI + board/table/timeline/calendar/issue
- `lib/**/*.test.ts` Vitest cases listed above

Existing files to keep/update: `README.md` (product setup), `LICENSE` (MIT unchanged).

## Success criteria

1. Logged-in owner can CRUD projects and issues with default workflow columns.
2. Kanban, table, timeline, and calendar all show the same issue set with the date rules above.
3. Labels, comments, one-level subtasks, and cycles (including carry-over) work as specified.
4. RLS prevents cross-user access (404 / no leak).
5. Unit tests listed above pass; `lint` and `build` succeed with documented env vars.

## Risks

- D-sized surface on a greenfield rewrite is large; schedule slip is likely if UI polish is unbounded — ship functional views first, visual parity with itsaplan is not required.
- Supabase local vs hosted: spec assumes a project the developer can migrate; `.env.example` must list all keys.
- `canceled` state_type is in the cycle rule but not in the default four columns; settings may add a Canceled column later, or cycle treat only `completed` as done until a canceled column exists. **Resolved:** default four columns only; `canceled` is allowed on `state_type` so a user-created Canceled column participates in carry rules.

## Spec self-review

- Placeholders: none remaining.
- Consistency: architecture, data, pages, errors, and tests all use the same table/route set.
- Scope: one implementation plan is large but bounded by the out-of-scope list.
- Ambiguity: subtask “complete” = move to a column with `state_type = completed`; assignee only owner; no stored views.
