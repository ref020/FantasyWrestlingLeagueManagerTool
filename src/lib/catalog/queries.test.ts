import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn(), result: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, from: mocks.from }) }));
import { getSeasonCatalog } from "./queries";

const builder = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), not: vi.fn(), order: vi.fn(), range: mocks.result };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: "ordinary-user" } }, error: null });
  mocks.from.mockReturnValue(builder);
  for (const fn of [builder.select, builder.eq, builder.is, builder.not, builder.order]) fn.mockReturnValue(builder);
  mocks.result.mockResolvedValue({ data: [], error: null });
});
describe("catalog query boundary (mocked, not RLS proof)", () => {
  it("rejects invalid years and pagination before accessing Supabase", async () => {
    for (const args of [[1899, 0], [2026, -1], [2026, 1.5], [2026, Number.MAX_SAFE_INTEGER], [NaN, 0]]) expect((await getSeasonCatalog(args[0], args[1])).error).toBe("invalid-query");
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("requires an authenticated caller", async () => {
    mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
    expect((await getSeasonCatalog(2026)).error).toBe("unavailable");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("reads only current approved roster rows with pagination and parent RLS", async () => {
    expect(await getSeasonCatalog(2026, 100)).toEqual({ entries: [], error: null });
    expect(builder.eq.mock.calls).toEqual([["season_start_year", 2026], ["is_approved", true], ["roster_status", "rostered"], ["wrestling_school_seasons.classification", "ncaa_di_men"]]);
    expect(builder.not).toHaveBeenCalledWith("last_verified_at", "is", null);
    expect(builder.is).toHaveBeenCalledWith("superseded_at", null);
    expect(builder.select.mock.calls[0][0]).toContain("wrestlers!inner");
    expect(builder.select.mock.calls[0][0]).not.toContain("evidence_id");
    expect(mocks.result).toHaveBeenCalledWith(100, 199);
  });
  it("preserves NULL weight and distinct canonical identity in a minimal DTO", async () => {
    mocks.result.mockResolvedValue({ data: [{ id: "aff", primary_weight: null, wrestlers: { id: "person" }, wrestling_school_seasons: { wrestling_schools: { id: "school" } } }], error: null });
    expect((await getSeasonCatalog(2026)).entries).toEqual([{ affiliation: { id: "aff", primary_weight: null }, wrestler: { id: "person" }, school: { id: "school" } }]);
  });
  it("does not leak raw database or network errors", async () => {
    mocks.result.mockResolvedValue({ data: null, error: { message: "private diagnostic" } });
    expect(await getSeasonCatalog(2026)).toEqual({ entries: [], error: "unavailable" });
    mocks.auth.mockRejectedValue(new Error("network detail"));
    expect(await getSeasonCatalog(2026)).toEqual({ entries: [], error: "unavailable" });
  });
});
