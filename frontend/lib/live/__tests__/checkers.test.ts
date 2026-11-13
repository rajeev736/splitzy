/** npx tsx lib/live/__tests__/checkers.test.ts */
import type { RoomPlayer } from "../types"
import {
  applyMove,
  applyMoveToBoard,
  assignSides,
  boardOf,
  cellAt,
  cellOfNumber,
  crownRow,
  DRAW_QUIET_PLIES,
  initialBoard,
  initialCheckersState,
  isPlayable,
  legalMoves,
  movableSquares,
  movePiece,
  movesAlong,
  notation,
  opponentOf,
  pieceCounts,
  sameMove,
  sideOf,
  squareNumber,
  status,
  toLiveResult,
  type Board,
  type Cell,
  type CheckersMove,
  type CheckersState,
} from "../checkers"

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

const player = (uid: string, seat: number): RoomPlayer => ({
  uid,
  name: uid,
  seat,
  joinedAt: 0,
  online: true,
  lastSeen: 0,
})
const host = player("host", 0)
const guest = player("guest", 1)

const T0 = 1_700_000_000_000

/** An empty board with pieces on the given numbered squares (1–32). */
function boardWith(pieces: Record<number, Cell>): Board {
  const board: Board = Array.from({ length: 64 }, () => "")
  for (const [n, cell] of Object.entries(pieces))
    board[cellOfNumber(Number(n))] = cell
  return board
}

/** A game in progress: host is light, guest is dark, light to move unless told otherwise. */
function game(board: Board, extra: Partial<CheckersState> = {}): CheckersState {
  return {
    light: "host",
    dark: "guest",
    board,
    turn: "l",
    moves: 0,
    quiet: 0,
    startedAt: T0,
    lastMoveAt: T0,
    ...extra,
  }
}

/** A move written in square numbers: mv([22, 15], [18]) is 22x15 taking 18. */
const mv = (path: number[], captured: number[] = []): CheckersMove => ({
  path: path.map(cellOfNumber),
  captured: captured.map(cellOfNumber),
})

const hasMove = (moves: CheckersMove[], m: CheckersMove) =>
  moves.some((x) => sameMove(x, m))

console.log("Running checkers tests...\n")

// ── Geometry & numbering ──────────────────────────────────────────────
{
  let playable = 0
  for (let i = 0; i < 64; i++) if (isPlayable(i)) playable++
  assert(playable === 32, "32 playable squares")
  assert(
    isPlayable(cellAt(7, 0)) && isPlayable(cellAt(0, 7)),
    "each side has a dark square in its left corner"
  )
  assert(
    !isPlayable(cellAt(0, 0)) && !isPlayable(cellAt(7, 7)),
    "the other corners are light"
  )
  for (let n = 1; n <= 32; n++) {
    const i = cellOfNumber(n)
    assert(isPlayable(i), `square ${n} is playable`)
    assert(squareNumber(i) === n, `square ${n} round-trips`)
  }
  assert(
    cellOfNumber(1) === cellAt(0, 1) && cellOfNumber(32) === cellAt(7, 6),
    "1 is top left, 32 bottom right"
  )
  assert(
    cellOfNumber(22) === cellAt(5, 2) && cellOfNumber(18) === cellAt(4, 3),
    "22 and 18 touch diagonally"
  )
  assert(
    crownRow("l") === 0 && crownRow("d") === 7,
    "light crowns at the top, dark at the bottom"
  )
}

