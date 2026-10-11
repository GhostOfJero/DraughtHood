import {
  applyMove,
  countKings,
  countPieces,
  getLegalMoves,
  type GameState,
  type Move,
  type Side,
} from "./engine";

export type Difficulty = "relaxed" | "club" | "champion";

const enemyOf = (side: Side): Side => (side === "player" ? "opponent" : "player");

function evaluate(state: GameState, perspective: Side): number {
  if (state.status === "finished") return state.winner === perspective ? 100_000 : -100_000;
  const other = enemyOf(perspective);
  let score = (countPieces(state.board, perspective) - countPieces(state.board, other)) * 110;
  score += (countKings(state.board, perspective) - countKings(state.board, other)) * 80;

  for (let row = 0; row < state.board.length; row += 1) {
    for (let col = 0; col < state.board.length; col += 1) {
      const piece = state.board[row][col];
      if (!piece) continue;
      const progress = piece.side === "player" ? 9 - row : row;
      const center = 4.5 - (Math.abs(4.5 - row) + Math.abs(4.5 - col)) / 2;
      const value = (piece.king ? 1.1 : 0.65) * progress + center * 0.8;
      score += piece.side === perspective ? value : -value;
    }
  }
  return score;
}

function randomChoice<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function chooseRelaxed(state: GameState, moves: Move[]): Move | null {
  const captures = moves.filter((move) => move.isCapture);
  if (captures.length > 0 && Math.random() < 0.72) return randomChoice(captures);
  return randomChoice(moves);
}

function chooseClub(state: GameState, moves: Move[]): Move | null {
  const perspective = state.turn;
  const ranked = moves.map((move) => {
    const next = applyMove(state, move);
    const material = evaluate(next, perspective);
    const captureBonus = move.captured.length * 32;
    const promotionBonus = !state.board[move.from.row][move.from.col]?.king &&
      ((perspective === "player" && move.to.row === 0) ||
        (perspective === "opponent" && move.to.row === 9))
      ? 85
      : 0;
    return { move, value: material + captureBonus + promotionBonus + Math.random() * 18 };
  });
  ranked.sort((a, b) => b.value - a.value);
  return ranked[0]?.move ?? null;
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizingSide: Side,
): number {
  if (depth === 0 || state.status === "finished") return evaluate(state, maximizingSide);
  const moves = getLegalMoves(state);
  if (moves.length === 0) return evaluate(state, maximizingSide);

  if (state.turn === maximizingSide) {
    let best = Number.NEGATIVE_INFINITY;
    for (const move of moves) {
      best = Math.max(best, minimax(applyMove(state, move), depth - 1, alpha, beta, maximizingSide));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Number.POSITIVE_INFINITY;
  for (const move of moves) {
    best = Math.min(best, minimax(applyMove(state, move), depth - 1, alpha, beta, maximizingSide));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function chooseChampion(state: GameState, moves: Move[]): Move | null {
  const perspective = state.turn;
  let bestScore = Number.NEGATIVE_INFINITY;
  let best: Move[] = [];
  for (const move of moves) {
    const score = minimax(applyMove(state, move), 3, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, perspective);
    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) {
      best.push(move);
    }
  }
  return randomChoice(best);
}

export function chooseComputerMove(state: GameState, difficulty: Difficulty): Move | null {
  if (state.status !== "playing") return null;
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;
  switch (difficulty) {
    case "relaxed":
      return chooseRelaxed(state, moves);
    case "club":
      return chooseClub(state, moves);
    case "champion":
      return chooseChampion(state, moves);
  }
}
