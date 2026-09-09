import type { StateType } from "@/lib/columns";

export type Project = {
  id: number;
  owner_id: string;
  key: string;
  name: string;
  description: string;
  next_sequence: number;
};

export type ProjectColumn = {
  id: number;
  project_id: number;
  name: string;
  state_type: StateType;
  position: number;
  wip_limit: number | null;
  auto_assign_id: string | null;
};

export type Label = {
  id: number;
  project_id: number;
  name: string;
  color: string;
};

export type Cycle = {
  id: number;
  project_id: number;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  completed_at: string | null;
};

export type Initiative = {
  id: number;
  project_id: number;
  name: string;
  description: string;
  status: "planned" | "active" | "done";
  target_date: string | null;
};

export type IssueType = {
  id: number;
  project_id: number;
  name: string;
  color: string;
  position: number;
};

export type Priority = "p0" | "p1" | "p2" | "p3" | null;

export type Issue = {
  id: number;
  project_id: number;
  sequence_number: number;
  column_id: number;
  parent_id: number | null;
  cycle_id: number | null;
  initiative_id: number | null;
  assignee_id: string | null;
  type_id: number | null;
  priority: Priority;
  estimate_points: number | null;
  estimate_minutes: number | null;
  title: string;
  description: string;
  start_date: string | null;
  due_date: string | null;
  position: number;
  created_at?: string;
  completed_at: string | null;
};

export type IssueComment = {
  id: number;
  issue_id: number;
  author_id: string;
  parent_id: number | null;
  body: string;
  created_at: string;
};

export type ChecklistItem = {
  id: number;
  issue_id: number;
  title: string;
  done: boolean;
  position: number;
};

export type IssueLink = {
  id: number;
  source_id: number;
  target_id: number;
  link_type: "blocks" | "relates" | "duplicates";
};

export type IssueWithLabels = Issue & {
  labels: Label[];
  checklistDone: number;
  checklistTotal: number;
};

export type ProjectMember = {
  project_id: number;
  user_id: string;
  role: "owner" | "member";
  email: string;
  created_at: string;
};

export type ProjectInvite = {
  id: number;
  project_id: number;
  email: string;
  role: "owner" | "member";
  token: string;
  status: "pending" | "accepted" | "revoked";
  invited_by: string | null;
  created_at: string;
};

export type SavedView = {
  id: number;
  project_id: number;
  name: string;
  kind: "kanban" | "table" | "timeline" | "calendar";
  spec: Record<string, string>;
  position: number;
};
