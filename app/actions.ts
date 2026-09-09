"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { normalizeProjectKey } from "@/lib/project-key";
import { autoAssigneeOnEnter, canDeleteColumn, defaultColumns, parseWipLimit, pickCompletedColumnId, wipBlocksEnter } from "@/lib/columns";
import { defaultIssueTypes, parseEstimateMinutes, parseEstimatePoints, parsePriority, resolveTypeId } from "@/lib/issue-meta";
import { assertCanSetParent } from "@/lib/subtasks";
import { applyCycleCarry, shouldCarryIssue } from "@/lib/cycle-carry";
import type { StateType } from "@/lib/columns";
import { getMyRole, getOwnedProject, listMembers } from "@/lib/queries";
import { assertAssigneeIsMember, canAcceptInvite, canManageMembers, normalizeInviteEmail } from "@/lib/membership";
import { parseChecklistTitle } from "@/lib/checklist";
import { assertCanReplyComment, extractMentionTokens, resolveMentions } from "@/lib/comments";
import { normalizeLinkEndpoints, parseIssueRef, parseLinkType } from "@/lib/issue-links";
import { completedAtOnColumnChange } from "@/lib/dashboard";
import { parseInitiativeName, parseInitiativeStatus, resolveInitiativeId } from "@/lib/initiatives";
import { parseIssueQuery, parseViewKind, parseViewName, specFromQuery } from "@/lib/saved-views";
import { mapAuthError } from "@/lib/auth-errors";
import { createAdminClient } from "@/utils/supabase/admin";

function revalidateProject(key: string) {
  revalidatePath("/projects");
  revalidatePath(`/projects/${key}`);
  revalidatePath(`/projects/${key}/table`);
  revalidatePath(`/projects/${key}/timeline`);
  revalidatePath(`/projects/${key}/calendar`);
  revalidatePath(`/projects/${key}/cycles`);
  revalidatePath(`/projects/${key}/settings`);
  revalidatePath(`/projects/${key}/members`);
  revalidatePath(`/projects/${key}/initiatives`);
  revalidatePath(`/projects/${key}/dashboard`);
}

async function planColumnEnter(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: number,
  columnId: number,
  issue: { parent_id: number | null; column_id?: number | null },
) {
  const { data: col } = await supabase
    .from("project_columns")
    .select("wip_limit, auto_assign_id, state_type")
    .eq("id", columnId)
    .eq("project_id", projectId)
    .maybeSingle();
  const alreadyInColumn = issue.column_id === columnId;
  const { count } = await supabase
    .from("issues")
    .select("id", { count: "exact", head: true })
    .eq("column_id", columnId)
    .is("parent_id", null);
  const wip = wipBlocksEnter({
    limit: (col?.wip_limit as number | null) ?? null,
    rootCount: count ?? 0,
    isRoot: issue.parent_id == null,
    alreadyInColumn,
  });
  const assigneeId = autoAssigneeOnEnter({
    autoAssignId: (col?.auto_assign_id as string | null) ?? null,
    alreadyInColumn,
  });
  return { wip, assigneeId, toCompleted: col?.state_type === "completed" };
}

async function columnIsCompleted(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: number,
  columnId: number | null | undefined,
) {
  if (columnId == null) return false;
  const { data } = await supabase
    .from("project_columns")
    .select("state_type")
    .eq("id", columnId)
    .eq("project_id", projectId)
    .maybeSingle();
  return data?.state_type === "completed";
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/projects");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent("邮箱或密码不正确")}&next=${encodeURIComponent(next)}`);
  }
  redirect(next.startsWith("/") ? next : "/projects");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  const rateLimited =
    error &&
    (error.status === 429 ||
      (error.message ?? "").toLowerCase().includes("rate limit") ||
      (error.code ?? "").includes("rate_limit"));

  if (error && rateLimited) {
    const admin = createAdminClient();
    if (admin) {
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (created.error) {
        console.error("admin createUser", created.error.message);
        redirect(`/sign-up?error=${encodeURIComponent(mapAuthError(created.error))}`);
      }
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        redirect(`/sign-in?error=${encodeURIComponent("账号已创建，请登录")}`);
      }
      redirect("/projects");
    }
  }

  if (error) {
    console.error("signUp", error.code, error.message, error.status);
    redirect(`/sign-up?error=${encodeURIComponent(mapAuthError(error))}`);
  }
  if (data.session) {
    redirect("/projects");
  }
  redirect("/sign-in?error=" + encodeURIComponent("账号已创建，请登录"));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const keyResult = normalizeProjectKey(String(formData.get("key") ?? ""));
  if (!name) redirect("/projects?error=" + encodeURIComponent("请填写项目名称"));
  if (!keyResult.ok) redirect("/projects?error=" + encodeURIComponent(keyResult.error));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data, error } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, key: keyResult.key, name, description: "" })
    .select()
    .single();
  if (error) {
    const msg = error.code === "23505" ? "Key 已被使用" : "创建项目失败";
    redirect("/projects?error=" + encodeURIComponent(msg));
  }
  await supabase.from("project_members").insert({
    project_id: data.id,
    user_id: user.id,
    role: "owner",
    email: user.email ?? "",
  });
  await supabase.from("project_columns").insert(
    defaultColumns().map((c) => ({
      project_id: data.id,
      name: c.name,
      state_type: c.stateType,
      position: c.position,
    })),
  );
  await supabase.from("issue_types").insert(
    defaultIssueTypes().map((t) => ({
      project_id: data.id,
      name: t.name,
      color: t.color,
      position: t.position,
    })),
  );
  redirect(`/projects/${keyResult.key}`);
}

