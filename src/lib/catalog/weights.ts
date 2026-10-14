export const WRESTLING_WEIGHTS = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285] as const;
export type WrestlingWeight = typeof WRESTLING_WEIGHTS[number];

export function isWrestlingWeight(value: unknown): value is WrestlingWeight {
  return typeof value === "number" && WRESTLING_WEIGHTS.some(weight => weight === value);
}

export function formatWrestlingWeight(value: WrestlingWeight | null): string {
  return value === null ? "Weight not established" : `${value} lb`;
}
