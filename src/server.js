import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { loadConfig } from "./config.js";
import { createMappingManager } from "./mapping-manager.js";
import { handleMappingCommand } from "./mapping-commands.js";
import { findMatchesWithPositions } from "./matcher.js";
import { shouldMoonwalk } from "./moonwalk.js";
import { findTwitchEmote } from "./twitch-emotes.js";
import { createTwitchEmoteCatalog } from "./twitch-emote-catalog.js";
import { filterDebugMoonratKeywordMatch, findDebugMoonratCommands } from "./debug-moonrat.js";
import { TwitchIrcClient } from "./twitch-irc.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const config = loadConfig();
const mappingManager = createMappingManager({
  filePath: config.mappingsFile,
  initialDefinitions: config.mappingDefinitions,
});
config.mappings = mappingManager.mappings;
const emoteCatalog = createTwitchEmoteCatalog({
  clientId: config.twitchClientId,
  clientSecret: config.twitchClientSecret,
});

for (const mapping of config.mappings) {
  if (!mapping.exists) {
    const sourceDescription = mapping.path
      ? `GIF not found: ${mapping.path}`
      : "no local GIF configured";
    console.warn(`No local GIF for keyword "${mapping.keyword}" (${sourceDescription}; will use a matching Twitch emote when available)`);
  }
}
console.info(`Loaded ${config.mappings.length} keyword mapping(s) for #${config.channel}`);
if (config.mappingsFile) console.info(`Persistent GIF mappings: ${config.mappingsFile}`);
if (config.moonratDebug) {
  console.warn("MOONRAT debug mode enabled: every GIF spawn will moonwalk");
}

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
  ["/gif-queue.js", "gif-queue.js"],
  ["/gif-scheduler.js", "gif-scheduler.js"],
  ["/gif-motion.js", "gif-motion.js"],
  ["/gif-depth.js", "gif-depth.js"],
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
  socket.send(JSON.stringify({ type: "connected", moonratColors: config.moonratColors }));
});

function broadcast(payload) {
  const encoded = JSON.stringify(payload);
  for (const client of webSockets.clients) {
    if (client.readyState === 1) client.send(encoded);
  }
}

const irc = new TwitchIrcClient({
  channel: config.channel,
  async onMessage(message, tags, username) {
    const command = handleMappingCommand({ username, message, manager: mappingManager });
    if (command.handled) {
      if (command.error) console.warn(`Mapping command from ${username}: ${command.error}`);
      if (command.action) {
        config.mappings = mappingManager.mappings;
        broadcast({ type: "mappings-updated", keywords: config.mappings.map(({ keyword }) => keyword) });
      }
      return;
    }

    config.mappings = mappingManager.mappings;
    const debugCommands = findDebugMoonratCommands(username, message, config.mappings);
    let events = findMatchesWithPositions(message, config.mappings);
    events = filterDebugMoonratKeywordMatch(events, debugCommands);
    for (const debugCommand of debugCommands) {
      const mappingIndex = config.mappings.findIndex(
        (mapping) => mapping.normalizedKeyword === debugCommand.keyword.toLocaleLowerCase("en-US"),
      );
      if (mappingIndex !== -1) {
        events.push({
          mapping: config.mappings[mappingIndex],
          index: debugCommand.index,
          mappingIndex,
          debug: true,
        });
      }
    }

    events.sort((a, b) => a.index - b.index || a.mappingIndex - b.mappingIndex);
    for (const event of events) {
      const match = event.mapping;
      let src = match.path;
      if (!match.exists) {
        const taggedEmote = findTwitchEmote(message, tags.emotes, match.keyword);
        const catalogEmote = taggedEmote || emoteCatalog.find(match.keyword) || await emoteCatalog.resolve(match.keyword);
        src = catalogEmote?.src;
      }
      if (!src) continue;

      broadcast({
        type: "spawn",
        keyword: match.keyword,
        src,
        durationMs: match.durationMs,
        scale: match.scale,
        queueIntervalMs: config.gifQueueIntervalMs,
        yOffsetPx: match.yOffsetPx,
        flip: match.flip,
        moonratText: match.moonratText,
        moonwalk: event.debug ? true : shouldMoonwalk(Math.random, config.moonratDebug),
      });
    }
  },
});

server.listen(config.port, "0.0.0.0", async () => {
  console.info(`Overlay listening on http://0.0.0.0:${config.port}`);
  if (emoteCatalog.enabled) {
    try {
      await emoteCatalog.refresh();
      emoteCatalog.start();
    } catch (error) {
      console.warn(`Unable to load Twitch emote catalog; IRC emote-tag fallback remains available: ${error.message}`);
      emoteCatalog.start();
    }
  } else {
    console.info("Twitch emote catalog disabled; set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET to enable it");
  }
  irc.start();
});

function shutdown(signal) {
  console.info(`${signal} received; shutting down`);
  irc.stop();
  emoteCatalog.stop();
  for (const client of webSockets.clients) client.close(1001, "Server shutting down");
  webSockets.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
