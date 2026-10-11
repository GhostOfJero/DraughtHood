import { describe, expect, it } from "vitest";
import { applyMove, countPieces, createInitialState, createPositionState, getLegalMoves, moveKey, type StartingPiece } from "../lib/game/engine";

const seed = (row: number, col: number, side: "player" | "opponent", king = false): StartingPiece => ({ row, col, side, king });

describe("Nigerian Draughts engine", () => {
  it("sets up twenty seeds per side on a 10×10 board", () => {
    const state = createInitialState();
    expect(state.board).toHaveLength(10);
    expect(state.board.flat()).toHaveLength(100);
    expect(countPieces(state.board, "player")).toBe(20);
    expect(countPieces(state.board, "opponent")).toBe(20);
    expect(getLegalMoves(state).length).toBeGreaterThan(0);
    expect(getLegalMoves(state).every((move) => !move.isCapture && move.to.row < move.from.row)).toBe(true);
  });

  it("makes captures compulsory and allows a seed to capture backward", () => {
    const state = createPositionState([
      seed(5, 4, "player"),
      seed(6, 5, "opponent"),
      seed(0, 1, "opponent"),
    ]);
    const moves = getLegalMoves(state);
    expect(moves.length).toBe(1);
    expect(moves[0].isCapture).toBe(true);
    expect(moves[0].to).toEqual({ row: 7, col: 6 });
    expect(moves[0].captured).toEqual([{ row: 6, col: 5 }]);
  });

  it("allows players to choose any capture route without a majority-capture requirement", () => {
    const state = createPositionState([
      seed(6, 1, "player"),
      seed(6, 5, "player"),
      seed(5, 2, "opponent"),
      seed(3, 4, "opponent"),
      seed(5, 6, "opponent"),
    ]);
    const moves = getLegalMoves(state);
    expect(moves.every((move) => move.isCapture)).toBe(true);
    expect(moves.some((move) => move.captured.length === 1)).toBe(true);
    expect(moves.some((move) => move.captured.length === 2)).toBe(true);
  });

  it("preserves distinct legal capture paths that end on the same square", () => {
    const state = createPositionState([
      seed(5, 4, "player", true),
      seed(4, 3, "opponent"),
      seed(6, 5, "opponent"),
    ]);
    const routes = getLegalMoves(state).filter((move) =>
      move.from.row === 5 && move.from.col === 4 && move.to.row === 3 && move.to.col === 2,
    );

    expect(routes.map((move) => move.captured.length)).toContain(1);
    expect(routes.map((move) => move.captured.length)).toContain(2);
    expect(new Set(routes.map(moveKey)).size).toBe(routes.length);
  });

  it("lets a king fly along open diagonals and capture at a distance", () => {
    const quiet = createPositionState([seed(5, 4, "player", true), seed(0, 1, "opponent")]);
    const moves = getLegalMoves(quiet);
    expect(moves.some((move) => move.to.row === 0 && move.to.col === 9)).toBe(true);
    expect(moves.some((move) => move.to.row === 9 && move.to.col === 0)).toBe(true);

    const capture = createPositionState([seed(5, 4, "player", true), seed(2, 1, "opponent")]);
    expect(getLegalMoves(capture).some((move) => move.isCapture && move.to.row === 1 && move.to.col === 0)).toBe(true);
  });

  it("crowns a seed when it reaches the far backline", () => {
    const state = createPositionState([seed(1, 2, "player"), seed(6, 9, "opponent")]);
    const move = getLegalMoves(state).find((candidate) => candidate.to.row === 0 && candidate.to.col === 3);
    expect(move).toBeDefined();
    const next = applyMove(state, move!);
    expect(next.board[0][3]?.king).toBe(true);
    expect(next.turn).toBe("opponent");
  });

  it("ends the game when the last opposing seed is captured", () => {
    const state = createPositionState([seed(2, 1, "player"), seed(1, 2, "opponent")]);
    const move = getLegalMoves(state).find((candidate) => candidate.isCapture);
    expect(move).toBeDefined();
    const next = applyMove(state, move!);
    expect(next.status).toBe("finished");
    expect(next.winner).toBe("player");
    expect(countPieces(next.board, "opponent")).toBe(0);
  });
});