export async function createIssueAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const columnId = Number(formData.get("columnId"));
  const parentIdRaw = formData.get("parentId");
  const parentId = parentIdRaw ? Number(parentIdRaw) : null;
  if (!title) redirect(`/projects/${key}?error=` + encodeURIComponent("Issue 标题必填"));
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  const supabase = await createClient();

  if (parentId) {
    const { data: parent } = await supabase.from("issues").select("id, parent_id").eq("id", parentId).single();
    const { count } = await supabase
      .from("issues")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", parentId);
    try {
      assertCanSetParent({
        parentId,
        parentHasParent: Boolean(parent?.parent_id),
        childHasChildren: false,
      });
    } catch (e) {
      redirect(`/projects/${key}?error=` + encodeURIComponent((e as Error).message));
    }
    void count;
  }

  const sequence = project.next_sequence;
  const { data: types } = await supabase
    .from("issue_types")
    .select("id")
    .eq("project_id", project.id)
    .order("position");
  const typeIds = (types ?? []).map((t) => t.id as number);
  const typeParsed = resolveTypeId(String(formData.get("typeId") ?? ""), typeIds, typeIds[0] ?? null);
  if (!typeParsed.ok) {
    redirect(`/projects/${key}?error=` + encodeURIComponent(typeParsed.error));
  }
  const enter = await planColumnEnter(supabase, project.id, columnId, { parent_id: parentId });
  if (!enter.wip.ok) {
    const parentSeq = String(formData.get("parentSequence") ?? "");
    const dest = parentSeq ? `/projects/${key}/issues/${parentSeq}` : `/projects/${key}`;
    redirect(`${dest}?error=` + encodeURIComponent(enter.wip.error));
  }
  const { error } = await supabase.from("issues").insert({
    project_id: project.id,
    sequence_number: sequence,
    column_id: columnId,
    parent_id: parentId,
    type_id: typeParsed.value,
    assignee_id: enter.assigneeId ?? null,
    title,
    description: "",
    position: Date.now(),
    completed_at: enter.toCompleted ? new Date().toISOString() : null,
  });
  if (error) redirect(`/projects/${key}?error=` + encodeURIComponent("创建 Issue 失败"));
  await supabase.from("projects").update({ next_sequence: sequence + 1 }).eq("id", project.id);
  revalidateProject(key);
  const parentSeq = String(formData.get("parentSequence") ?? "");
  if (parentSeq) {
    revalidatePath(`/projects/${key}/issues/${parentSeq}`);
    redirect(`/projects/${key}/issues/${parentSeq}`);
  }
}

export async function moveIssueAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const issueId = Number(formData.get("issueId"));
  const columnId = Number(formData.get("columnId"));
  const project = await getOwnedProject(key);
  if (!project) return { error: "没有权限" };
  const supabase = await createClient();
  const { data: issue } = await supabase
    .from("issues")
    .select("id, parent_id, column_id, completed_at")
    .eq("id", issueId)
    .eq("project_id", project.id)
    .maybeSingle();
  if (!issue) return { error: "Issue 不存在" };
  const enter = await planColumnEnter(supabase, project.id, columnId, {
    parent_id: issue.parent_id,
    column_id: issue.column_id,
  });
  if (!enter.wip.ok) return { error: enter.wip.error };
  const fromCompleted = await columnIsCompleted(supabase, project.id, issue.column_id);
  const patch: { column_id: number; position: number; assignee_id?: string; completed_at: string | null } = {
    column_id: columnId,
    position: Date.now(),
    completed_at: completedAtOnColumnChange({
      fromCompleted,
      toCompleted: enter.toCompleted,
      nowIso: new Date().toISOString(),
      existing: issue.completed_at,
    }),
  };
  if (enter.assigneeId) patch.assignee_id = enter.assigneeId;
  const { error } = await supabase.from("issues").update(patch).eq("id", issueId).eq("project_id", project.id);
  if (error) return { error: "未能更新状态" };
  revalidateProject(key);
  return { ok: true };
}

