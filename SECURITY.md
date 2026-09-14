# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in P2P File Share, please report it
privately rather than opening a public issue. Include:

- A description of the vulnerability and its potential impact
- Steps to reproduce it
- The affected version/commit

We aim to acknowledge reports within 3 business days and to ship a fix or
mitigation for confirmed critical issues within 14 days.

## Design Principles

P2P File Share's threat model and mitigations are described in the
[README's Security section](README.md#security). In summary:

- **No file data on the server.** The signaling server only ever relays
  session metadata (session IDs, tokens, SDP, ICE candidates). File chunks
  travel exclusively over the WebRTC data channel, directly between peers
  (or through a TURN relay, still end-to-end encrypted by DTLS-SRTP, when a
  direct connection is not possible).
- **Short-lived, single-use sessions.** Session tokens and pairing codes are
  cryptographically random, expire automatically (10–60 minutes,
  configurable), and are invalidated once a receiver joins.
- **Untrusted peer input.** All metadata received from a peer (file names,
  sizes, offer payloads) is validated against a schema and sanitized before
  use; file names are stripped of path separators and traversal sequences
  before being used as a save target.
- **Defense in depth for transport.** WebRTC's DTLS-SRTP already encrypts
  the data channel; an optional application-level AES-GCM layer is available
  for an additional layer of privacy under a fresh per-session key.
- **Rate limiting and input size limits** are enforced on the signaling
  server to reduce abuse potential (see `server/src/security/`).

## Known Limitations

- The signaling server, as shipped, is a minimal reference implementation
  without persistent storage, clustering, or a production-grade rate-limit
  backend (e.g. Redis). Review `server/src/security/rateLimiter.ts` before
  relying on it at scale.
- Resuming a transfer after a full page reload (not just a network
  reconnect within the same tab) is out of scope for the current release —
  see the README's "Known Limitations" section.
- Running your own TURN server is strongly recommended for production use;
  without one, some device pairs behind symmetric NATs will be unable to
  connect at all.

## Dependency Auditing

Run `npm audit` in each workspace (`client`, `server`, `shared`) as part of
your release process, and keep dependencies current via your usual update
workflow (Dependabot, Renovate, or manual review).
