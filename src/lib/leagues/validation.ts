const LEAGUE_NAME_PATTERN = /^[\p{L}\p{N} .,'&()!:_+-]+$/u;
const LEAGUE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INVITE_CODE_PATTERN = /^[A-HJ-NP-R]{20}$/;

export function normalizeLeagueName(value: string): string | null {
  const name = value.trim();

  const characterCount = Array.from(name).length;
  if (characterCount < 3 || characterCount > 50 || /[\u0000-\u001f\u007f-\u009f]/u.test(name)) {
    return null;
  }

  return LEAGUE_NAME_PATTERN.test(name) ? name : null;
}

export function normalizeInviteCode(value: string): string | null {
  const code = value.replace(/[\s-]/g, "").toUpperCase();
  return INVITE_CODE_PATTERN.test(code) ? code : null;
}

export function normalizeLeagueId(value: string): string | null {
  return LEAGUE_ID_PATTERN.test(value) ? value.toLowerCase() : null;
}