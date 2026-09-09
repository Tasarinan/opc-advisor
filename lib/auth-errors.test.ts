import { describe, expect, it } from "vitest";
import { mapAuthError } from "./auth-errors";

describe("mapAuthError", () => {
  it("maps rate limit", () => {
    expect(mapAuthError({ message: "email rate limit exceeded", code: "over_email_send_rate_limit" })).toMatch(
      /频繁/,
    );
  });

  it("maps already registered", () => {
    expect(mapAuthError({ message: "User already registered" })).toBe("该邮箱已注册，请直接登录");
  });

  it("maps fetch failed", () => {
    expect(mapAuthError({ message: "fetch failed" })).toMatch(/连不上数据库/);
  });
});
