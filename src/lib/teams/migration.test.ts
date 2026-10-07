import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeTeamName } from "./validation";

const directory = resolve("supabase/migrations");
const file = "202610070001_league_seasons_and_fantasy_teams.sql";
const read = (name: string) => readFileSync(resolve(directory, name), "utf8").replace(/\r\n/g, "\n");
const sql = read(file);
const body = (name: string) => sql.match(new RegExp(`create function public\\.${name}\\([\\s\\S]*?\\$\\$;`))?.[0] ?? "";

// These checks inspect SQL source, not PostgreSQL execution, concurrency, or RLS.
describe("Milestone 4A migration source contracts", () => {
  it("is additive and preserves every applied migration", () => {
    const history = {
      "202609290001_profiles.sql": "008a1eb2ffce6195a1e78b4988b03a1aedaff1f026a32516a75a95079f000fe6",
      "202609290002_leagues.sql": "3dab69831e2d324f26855602572921618eb4eb3af9b153e69b0ac2b384279b4d",
      "202610050001_fix_league_migration.sql": "0c45d94f864eedfd1f2bedfc8020f513f717475961115d2734b250b549137c45",
      "202610050002_fix_join_league_conflict.sql": "996e30698c8e80ee4931c8a56d81edf80de2721c04a81fb36d3082be1da2618d",
    };
    for (const [name, hash] of Object.entries(history)) {
      expect(createHash("sha256").update(read(name)).digest("hex")).toBe(hash);
    }
    expect(readdirSync(directory).filter(n => n.endsWith(".sql")).sort()).toEqual([...Object.keys(history), file]);
  });
  it("does not invent existing season years or alter prior membership/invite behavior", () => {
    expect(sql).toContain("add column season_start_year integer,");
    expect(sql).toContain("add column is_active boolean not null default true");
    expect(sql).toContain("season_start_year between 1900 and 9998");
    expect(sql).not.toMatch(/create table public\.(seasons|rosters|wrestlers|schools)/);
    expect(sql).not.toMatch(/(?:update|delete from|alter table) public\.(league_members|league_invite_codes)/);
  });
  it("requires a season for new leagues without exposing the legacy creation overload", () => {
    expect(body("create_league")).toContain("p_season_start_year is null");
    expect(body("create_league")).toContain("public.create_league(p_name)");
    expect(sql).toContain("revoke all on function public.create_league(text) from public, anon, authenticated;");
    expect(body("update_league_season_settings")).toContain("private.is_league_commissioner(p_league_id)");
    expect(body("update_league_season_settings")).toContain("current_season <> p_season_start_year");
  });
  it("retains user-owned teams independently of membership and restricts destructive deletion", () => {
    expect(sql).toContain("owner_user_id uuid not null references auth.users (id) on delete restrict");
    expect(sql).toContain("league_id uuid not null references public.leagues (id) on delete restrict");
    expect(sql).not.toContain("references public.league_members");
    expect(sql).toContain("unique (league_id, owner_user_id)");
    expect(body("create_fantasy_team")).toContain("on conflict on constraint fantasy_teams_one_owner_per_league do nothing");
    expect(body("create_fantasy_team")).toContain("errcode = '23505', message = 'team_already_exists'");
  });
  it.each(["create_fantasy_team", "rename_fantasy_team"])("enforces actor and league checks in %s", name => {
    const fn = body(name);
    expect(fn).toContain(`${name}(p_league_id uuid, p_name text)`);
    expect(fn).toContain("actor_id uuid := (select auth.uid())");
    expect(fn).toContain("if actor_id is null then");
    expect(fn).toContain("where l.id = p_league_id for update");
    expect(fn).toContain("not private.is_league_member(p_league_id)");
    expect(fn.indexOf("for update")).toBeLessThan(fn.indexOf("private.is_league_member"));
    expect(fn).toContain("if not league_active then");
    expect(fn).toContain("if league_season is null then");
    expect(fn).not.toContain("p_owner");
    expect(fn).not.toContain("is_league_commissioner");
  });
  it("creates for auth.uid and renames only the caller's own league team", () => {
    expect(body("create_fantasy_team")).toContain("values (p_league_id, actor_id, team_name)");
    expect(body("rename_fantasy_team")).toContain("where ft.league_id = p_league_id and ft.owner_user_id = actor_id");
  });
  it("keeps team reads member-scoped and writes confined to explicitly granted RPCs", () => {
    expect(sql).toContain("alter table public.fantasy_teams enable row level security");
    expect(sql).toContain("revoke all on table public.fantasy_teams from public, anon, authenticated");
    expect(sql).toContain("grant select on table public.fantasy_teams to authenticated");
    expect(sql).toContain("using ((select private.is_league_member(league_id)))");
    const signatures = ["create_league(text, integer)", "update_league_season_settings(uuid, boolean, integer)", "create_fantasy_team(uuid, text)", "rename_fantasy_team(uuid, text)"];
    for (const signature of signatures) {
      expect(sql).toContain(`alter function public.${signature} owner to postgres;`);
      expect(sql).toContain(`revoke all on function public.${signature} from public, anon;`);
      expect(sql).toContain(`grant execute on function public.${signature} to authenticated;`);
      expect(body(signature.split("(")[0])).toContain("security definer\nset search_path = ''");
    }
  });
  it("allows future lineage without cascading history or exposing a copying RPC", () => {
    expect(sql).toContain("copied_from_league_id uuid references public.leagues (id) on delete set null");
    expect(sql).toContain("check (copied_from_league_id <> id)");
    expect(body("create_league")).not.toContain("copied_from");
  });
  it("keeps application name validation aligned with the SQL ASCII constraint", () => {
    const pattern = sql.match(/name collate "C" !~ '((?:''|[^'])*)'/)?.[1].replace(/''/g, "'");
    expect(pattern).toBeDefined();
    const invalidCharacter = new RegExp(pattern!);
    for (const character of [...Array.from({ length: 128 }, (_, i) => String.fromCharCode(i)), "é", "🏆"]) {
      const value = `Mat${character}Team`;
      expect(normalizeTeamName(value) !== null).toBe(!invalidCharacter.test(value));
    }
    expect(sql.match(/team_name collate "C" ~ /g)).toHaveLength(2);
  });
});
