export const BOARD_SIZE = 10;

export type Side = "player" | "opponent";
export type GameStatus = "playing" | "finished";

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  id: string;
  side: Side;
  king: boolean;
}

export type Board = (Piece | null)[][];

export interface Move {
  from: Position;
  to: Position;
  /** Each landing square after a capture jump, in order. */
  path: Position[];
  /** Opponent squares removed by this capture route, in order. */
  captured: Position[];
  isCapture: boolean;
}

export interface GameState {
  board: Board;
  turn: Side;
  status: GameStatus;
  winner: Side | null;
  moveNumber: number;
  lastMove: Move | null;
  lastEvent: "move" | "capture" | "promotion" | "win" | null;
}

export interface StartingPiece extends Position {
  side: Side;
  king?: boolean;
}

const DIAGONALS: Position[] = [
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 1 },
];

const inside = (p: Position): boolean =>
  p.row >= 0 && p.row < BOARD_SIZE && p.col >= 0 && p.col < BOARD_SIZE;

const same = (a: Position, b: Position): boolean => a.row === b.row && a.col === b.col;

const otherSide = (side: Side): Side => (side === "player" ? "opponent" : "player");

const copyPosition = (p: Position): Position => ({ row: p.row, col: p.col });

export function createInitialState(): GameState {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
  let playerSeed = 0;
  let opponentSeed = 0;

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { id: `opponent-${opponentSeed++}`, side: "opponent", king: false };
      }
    }
  }
  for (let row = 6; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { id: `player-${playerSeed++}`, side: "player", king: false };
      }
    }
  }

  return {
    board,
    turn: "player",
    status: "playing",
    winner: null,
    moveNumber: 1,
    lastMove: null,
    lastEvent: null,
  };
}

export function createPositionState(pieces: StartingPiece[], turn: Side = "player"): GameState {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
  const ids: Record<Side, number> = { player: 0, opponent: 0 };

  for (const item of pieces) {
    if (!inside(item) || (item.row + item.col) % 2 !== 1 || board[item.row][item.col]) {
      throw new Error(`Invalid challenge seed at ${item.row},${item.col}`);
    }
    const index = ids[item.side]++;
    board[item.row][item.col] = {
      id: `${item.side}-${index}`,
      side: item.side,
      king: Boolean(item.king),
    };
  }

  return {
    board,
    turn,
    status: "playing",
    winner: null,
    moveNumber: 1,
    lastMove: null,
    lastEvent: null,
  };
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    board: state.board.map((row) => row.map((piece) => (piece ? { ...piece } : null))),
    lastMove: state.lastMove
      ? {
          from: copyPosition(state.lastMove.from),
          to: copyPosition(state.lastMove.to),
          path: state.lastMove.path.map(copyPosition),
          captured: state.lastMove.captured.map(copyPosition),
          isCapture: state.lastMove.isCapture,
        }
      : null,
  };
}

export function countPieces(board: Board, side: Side): number {
  return board.reduce(
    (total, row) => total + row.filter((piece) => piece?.side === side).length,
    0,
  );
}

export function countKings(board: Board, side: Side): number {
  return board.reduce(
    (total, row) => total + row.filter((piece) => piece?.side === side && piece.king).length,
    0,
  );
}

function movementDirections(piece: Piece): Position[] {
  if (piece.king) return DIAGONALS;
  const forward = piece.side === "player" ? -1 : 1;
  return DIAGONALS.filter((direction) => direction.row === forward);
}

function captureLandings(board: Board, from: Position, piece: Piece): { landing: Position; victim: Position }[] {
  const found: { landing: Position; victim: Position }[] = [];

  for (const direction of DIAGONALS) {
    let row = from.row + direction.row;
    let col = from.col + direction.col;

    if (!piece.king) {
      const victim = inside({ row, col }) ? board[row][col] : null;
      const landing = { row: row + direction.row, col: col + direction.col };
      if (victim && victim.side !== piece.side && inside(landing) && !board[landing.row][landing.col]) {
        found.push({ landing, victim: { row, col } });
      }
      continue;
    }

    let victim: Position | null = null;
    while (inside({ row, col })) {
      const occupant = board[row][col];
      if (occupant) {
        if (occupant.side === piece.side) break;
        victim = { row, col };
        row += direction.row;
        col += direction.col;
        while (inside({ row, col }) && !board[row][col]) {
          found.push({ landing: { row, col }, victim });
          row += direction.row;
          col += direction.col;
        }
        break;
      }
      row += direction.row;
      col += direction.col;
    }
  }

  return found;
}

