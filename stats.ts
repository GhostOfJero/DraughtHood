import type { Difficulty } from "./ai";
import { getChallenge } from "./challenges";
import { countPieces, type Side } from "./engine";
import type { GameSession } from "./storage";
import type { GameMode } from "./mode";

export type MatchResult = "win" | "loss" | "draw";

export interface MatchReport {
  id: string;
  completedAt: number;
  mode: GameMode;
  difficulty: Difficulty;
  challengeId?: string;
  challengeTitle?: string;
  outcome: MatchResult;
  winner: Side | null;
  moves: number;
  playerMoves: number;
  opponentMoves: number;
  capturesPlayer: number;
  capturesOpponent: number;
  crownsPlayer: number;
  crownsOpponent: number;
  remainingPlayer: number;
  remainingOpponent: number;
  elapsedSeconds: number | null;
}

export function buildMatchReport(
  session: GameSession,
  outcome: MatchResult,
  completedAt = Date.now(),
): MatchReport {
  let playerMoves = 0;
  let opponentMoves = 0;
  let capturesPlayer = 0;
  let capturesOpponent = 0;
  let crownsPlayer = 0;
  let crownsOpponent = 0;

  for (let index = 0; index < session.history.length; index += 1) {
    const before = session.history[index];
    const after = index + 1 < session.history.length ? session.history[index + 1] : session.game;
    const move = after.lastMove;
    if (!move) continue;

    const side = before.turn;
    const beforePiece = before.board[move.from.row]?.[move.from.col];
    const afterPiece = after.board[move.to.row]?.[move.to.col];
    if (side === "player") {
      playerMoves += 1;
      capturesPlayer += move.captured.length;
      if (beforePiece && !beforePiece.king && afterPiece?.king) crownsPlayer += 1;
    } else {
      opponentMoves += 1;
      capturesOpponent += move.captured.length;
      if (beforePiece && !beforePiece.king && afterPiece?.king) crownsOpponent += 1;
    }
  }

  const challenge = getChallenge(session.challengeId);
  const winner = outcome === "draw" ? null : session.game.winner ?? (outcome === "win" ? "player" : "opponent");
  const elapsedSeconds = Number.isFinite(session.startedAt) && session.startedAt > 0
    ? Math.max(0, Math.floor((completedAt - session.startedAt) / 1000))
    : null;

  return {
    id: `${completedAt}-${session.mode}-${Math.random().toString(36).slice(2, 8)}`,
    completedAt,
    mode: session.mode,
    difficulty: session.difficulty,
    challengeId: session.challengeId,
    challengeTitle: challenge?.title,
    outcome,
    winner,
    moves: playerMoves + opponentMoves,
    playerMoves,
    opponentMoves,
    capturesPlayer,
    capturesOpponent,
    crownsPlayer,
    crownsOpponent,
    remainingPlayer: countPieces(session.game.board, "player"),
    remainingOpponent: countPieces(session.game.board, "opponent"),
    elapsedSeconds,
  };
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}m ${remainder}s`;
}
