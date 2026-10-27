import { describe, expect, it } from "vitest";
import { assertTestTarget } from "../../scripts/assert-test-target.mjs";

describe("TC-TARGET-001 local test target allowlist", () => {
  it.each([
    ["http://127.0.0.1:3100/", "http://127.0.0.1:3100/"],
    ["http://localhost:3100/", "http://localhost:3100/"],
  ])("accepts %s", (target, expected) => {
    expect(assertTestTarget(target)).toBe(expected);
  });
});

describe("TC-TARGET-001 unsafe test target rejection", () => {
  it.each([
    "https://stratadrive.example/",
    "http://localhost.evil.example:3100/",
    "http://192.168.1.20:3100/",
    "http://[::1]:3100/",
    "https://localhost:3100/",
    "ftp://localhost:3100/",
    "file:///tmp/test.html",
    "http://localhost:3000/",
    "http://localhost/",
    "http://user:password@localhost:3100/",
    "http://localhost:3100/?next=https://stratadrive.example/",
    "http://localhost:3100/?",
    "http://localhost:3100/#token",
    "http://localhost:3100/#",
    "http://localhost:3100/api",
    "http://127.0.0.1:3100/../",
    "http://127.1:3100/",
    " http://localhost:3100/",
    "http://localhost:3100/redirect?to=https://stratadrive.example/",
    "//localhost:3100/",
    "invalid-url",
    "",
  ])("rejects %s", (target) => {
    expect(() => assertTestTarget(target)).toThrow();
  });

  it.each<[string, unknown]>([
    ["undefined", undefined],
    ["null", null],
    ["a number", 3100],
    ["a URL object instead of explicit configuration", new URL("http://localhost:3100/")],
  ])("rejects %s", (_description, target) => {
    expect(() => assertTestTarget(target)).toThrow();
  });
});
