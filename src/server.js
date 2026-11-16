import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { loadConfig } from "./config.js";
import { findMatches } from "./matcher.js";
import { TwitchIrcClient } from "./twitch-irc.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const config = loadConfig();

for (const mapping of config.mappings) {
  if (!mapping.exists) {
    console.warn(`GIF for keyword "${mapping.keyword}" not found: ${mapping.path} (will be skipped until the file is added)`);
  }
}
console.info(`Loaded ${config.mappings.length} keyword mapping(s) for #${config.channel}; scale=${config.scale}; duration=${config.animationDurationMs}ms`);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".gif": "image/gif",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function sendFile(response, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  fs.createReadStream(filePath).pipe(response);
}

const publicFiles = new Map([
  ["/overlay.js", "overlay.js"],
  ["/overlay.css", "overlay.css"],
]);

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/healthz") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ status: "ok", channel: config.channel }));
    return;
  }
  if (pathname === "/" || pathname === "/overlay") {
    sendFile(response, path.join(PUBLIC_DIR, "index.html"));
    return;
  }
  const publicFile = publicFiles.get(pathname);
  if (publicFile) {
    sendFile(response, path.join(PUBLIC_DIR, publicFile));
    return;
  }
  if (pathname.startsWith("/assets/")) {
    const relative = pathname.slice("/assets/".length);
    const filePath = path.resolve("/assets", relative);
    if (!filePath.startsWith("/assets/")) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("Invalid asset path");
      return;
    }
    sendFile(response, filePath);
    return;
  }
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
});

const webSockets = new WebSocketServer({ noServer: true });
server.on("upgrade", (request, socket, head) => {
  if (new URL(request.url, "http://localhost").pathname !== "/ws") {
    socket.destroy();
    return;
  }
  webSockets.handleUpgrade(request, socket, head, (webSocket) => {
    webSockets.emit("connection", webSocket, request);
  });
});

webSockets.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "connected" }));
});

function broadcast(payload) {
  const encoded = JSON.stringify(payload);
  for (const client of webSockets.clients) {
    if (client.readyState === 1) client.send(encoded);
  }
}

const irc = new TwitchIrcClient({
  channel: config.channel,
  onMessage(message) {
    for (const match of findMatches(message, config.mappings)) {
      if (!match.exists) continue;
      broadcast({
        type: "spawn",
        keyword: match.keyword,
        src: match.path,
        durationMs: config.animationDurationMs,
        scale: config.scale,
        queueIntervalMs: config.gifQueueIntervalMs,
        yOffsetPx: config.gifYOffsetPx,
      });
    }
  },
});

server.listen(config.port, "0.0.0.0", () => {
  console.info(`Overlay listening on http://0.0.0.0:${config.port}`);
  irc.start();
});

function shutdown(signal) {
  console.info(`${signal} received; shutting down`);
  irc.stop();
  for (const client of webSockets.clients) client.close(1001, "Server shutting down");
  webSockets.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