function bounceIssue(formData: FormData, key: string, sequence: number, error?: string): never {
  const returnTo = String(formData.get("returnTo") ?? "");
  if (returnTo.startsWith(`/projects/${key}`)) {
    const u = new URL(returnTo, "http://local.invalid");
    u.searchParams.set("issue", String(sequence));
    if (error) u.searchParams.set("error", error);
    else u.searchParams.delete("error");
    redirect(`${u.pathname}${u.search}`);
  }
  if (error) {
    redirect(`/projects/${key}/issues/${sequence}?error=` + encodeURIComponent(error));
  }
  redirect(`/projects/${key}/issues/${sequence}`);
}

export async function updateIssueDatesAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const issueId = Number(formData.get("issueId"));
  const start = String(formData.get("startDate") ?? "") || null;
  const due = String(formData.get("dueDate") ?? "") || null;
  if (start && due && due < start) return { error: "截止日期不能早于开始日期" };
  const project = await getOwnedProject(key);
  if (!project) return { error: "没有权限" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("issues")
    .update({ start_date: start, due_date: due })
    .eq("id", issueId)
    .eq("project_id", project.id);
  if (error) return { error: "未能更新日期" };
  revalidateProject(key);
  return { ok: true };
}

export async function updateIssueAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const sequence = Number(formData.get("sequence"));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) bounceIssue(formData, key, sequence, "Issue 标题必填");
  const start = String(formData.get("startDate") ?? "") || null;
  const due = String(formData.get("dueDate") ?? "") || null;
  if (start && due && due < start) {
    bounceIssue(formData, key, sequence, "截止日期不能早于开始日期");
  }
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  const members = await listMembers(project.id);
  try {
    assertAssigneeIsMember(
      assigneeId,
      members.map((m) => m.user_id),
    );
  } catch (e) {
    bounceIssue(formData, key, sequence, (e as Error).message);
  }

  const { data: current } = await supabase
    .from("issues")
    .select("id, parent_id, column_id, completed_at")
    .eq("project_id", project.id)
    .eq("sequence_number", sequence)
    .single();
  if (!current) redirect(`/projects/${key}`);

  const nextColumnId = Number(formData.get("columnId"));
  const enter = await planColumnEnter(supabase, project.id, nextColumnId, {
    parent_id: current.parent_id,
    column_id: current.column_id,
  });
  if (!enter.wip.ok) {
    bounceIssue(formData, key, sequence, enter.wip.error);
  }
  const fromCompleted = await columnIsCompleted(supabase, project.id, current.column_id);
  const completedAt = completedAtOnColumnChange({
    fromCompleted,
    toCompleted: enter.toCompleted,
    nowIso: new Date().toISOString(),
    existing: current.completed_at,
  });

  const cycleRaw = String(formData.get("cycleId") ?? "");
  const { data: types } = await supabase.from("issue_types").select("id").eq("project_id", project.id);
  const typeIds = (types ?? []).map((t) => t.id as number);
  const typeParsed = resolveTypeId(String(formData.get("typeId") ?? ""), typeIds, null);
  const { data: inits } = await supabase.from("initiatives").select("id").eq("project_id", project.id);
  const initParsed = resolveInitiativeId(
    String(formData.get("initiativeId") ?? ""),
    (inits ?? []).map((i) => i.id as number),
  );
  const priorityParsed = parsePriority(String(formData.get("priority") ?? ""));
  const pointsParsed = parseEstimatePoints(String(formData.get("estimatePoints") ?? ""));
  const minutesParsed = parseEstimateMinutes(String(formData.get("estimateMinutes") ?? ""));
  if (!typeParsed.ok) {
    bounceIssue(formData, key, sequence, typeParsed.error);
  }
  if (!initParsed.ok) {
    bounceIssue(formData, key, sequence, initParsed.error);
  }
  if (!priorityParsed.ok) {
    bounceIssue(formData, key, sequence, priorityParsed.error);
  }
  if (!pointsParsed.ok) {
    bounceIssue(formData, key, sequence, pointsParsed.error);
  }
  if (!minutesParsed.ok) {
    bounceIssue(formData, key, sequence, minutesParsed.error);
  }

  await supabase
    .from("issues")
    .update({
      title,
      description: String(formData.get("description") ?? ""),
      column_id: nextColumnId,
      cycle_id: cycleRaw ? Number(cycleRaw) : null,
      initiative_id: initParsed.value,
      assignee_id: enter.assigneeId ?? assigneeId,
      type_id: typeParsed.value,
      priority: priorityParsed.value,
      estimate_points: pointsParsed.value,
      estimate_minutes: minutesParsed.value,
      start_date: start,
      due_date: due,
      completed_at: completedAt,
    })
    .eq("id", current.id);

  const selectedLabels = formData.getAll("labelId").map((v) => Number(v));
  await supabase.from("issue_labels").delete().eq("issue_id", current.id);
  if (selectedLabels.length) {
    await supabase.from("issue_labels").insert(selectedLabels.map((label_id) => ({ issue_id: current.id, label_id })));
  }
  revalidateProject(key);
  revalidatePath(`/projects/${key}/issues/${sequence}`);
  if (String(formData.get("returnTo") ?? "")) bounceIssue(formData, key, sequence);
}

