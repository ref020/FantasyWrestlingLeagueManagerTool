import { describe, expect, it } from "vitest";
import { memberManagementControls } from "./permissions";

describe("memberManagementControls presentation rules", () => {
  it("allows commissioners to promote and remove ordinary members", () => {
    expect(memberManagementControls("commissioner", "a", "b", "member", 1)).toEqual({
      canChangeRole: true,
      canRemove: true,
    });
  });

  it("allows a commissioner to demote another commissioner while one remains", () => {
    expect(memberManagementControls("commissioner", "a", "b", "commissioner", 2)).toEqual({
      canChangeRole: true,
      canRemove: false,
    });
  });

  it("hides demotion of the final commissioner and all self-management controls", () => {
    expect(memberManagementControls("commissioner", "a", "b", "commissioner", 1).canChangeRole).toBe(false);
    expect(memberManagementControls("commissioner", "a", "a", "commissioner", 2)).toEqual({
      canChangeRole: false,
      canRemove: false,
    });
  });

  it("hides management controls from ordinary members", () => {
    expect(memberManagementControls("member", "b", "a", "member", 1)).toEqual({
      canChangeRole: false,
      canRemove: false,
    });
  });
});