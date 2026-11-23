# pyngo-online: design and protocol

Online Bingo for 2-5 players, grown from [pyngo](https://github.com/appu-46/pyngo) (2021).
The types live in `shared/src/index.ts`; this file explains the rules behind them.

## Rules

- Every player has a private 5x5 board holding the numbers 1-25 once each, shuffled or arranged by hand in the lobby.
- Players take turns in join order. On your turn you call any number that hasn't been called yet; it is crossed off on **every** board.
- Each completed row, column or diagonal (12 possible) crosses off one letter of B-I-N-G-O.
- The first player to reach 5 lines wins. If several reach 5 on the same call, they all win.
- Boards are private: the choice of what to call is the strategy, so others only see your line count.
- Turn timer: 30 s. If it runs out, the server calls a random uncalled number for you (`auto: true`).

## Architecture

```
client (React, Vite)  <── WebSocket, JSON messages ──>  server (Node, TypeScript, ws)
                               shared/ (types)                  rooms held in memory
```

- **The server is the authority.** It holds every board, validates every move, counts lines and decides the winner. The client only sends intentions (`call_number`) and renders what the server says.
- **State is in memory** for v1. Restarting the server ends all games; that's acceptable for now and a good thing to notice when you deploy.
- One WebSocket per player. The server pushes `room_state` to the whole room after every change, so clients never need to patch state themselves.

## Flow

```
A: create_room {name}          -> A: welcome {playerId, token, room(code K7Q2), board}
B: join_room {code, name}      -> B: welcome ...      all: room_state
A,B: shuffle_board / set_board -> that player: your_board
A,B: set_ready {true}          -> all: room_state
A (host): start_game           -> all: room_state (phase playing, turnPlayerId A)
A: call_number {n: 7}          -> all: number_called, room_state; each: your_board
...                            -> all: room_state (phase finished, winnerIds)
A (host): rematch              -> all: room_state (phase lobby, boards reshuffled, ready reset)
```

## Rules the server enforces

| Situation | Response |
|---|---|
| Unknown room code | `error room_not_found` |
| Room already has 5 players | `error room_full` |
| Joining once the game has started | `error game_in_progress` (rejoin with a token still works) |
| Name empty or over 20 chars | `error bad_name` |
| Custom board isn't 1-25 once each | `error bad_board` |
| `start_game`/`rematch` from a non-host | `error not_host` |
| Fewer than 2 players / someone not ready | `error not_enough_players` / `players_not_ready` |
| Calling out of turn | `error not_your_turn` |
| Number outside 1-25 / already called | `error bad_number` / `already_called` |
| Unparseable or unknown message | `error bad_message` |

## Connections

- **Room codes:** 4 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O, 1/I/L).
- **Tokens:** a random secret per player, returned in `welcome`. The client stores `{code, token}` in localStorage and sends `rejoin` after a refresh.
- **Disconnects:** the player is marked `connected: false` but keeps their seat for 60 s. Their turns are covered by the turn timer. After 60 s in the lobby they are removed; during a game they stay as a disconnected seat.
- **Host leaves:** the next player in turn order becomes host.
- **Empty room:** deleted once nobody has been connected for 60 s.

## Who builds what

- `server/`: you. Room store, message handling, validation, line counting, timers.
- `client/`: Claude. Lobby, board, call history, countdown, win screen.
- `shared/`: agreed together; change it first, then both sides.

## Later

Deploy (Docker, Caddy for HTTPS, Oracle Cloud free tier, GitHub Actions), rate limiting, a bot player, spectators.
