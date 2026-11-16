import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig, parseMappings } from "../src/config.js";

test("loads the documented defaults", () => {
  const config = loadConfig({});
  assert.equal(config.channel, "mintymelinda");
  assert.equal(config.port, 3000);
  assert.equal(config.animationDurationMs, 8000);
  assert.equal(config.gifQueueIntervalMs, 500);
  assert.equal(config.scale, 2);
  assert.deepEqual(config.mappings.map(({ keyword, yOffsetPx }) => [keyword, yOffsetPx]), [
    ["mindyfRatNes", 0],
    ["mindyfRatDos", 0],
    ["mindyfRatSnes", 0],
  ]);
});

test("parses per-GIF paths and vertical offsets", () => {
  const mappings = parseMappings(JSON.stringify({
    rat: { path: "/assets/rat.gif", yOffsetPx: 120 },
    "another rat": { path: "/assets/another-rat.gif", yOffsetPx: -35 },
  }));
  assert.deepEqual(mappings.map(({ keyword, path, yOffsetPx }) => [keyword, path, yOffsetPx]), [
    ["rat", "/assets/rat.gif", 120],
    ["another rat", "/assets/another-rat.gif", -35],
  ]);
});

test("rejects invalid mapping JSON, values, paths, and offsets", () => {
  assert.throws(() => parseMappings("{"), /valid JSON object/);
  assert.throws(() => parseMappings("[]"), /JSON object/);
  assert.throws(() => parseMappings('{"rat":"/assets/rat.gif"}'), /must be an object/);
  assert.throws(() => parseMappings('{"rat":{"path":"/etc/passwd.gif"}}'), /under \/assets\//);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/../outside.gif"}}'), /escapes/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.png"}}'), /\.gif file/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.gif","yOffsetPx":1.5}}'), /yOffsetPx/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.gif","yOffsetPx":10001}}'), /yOffsetPx/);
});

test("validates scale, channel, duration, and port", () => {
  for (const scale of ["0", "3", "16", "1.5"]) {
    assert.throws(() => loadConfig({ GIF_SCALE: scale }), /GIF_SCALE/);
  }
  assert.equal(loadConfig({ GIF_SCALE: "8", TWITCH_CHANNEL: "#Example_Channel" }).scale, 8);
  assert.equal(loadConfig({ GIF_QUEUE_INTERVAL_MS: "1250" }).gifQueueIntervalMs, 1250);
  assert.equal(loadConfig({ GIF_QUEUE_INTERVAL_MS: "0" }).gifQueueIntervalMs, 0);
  assert.throws(() => loadConfig({ GIF_QUEUE_INTERVAL_MS: "-1" }), /GIF_QUEUE_INTERVAL_MS/);
  assert.throws(() => loadConfig({ GIF_QUEUE_INTERVAL_MS: "60001" }), /GIF_QUEUE_INTERVAL_MS/);
  assert.throws(() => loadConfig({ TWITCH_CHANNEL: "not a channel" }), /TWITCH_CHANNEL/);
  assert.throws(() => loadConfig({ ANIMATION_DURATION_MS: "0" }), /ANIMATION_DURATION_MS/);
  assert.throws(() => loadConfig({ PORT: "70000" }), /PORT/);
});
