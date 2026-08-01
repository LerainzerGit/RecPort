# RecPort
A scaffold for a Rec Room-style browser port with a custom 2019 Rec Room packet handling backend.

## Project Structure

- `server/` — Express backend and WebSocket server for Rec Room screen mode.
- `client/` — Browser client that uses Rec Room-style packet protocols.
- `lib/` — Local `OpenRec` / `Rec.js` server-side protocol implementation.

## Protocol

This project uses a structured packet flow inspired by Rec Room 2019:

- `handshake`
- `auth_request` / `auth_response`
- `session_start`
- `world_state`
- `entity_update`
- `input` / `command`
- `ping` / `pong`
- `status` / `error`

The server sends initial handshake and session packets, then streams world updates to the browser.

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the server:

   ```bash
   npm start
   ```

3. Open the browser at `http://localhost:3000`

## How it works

- Browser connects to `/screen` via WebSocket.
- Server sends Rec Room-style handshake and auth request before establishing the session.
- Client renders the world state and updates entities in real time.
- A simulated input path moves the player in the shared world.

## Real Build Support

A placeholder real Rec Room build page exists at `/real` and `client/real.html`.

To use an actual Rec Room 2019 client build, place the build output into `client/` and update `server/index.js` or `client/real.html` to point to the real asset entry file.

## Notes

- This is not a full official Rec Room client or server. It is a custom recreation using Rec Room-like packet semantics.
- To continue building, add real Rec Room 2019 world state decoding, asset rendering, and authenticated user session handling.