function enumerateCaptureRoutes(
  board: Board,
  from: Position,
  at: Position,
  piece: Piece,
  path: Position[],
  captured: Position[],
  output: Move[],
): void {
  const options = captureLandings(board, at, piece);
  if (options.length === 0) return;

  for (const option of options) {
    const nextBoard = board.map((row) => row.slice());
    nextBoard[at.row][at.col] = null;
    nextBoard[option.victim.row][option.victim.col] = null;
    nextBoard[option.landing.row][option.landing.col] = piece;

    const nextPath = [...path, copyPosition(option.landing)];
    const nextCaptured = [...captured, copyPosition(option.victim)];
    // Nigerian play does not require the largest capture count, and a player may choose
    // to stop after a jump. Each prefix is therefore a legal stopping point.
    output.push({
      from: copyPosition(from),
      to: copyPosition(option.landing),
      path: nextPath,
      captured: nextCaptured,
      isCapture: true,
    });
    enumerateCaptureRoutes(
      nextBoard,
      from,
      option.landing,
      piece,
      nextPath,
      nextCaptured,
      output,
    );
  }
}

export function getLegalMoves(state: GameState, side: Side = state.turn): Move[] {
  if (state.status !== "playing") return [];

  const captureMoves: Move[] = [];
  const quietMoves: Move[] = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = state.board[row][col];
      if (!piece || piece.side !== side) continue;
      const from = { row, col };
      enumerateCaptureRoutes(state.board, from, from, piece, [], [], captureMoves);

      for (const direction of movementDirections(piece)) {
        let next = { row: row + direction.row, col: col + direction.col };
        while (inside(next) && !state.board[next.row][next.col]) {
          quietMoves.push({
            from: copyPosition(from),
            to: copyPosition(next),
            path: [copyPosition(next)],
            captured: [],
            isCapture: false,
          });
          if (!piece.king) break;
          next = { row: next.row + direction.row, col: next.col + direction.col };
        }
      }
    }
  }

  return captureMoves.length > 0 ? captureMoves : quietMoves;
}

export function moveKey(move: Move): string {
  const path = move.path.map((p) => `${p.row},${p.col}`).join(";");
  return `${move.from.row},${move.from.col}:${path}`;
}

export function applyMove(state: GameState, move: Move): GameState {
  const board = state.board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
  const moving = board[move.from.row][move.from.col];
  if (!moving || moving.side !== state.turn) return state;

  board[move.from.row][move.from.col] = null;
  for (const captured of move.captured) board[captured.row][captured.col] = null;

  const finalPiece: Piece = { ...moving };
  const promoted = !finalPiece.king &&
    ((finalPiece.side === "player" && move.to.row === 0) ||
      (finalPiece.side === "opponent" && move.to.row === BOARD_SIZE - 1));
  if (promoted) finalPiece.king = true;
  board[move.to.row][move.to.col] = finalPiece;

  const nextTurn = otherSide(state.turn);
  const next: GameState = {
    board,
    turn: nextTurn,
    status: "playing",
    winner: null,
    moveNumber: state.moveNumber + (state.turn === "opponent" ? 1 : 0),
    lastMove: {
      from: copyPosition(move.from),
      to: copyPosition(move.to),
      path: move.path.map(copyPosition),
      captured: move.captured.map(copyPosition),
      isCapture: move.isCapture,
    },
    lastEvent: promoted ? "promotion" : move.isCapture ? "capture" : "move",
  };

  if (countPieces(board, nextTurn) === 0 || getLegalMoves(next, nextTurn).length === 0) {
    next.status = "finished";
    next.winner = state.turn;
    next.lastEvent = "win";
  }
  return next;
}

export function positionLabel(position: Position): string {
  return `${String.fromCharCode(65 + position.col)}${BOARD_SIZE - position.row}`;
}

export function samePosition(a: Position, b: Position): boolean {
  return same(a, b);
}
