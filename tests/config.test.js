import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig, parseMappings } from "../src/config.js";

test("loads the documented defaults", () => {
  const config = loadConfig({});
  assert.equal(config.channel, "mintymelinda");
  assert.equal(config.port, 3000);
  assert.equal(config.gifQueueIntervalMs, 500);
  assert.deepEqual(config.mappings.map(({ keyword, durationMs, scale, yOffsetPx }) => [
    keyword,
    durationMs,
    scale,
    yOffsetPx,
  ]), [
    ["mindyfRatNes", 8000, 2, 0],
    ["mindyfRatDos", 8000, 2, 0],
    ["mindyfRatSnes", 8000, 2, 0],
  ]);
});

test("parses per-GIF paths, animation durations, scales, and vertical offsets", () => {
  const mappings = parseMappings(JSON.stringify({
    rat: { path: "/assets/rat.gif", durationMs: 12000, scale: 4, yOffsetPx: 120 },
    "another rat": { path: "/assets/another-rat.gif", durationMs: 4500, scale: 1, yOffsetPx: -35 },
  }));
  assert.deepEqual(mappings.map(({ keyword, path, durationMs, scale, yOffsetPx }) => [
    keyword,
    path,
    durationMs,
    scale,
    yOffsetPx,
  ]), [
    ["rat", "/assets/rat.gif", 12000, 4, 120],
    ["another rat", "/assets/another-rat.gif", 4500, 1, -35],
  ]);
});

test("rejects invalid mapping JSON, values, paths, durations, scales, and offsets", () => {
  assert.throws(() => parseMappings("{"), /valid JSON object/);
  assert.throws(() => parseMappings("[]"), /JSON object/);
  assert.throws(() => parseMappings('{"rat":"/assets/rat.gif"}'), /must be an object/);
  assert.throws(() => parseMappings('{"rat":{"path":"/etc/passwd.gif"}}'), /under \/assets\//);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/../outside.gif"}}'), /escapes/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.png"}}'), /\.gif file/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.gif","yOffsetPx":1.5}}'), /yOffsetPx/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.gif","yOffsetPx":10001}}'), /yOffsetPx/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.gif","durationMs":249}}'), /durationMs/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.gif","durationMs":120001}}'), /durationMs/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.gif","scale":3}}'), /scale/);
});

test("validates channel, port, and queue interval", () => {
  assert.equal(loadConfig({ TWITCH_CHANNEL: "#Example_Channel" }).channel, "example_channel");
  assert.equal(loadConfig({ GIF_QUEUE_INTERVAL_MS: "1250" }).gifQueueIntervalMs, 1250);
  assert.equal(loadConfig({ GIF_QUEUE_INTERVAL_MS: "0" }).gifQueueIntervalMs, 0);
  assert.throws(() => loadConfig({ GIF_QUEUE_INTERVAL_MS: "-1" }), /GIF_QUEUE_INTERVAL_MS/);
  assert.throws(() => loadConfig({ GIF_QUEUE_INTERVAL_MS: "60001" }), /GIF_QUEUE_INTERVAL_MS/);
  assert.throws(() => loadConfig({ TWITCH_CHANNEL: "not a channel" }), /TWITCH_CHANNEL/);
  assert.throws(() => loadConfig({ PORT: "70000" }), /PORT/);
});
