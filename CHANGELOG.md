# Changelog

All notable changes to P2P File Share are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-09-14

### Added

- Initial release of P2P File Share.
- Direct peer-to-peer file transfer over WebRTC data channels, with STUN
  support and an optional TURN relay fallback.
- Node.js/WebSocket signaling server for session creation, SDP/ICE relay,
  session expiration, rate limiting, and origin validation. Never relays
  file data.
- QR code pairing (`qrcode.react` / `html5-qrcode`), a numeric pairing-code
  fallback, and a shareable deep link.
- Chunked file transfer engine with:
  - Adaptive chunk sizing based on file size and device memory
  - Backpressure-aware sending via `RTCDataChannel.bufferedAmount` /
    `bufferedamountlow`
  - Resumable transfers across a WebRTC reconnect within the same session
  - Incremental SHA-256 integrity verification (sender and receiver)
  - Optional application-level AES-GCM encryption layered on top of
    WebRTC's transport encryption
- Direct-to-disk writes via the File System Access API where supported,
  with an IndexedDB-backed fallback for other browsers.
- Multi-file, drag-and-drop send queue; live per-file and overall progress,
  speed, and ETA with a smoothed rolling average.
- Explicit transfer state machine (`IDLE` → … → `COMPLETED` /
  `FAILED` / `CANCELLED` / `EXPIRED`) backing the UI, instead of ad-hoc
  boolean flags.
- Full Material UI interface: Home, Send, Receive (scan/code), Transfer
  dashboard, History, Settings, About, and Privacy pages; light, dark, and
  system themes; responsive down to mobile widths.
- Local-only transfer history (metadata only, never file contents), with a
  one-click clear.
- Installable PWA: web app manifest, service worker, offline app shell.
- Unit test coverage for the transfer engine (chunking, backpressure loop,
  resume, checksum), the transfer state machine, session management, rate
  limiting, and protocol schema validation.
- Docker support: production `Dockerfile` for both the client (Nginx) and
  the signaling server, plus a `docker-compose.yml` wiring both together.
- Documentation: README, SECURITY.md, CONTRIBUTING.md, `.env.example`.

[1.0.0]: https://github.com/groovyatoms-cmyk/file-share-app/releases/tag/v1.0.0
