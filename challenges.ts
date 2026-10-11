import { countKings, countPieces, createPositionState, type GameState, type Side, type StartingPiece } from "./engine";
import type { Difficulty } from "@/lib/game/ai";

export type ChallengeGoal = "crown" | "clear" | "hold";

export interface ChallengeDefinition {
  id: string;
  stage: number;
  unlockAfter?: string;
  title: string;
  subtitle: string;
  category: string;
  difficulty: Difficulty;
  goal: ChallengeGoal;
  target: number;
  seedCount: number;
  accent: string;
  lesson: string;
  pieces: StartingPiece[];
}

const P = (row: number, col: number, side: Side, king = false): StartingPiece => ({ row, col, side, king });

export const CHALLENGES: ChallengeDefinition[] = [
  {
    id: "first-crown",
    stage: 1,
    title: "The First Crown",
    subtitle: "Clear a lane and earn your crown.",
    category: "Crown run",
    difficulty: "relaxed",
    goal: "crown",
    target: 1,
    seedCount: 6,
    accent: "#D79B43",
    lesson: "Guide one seed all the way to the backline.",
    pieces: [P(8, 1, "player"), P(8, 5, "player"), P(7, 8, "player"), P(1, 2, "opponent"), P(1, 6, "opponent"), P(2, 7, "opponent")],
  },
  {
    id: "the-fork",
    stage: 2,
    unlockAfter: "first-crown",
    title: "The Fork",
    subtitle: "One landing square. More than one capture route.",
    category: "Route practice",
    difficulty: "club",
    goal: "clear",
    target: 2,
    seedCount: 3,
    accent: "#D4AE66",
    lesson: "Choose the route that fits your plan; the longest capture is not required.",
    pieces: [P(5, 4, "player", true), P(4, 3, "opponent"), P(6, 5, "opponent")],
  },
  {
    id: "clear-the-field",
    stage: 3,
    unlockAfter: "the-fork",
    title: "Clear the Field",
    subtitle: "Take all three opposing seeds.",
    category: "Clean sweep",
    difficulty: "club",
    goal: "clear",
    target: 3,
    seedCount: 6,
    accent: "#E28D70",
    lesson: "Every capture route is yours to choose. Set the trap.",
    pieces: [P(6, 1, "player"), P(7, 4, "player"), P(8, 7, "player"), P(4, 3, "opponent"), P(3, 6, "opponent"), P(2, 5, "opponent")],
  },
  {
    id: "hold-the-line",
    stage: 4,
    unlockAfter: "clear-the-field",
    title: "Hold the Line",
    subtitle: "Keep your crown standing for six turns.",
    category: "Holdout",
    difficulty: "champion",
    goal: "hold",
    target: 6,
    seedCount: 6,
    accent: "#72AA8A",
    lesson: "Trade space carefully. Your king is the anchor.",
    pieces: [P(7, 2, "player", true), P(8, 7, "player"), P(1, 2, "opponent"), P(2, 7, "opponent"), P(4, 9, "opponent"), P(4, 3, "opponent")],
  },
  {
    id: "kingmaker",
    stage: 5,
    unlockAfter: "hold-the-line",
    title: "Kingmaker",
    subtitle: "Turn a single seed into a winning king.",
    category: "Tactical puzzle",
    difficulty: "champion",
    goal: "crown",
    target: 1,
    seedCount: 5,
    accent: "#9F8AD1",
    lesson: "Protect the long diagonal on your road to promotion.",
    pieces: [P(9, 0, "player"), P(8, 5, "player"), P(7, 8, "player"), P(1, 2, "opponent"), P(3, 6, "opponent")],
  },
];

export function getChallenge(id: string | undefined): ChallengeDefinition | undefined {
  return CHALLENGES.find((challenge) => challenge.id === id);
}

export function isChallengeUnlocked(id: string, completedIds: string[]): boolean {
  const challenge = getChallenge(id);
  if (!challenge) return false;
  if (!challenge.unlockAfter || completedIds.includes(challenge.id)) return true;
  return completedIds.includes(challenge.unlockAfter);
}

export function getNextChallenge(completedIds: string[]): ChallengeDefinition {
  return CHALLENGES.find((challenge) => !completedIds.includes(challenge.id)) ?? CHALLENGES[CHALLENGES.length - 1];
}

export function createChallengeState(challengeId: string): GameState {
  const challenge = getChallenge(challengeId);
  if (!challenge) throw new Error(`Unknown challenge: ${challengeId}`);
  return createPositionState(challenge.pieces, "player");
}

export function challengeProgress(challenge: ChallengeDefinition, state: GameState, playerTurns: number): number {
  if (challenge.goal === "crown") return Math.min(challenge.target, countKings(state.board, "player"));
  if (challenge.goal === "clear") {
    const startingOpponents = challenge.pieces.filter((piece) => piece.side === "opponent").length;
    return Math.min(challenge.target, startingOpponents - countPieces(state.board, "opponent"));
  }
  return Math.min(challenge.target, playerTurns);
}

export function isChallengeComplete(challenge: ChallengeDefinition, state: GameState, playerTurns: number): boolean {
  if (state.winner === "opponent") return false;
  if (challenge.goal === "clear") return countPieces(state.board, "opponent") === 0;
  if (challenge.goal === "crown") return countKings(state.board, "player") >= challenge.target;
  return countKings(state.board, "player") > 0 && playerTurns >= challenge.target;
}

export function isChallengeFailed(challenge: ChallengeDefinition, state: GameState, playerTurns: number): boolean {
  if (isChallengeComplete(challenge, state, playerTurns)) return false;
  if (challenge.goal === "hold" && countKings(state.board, "player") === 0) return true;
  return state.status === "finished";
}
