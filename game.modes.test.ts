import { describe, expect, it } from "vitest";
import { isHumanControlled, nameForSide } from "../lib/game/mode";

describe("Eagle Draft match modes", () => {
  it("lets both sides take turns in local pass-and-play", () => {
    expect(isHumanControlled("local", "player")).toBe(true);
    expect(isHumanControlled("local", "opponent")).toBe(true);
  });

  it("keeps the opponent side computer-controlled in classic and challenge matches", () => {
    expect(isHumanControlled("classic", "player")).toBe(true);
    expect(isHumanControlled("classic", "opponent")).toBe(false);
    expect(isHumanControlled("challenge", "opponent")).toBe(false);
  });

  it("labels local sides as Player 1 and Player 2 without changing AI labels", () => {
    expect(nameForSide("local", "player")).toBe("Player 1");
    expect(nameForSide("local", "opponent")).toBe("Player 2");
    expect(nameForSide("classic", "opponent")).toBe("Eagle Bot");
  });
});
