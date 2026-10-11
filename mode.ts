import type { Side } from "./engine";

export type GameMode = "classic" | "challenge" | "local";

export function isHumanControlled(mode: GameMode, side: Side): boolean {
  return mode === "local" || side === "player";
}

export function nameForSide(mode: GameMode, side: Side): string {
  if (mode === "local") return side === "player" ? "Player 1" : "Player 2";
  return side === "player" ? "You" : "Eagle Bot";
}