// ── Setup ─────────────────────────────────────────────────────────────
{
  const start = initialBoard()
  const counts = pieceCounts(start)
  assert(
    counts.l.men === 12 &&
      counts.d.men === 12 &&
      counts.l.kings === 0 &&
      counts.d.kings === 0,
    "12 men each"
  )
  assert(
    start.every((c, i) => c === "" || isPlayable(i)),
    "pieces only on dark squares"
  )
  for (let n = 1; n <= 12; n++)
    assert(start[cellOfNumber(n)] === "d", `dark on ${n}`)
  for (let n = 13; n <= 20; n++)
    assert(start[cellOfNumber(n)] === "", `${n} is empty`)
  for (let n = 21; n <= 32; n++)
    assert(start[cellOfNumber(n)] === "l", `light on ${n}`)

  let s = assignSides([host, guest], { colour: "light" }, "ABCDEF")
  assert(s.light === "host" && s.dark === "guest", "host asked for light")
  s = assignSides([host, guest], { colour: "dark" }, "ABCDEF")
  assert(s.light === "guest" && s.dark === "host", "host asked for dark")
  const r1 = assignSides([host, guest], { colour: "random" }, "ABCDEF")
  const r2 = assignSides([host, guest], { colour: "random" }, "ABCDEF")
  assert(
    r1.light === r2.light && r1.light !== r1.dark,
    "random is the same for the same room"
  )
  const seeds = ["ABC234", "XYZ789", "AAAAAA", "HJK2M9", "BBBBBB", "W7TQ4N"]
  const lights = new Set(
    seeds.map(
      (seed) => assignSides([host, guest], { colour: "random" }, seed).light
    )
  )
  assert(lights.size === 2, "random actually varies by room")

  const state = initialCheckersState(
    [host, guest],
    { colour: "light" },
    "ABCDEF"
  )
  assert(
    state.light === "host" &&
      state.turn === "l" &&
      state.moves === 0 &&
      state.quiet === 0,
    "fresh game, light to move"
  )
  assert(
    state.board.length === 64 && pieceCounts(boardOf(state)).l.men === 12,
    "the starting position"
  )
  assert(
    !("lastMove" in state) &&
      !("result" in state) &&
      !("history" in state) &&
      !("drawOffer" in state),
    "no undefined fields go to the database"
  )
  assert(
    sideOf(state, "host") === "l" &&
      sideOf(state, "guest") === "d" &&
      sideOf(state, "x") === null,
    "sides"
  )
  assert(
    opponentOf(state, "host") === "guest" &&
      opponentOf(state, "guest") === "host",
    "opponents"
  )

  // The database may hand the board back as an object keyed "0".."63"
  const asObject = {
    ...state,
    board: Object.fromEntries(
      state.board.map((c, i) => [String(i), c])
    ) as unknown as Board,
  }
  assert(
    boardOf(asObject).join("") === state.board.join(""),
    "boardOf reads an object-shaped board"
  )
}

// ── Opening moves ─────────────────────────────────────────────────────
{
  const moves = legalMoves(initialBoard(), "l")
  assert(moves.length === 7, "light has seven opening moves")
  assert(
    moves.every((m) => m.captured.length === 0 && m.path.length === 2),
    "all plain steps"
  )
  assert(
    hasMove(moves, mv([22, 18])) &&
      hasMove(moves, mv([24, 20])) &&
      hasMove(moves, mv([21, 17])),
    "22-18, 24-20, 21-17"
  )
  assert(!hasMove(moves, mv([22, 26])), "men don't move backwards")
  assert(
    legalMoves(initialBoard(), "d").length === 7,
    "dark would also have seven"
  )
  assert(movableSquares(moves).length === 4, "the four front men can move")

  const s = game(initialBoard())
  assert(
    applyMove(s, "guest", mv([11, 15]), T0) === null,
    "dark can't move first"
  )
  assert(
    applyMove(s, "nobody", mv([22, 18]), T0) === null,
    "spectators can't move"
  )
  assert(applyMove(s, "host", mv([22, 26]), T0) === null, "illegal step")
  const next = applyMove(s, "host", mv([22, 18]), T0 + 3000)!
  assert(next !== null, "22-18 is legal")
  assert(
    next.turn === "d" && next.moves === 1 && next.quiet === 0,
    "dark to move after one ply"
  )
  assert(
    next.board[cellOfNumber(22)] === "" && next.board[cellOfNumber(18)] === "l",
    "the man moved"
  )
  assert(next.history?.join(" ") === "22-18", "notation recorded")
  assert(
    next.lastMove?.from === cellOfNumber(22) &&
      next.lastMove.to === cellOfNumber(18),
    "last move squares"
  )
  assert(
    !("captured" in next.lastMove!) && !("crowned" in next.lastMove!),
    "a step has no captures and no crown"
  )
  assert(
    next.lastMoveAt === T0 + 3000 && !("result" in next),
    "clock restarts; game goes on"
  )
}

