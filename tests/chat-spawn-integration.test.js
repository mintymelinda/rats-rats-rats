import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { resolveChatSpawnEvents } from "../src/chat-spawn-events.js";
import { createGifScheduler } from "../public/gif-scheduler.js";

test("one Twitch chat message reaches the browser scheduler as every mapped GIF in message order", async (t) => {
  const mappings = [
    { keyword: "mindyfRatNes", normalizedKeyword: "mindyfratnes", path: "/assets/rat-nes.gif", exists: true, durationMs: 8000, scale: 2, yOffsetPx: 0, flip: false, moonratText: "MOONRAT" },
    { keyword: "mindyfRatDos", normalizedKeyword: "mindyfratdos", path: "/assets/rat-dos.gif", exists: true, durationMs: 8000, scale: 2, yOffsetPx: 80, flip: false, moonratText: "MOONRAT" },
    { keyword: "mindyfRatSnes", normalizedKeyword: "mindyfratsnes", path: "/assets/rat-snes.gif", exists: true, durationMs: 8000, scale: 2, yOffsetPx: 160, flip: false, moonratText: "MOONRAT" },
  ];
  const emoteRegistry = { get: () => null, resolve: async () => null };
  const events = await resolveChatSpawnEvents({
    message: "mindyfRatSnes mindyfDog mindyfRatNes mindyfRatDos mindyfCow",
    tags: { emotes: "" },
    username: "viewer",
    mappings,
    emoteRegistry,
    queueIntervalMs: 500,
    random: () => 0.5,
  });

  assert.deepEqual(events.map(({ keyword }) => keyword), [
    "mindyfRatSnes",
    "mindyfRatNes",
    "mindyfRatDos",
  ]);

  const server = http.createServer();
  const webSockets = new WebSocketServer({ server });
  const spawned = [];
  const timers = [];
  const scheduler = createGifScheduler({
    setTimer(callback, delay) {
      const timer = { callback, delay };
      timers.push(timer);
      return timer;
    },
    spawnRegularGif(gif, complete) {
      spawned.push(gif.keyword);
    },
    spawnMoonwalkGif() {
      assert.fail("This input should not start a MOONRAT stage");
    },
  });

  webSockets.on("connection", (socket) => {
    socket.on("message", (data) => {
      const payload = JSON.parse(data.toString());
      if (payload.type === "spawn") scheduler.enqueue(payload);
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const client = new WebSocket(`ws://127.0.0.1:${address.port}`);
  t.after(async () => {
    client.close();
    await new Promise((resolve) => webSockets.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  });
  await new Promise((resolve, reject) => {
    client.once("open", resolve);
    client.once("error", reject);
  });

  for (const event of events) {
    for (const peer of webSockets.clients) peer.send(JSON.stringify(event));
  }

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(spawned, ["mindyfRatSnes"]);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 500);

  timers[0].callback();
  assert.deepEqual(spawned, ["mindyfRatSnes", "mindyfRatNes"]);
  assert.equal(timers[1].delay, 500);

  timers[1].callback();
  assert.deepEqual(spawned, ["mindyfRatSnes", "mindyfRatNes", "mindyfRatDos"]);
});
