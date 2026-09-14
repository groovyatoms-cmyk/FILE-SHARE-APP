import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import {
  SIGNALING_RATE_LIMIT_MAX_MESSAGES,
  SIGNALING_RATE_LIMIT_WINDOW_MS,
} from "@p2p/shared";
import { SessionManager } from "./sessions/sessionManager.js";
import { RateLimiter } from "./security/rateLimiter.js";
import { isOriginAllowed, parseAllowedOrigins } from "./security/origin.js";
import { SignalingRelay, clientIpFor } from "./signaling/relay.js";
import { logger } from "./utils/logger.js";

const PORT = Number(process.env.PORT ?? 8080);
const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
const HEARTBEAT_INTERVAL_MS = 30_000;
const SESSION_SWEEP_INTERVAL_MS = 15_000;
const CONNECTION_RATE_LIMIT_MAX = 20; // new connections per IP per window

interface TrackedSocket extends WebSocket {
  isAlive?: boolean;
}

const sessions = new SessionManager();
const messageRateLimiter = new RateLimiter(SIGNALING_RATE_LIMIT_WINDOW_MS, SIGNALING_RATE_LIMIT_MAX_MESSAGES);
const connectionRateLimiter = new RateLimiter(SIGNALING_RATE_LIMIT_WINDOW_MS, CONNECTION_RATE_LIMIT_MAX);
const relay = new SignalingRelay({ sessions, rateLimiter: messageRateLimiter });

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", activeSessions: sessions.activeSessionCount }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  const origin = req.headers.origin;
  if (!isOriginAllowed(origin, ALLOWED_ORIGINS)) {
    logger.warn("rejected connection: disallowed origin", { origin });
    socket.destroy();
    return;
  }
  const ip = clientIpFor(req);
  if (!connectionRateLimiter.check(ip)) {
    logger.warn("rejected connection: rate limited");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws: TrackedSocket, req) => {
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });
  relay.handleConnection(ws, req);
  logger.debug("client connected");
});

// Heartbeat: terminate dead connections so sessions don't leak.
const heartbeat = setInterval(() => {
  for (const client of wss.clients) {
    const ws = client as TrackedSocket;
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_INTERVAL_MS);

const sweepTimer = setInterval(() => {
  sessions.sweepExpired();
  messageRateLimiter.sweep();
  connectionRateLimiter.sweep();
}, SESSION_SWEEP_INTERVAL_MS);

httpServer.listen(PORT, () => {
  logger.info(`signaling server listening on port ${PORT}`);
});

function shutdown(): void {
  logger.info("shutting down signaling server");
  clearInterval(heartbeat);
  clearInterval(sweepTimer);
  wss.close();
  httpServer.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
