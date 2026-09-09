import { describe, expect, it } from "vitest";
import {
  describeLink,
  normalizeLinkEndpoints,
  parseIssueRef,
  parseLinkType,
} from "./issue-links";

describe("parseLinkType", () => {
  it("accepts blocks, relates, duplicates", () => {
    expect(parseLinkType("blocks")).toEqual({ ok: true, value: "blocks" });
    expect(parseLinkType("relates")).toEqual({ ok: true, value: "relates" });
    expect(parseLinkType("duplicates")).toEqual({ ok: true, value: "duplicates" });
  });
  it("rejects unknown", () => {
    expect(parseLinkType("parent")).toMatchObject({ ok: false });
  });
});

describe("parseIssueRef", () => {
  it("parses sequence or KEY-n", () => {
    expect(parseIssueRef("12", "OPC")).toEqual({ ok: true, sequence: 12 });
    expect(parseIssueRef("OPC-3", "OPC")).toEqual({ ok: true, sequence: 3 });
    expect(parseIssueRef("opc-3", "OPC")).toEqual({ ok: true, sequence: 3 });
  });
  it("rejects empty, other project key, and non-positive", () => {
    expect(parseIssueRef("", "OPC")).toMatchObject({ ok: false });
    expect(parseIssueRef("ABC-1", "OPC")).toMatchObject({ ok: false });
    expect(parseIssueRef("0", "OPC")).toMatchObject({ ok: false });
  });
});

describe("normalizeLinkEndpoints", () => {
  it("orders relates by id", () => {
    expect(normalizeLinkEndpoints("relates", 9, 2)).toEqual({ sourceId: 2, targetId: 9 });
  });
  it("keeps blocks directed", () => {
    expect(normalizeLinkEndpoints("blocks", 9, 2)).toEqual({ sourceId: 9, targetId: 2 });
  });
});

describe("describeLink", () => {
  it("labels outgoing blocks vs incoming blocked-by", () => {
    expect(describeLink({ id: 1, source_id: 10, target_id: 20, link_type: "blocks" }, 10)).toMatchObject({
      outgoing: true,
      otherId: 20,
      label: "阻塞",
    });
    expect(describeLink({ id: 1, source_id: 10, target_id: 20, link_type: "blocks" }, 20)).toMatchObject({
      outgoing: false,
      otherId: 10,
      label: "被阻塞",
    });
  });
});
