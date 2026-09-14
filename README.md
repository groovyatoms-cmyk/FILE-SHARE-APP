# P2P File Share

**Version 1.0.0**

A privacy-first, peer-to-peer file-sharing web application. Files travel
directly between devices over an encrypted WebRTC data channel — there is no
mandatory cloud upload, no permanent file storage, and no account system.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Signaling Server](#signaling-server)
- [STUN / TURN Configuration](#stun--turn-configuration)
- [Testing](#testing)
- [Production Build](#production-build)
- [Deployment](#deployment)
- [Security](#security)
- [Browser Compatibility](#browser-compatibility)
- [Known Limitations](#known-limitations)
- [License](#license)

## Overview

P2P File Share lets two devices exchange files directly, pairing over a QR
code or a short numeric code, with no size limit imposed by server storage.
A lightweight signaling server brokers the initial WebRTC handshake only —
once a peer connection is established, file data never touches the server.

## Features

- **Direct peer-to-peer transfer** over a WebRTC data channel, with a TURN
  relay fallback for restrictive networks
- **QR code and pairing-code pairing**, plus a shareable deep link
- **Multi-file, drag-and-drop transfers**, including large files (multi-GB),
  streamed in bounded-size chunks rather than buffered in memory
- **Adaptive, backpressure-aware chunking** — chunk size scales with file
  size and device memory, and sending pauses automatically when the
  underlying data channel's buffer is full
- **Resumable transfers** — a transfer interrupted by a network blip resumes
  from the last confirmed chunk once the connection is re-established
- **SHA-256 integrity verification** on every file, computed incrementally
  so multi-gigabyte files are never fully buffered just to hash them
- **Optional application-level AES-GCM encryption**, layered on top of
  WebRTC's own DTLS-SRTP transport encryption
- **Live progress, speed, and ETA** with a smoothed rolling average
- **Explicit transfer state machine** (no ad-hoc boolean flags) driving a
  polished Material UI dashboard, in light, dark, and system themes
- **Installable PWA** with an offline app shell
- **Privacy-first by design** — session metadata expires automatically;
  transfer history stores file names and sizes locally, never file contents

## Architecture

The signaling server is used only to broker the WebRTC handshake. Once a
peer connection is established, all file data flows directly between the
two browsers:

```text
DEVICE A                    SIGNALING SERVER                   DEVICE B
   │                        (WebSocket, brokers only)              │
   │──── CREATE_SESSION ───────────▶│                              │
   │◀─── SESSION_CREATED ───────────│                              │
   │        (QR / pairing code)     │                              │
   │                                │◀──── JOIN_SESSION ───────────│
   │◀──── PEER_JOINED ──────────────│──── SESSION_JOINED ─────────▶│
   │──── OFFER ─────────────────────▶│──── OFFER ───────────────────▶│
   │◀─── ANSWER ────────────────────│◀─── ANSWER ───────────────────│
   │◀──▶ ICE_CANDIDATE ─────────────│◀──▶ ICE_CANDIDATE ────────────│
   │                                │                              │
   └───────────── direct WebRTC DataChannel (file bytes) ──────────┘
                    (TURN relay only if direct fails)
```

Two ordered, reliable data channels are opened per session:

- **`control`** — small JSON protocol messages: session/file offers,
  accept/reject, pause/resume/cancel, ping/pong
- **`file-transfer`** — chunk metadata frames and their binary payloads,
  interleaved on one ordered channel so a chunk's metadata can never be
  separated from, or arrive out of order relative to, its binary data

See [`shared/src/types.ts`](shared/src/types.ts) for the full wire protocol.

## Technology Stack

**Client:** React, TypeScript, Vite, Material UI, React Router, Zustand,
React Hook Form, Zod, WebRTC, Web Crypto API, IndexedDB, Service Worker
(via `vite-plugin-pwa`), `qrcode.react`, `html5-qrcode`, `react-dropzone`,
`idb`, `file-saver`, `@noble/hashes`, `notistack`

**Server:** Node.js, TypeScript, `ws` (WebSocket), Zod

**Shared:** TypeScript types, Zod schemas, and protocol constants consumed
by both the client and server, published as an internal `@p2p/shared`
workspace package

## Project Structure

```text
p2p-file-share/
├── client/                 React + Vite frontend
│   ├── src/
│   │   ├── components/     Reusable UI (QR display/scanner, file list, ...)
│   │   ├── features/       Feature-level composition (transfer dashboard)
│   │   ├── pages/          Route-level pages
│   │   ├── services/       WebRTC, signaling, transfer engine, crypto, storage
│   │   ├── stores/         Zustand state (connection, transfer, settings, ...)
│   │   ├── theme/          Centralized MUI theme tokens (light/dark)
│   │   └── router/         React Router configuration
│   └── public/             PWA icons, manifest assets
├── server/                 Signaling server
│   └── src/
│       ├── signaling/      WebSocket message relay
│       ├── sessions/       In-memory session store with expiration
│       ├── security/       Rate limiting, origin validation
│       └── utils/          Logging, ID generation
├── shared/                 Shared types, Zod schemas, protocol constants
├── docker-compose.yml
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Installation

```bash
git clone <repository-url>
cd p2p-file-share
npm install
```

### Configuration

```bash
cp .env.example client/.env.local
cp .env.example server/.env
```

At minimum, set `VITE_SIGNALING_URL` in `client/.env.local` to point at your
signaling server (`ws://localhost:8080` for local development).

### Development

Run both the client and signaling server together:

```bash
npm run dev
```

Or individually:

```bash
npm run dev:server   # signaling server on :8080
npm run dev:client   # Vite dev server on :5173
```

Open `http://localhost:5173`. To test a transfer end-to-end, open the app
in two browser tabs (or two devices on the same network) — use one to send
and the other to receive.

## Environment Variables

See [`.env.example`](.env.example) for the full, annotated list. The most
important ones:

| Variable                | Applies to | Description                                              |
| ------------------------ | ---------- | --------------------------------------------------------- |
| `VITE_SIGNALING_URL`     | Client     | WebSocket URL of the signaling server (`wss://` in prod)   |
| `VITE_STUN_SERVER`       | Client     | STUN server for NAT traversal                              |
| `VITE_TURN_SERVER`       | Client     | TURN relay fallback (recommended for production)           |
| `VITE_TURN_USERNAME`     | Client     | TURN credential username                                   |
| `VITE_TURN_CREDENTIAL`   | Client     | TURN credential password                                   |
| `VITE_SESSION_TIMEOUT`   | Client     | Default session lifetime, in seconds                        |
| `PORT`                   | Server     | Port the signaling server listens on                        |
| `ALLOWED_ORIGINS`        | Server     | Comma-separated allowed browser origins                     |
| `NODE_ENV`               | Server     | `development` or `production` (affects log verbosity)       |

`VITE_*` variables are inlined into the client bundle at **build time** —
changing them requires a rebuild, not just a server restart.

## Signaling Server

The signaling server (`server/`) is a minimal Node.js + WebSocket service.
It is responsible only for:

- Creating and expiring sessions
- Relaying SDP offers/answers and ICE candidates between exactly two peers
  in a session
- Validating session tokens and pairing codes
- Rate limiting and origin validation

It never sees file names, file sizes, or file contents — see
[`shared/src/types.ts`](shared/src/types.ts) for what actually crosses the
signaling channel.

Run it standalone:

```bash
npm run build --workspace=shared
npm run build --workspace=server
node server/dist/server.js
```

A health check is available at `GET /health`.

## STUN / TURN Configuration

WebRTC needs STUN to discover a device's public address, and — for devices
behind symmetric NATs, carrier-grade NAT, or restrictive corporate
firewalls — a TURN relay to actually carry traffic when a direct
peer-to-peer path cannot be established.

- A public STUN server (Google's, by default) is enough for many
  connections but **not all**.
- For production, run your own TURN server (e.g. [coturn](https://github.com/coturn/coturn) —
  a commented-out service is included in `docker-compose.yml`) and set
  `VITE_TURN_SERVER`, `VITE_TURN_USERNAME`, and `VITE_TURN_CREDENTIAL`.

The application is transparent about this: it never claims a transfer is
always fully peer-to-peer, since a TURN relay may be involved. Traffic
through a TURN relay is still protected by WebRTC's own DTLS-SRTP
transport encryption.

## Testing

Each workspace has its own unit test suite (Vitest):

```bash
npm run test              # shared + server + client
npm run test --workspace=client
npm run test --workspace=server
npm run test --workspace=shared
```

Coverage focuses on the pieces where a silent bug would be worst: chunking,
backpressure, checksum computation and verification, the transfer state
machine, session expiration, and rate limiting.

Type-check and build as a combined correctness gate:

```bash
npm run typecheck
npm run build
```

## Production Build

```bash
npm run build
```

This builds `shared` first (both `server` and `client` depend on it), then
`server` (TypeScript → `server/dist`), then `client` (Vite → `client/dist`,
including the generated service worker and PWA manifest).

## Deployment

**Client** (`client/dist` is a static site): deploy to Vercel, Netlify,
Cloudflare Pages, or any static host / Nginx. A production-ready
`client/Dockerfile` (multi-stage build → Nginx) and `client/nginx.conf`
(SPA fallback, gzip, security headers, CSP) are included.

**Signaling server**: deploy anywhere Node.js runs — a VPS, a container
platform (Cloud Run, ECS, Azure Container Apps), or similar. A production
`server/Dockerfile` is included.

**Docker Compose** (both services together, for local or single-host
deployment):

```bash
docker compose up --build
```

## Security

- **No file data on the server.** File chunks travel exclusively over the
  WebRTC data channel — the signaling server relays only session metadata.
- **Short-lived, single-use sessions.** Tokens and pairing codes are
  cryptographically random and expire automatically.
- **Untrusted peer input is validated.** All metadata received from a peer
  is checked against a Zod schema; file names are sanitized to remove path
  separators and traversal sequences before being used as a save target.
- **Transport security + optional application-level encryption.** WebRTC's
  DTLS-SRTP encrypts the data channel by default; enabling
  "Application-level encryption" in Settings adds an AES-GCM layer under a
  fresh per-session key, for defense in depth.
- **Incoming transfers always require explicit approval** — files are never
  downloaded silently.
- Server-side: rate limiting, message size limits, and origin validation
  are enforced (see `server/src/security/`).

See [SECURITY.md](SECURITY.md) for the full threat model, how to report a
vulnerability, and known limitations of the reference signaling server.

## Browser Compatibility

Requires a browser with `RTCPeerConnection`/`RTCDataChannel`,
`crypto.subtle`, and IndexedDB. Tested against current Chrome, Edge,
Firefox, and Safari (desktop and mobile). Optional capabilities degrade
gracefully:

| Capability                    | Fallback when unavailable                          |
| ------------------------------ | --------------------------------------------------- |
| File System Access API         | IndexedDB-buffered download via a Blob             |
| Camera / QR scanning           | Manual pairing-code entry                           |
| Torch (flash) on QR scanner    | Hidden; scanning still works                        |

## Known Limitations

- Resuming a transfer survives a WebRTC reconnect (network blip) within the
  same browser tab, but **not** a full page reload — hashing and
  in-progress chunk state live in memory for the session's lifetime.
- The bundled signaling server is a reference implementation: in-memory
  session storage only, no clustering. For high-scale production use,
  consider backing session state with Redis or similar.
- A TURN server is not bundled or hosted for you; without one, some device
  pairs behind symmetric NATs will be unable to connect directly.

## License

[MIT](LICENSE)

---

See [CHANGELOG.md](CHANGELOG.md) for release history.