export async function addCommentAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const sequence = Number(formData.get("sequence"));
  const body = String(formData.get("body") ?? "").trim();
  const parentRaw = String(formData.get("parentId") ?? "");
  const parentId = parentRaw ? Number(parentRaw) : null;
  if (!body) {
    redirect(`/projects/${key}/issues/${sequence}?error=` + encodeURIComponent("评论不能为空"));
  }
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: issue } = await supabase
    .from("issues")
    .select("id")
    .eq("project_id", project.id)
    .eq("sequence_number", sequence)
    .single();
  if (!issue) redirect(`/projects/${key}`);
  if (parentId) {
    const { data: parent } = await supabase
      .from("issue_comments")
      .select("id, parent_id, issue_id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || parent.issue_id !== issue.id) {
      redirect(`/projects/${key}/issues/${sequence}?error=` + encodeURIComponent("回复的评论不存在"));
    }
    try {
      assertCanReplyComment({ parentId, parentHasParent: Boolean(parent.parent_id) });
    } catch (e) {
      redirect(`/projects/${key}/issues/${sequence}?error=` + encodeURIComponent((e as Error).message));
    }
  }
  const { data: created, error } = await supabase
    .from("issue_comments")
    .insert({ issue_id: issue.id, author_id: user.id, body, parent_id: parentId })
    .select("id")
    .single();
  if (error || !created) {
    redirect(`/projects/${key}/issues/${sequence}?error=` + encodeURIComponent("发表评论失败"));
  }
  const members = await listMembers(project.id);
  const mentioned = resolveMentions(extractMentionTokens(body), members);
  if (mentioned.length) {
    await supabase.from("issue_comment_mentions").insert(
      mentioned.map((m) => ({ comment_id: created.id, user_id: m.user_id })),
    );
  }
  revalidatePath(`/projects/${key}/issues/${sequence}`);
}

export async function addIssueLinkAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const sequence = Number(formData.get("sequence"));
  const typeParsed = parseLinkType(String(formData.get("linkType") ?? ""));
  const refParsed = parseIssueRef(String(formData.get("targetRef") ?? ""), key);
  if (!typeParsed.ok) {
    redirect(`/projects/${key}/issues/${sequence}?error=` + encodeURIComponent(typeParsed.error));
  }
  if (!refParsed.ok) {
    redirect(`/projects/${key}/issues/${sequence}?error=` + encodeURIComponent(refParsed.error));
  }
  if (refParsed.sequence === sequence) {
    redirect(`/projects/${key}/issues/${sequence}?error=` + encodeURIComponent("不能关联自己"));
  }
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  const { supabase, issue } = await getIssueInProject(project.id, sequence);
  if (!issue) redirect(`/projects/${key}`);
  const { data: target } = await supabase
    .from("issues")
    .select("id")
    .eq("project_id", project.id)
    .eq("sequence_number", refParsed.sequence)
    .maybeSingle();
  if (!target) {
    redirect(`/projects/${key}/issues/${sequence}?error=` + encodeURIComponent("找不到该 Issue"));
  }
  const ends = normalizeLinkEndpoints(typeParsed.value, issue.id, target.id);
  const { error } = await supabase.from("issue_links").insert({
    source_id: ends.sourceId,
    target_id: ends.targetId,
    link_type: typeParsed.value,
  });
  if (error) {
    const msg = error.code === "23505" ? "该关联已存在" : "创建关联失败";
    redirect(`/projects/${key}/issues/${sequence}?error=` + encodeURIComponent(msg));
  }
  revalidateProject(key);
  revalidatePath(`/projects/${key}/issues/${sequence}`);
  revalidatePath(`/projects/${key}/issues/${refParsed.sequence}`);
}

export async function deleteIssueLinkAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const sequence = Number(formData.get("sequence"));
  const linkId = Number(formData.get("linkId"));
  const project = await getOwnedProject(key);
  if (!project) return;
  const { supabase, issue } = await getIssueInProject(project.id, sequence);
  if (!issue) return;
  const { data: row } = await supabase
    .from("issue_links")
    .select("id, source_id, target_id")
    .eq("id", linkId)
    .maybeSingle();
  if (!row || (row.source_id !== issue.id && row.target_id !== issue.id)) return;
  await supabase.from("issue_links").delete().eq("id", linkId);
  revalidateProject(key);
  revalidatePath(`/projects/${key}/issues/${sequence}`);
}

async function getIssueInProject(projectId: number, sequence: number) {
  const supabase = await createClient();
  const { data: issue } = await supabase
    .from("issues")
    .select("id")
    .eq("project_id", projectId)
    .eq("sequence_number", sequence)
    .maybeSingle();
  return { supabase, issue };
}

