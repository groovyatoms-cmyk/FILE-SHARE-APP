# Contributing to P2P File Share

Thank you for your interest in contributing. This document covers how the
project is organized and how to get a change merged.

## Project Structure

This is an npm-workspaces monorepo:

```text
p2p-file-share/
├── client/    React + Vite + TypeScript + MUI frontend
├── server/    Node.js signaling server (WebSocket)
├── shared/    Types, zod schemas, and protocol constants shared by both
└── docker-compose.yml
```

See the [README](README.md) for architecture details.

## Getting Started

```bash
npm install
cp .env.example client/.env.local
cp .env.example server/.env   # only PORT / ALLOWED_ORIGINS / NODE_ENV matter here
npm run dev
```

## Development Workflow

1. Create a branch from `main`.
2. Make your change, keeping it scoped to one concern.
3. Add or update tests for any behavior change — this project treats the
   transfer engine (chunking, backpressure, checksum, resume) as
   correctness-critical, and changes there should always come with tests.
4. Run the full check suite before opening a PR:
   ```bash
   npm run typecheck
   npm run test
   npm run build
   ```
5. Open a pull request describing what changed and why.

## Code Style

- TypeScript `strict` mode is on across all three packages — please don't
  introduce `any` without a specific reason (and a comment explaining it).
- Keep networking/business logic out of React components; put it in
  `client/src/services/`.
- Prefer small, focused modules over large multi-purpose ones.
- Comments should explain *why*, not *what* — code should be self-descriptive
  through naming.

## Reporting Bugs / Requesting Features

Please open an issue with:

- A clear description of the problem or proposal
- Steps to reproduce (for bugs), including browser/OS
- What you expected to happen vs. what actually happened

For security vulnerabilities, see [SECURITY.md](SECURITY.md) instead of
opening a public issue.
