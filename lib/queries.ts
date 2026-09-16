import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import type {
  ChecklistItem,
  Cycle,
  Initiative,
  Issue,
  IssueComment,
  IssueLink,
  IssueType,
  Label,
  Project,
  ProjectColumn,
  ProjectInvite,
  ProjectMember,
  SavedView,
} from "@/lib/types";
import { checklistProgress } from "@/lib/checklist";
import { displayColumnName } from "@/lib/columns";

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };
  return { supabase, user };
});

export const getOwnedProject = cache(async (key: string): Promise<Project | null> => {
  const { supabase, user } = await requireUser();
  if (!user) return null;
  const { data } = await supabase.from("projects").select("*").eq("key", key).maybeSingle();
  return (data as Project | null) ?? null;
});

export async function getOwnedProjectOr404(key: string): Promise<Project> {
  const project = await getOwnedProject(key);
  if (!project) notFound();
  return project;
}

export const listProjects = cache(async (): Promise<Project[]> => {
  const { supabase, user } = await requireUser();
  if (!user) return [];
  const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Project[];
});

export const listMembers = cache(async (projectId: number): Promise<ProjectMember[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at");
  return (data ?? []) as ProjectMember[];
});

export async function getMyRole(projectId: number): Promise<"owner" | "member" | null> {
  const { supabase, user } = await requireUser();
  if (!user) return null;
  const { data } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  return (data?.role as "owner" | "member" | undefined) ?? null;
}

export async function listInvites(projectId: number): Promise<ProjectInvite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_invites")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []) as ProjectInvite[];
}

export async function getInviteByToken(token: string): Promise<ProjectInvite | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("project_invites").select("*").eq("token", token).maybeSingle();
  return (data as ProjectInvite | null) ?? null;
}

export const loadBoard = cache(async (projectId: number) => {
  const supabase = await createClient();
  const [{ data: columns, error: colErr }, { data: issues, error: issErr }, { data: labels }, { data: cycles }, { data: issueTypes }, { data: initiatives }] =
    await Promise.all([
      supabase.from("project_columns").select("*").eq("project_id", projectId).order("position"),
      supabase.from("issues").select("*").eq("project_id", projectId).order("position"),
      supabase.from("labels").select("*").eq("project_id", projectId).order("name"),
      supabase.from("cycles").select("*").eq("project_id", projectId).order("start_date"),
      supabase.from("issue_types").select("*").eq("project_id", projectId).order("position"),
      supabase.from("initiatives").select("*").eq("project_id", projectId).order("name"),
    ]);
  if (colErr || issErr) {
    throw new Error("SUPABASE_UNAVAILABLE");
  }

  const issueIds = (issues ?? []).map((i) => i.id as number);
  let issueLabels: { issue_id: number; label_id: number }[] = [];
  let checklistRows: { issue_id: number; done: boolean }[] = [];
  if (issueIds.length) {
    const [labelRes, checkRes] = await Promise.all([
      supabase.from("issue_labels").select("issue_id, label_id").in("issue_id", issueIds),
      supabase.from("issue_checklist_items").select("issue_id, done").in("issue_id", issueIds),
    ]);
    issueLabels = (labelRes.data ?? []) as { issue_id: number; label_id: number }[];
    checklistRows = (checkRes.data ?? []) as { issue_id: number; done: boolean }[];
  }

  const labelById = new Map((labels ?? []).map((l) => [l.id as number, l as Label]));
  const labelsByIssue = new Map<number, Label[]>();
  for (const row of issueLabels) {
    const list = labelsByIssue.get(row.issue_id) ?? [];
    const label = labelById.get(row.label_id);
    if (label) list.push(label);
    labelsByIssue.set(row.issue_id, list);
  }

  const checklistByIssue = new Map<number, { done: boolean }[]>();
  for (const row of checklistRows) {
    const list = checklistByIssue.get(row.issue_id) ?? [];
    list.push({ done: row.done });
    checklistByIssue.set(row.issue_id, list);
  }

  return {
    columns: ((columns ?? []) as ProjectColumn[]).map((col) => ({
      ...col,
      name: displayColumnName(col.name),
    })),
    issues: ((issues ?? []) as Issue[]).map((issue) => {
      const progress = checklistProgress(checklistByIssue.get(issue.id) ?? []);
      return {
        ...issue,
        labels: labelsByIssue.get(issue.id) ?? [],
        checklistDone: progress.done,
        checklistTotal: progress.total,
      };
    }),
    labels: (labels ?? []) as Label[],
    cycles: (cycles ?? []) as Cycle[],
    issueTypes: (issueTypes ?? []) as IssueType[],
    initiatives: (initiatives ?? []) as Initiative[],
  };
});

export const loadIssueDetail = cache(async (projectId: number, sequence: number) => {
  const supabase = await createClient();
  const { data: issue } = await supabase
    .from("issues")
    .select("*")
    .eq("project_id", projectId)
    .eq("sequence_number", sequence)
    .maybeSingle();
  if (!issue) return null;

  const [{ data: comments }, { data: children }, { data: labelRows }, { data: checklist }, { data: links }] =
    await Promise.all([
      supabase.from("issue_comments").select("*").eq("issue_id", issue.id).order("created_at"),
      supabase.from("issues").select("*").eq("parent_id", issue.id).order("sequence_number"),
      supabase.from("issue_labels").select("label_id").eq("issue_id", issue.id),
      supabase.from("issue_checklist_items").select("*").eq("issue_id", issue.id).order("position"),
      supabase.from("issue_links").select("*").or(`source_id.eq.${issue.id},target_id.eq.${issue.id}`),
    ]);

  const linkRows = (links ?? []) as IssueLink[];
  const otherIds = [
    ...new Set(
      linkRows.map((l) => (l.source_id === issue.id ? l.target_id : l.source_id)),
    ),
  ];
  const { data: linkedIssues } = otherIds.length
    ? await supabase.from("issues").select("id, sequence_number, title").in("id", otherIds)
    : { data: [] as { id: number; sequence_number: number; title: string }[] };

  return {
    issue: issue as Issue,
    comments: (comments ?? []) as IssueComment[],
    children: (children ?? []) as Issue[],
    labelIds: (labelRows ?? []).map((r) => r.label_id as number),
    checklist: (checklist ?? []) as ChecklistItem[],
    links: linkRows,
    linkedIssues: (linkedIssues ?? []) as Array<{ id: number; sequence_number: number; title: string }>,
  };
});

export const listSavedViews = cache(async (projectId: number): Promise<SavedView[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("saved_views").select("*").eq("project_id", projectId).order("position").order("id");
  return ((data ?? []) as SavedView[]).map((row) => ({
    ...row,
    spec: row.spec && typeof row.spec === "object" ? (row.spec as Record<string, string>) : {},
  }));
});