export async function addChecklistItemAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const sequence = Number(formData.get("sequence"));
  const parsed = parseChecklistTitle(String(formData.get("title") ?? ""));
  if (!parsed.ok) {
    redirect(`/projects/${key}/issues/${sequence}?error=` + encodeURIComponent(parsed.error));
  }
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  const { supabase, issue } = await getIssueInProject(project.id, sequence);
  if (!issue) redirect(`/projects/${key}`);
  const { count } = await supabase
    .from("issue_checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("issue_id", issue.id);
  await supabase.from("issue_checklist_items").insert({
    issue_id: issue.id,
    title: parsed.value,
    done: false,
    position: count ?? 0,
  });
  revalidateProject(key);
  revalidatePath(`/projects/${key}/issues/${sequence}`);
}

export async function toggleChecklistItemAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const sequence = Number(formData.get("sequence"));
  const itemId = Number(formData.get("itemId"));
  const done = String(formData.get("done")) === "true";
  const project = await getOwnedProject(key);
  if (!project) return;
  const { supabase, issue } = await getIssueInProject(project.id, sequence);
  if (!issue) return;
  await supabase
    .from("issue_checklist_items")
    .update({ done })
    .eq("id", itemId)
    .eq("issue_id", issue.id);
  revalidateProject(key);
  revalidatePath(`/projects/${key}/issues/${sequence}`);
}

export async function deleteChecklistItemAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const sequence = Number(formData.get("sequence"));
  const itemId = Number(formData.get("itemId"));
  const project = await getOwnedProject(key);
  if (!project) return;
  const { supabase, issue } = await getIssueInProject(project.id, sequence);
  if (!issue) return;
  await supabase.from("issue_checklist_items").delete().eq("id", itemId).eq("issue_id", issue.id);
  revalidateProject(key);
  revalidatePath(`/projects/${key}/issues/${sequence}`);
}

export async function renameProjectAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const project = await getOwnedProject(key);
  if (!project || !name) return;
  const supabase = await createClient();
  await supabase.from("projects").update({ name }).eq("id", project.id);
  revalidateProject(key);
}

export async function addColumnAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const stateType = String(formData.get("stateType") ?? "unstarted") as StateType;
  const project = await getOwnedProject(key);
  if (!project || !name) return;
  const supabase = await createClient();
  const { data: cols } = await supabase.from("project_columns").select("position").eq("project_id", project.id);
  const max = Math.max(-1, ...(cols ?? []).map((c) => c.position as number));
  await supabase.from("project_columns").insert({
    project_id: project.id,
    name,
    state_type: stateType,
    position: max + 1,
  });
  revalidateProject(key);
}

export async function deleteColumnAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const columnId = Number(formData.get("columnId"));
  const project = await getOwnedProject(key);
  if (!project) return;
  const supabase = await createClient();
  const { count: colCount } = await supabase
    .from("project_columns")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);
  const { count: issueCount } = await supabase
    .from("issues")
    .select("id", { count: "exact", head: true })
    .eq("column_id", columnId);
  const allowed = canDeleteColumn({ issueCount: issueCount ?? 0, columnCount: colCount ?? 0 });
  if (!allowed.ok) {
    redirect(`/projects/${key}/settings?error=` + encodeURIComponent(allowed.error));
  }
  await supabase.from("project_columns").delete().eq("id", columnId).eq("project_id", project.id);
  revalidateProject(key);
}

export async function addLabelAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#6b7280");
  const project = await getOwnedProject(key);
  if (!project || !name) return;
  const supabase = await createClient();
  const { error } = await supabase.from("labels").insert({ project_id: project.id, name, color });
  if (error) {
    const msg = error.code === "23505" ? "标签名称已存在" : "没有权限";
    redirect(`/projects/${key}/settings?error=` + encodeURIComponent(msg));
  }
  revalidateProject(key);
}

export async function deleteLabelAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const labelId = Number(formData.get("labelId"));
  const project = await getOwnedProject(key);
  if (!project) return;
  const supabase = await createClient();
  await supabase.from("labels").delete().eq("id", labelId).eq("project_id", project.id);
  revalidateProject(key);
}

export async function addIssueTypeAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#6b7280");
  const project = await getOwnedProject(key);
  if (!project || !name) return;
  const supabase = await createClient();
  const { count } = await supabase
    .from("issue_types")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);
  const { error } = await supabase.from("issue_types").insert({
    project_id: project.id,
    name,
    color,
    position: count ?? 0,
  });
  if (error) {
    const msg = error.code === "23505" ? "类型名称已存在" : "没有权限";
    redirect(`/projects/${key}/settings?error=` + encodeURIComponent(msg));
  }
  revalidateProject(key);
}

export async function deleteIssueTypeAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const typeId = Number(formData.get("typeId"));
  const project = await getOwnedProject(key);
  if (!project) return;
  const supabase = await createClient();
  await supabase.from("issue_types").delete().eq("id", typeId).eq("project_id", project.id);
  revalidateProject(key);
}

