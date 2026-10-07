import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { createFantasyTeamAction, createLeagueAction, renameFantasyTeamAction, updateSeasonSettingsAction } from "./actions";

const leagueId = "a12b3456-7890-4abc-8def-1234567890ab";
function form(values: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ leagueId, name: "Mat Club", ...values })) data.set(key, value);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "current-user" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: leagueId, error: null });
});

// Application behavior with mocked auth/RPC calls, not hosted authorization tests.
describe("4A server actions", () => {
  it("requires an explicit valid season before creating a league", async () => {
    await expect(createLeagueAction(form())).rejects.toThrow("REDIRECT:/leagues/new?error=invalid_season");
    expect(mocks.rpc).not.toHaveBeenCalled();
    await expect(createLeagueAction(form({ seasonStartYear: "2026" }))).rejects.toThrow(`REDIRECT:/leagues/${leagueId}`);
    expect(mocks.rpc).toHaveBeenCalledWith("create_league", { p_name: "Mat Club", p_season_start_year: 2026 });
  });
  it.each([createFantasyTeamAction, renameFantasyTeamAction])("ignores forged owner/user/team IDs", async action => {
    await expect(action(form({ owner_user_id: "another-user", userId: "another-user", teamId: "another-team" })))
      .rejects.toThrow(`REDIRECT:/leagues/${leagueId}?notice=team-saved`);
    expect(mocks.rpc.mock.calls[0][1]).toEqual({ p_league_id: leagueId, p_name: "Mat Club" });
  });
  it("does not call RPCs without a verified session and preserves the return path", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(createFantasyTeamAction(form())).rejects.toThrow(`REDIRECT:/login?next=${encodeURIComponent(`/leagues/${leagueId}`)}`);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects invalid names before calling a team RPC", async () => {
    await expect(createFantasyTeamAction(form({ name: "Bad\nName" }))).rejects.toThrow("error=invalid_team_name");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("maps a second-team rejection without leaking the database response", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "23505", message: "team_already_exists" } });
    await expect(createFantasyTeamAction(form())).rejects.toThrow("error=team_already_exists");
  });
  it("keeps unexpected backend errors out of the redirect", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "XX000", message: "internal database details" } });
    await expect(renameFantasyTeamAction(form())).rejects.toThrow(`REDIRECT:/leagues/${leagueId}?error=database`);
  });
  it("handles connection failures with a friendly error destination", async () => {
    mocks.getUser.mockRejectedValue(new Error("network details"));
    await expect(createFantasyTeamAction(form())).rejects.toThrow(`REDIRECT:/leagues/${leagueId}?error=database`);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("submits activity and optional legacy season without actor identity", async () => {
    await expect(updateSeasonSettingsAction(form({ activity: "inactive" }))).rejects.toThrow("notice=season-updated");
    expect(mocks.rpc).toHaveBeenCalledWith("update_league_season_settings", { p_league_id: leagueId, p_is_active: false, p_season_start_year: null });
  });
  it("rejects forged activity values", async () => {
    await expect(updateSeasonSettingsAction(form({ activity: "false" }))).rejects.toThrow("error=invalid_season");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