// ── Forced capture ────────────────────────────────────────────────────
{
  // Light man on 22 can jump the dark man on 18; the man on 21 could step but may not
  const board = boardWith({ 22: "l", 21: "l", 18: "d", 1: "d" })
  const moves = legalMoves(board, "l")
  assert(moves.length === 1, "only the capture is legal")
  assert(sameMove(moves[0], mv([22, 15], [18])), "22x15 taking 18")
  assert(notation(moves[0]) === "22x15", "capture notation")

  const s = game(board)
  assert(
    applyMove(s, "host", mv([21, 17]), T0) === null,
    "a step is refused while a capture is on"
  )
  assert(
    applyMove(s, "host", mv([22, 18]), T0) === null,
    "and so is moving onto the rival"
  )
  const next = applyMove(s, "host", mv([22, 15], [18]), T0)!
  assert(next !== null, "the capture goes through")
  assert(
    next.board[cellOfNumber(18)] === "" && next.board[cellOfNumber(15)] === "l",
    "the rival is gone, the man landed"
  )
  assert(
    next.lastMove?.captured?.length === 1 &&
      next.lastMove.captured[0] === cellOfNumber(18),
    "captured square recorded"
  )
  assert(pieceCounts(next.board).d.men === 1, "dark is down to one")
}

// ── Multi-jump ────────────────────────────────────────────────────────
{
  // 22 jumps 18 to land on 15, then must jump 11 to land on 8
  const board = boardWith({ 22: "l", 18: "d", 11: "d", 32: "l", 1: "d" })
  const moves = legalMoves(board, "l")
  assert(moves.length === 1, "one sequence")
  assert(sameMove(moves[0], mv([22, 15, 8], [18, 11])), "22x15x8")
  assert(
    !hasMove(moves, mv([22, 15], [18])),
    "stopping after the first jump is not allowed"
  )
  assert(notation(moves[0]) === "22x15x8", "multi-jump notation")

  const s = game(board)
  assert(
    applyMove(s, "host", mv([22, 15], [18]), T0) === null,
    "an unfinished jump is refused"
  )
  const next = applyMove(s, "host", mv([22, 15, 8], [18, 11]), T0)!
  assert(next !== null, "the full sequence is accepted")
  assert(
    next.board[cellOfNumber(18)] === "" &&
      next.board[cellOfNumber(11)] === "" &&
      next.board[cellOfNumber(8)] === "l",
    "both rivals gone, man on 8"
  )
  assert(
    next.lastMove?.path.length === 3 && next.lastMove.captured?.length === 2,
    "the whole path is recorded"
  )

  // A fork: from 15 the man may take 11 (to 8) or 10 (to 6) — both are offered, each complete
  const fork = boardWith({ 22: "l", 18: "d", 11: "d", 10: "d", 1: "d" })
  const forks = legalMoves(fork, "l")
  assert(forks.length === 2, "two branches")
  assert(
    hasMove(forks, mv([22, 15, 8], [18, 11])) &&
      hasMove(forks, mv([22, 15, 6], [18, 10])),
    "both branches"
  )
  const along = movesAlong(forks, [cellOfNumber(22), cellOfNumber(15)])
  assert(
    along.length === 2 &&
      movesAlong(forks, [cellOfNumber(22), cellOfNumber(15), cellOfNumber(8)])
        .length === 1,
    "prefix filtering"
  )
  assert(
    movesAlong(forks, [cellOfNumber(21)]).length === 0,
    "no moves from an empty square"
  )
  const preview = movePiece(fork, cellOfNumber(22), cellOfNumber(15))
  assert(
    preview[cellOfNumber(22)] === "" &&
      preview[cellOfNumber(15)] === "l" &&
      preview[cellOfNumber(18)] === "d",
    "preview keeps the taken piece in place"
  )
}

