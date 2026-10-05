"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeInviteCode, normalizeLeagueId, normalizeLeagueName } from "@/lib/leagues/validation";

type RpcError = { code?: string; message: string };

function errorKey(error: RpcError): string {
  if (error.message.includes("invalid_invite_code")) return "invite";
  if (error.message.includes("invalid_league_name")) return "invalid-name";
  if (error.code === "22023") return "invalid";
  if (error.message.includes("final_commissioner_required") || error.code === "23514") return "final-commissioner";
  if (error.message.includes("not_authorized") || error.code === "42501") return "unauthorized";
  if (error.message.includes("already")) return "already-member";
  return "database";
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");
  return supabase;
}

function leaguePath(leagueId: string, section = "") {
  return `/leagues/${leagueId}${section ? `/${section}` : ""}`;
}

export async function createLeagueAction(formData: FormData): Promise<void> {
  const name = normalizeLeagueName(String(formData.get("name") ?? ""));
  if (!name) redirect("/leagues/new?error=invalid-name");

  const supabase = await requireUser();
  let destination = "/leagues/new?error=database";
  try {
    const { data, error } = await supabase.rpc("create_league", { p_name: name });
    destination = error || !data ? `/leagues/new?error=${error ? errorKey(error) : "database"}` : leaguePath(data);
  } catch {
    destination = "/leagues/new?error=database";
  }
  redirect(destination);
}

export async function joinLeagueAction(formData: FormData): Promise<void> {
  const inviteCode = normalizeInviteCode(String(formData.get("inviteCode") ?? ""));
  if (!inviteCode) redirect("/leagues/join?error=invalid-code");

  const supabase = await requireUser();
  let destination = "/leagues/join?error=database";
  try {
    const { data, error } = await supabase.rpc("join_league", { p_invite_code: inviteCode });
    destination = error || !data?.[0]
      ? `/leagues/join?error=${error ? errorKey(error) : "invite"}`
      : `${leaguePath(data[0].league_id)}${data[0].already_member ? "?notice=already-member" : ""}`;
  } catch {
    destination = "/leagues/join?error=database";
  }
  redirect(destination);
}

export async function regenerateInviteAction(formData: FormData): Promise<void> {
  const leagueId = normalizeLeagueId(String(formData.get("leagueId") ?? ""));
  if (!leagueId) redirect("/dashboard?error=invalid-league");

  const supabase = await requireUser();
  let destination = `${leaguePath(leagueId, "settings")}?error=database`;
  try {
    const { error } = await supabase.rpc("regenerate_league_invite_code", { p_league_id: leagueId });
    destination = error
      ? `${leaguePath(leagueId, "settings")}?error=${errorKey(error)}`
      : `${leaguePath(leagueId, "settings")}?notice=invite-regenerated`;
  } catch {
    destination = `${leaguePath(leagueId, "settings")}?error=database`;
  }
  redirect(destination);
}

export async function changeMemberRoleAction(formData: FormData): Promise<void> {
  const leagueId = normalizeLeagueId(String(formData.get("leagueId") ?? ""));
  const userId = normalizeLeagueId(String(formData.get("userId") ?? ""));
  const role = String(formData.get("role") ?? "");
  if (!leagueId || !userId || (role !== "member" && role !== "commissioner")) redirect("/dashboard?error=invalid-league");

  const supabase = await requireUser();
  let destination = `${leaguePath(leagueId, "members")}?error=database`;
  try {
    const { error } = await supabase.rpc("change_league_member_role", {
      p_league_id: leagueId,
      p_user_id: userId,
      p_role: role,
    });
    destination = error
      ? `${leaguePath(leagueId, "members")}?error=${errorKey(error)}`
      : `${leaguePath(leagueId, "members")}?notice=role-updated`;
  } catch {
    destination = `${leaguePath(leagueId, "members")}?error=database`;
  }
  redirect(destination);
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const leagueId = normalizeLeagueId(String(formData.get("leagueId") ?? ""));
  const userId = normalizeLeagueId(String(formData.get("userId") ?? ""));
  if (!leagueId || !userId) redirect("/dashboard?error=invalid-league");

  const supabase = await requireUser();
  let destination = `${leaguePath(leagueId, "members")}?error=database`;
  try {
    const { error } = await supabase.rpc("remove_league_member", { p_league_id: leagueId, p_user_id: userId });
    destination = error
      ? `${leaguePath(leagueId, "members")}?error=${errorKey(error)}`
      : `${leaguePath(leagueId, "members")}?notice=member-removed`;
  } catch {
    destination = `${leaguePath(leagueId, "members")}?error=database`;
  }
  redirect(destination);
}

export async function leaveLeagueAction(formData: FormData): Promise<void> {
  const leagueId = normalizeLeagueId(String(formData.get("leagueId") ?? ""));
  if (!leagueId) redirect("/dashboard?error=invalid-league");

  const supabase = await requireUser();
  let destination = `${leaguePath(leagueId, "settings")}?error=database`;
  try {
    const { error } = await supabase.rpc("leave_league", { p_league_id: leagueId });
    destination = error
      ? `${leaguePath(leagueId, "settings")}?error=${errorKey(error)}`
      : "/dashboard?notice=left-league";
  } catch {
    destination = `${leaguePath(leagueId, "settings")}?error=database`;
  }
  redirect(destination);
}