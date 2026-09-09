import { describe, expect, it } from "vitest";
import {
  assertCanReplyComment,
  extractMentionTokens,
  nestComments,
  resolveMentions,
  splitMentionedBody,
} from "./comments";

describe("extractMentionTokens", () => {
  it("finds local and full-email mentions", () => {
    expect(extractMentionTokens("请看 @Ada 和 @bob@ex.com")).toEqual(["ada", "bob@ex.com"]);
  });
  it("dedupes case-insensitively", () => {
    expect(extractMentionTokens("@Ada @ada")).toEqual(["ada"]);
  });
});

describe("resolveMentions", () => {
  const members = [
    { user_id: "u1", email: "ada@ex.com" },
    { user_id: "u2", email: "bob@ex.com" },
  ];
  it("matches local part and full email", () => {
    expect(resolveMentions(["ada", "bob@ex.com"], members).map((m) => m.user_id)).toEqual(["u1", "u2"]);
  });
  it("ignores unknown tokens", () => {
    expect(resolveMentions(["nobody"], members)).toEqual([]);
  });
});

describe("assertCanReplyComment", () => {
  it("allows reply to a root comment", () => {
    expect(() => assertCanReplyComment({ parentId: 1, parentHasParent: false })).not.toThrow();
  });
  it("rejects reply to a reply", () => {
    expect(() => assertCanReplyComment({ parentId: 2, parentHasParent: true })).toThrow(/一层/);
  });
});

describe("nestComments", () => {
  it("groups one-level replies under roots", () => {
    const nested = nestComments([
      { id: 1, parent_id: null },
      { id: 2, parent_id: 1 },
      { id: 3, parent_id: null },
    ]);
    expect(nested.map((c) => c.id)).toEqual([1, 3]);
    expect(nested[0].replies.map((c) => c.id)).toEqual([2]);
  });
});

describe("splitMentionedBody", () => {
  it("wraps matched tokens", () => {
    const parts = splitMentionedBody("hi @Ada thanks", ["ada"]);
    expect(parts).toEqual([
      { mention: false, text: "hi " },
      { mention: true, text: "@Ada" },
      { mention: false, text: " thanks" },
    ]);
  });
});

