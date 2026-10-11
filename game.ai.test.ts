import { describe, expect, it } from "vitest";
import { chooseComputerMove, type Difficulty } from "../lib/game/ai";
import { applyMove, createInitialState, getLegalMoves, moveKey } from "../lib/game/engine";

const levels: Difficulty[] = ["relaxed", "club", "champion"];

describe.each(levels)("%s computer opponent", (difficulty) => {
  it("returns a legal reply on a standard 10×10 opening", () => {
    const opening = createInitialState();
    const playerMove = getLegalMoves(opening)[0];
    const opponentState = applyMove(opening, playerMove);
    const legalReplies = getLegalMoves(opponentState);
    const reply = chooseComputerMove(opponentState, difficulty);

    expect(reply).not.toBeNull();
    expect(legalReplies.some((move) => moveKey(move) === moveKey(reply!))).toBe(true);
  });
});
