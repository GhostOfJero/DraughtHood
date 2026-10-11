import { describe, expect, it } from "vitest";
import { challengeProgress, CHALLENGES, createChallengeState, isChallengeComplete, isChallengeFailed } from "../lib/game/challenges";
import { countKings, countPieces, createPositionState, getLegalMoves } from "../lib/game/engine";

describe("Eagle Draft challenges", () => {
  it("starts every scenario with a playable position and no completed objective", () => {
    for (const challenge of CHALLENGES) {
      const state = createChallengeState(challenge.id);
      expect(getLegalMoves(state).length, challenge.title).toBeGreaterThan(0);
      expect(isChallengeComplete(challenge, state, 0), challenge.title).toBe(false);
      expect(challengeProgress(challenge, state, 0), challenge.title).toBe(0);
    }
  });

  it("counts only the opponent's seeds toward Clear the Field", () => {
    const challenge = CHALLENGES.find((item) => item.id === "clear-the-field")!;
    const state = createChallengeState(challenge.id);
    expect(countPieces(state.board, "opponent")).toBe(3);
    expect(challengeProgress(challenge, state, 0)).toBe(0);
    expect(isChallengeComplete(challenge, state, 0)).toBe(false);
  });

  it("sets up The Fork with different legal capture routes to the same destination", () => {
    const challenge = CHALLENGES.find((item) => item.id === "the-fork")!;
    const state = createChallengeState(challenge.id);
    const routes = getLegalMoves(state).filter((move) =>
      move.from.row === 5 && move.from.col === 4 && move.to.row === 3 && move.to.col === 2,
    );

    expect(routes.map((move) => move.captured.length)).toContain(1);
    expect(routes.map((move) => move.captured.length)).toContain(2);
  });

  it("completes Hold the Line after the target turns while at least one seed survives", () => {
    const challenge = CHALLENGES.find((item) => item.id === "hold-the-line")!;
    const state = createChallengeState(challenge.id);
    expect(challengeProgress(challenge, state, challenge.target)).toBe(challenge.target);
    expect(isChallengeComplete(challenge, state, challenge.target)).toBe(true);
  });

  it("fails Hold the Line as soon as its king is lost, even if another seed remains", () => {
    const challenge = CHALLENGES.find((item) => item.id === "hold-the-line")!;
    const remainingSeeds = challenge.pieces.map((piece) => piece.side === "player" ? { ...piece, king: false } : piece);
    const state = createPositionState(remainingSeeds);

    expect(countPieces(state.board, "player")).toBeGreaterThan(0);
    expect(countKings(state.board, "player")).toBe(0);
    expect(isChallengeComplete(challenge, state, challenge.target)).toBe(false);
    expect(isChallengeFailed(challenge, state, 2)).toBe(true);
  });
});