// ── Crowning ends the move ────────────────────────────────────────────
{
  // 11 jumps 7 onto 2 (the crown row). A king could carry on over 6, but a freshly crowned man stops
  const board = boardWith({ 11: "l", 7: "d", 6: "d", 32: "l", 4: "d" })
  const moves = legalMoves(board, "l")
  assert(
    moves.length === 1 && sameMove(moves[0], mv([11, 2], [7])),
    "the jump ends on the crown row"
  )
  const next = applyMove(game(board), "host", mv([11, 2], [7]), T0)!
  assert(next.board[cellOfNumber(2)] === "L", "crowned")
  assert(next.lastMove?.crowned === true, "crowning is recorded")
  assert(next.board[cellOfNumber(6)] === "d", "the second rival survives")
  // Next time round, the new king does jump backwards
  const kingMoves = legalMoves(next.board, "l")
  assert(
    hasMove(kingMoves, mv([2, 9], [6])),
    "the king takes 6 on its next move"
  )

  // A plain step onto the far row also crowns
  const step = applyMoveToBoard(boardWith({ 5: "l" }), mv([5, 1]))
  assert(
    step.crowned && step.board[cellOfNumber(1)] === "L",
    "stepping onto the far row crowns"
  )
  // Dark crowns at the bottom
  const dark = applyMoveToBoard(boardWith({ 28: "d" }), mv([28, 32]))
  assert(
    dark.crowned && dark.board[cellOfNumber(32)] === "D",
    "dark crowns on row 7"
  )
  const already = applyMoveToBoard(boardWith({ 5: "L" }), mv([5, 1]))
  assert(
    !already.crowned && already.board[cellOfNumber(1)] === "L",
    "a king stays a king"
  )
}

// ── Kings move and capture backwards ──────────────────────────────────
{
  const board = boardWith({ 15: "L", 19: "d", 1: "d" })
  const moves = legalMoves(board, "l")
  assert(
    moves.length === 1 && sameMove(moves[0], mv([15, 24], [19])),
    "the king jumps backwards over 19"
  )
  const man = legalMoves(boardWith({ 15: "l", 19: "d", 1: "d" }), "l")
  assert(
    man.every((m) => m.captured.length === 0),
    "a man can't take backwards…"
  )
  assert(
    man.length === 2 &&
      hasMove(man, mv([15, 10])) &&
      hasMove(man, mv([15, 11])),
    "…it just steps forward"
  )

  const free = legalMoves(boardWith({ 15: "L", 1: "d" }), "l")
  assert(free.length === 4, "a lone king has four steps")
  assert(
    hasMove(free, mv([15, 18])) && hasMove(free, mv([15, 19])),
    "including backwards"
  )

  // Not a flying king: one square at a time
  const far = legalMoves(boardWith({ 15: "L", 1: "d", 28: "d" }), "l")
  assert(
    far.every((m) => m.captured.length === 0),
    "no long-range captures"
  )

  // A king may come back round to the square it started on
  const loop = boardWith({
    14: "L",
    10: "d",
    11: "d",
    18: "d",
    19: "d",
    1: "d",
  })
  const loops = legalMoves(loop, "l")
  assert(
    loops.length > 0 && loops.every((m) => m.captured.length === 4),
    "a king takes all four round the loop"
  )
  assert(
    loops[0].path[loops[0].path.length - 1] === cellOfNumber(14),
    "and lands back where it began"
  )
}

