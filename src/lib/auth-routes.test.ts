import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./auth-routes";

describe("safeReturnPath", () => {
  it("allows a known protected application destination", () => {
    expect(safeReturnPath("/my-team?week=2")).toBe("/my-team?week=2");
    expect(safeReturnPath("/leagues/a12b3456-7890-4abc-8def-1234567890ab/members")).toBe("/leagues/a12b3456-7890-4abc-8def-1234567890ab/members");
  });

  it.each(["https://example.com", "//example.com", "/login", "/unknown", ""]) (
    "falls back for unsafe or unsupported destinations %j",
    (destination) => {
      expect(safeReturnPath(destination)).toBe("/dashboard");
    },
  );
});