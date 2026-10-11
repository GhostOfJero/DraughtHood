import { describe, expect, it } from "vitest";
import { applyMove, createPositionState, getLegalMoves } from "../lib/game/engine";
import { buildMatchReport, formatDuration } from "../lib/game/stats";
import type { GameSession } from "../lib/game/storage";

const seed = (row: number, col: number, side: "player" | "opponent", king = false) => ({ row, col, side, king });

function sessionAfterOneMove(startedAt: number, from: { row: number; col: number }, to: { row: number; col: number }, pieces: ReturnType<typeof seed>[]): GameSession {
  const initial = createPositionState(pieces);
  const move = getLegalMoves(initial).find((candidate) => candidate.from.row === from.row && candidate.from.col === from.col && candidate.to.row === to.row && candidate.to.col === to.col);
  if (!move) throw new Error("Test move is not legal");
  return {
    game: applyMove(initial, move),
    history: [initial],
    mode: "classic",
    difficulty: "club",
    playerTurns: 1,
    startedAt,
  };
}

describe("per-match reports", () => {
  it("counts moves, captures, final seeds, and elapsed time", () => {
    const session = sessionAfterOneMove(
      1_000,
      { row: 5, col: 0 },
      { row: 3, col: 2 },
      [seed(5, 0, "player"), seed(4, 1, "opponent"), seed(0, 1, "opponent")],
    );
    const report = buildMatchReport(session, "win", 8_000);

    expect(report.outcome).toBe("win");
    expect(report.winner).toBe("player");
    expect(report.moves).toBe(1);
    expect(report.playerMoves).toBe(1);
    expect(report.opponentMoves).toBe(0);
    expect(report.capturesPlayer).toBe(1);
    expect(report.capturesOpponent).toBe(0);
    expect(report.remainingPlayer).toBe(1);
    expect(report.remainingOpponent).toBe(1);
    expect(report.elapsedSeconds).toBe(7);
  });

  it("counts a crown earned from promotion rather than an initial king", () => {
    const session = sessionAfterOneMove(
      5_000,
      { row: 1, col: 2 },
      { row: 0, col: 3 },
      [seed(1, 2, "player"), seed(6, 9, "opponent")],
    );
    const report = buildMatchReport(session, "win", 9_000);

    expect(report.crownsPlayer).toBe(1);
    expect(report.crownsOpponent).toBe(0);
    expect(report.elapsedSeconds).toBe(4);
  });

  it("formats short, minute-long, and unavailable durations", () => {
    expect(formatDuration(9)).toBe("9s");
    expect(formatDuration(125)).toBe("2m 05s");
    expect(formatDuration(null)).toBe("—");
  });
});
