import { describe, expect, it } from "vitest";
import { CHALLENGES, getNextChallenge, isChallengeUnlocked } from "../lib/game/challenges";

describe("DraughtHood challenge ladder", () => {
  it("orders five progressively harder hurdles with explicit prerequisites", () => {
    expect(CHALLENGES.map((challenge) => challenge.id)).toEqual([
      "first-crown",
      "the-fork",
      "clear-the-field",
      "hold-the-line",
      "kingmaker",
    ]);
    expect(CHALLENGES.map((challenge) => challenge.stage)).toEqual([1, 2, 3, 4, 5]);
    expect(CHALLENGES[0].unlockAfter).toBeUndefined();
    expect(CHALLENGES.slice(1).every((challenge) => Boolean(challenge.unlockAfter))).toBe(true);
  });

  it("opens only the first hurdle for a new profile", () => {
    expect(isChallengeUnlocked("first-crown", [])).toBe(true);
    for (const challenge of CHALLENGES.slice(1)) {
      expect(isChallengeUnlocked(challenge.id, []), challenge.title).toBe(false);
    }
  });

  it("unlocks the next hurdle only after its predecessor is cleared", () => {
    expect(isChallengeUnlocked("the-fork", ["first-crown"])).toBe(true);
    expect(isChallengeUnlocked("clear-the-field", ["first-crown"])).toBe(false);
    expect(isChallengeUnlocked("clear-the-field", ["first-crown", "the-fork"])).toBe(true);
  });

  it("keeps an already-cleared challenge available for replay", () => {
    expect(isChallengeUnlocked("kingmaker", ["kingmaker"])).toBe(true);
  });

  it("selects the next uncleared hurdle and keeps the finale replayable after completion", () => {
    expect(getNextChallenge([]).id).toBe("first-crown");
    expect(getNextChallenge(["first-crown", "the-fork"]).id).toBe("clear-the-field");
    expect(getNextChallenge(CHALLENGES.map((challenge) => challenge.id)).id).toBe("kingmaker");
  });
});
