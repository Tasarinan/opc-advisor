# opc-advisor

帮助 OPC 处理常见项目管理：项目、Issue、看板 / 表格 / 时间线 / 日历、标签、评论、一层子任务、周期。

技术栈：Next.js 15、Supabase、Tailwind。领域概念对齐 itsaplan，实现为 MIT 重写（不包含 Agent / MCP）。

## 本地运行

1. 复制 `.env.example` 为 `.env.local`，填入 `NEXT_PUBLIC_SUPABASE_URL`、publishable key，以及仅服务端使用的 `SUPABASE_SECRET_KEY`（不要用 `NEXT_PUBLIC_` 前缀）。
2. 在 Supabase Dashboard → SQL Editor **依次**执行：
   - `supabase/migrations/20260909000000_init_pm.sql`
   - `supabase/migrations/20260909000001_members.sql`
3. Auth → Email：按需关闭 “Confirm email” 以便本地直接登录。
4. `npm install` 后 `npm run dev`。
5. 打开 http://localhost:3000 注册并创建项目。

## 脚本

- `npm test` — 领域单测（Vitest）
- `npm run build` — 生产构建
- `npm run lint` — Next lint

## 设计

见 `docs/superpowers/specs/2026-09-08-opc-advisor-pm-design.md`。