export async function createCycleAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const start = String(formData.get("startDate") ?? "");
  const end = String(formData.get("endDate") ?? "");
  if (!name || !start || !end) {
    redirect(`/projects/${key}/cycles?error=` + encodeURIComponent("请填写名称与日期"));
  }
  if (end < start) {
    redirect(`/projects/${key}/cycles?error=` + encodeURIComponent("结束日期不能早于开始日期"));
  }
  const project = await getOwnedProject(key);
  if (!project) return;
  const supabase = await createClient();
  await supabase.from("cycles").insert({
    project_id: project.id,
    name,
    goal: String(formData.get("goal") ?? ""),
    start_date: start,
    end_date: end,
  });
  revalidateProject(key);
}

export async function completeCycleAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const cycleId = Number(formData.get("cycleId"));
  const nextRaw = String(formData.get("nextCycleId") ?? "");
  const nextCycleId = nextRaw ? Number(nextRaw) : null;
  const confirmEmpty = formData.get("confirmEmpty") === "1";
  const project = await getOwnedProject(key);
  if (!project) return;
  const supabase = await createClient();
  const { data: issues } = await supabase.from("issues").select("id, cycle_id, column_id").eq("cycle_id", cycleId);
  const { data: columns } = await supabase.from("project_columns").select("id, state_type").eq("project_id", project.id);
  const stateByColumn = new Map((columns ?? []).map((c) => [c.id as number, c.state_type as StateType]));
  const mapped = (issues ?? []).map((i) => ({
    id: i.id as number,
    stateType: stateByColumn.get(i.column_id as number) ?? "unstarted",
    cycleId: (i.cycle_id as number | null) ?? null,
  }));
  const unfinished = mapped.filter((i) => shouldCarryIssue(i.stateType));
  if (unfinished.length && nextCycleId == null && !confirmEmpty) {
    redirect(
      `/projects/${key}/cycles?complete=${cycleId}&error=` +
        encodeURIComponent("存在未完成 Issue。请选择下一周期，或确认清空周期归属。"),
    );
  }
  const next = applyCycleCarry(mapped, nextCycleId);
  for (const issue of next) {
    if (issue.cycleId !== mapped.find((m) => m.id === issue.id)?.cycleId) {
      await supabase.from("issues").update({ cycle_id: issue.cycleId }).eq("id", issue.id);
    }
  }
  await supabase.from("cycles").update({ completed_at: new Date().toISOString() }).eq("id", cycleId);
  revalidateProject(key);
}

export async function completeSubtaskAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const issueId = Number(formData.get("issueId"));
  const returnSequence = String(formData.get("returnSequence") ?? "");
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  const supabase = await createClient();
  const { data: columns } = await supabase
    .from("project_columns")
    .select("id, state_type")
    .eq("project_id", project.id);
  const doneId = pickCompletedColumnId(
    (columns ?? []).map((c) => ({ id: c.id as number, stateType: c.state_type as StateType })),
  );
  if (doneId == null) {
    redirect(
      `/projects/${key}/issues/${returnSequence}?error=` + encodeURIComponent("没有 completed 状态列，无法标记完成"),
    );
  }
  const { data: sub } = await supabase
    .from("issues")
    .select("parent_id, column_id, completed_at")
    .eq("id", issueId)
    .eq("project_id", project.id)
    .maybeSingle();
  const enter = await planColumnEnter(supabase, project.id, doneId, {
    parent_id: sub?.parent_id ?? null,
    column_id: sub?.column_id,
  });
  if (!enter.wip.ok) {
    redirect(`/projects/${key}/issues/${returnSequence}?error=` + encodeURIComponent(enter.wip.error));
  }
  const fromCompleted = await columnIsCompleted(supabase, project.id, sub?.column_id);
  const patch: { column_id: number; assignee_id?: string; completed_at: string | null } = {
    column_id: doneId,
    completed_at: completedAtOnColumnChange({
      fromCompleted,
      toCompleted: true,
      nowIso: new Date().toISOString(),
      existing: sub?.completed_at ?? null,
    }),
  };
  if (enter.assigneeId) patch.assignee_id = enter.assigneeId;
  const { error } = await supabase
    .from("issues")
    .update(patch)
    .eq("id", issueId)
    .eq("project_id", project.id);
  if (error) {
    redirect(`/projects/${key}/issues/${returnSequence}?error=` + encodeURIComponent("没有权限"));
  }
  revalidateProject(key);
  revalidatePath(`/projects/${key}/issues/${returnSequence}`);
}

export async function deleteIssueAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const sequence = Number(formData.get("sequence"));
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  const supabase = await createClient();
  const { data: issue } = await supabase
    .from("issues")
    .select("id")
    .eq("project_id", project.id)
    .eq("sequence_number", sequence)
    .single();
  if (!issue) redirect(`/projects/${key}`);
  const { error } = await supabase.from("issues").delete().eq("id", issue.id).eq("project_id", project.id);
  if (error) {
    redirect(`/projects/${key}/issues/${sequence}?error=` + encodeURIComponent("没有权限"));
  }
  revalidateProject(key);
  redirect(`/projects/${key}`);
}

