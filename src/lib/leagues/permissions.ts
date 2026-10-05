import type { LeagueRole } from "@/types/league";

export function memberManagementControls(
  actorRole: LeagueRole,
  actorId: string,
  targetId: string,
  targetRole: LeagueRole,
  commissionerCount: number,
) {
  const canManageTarget = actorRole === "commissioner" && actorId !== targetId;

  return {
    canChangeRole: canManageTarget && !(targetRole === "commissioner" && commissionerCount <= 1),
    canRemove: canManageTarget && targetRole === "member",
  };
}