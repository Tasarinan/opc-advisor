import { describe, expect, it } from "vitest";
import {
  assertAssigneeIsMember,
  canAcceptInvite,
  canManageMembers,
  normalizeInviteEmail,
} from "./membership";

describe("normalizeInviteEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeInviteEmail("  Ada@Example.COM ")).toBe("ada@example.com");
  });
});

describe("canAcceptInvite", () => {
  it("accepts pending invite for the same email", () => {
    expect(
      canAcceptInvite({
        status: "pending",
        inviteEmail: "ada@example.com",
        userEmail: "Ada@example.com",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects wrong email or accepted invite", () => {
    expect(
      canAcceptInvite({ status: "pending", inviteEmail: "a@x.com", userEmail: "b@x.com" }),
    ).toMatchObject({ ok: false });
    expect(
      canAcceptInvite({ status: "accepted", inviteEmail: "a@x.com", userEmail: "a@x.com" }),
    ).toMatchObject({ ok: false });
  });
});

describe("canManageMembers", () => {
  it("only owners manage", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("member")).toBe(false);
  });
});

describe("assertAssigneeIsMember", () => {
  it("allows empty assignee", () => {
    expect(() => assertAssigneeIsMember(null, ["u1"])).not.toThrow();
  });
  it("rejects outsiders", () => {
    expect(() => assertAssigneeIsMember("u2", ["u1"])).toThrow(/成员/);
  });
});