export async function deleteProjectAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  if (!canManageMembers(await getMyRole(project.id))) {
    redirect(`/projects/${key}/settings?error=` + encodeURIComponent("只有所有者可以删除项目"));
  }
  const supabase = await createClient();
  const { error: issueErr } = await supabase.from("issues").delete().eq("project_id", project.id);
  if (issueErr) {
    redirect(`/projects/${key}/settings?error=` + encodeURIComponent("没有权限"));
  }
  const { error } = await supabase.from("projects").delete().eq("id", project.id);
  if (error) {
    redirect(`/projects/${key}/settings?error=` + encodeURIComponent("没有权限"));
  }
  revalidatePath("/projects");
  redirect("/projects");
}

export async function renameColumnAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const columnId = Number(formData.get("columnId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const wipParsed = parseWipLimit(String(formData.get("wipLimit") ?? ""));
  if (!wipParsed.ok) {
    redirect(`/projects/${key}/settings?error=` + encodeURIComponent(wipParsed.error));
  }
  const autoAssignId = String(formData.get("autoAssignId") ?? "") || null;
  const project = await getOwnedProject(key);
  if (!project) return;
  if (autoAssignId) {
    const members = await listMembers(project.id);
    try {
      assertAssigneeIsMember(
        autoAssignId,
        members.map((m) => m.user_id),
      );
    } catch (e) {
      redirect(`/projects/${key}/settings?error=` + encodeURIComponent((e as Error).message));
    }
  }
  const supabase = await createClient();
  await supabase
    .from("project_columns")
    .update({
      name,
      state_type: String(formData.get("stateType") ?? "unstarted"),
      wip_limit: wipParsed.value,
      auto_assign_id: autoAssignId,
    })
    .eq("id", columnId)
    .eq("project_id", project.id);
  revalidateProject(key);
}

export async function updateProjectDescriptionAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const description = String(formData.get("description") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const project = await getOwnedProject(key);
  if (!project || !name) return;
  const supabase = await createClient();
  await supabase.from("projects").update({ name, description }).eq("id", project.id);
  revalidateProject(key);
}

export async function inviteMemberAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const email = normalizeInviteEmail(String(formData.get("email") ?? ""));
  const role = String(formData.get("role") ?? "member") === "owner" ? "owner" : "member";
  if (!email) redirect(`/projects/${key}/members?error=` + encodeURIComponent("请填写邮箱"));
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  const roleMine = await getMyRole(project.id);
  if (!canManageMembers(roleMine)) {
    redirect(`/projects/${key}/members?error=` + encodeURIComponent("只有所有者可以邀请"));
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("project_invites").insert({
    project_id: project.id,
    email,
    role,
    invited_by: user?.id ?? null,
  });
  if (error) {
    redirect(`/projects/${key}/members?error=` + encodeURIComponent("邀请失败（可能已有待处理邀请）"));
  }
  revalidatePath(`/projects/${key}/members`);
}

export async function revokeInviteAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const inviteId = Number(formData.get("inviteId"));
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  if (!canManageMembers(await getMyRole(project.id))) {
    redirect(`/projects/${key}/members?error=` + encodeURIComponent("没有权限"));
  }
  const supabase = await createClient();
  await supabase.from("project_invites").update({ status: "revoked" }).eq("id", inviteId).eq("project_id", project.id);
  revalidatePath(`/projects/${key}/members`);
}

export async function removeMemberAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  if (!canManageMembers(await getMyRole(project.id))) {
    redirect(`/projects/${key}/members?error=` + encodeURIComponent("没有权限"));
  }
  const members = await listMembers(project.id);
  const target = members.find((m) => m.user_id === userId);
  if (target?.role === "owner" && members.filter((m) => m.role === "owner").length <= 1) {
    redirect(`/projects/${key}/members?error=` + encodeURIComponent("不能移除最后一位所有者"));
  }
  const supabase = await createClient();
  await supabase.from("project_members").delete().eq("project_id", project.id).eq("user_id", userId);
  revalidatePath(`/projects/${key}/members`);
  revalidateProject(key);
}

export async function acceptInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  const { data: invite } = await supabase.from("project_invites").select("*").eq("token", token).maybeSingle();
  if (!invite) redirect("/projects?error=" + encodeURIComponent("邀请不存在"));
  const allowed = canAcceptInvite({
    status: invite.status,
    inviteEmail: invite.email,
    userEmail: user.email,
  });
  if (!allowed.ok) {
    redirect(`/invite/${token}?error=` + encodeURIComponent(allowed.error));
  }
  const { error: memErr } = await supabase.from("project_members").insert({
    project_id: invite.project_id,
    user_id: user.id,
    role: invite.role,
    email: user.email ?? invite.email,
  });
  if (memErr && memErr.code !== "23505") {
    redirect(`/invite/${token}?error=` + encodeURIComponent("加入失败"));
  }
  await supabase.from("project_invites").update({ status: "accepted" }).eq("id", invite.id);
  const { data: project } = await supabase.from("projects").select("key").eq("id", invite.project_id).single();
  redirect(project?.key ? `/projects/${project.key}` : "/projects");
}