// ── Losing: no pieces, no moves ───────────────────────────────────────
{
  // Light's last capture leaves dark with nothing
  const board = boardWith({ 22: "l", 18: "d" })
  const next = applyMove(game(board), "host", mv([22, 15], [18]), T0)!
  assert(
    next.result?.winner === "host" && next.result.reason === "no_pieces",
    "all taken: light wins"
  )
  assert(
    applyMove(next, "guest", mv([1, 5]), T0) === null,
    "no moves after the end"
  )
  const live = toLiveResult(next.result!)
  assert(
    live.winnerIds.length === 1 &&
      live.winnerIds[0] === "host" &&
      live.reason === "no_pieces",
    "LiveResult"
  )

  // Dark's only man on 1 is boxed in: 5 and 6 are taken and the jump over 6 lands on occupied 10
  const boxed = boardWith({ 1: "d", 5: "l", 6: "l", 10: "l", 32: "l" })
  assert(legalMoves(boxed, "d").length === 0, "dark has no legal move")
  assert(
    status(game(boxed, { turn: "d" })).kind === "win",
    "no moves is a loss"
  )
  const after = applyMove(game(boxed), "host", mv([32, 27]), T0)!
  assert(
    after.result?.winner === "host" && after.result.reason === "no_moves",
    "light wins once dark is stuck"
  )

  // Still a game while dark can move
  const open = boardWith({ 1: "d", 5: "l", 32: "l" })
  assert(
    status(game(open, { turn: "d" })).kind === "ongoing",
    "a free square keeps the game going"
  )

  const draw = toLiveResult({ winner: null, reason: "draw_agreed" })
  assert(
    draw.winnerIds.length === 0 && draw.reason === "draw_agreed",
    "a draw has no winner"
  )
}

// ── The draw counter ──────────────────────────────────────────────────
{
  // Two kings far apart shuffling about
  let s = game(boardWith({ 32: "L", 1: "D" }))
  const shuffle: [string, CheckersMove][] = [
    ["host", mv([32, 27])],
    ["guest", mv([1, 5])],
    ["host", mv([27, 32])],
    ["guest", mv([5, 1])],
  ]
  for (let ply = 0; ply < DRAW_QUIET_PLIES - 1; ply++) {
    const [uid, m] = shuffle[ply % 4]
    s = applyMove(s, uid, m, T0)!
    assert(s !== null && !s.result, `ply ${ply + 1} keeps going`)
  }
  assert(
    s.quiet === DRAW_QUIET_PLIES - 1 && s.moves === DRAW_QUIET_PLIES - 1,
    "the counter climbs with every king move"
  )
  const [uid, m] = shuffle[(DRAW_QUIET_PLIES - 1) % 4]
  s = applyMove(s, uid, m, T0)!
  assert(
    s.result?.reason === "forty_moves" && !s.result.winner,
    "forty quiet plies is a draw"
  )

  // A man moving resets the count
  const withMan = game(boardWith({ 32: "L", 21: "l", 1: "D" }), {
    quiet: DRAW_QUIET_PLIES - 1,
  })
  const manMove = applyMove(withMan, "host", mv([21, 17]), T0)!
  assert(manMove.quiet === 0 && !manMove.result, "a man moving is progress")
  const kingMove = applyMove(withMan, "host", mv([32, 27]), T0)!
  assert(
    kingMove.result?.reason === "forty_moves",
    "a king move on the 40th ply draws"
  )

  // So does a capture — and it's forced
  const capture = game(boardWith({ 32: "L", 15: "L", 19: "d", 1: "D" }), {
    quiet: DRAW_QUIET_PLIES - 1,
  })
  assert(
    applyMove(capture, "host", mv([32, 27]), T0) === null,
    "no quiet move while a capture is on"
  )
  const took = applyMove(capture, "host", mv([15, 24], [19]), T0)!
  assert(took.quiet === 0 && !took.result, "a capture is progress")
}

// ── Draw offers ride along ────────────────────────────────────────────
{
  const offered = game(initialBoard(), { drawOffer: "guest" })
  const answered = applyMove(offered, "host", mv([22, 18]), T0)!
  assert(!("drawOffer" in answered), "moving declines the other side's offer")
  const own = game(initialBoard(), { drawOffer: "host" })
  const still = applyMove(own, "host", mv([22, 18]), T0)!
  assert(still.drawOffer === "host", "your own offer stands when you move")
  const ended = game(initialBoard(), {
    result: { winner: "host", reason: "resign" },
  })
  assert(
    applyMove(ended, "host", mv([22, 18]), T0) === null,
    "no moves after a resignation"
  )
}

console.log("All checkers tests passed.")
