// The contract between the server and the client.
// Both sides import from here, so a change to a message shows up as a type error on the other side.
// See docs/PROTOCOL.md for the rules and the flow.

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 5
export const BOARD_SIZE = 5 // 5x5 grid holding the numbers 1-25
export const LINES_TO_WIN = 5 // B-I-N-G-O
export const TURN_SECONDS = 30
export const RECONNECT_GRACE_SECONDS = 60

/** 25 numbers, row by row. Each of 1-25 appears exactly once. */
export type Board = number[]

export type Phase = 'lobby' | 'playing' | 'finished'

/** What everyone in the room can see about a player. Boards stay private. */
export interface PublicPlayer {
  id: string
  name: string
  isHost: boolean
  ready: boolean
  connected: boolean
  lines: number // completed rows, columns and diagonals, 0-5+
}

export interface RoomState {
  code: string
  phase: Phase
  players: PublicPlayer[] // in turn order (join order)
  turnPlayerId: string | null
  turnEndsAt: number | null // epoch ms, for the countdown
  called: number[] // in the order they were called
  winnerIds: string[] // more than one if they finished on the same call
}

/** Only sent to the board's owner. */
export interface PrivateBoard {
  board: Board
  /** Indexes 0-11 of completed lines: 0-4 rows, 5-9 columns, 10 = top-left diagonal, 11 = top-right. */
  completedLines: number[]
}

// ---------- client -> server ----------

export type ClientMessage =
  | { type: 'create_room'; name: string }
  | { type: 'join_room'; code: string; name: string }
  | { type: 'rejoin'; code: string; token: string }
  | { type: 'set_board'; board: Board } // lobby only; custom arrangement
  | { type: 'shuffle_board' } // lobby only; random arrangement
  | { type: 'set_ready'; ready: boolean }
  | { type: 'start_game' } // host only
  | { type: 'call_number'; n: number } // your turn only
  | { type: 'rematch' } // host only, after the game ends
  | { type: 'leave_room' }

// ---------- server -> client ----------

export type ErrorCode =
  | 'room_not_found'
  | 'room_full'
  | 'game_in_progress'
  | 'bad_name'
  | 'bad_board'
  | 'not_host'
  | 'not_your_turn'
  | 'already_called'
  | 'bad_number'
  | 'not_enough_players'
  | 'players_not_ready'
  | 'bad_token'
  | 'bad_message'

export type ServerMessage =
  /** Sent once after create/join/rejoin. Keep `token` to rejoin after a refresh. */
  | { type: 'welcome'; playerId: string; token: string; room: RoomState; board: PrivateBoard }
  /** Sent to everyone whenever anything public changes. */
  | { type: 'room_state'; room: RoomState }
  /** Sent to one player when their own board changes. */
  | { type: 'your_board'; board: PrivateBoard }
  /** Sent to everyone on each call, so the UI can animate it. `auto` means the turn timer ran out. */
  | { type: 'number_called'; n: number; byPlayerId: string; auto: boolean }
  | { type: 'error'; code: ErrorCode; message: string }