export async function saveViewAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const kindParsed = parseViewKind(String(formData.get("kind") ?? ""));
  const nameParsed = parseViewName(String(formData.get("name") ?? ""));
  if (!kindParsed.ok) {
    redirect(`/projects/${key}?error=` + encodeURIComponent(kindParsed.error));
  }
  if (!nameParsed.ok) {
    redirect(`${kindPath(key, kindParsed.value)}?error=` + encodeURIComponent(nameParsed.error));
  }
  const query = parseIssueQuery({
    cycle: String(formData.get("cycle") ?? "") || undefined,
    type: String(formData.get("type") ?? "") || undefined,
    priority: String(formData.get("priority") ?? "") || undefined,
    assignee: String(formData.get("assignee") ?? "") || undefined,
    group: String(formData.get("group") ?? "") || undefined,
    fields: String(formData.get("fields") ?? "") || undefined,
  });
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { count } = await supabase
    .from("saved_views")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);
  const { error } = await supabase.from("saved_views").insert({
    project_id: project.id,
    name: nameParsed.value,
    kind: kindParsed.value,
    spec: specFromQuery(query),
    position: count ?? 0,
    created_by: user?.id ?? null,
  });
  if (error) {
    const msg = error.code === "23505" ? "视图名称已存在" : "保存视图失败";
    redirect(`${kindPath(key, kindParsed.value)}?error=` + encodeURIComponent(msg));
  }
  revalidateProject(key);
  redirect(kindPath(key, kindParsed.value) + querySuffix(query));
}

export async function deleteSavedViewAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const viewId = Number(formData.get("viewId"));
  const project = await getOwnedProject(key);
  if (!project) return;
  const supabase = await createClient();
  await supabase.from("saved_views").delete().eq("id", viewId).eq("project_id", project.id);
  revalidateProject(key);
}

function kindPath(key: string, kind: "kanban" | "table" | "timeline" | "calendar") {
  if (kind === "kanban") return `/projects/${key}`;
  return `/projects/${key}/${kind}`;
}

function querySuffix(query: ReturnType<typeof parseIssueQuery>) {
  const q = specFromQuery(query);
  const s = new URLSearchParams(q).toString();
  return s ? `?${s}` : "";
}

export async function createInitiativeAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const nameParsed = parseInitiativeName(String(formData.get("name") ?? ""));
  const statusParsed = parseInitiativeStatus(String(formData.get("status") ?? "planned"));
  if (!nameParsed.ok) {
    redirect(`/projects/${key}/initiatives?error=` + encodeURIComponent(nameParsed.error));
  }
  if (!statusParsed.ok) {
    redirect(`/projects/${key}/initiatives?error=` + encodeURIComponent(statusParsed.error));
  }
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  const supabase = await createClient();
  const { error } = await supabase.from("initiatives").insert({
    project_id: project.id,
    name: nameParsed.value,
    description: String(formData.get("description") ?? "").trim(),
    status: statusParsed.value,
    target_date: String(formData.get("targetDate") ?? "") || null,
  });
  if (error) {
    const msg = error.code === "23505" ? "主题名称已存在" : "创建主题失败";
    redirect(`/projects/${key}/initiatives?error=` + encodeURIComponent(msg));
  }
  revalidateProject(key);
}

export async function updateInitiativeAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const id = Number(formData.get("initiativeId"));
  const nameParsed = parseInitiativeName(String(formData.get("name") ?? ""));
  const statusParsed = parseInitiativeStatus(String(formData.get("status") ?? "planned"));
  if (!nameParsed.ok) {
    redirect(`/projects/${key}/initiatives?error=` + encodeURIComponent(nameParsed.error));
  }
  if (!statusParsed.ok) {
    redirect(`/projects/${key}/initiatives?error=` + encodeURIComponent(statusParsed.error));
  }
  const project = await getOwnedProject(key);
  if (!project) redirect("/projects");
  const supabase = await createClient();
  const { error } = await supabase
    .from("initiatives")
    .update({
      name: nameParsed.value,
      description: String(formData.get("description") ?? "").trim(),
      status: statusParsed.value,
      target_date: String(formData.get("targetDate") ?? "") || null,
    })
    .eq("id", id)
    .eq("project_id", project.id);
  if (error) {
    const msg = error.code === "23505" ? "主题名称已存在" : "保存失败";
    redirect(`/projects/${key}/initiatives?error=` + encodeURIComponent(msg));
  }
  revalidateProject(key);
}

export async function deleteInitiativeAction(formData: FormData) {
  const key = String(formData.get("projectKey") ?? "");
  const id = Number(formData.get("initiativeId"));
  const project = await getOwnedProject(key);
  if (!project) return;
  const supabase = await createClient();
  await supabase.from("initiatives").delete().eq("id", id).eq("project_id", project.id);
  revalidateProject(key);
}
