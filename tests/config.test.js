import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig, parseMappings } from "../src/config.js";

test("loads the documented defaults", () => {
  const config = loadConfig({});
  assert.equal(config.channel, "mintymelinda");
  assert.equal(config.port, 3000);
  assert.equal(config.gifQueueIntervalMs, 500);
  assert.equal(config.moonratDebug, false);
  assert.equal(config.twitchClientId, "");
  assert.equal(config.twitchClientSecret, "");
  assert.deepEqual(config.moonratColors, {
    text: "#fff36b",
    outline: "#a400a8",
    glow: "#fff36b",
  });
  assert.deepEqual(config.mappings.map(({ keyword, durationMs, scale, yOffsetPx, flip, moonratText }) => [
    keyword,
    durationMs,
    scale,
    yOffsetPx,
    flip,
    moonratText,
  ]), [
    ["mindyfRatNes", 8000, 2, 0, false, "MOONRAT"],
    ["mindyfRatDos", 8000, 2, 0, false, "MOONRAT"],
    ["mindyfRatSnes", 8000, 2, 0, false, "MOONRAT"],
  ]);
});

test("infers the moonwalk announcement from the first PascalCase keyword segment", () => {
  const mappings = parseMappings(JSON.stringify({
    mindyfRatNes: { path: "/assets/rat-nes.gif" },
    mindyfCow: { path: "/assets/cow.gif" },
    mindyfDog: { path: "/assets/dog.gif" },
    mindyfRatSnes: { path: "/assets/rat-snes.gif" },
  }));

  assert.deepEqual(mappings.map(({ moonratText }) => moonratText), [
    "MOONRAT",
    "MOONCOW",
    "MOONDOG",
    "MOONRAT",
  ]);
});

test("allows a per-GIF moonratText override and normalizes it to uppercase", () => {
  const [mapping] = parseMappings(JSON.stringify({
    mindyfRatNes: { path: "/assets/rat.gif", moonratText: "moon-beast" },
  }));

  assert.equal(mapping.moonratText, "MOON-BEAST");
  assert.throws(() => parseMappings(JSON.stringify({
    mindyfRatNes: { path: "/assets/rat.gif", moonratText: "  " },
  })), /moonratText/);
});

test("parses per-GIF paths, animation durations, scales, offsets, and flips", () => {
  const mappings = parseMappings(JSON.stringify({
    rat: { path: "/assets/rat.gif", durationMs: 12000, scale: 4, yOffsetPx: 120, flip: true },
    "another rat": { path: "/assets/another-rat.gif", durationMs: 4500, scale: 1, yOffsetPx: -35 },
  }));
  assert.deepEqual(mappings.map(({ keyword, path, durationMs, scale, yOffsetPx, flip }) => [
    keyword,
    path,
    durationMs,
    scale,
    yOffsetPx,
    flip,
  ]), [
    ["rat", "/assets/rat.gif", 12000, 4, 120, true],
    ["another rat", "/assets/another-rat.gif", 4500, 1, -35, false],
  ]);
});

test("allows a Twitch-emote-only mapping with no local GIF path", () => {
  const [mapping] = parseMappings(JSON.stringify({
    graped4Based: { durationMs: 4000, scale: 1, yOffsetPx: 0, flip: false },
  }));

  assert.equal(mapping.keyword, "graped4Based");
  assert.equal(mapping.path, null);
  assert.equal(mapping.exists, false);
  assert.equal(mapping.durationMs, 4000);
  assert.equal(mapping.scale, 1);
  assert.equal(mapping.yOffsetPx, 0);
  assert.equal(mapping.flip, false);
});

test("rejects invalid mapping JSON, values, paths, durations, scales, offsets, and flips", () => {
  assert.throws(() => parseMappings("{"), /valid JSON object/);
  assert.throws(() => parseMappings("[]"), /JSON object/);
  assert.throws(() => parseMappings('{"rat":"/assets/rat.gif"}'), /must be an object/);
  assert.throws(() => parseMappings('{"rat":{"path":"/etc/passwd.gif"}}'), /under \/assets\//);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/../outside.gif"}}'), /escapes/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.png"}}'), /\.gif file/);
  assert.throws(() => parseMappings('{"rat":{"path":null}}'), /under \/assets\//);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.gif","yOffsetPx":1.5}}'), /yOffsetPx/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.gif","yOffsetPx":10001}}'), /yOffsetPx/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.gif","durationMs":249}}'), /durationMs/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.gif","durationMs":120001}}'), /durationMs/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.gif","scale":3}}'), /scale/);
  assert.throws(() => parseMappings('{"rat":{"path":"/assets/rat.gif","flip":"true"}}'), /flip/);
});

test("validates channel, port, queue interval, MOONRAT debug flag, and announcement colors", () => {
  assert.equal(loadConfig({ TWITCH_CHANNEL: "#Example_Channel" }).channel, "example_channel");
  assert.equal(loadConfig({ GIF_QUEUE_INTERVAL_MS: "1250" }).gifQueueIntervalMs, 1250);
  assert.equal(loadConfig({ GIF_QUEUE_INTERVAL_MS: "0" }).gifQueueIntervalMs, 0);
  assert.equal(loadConfig({ MOONRAT_DEBUG: "true" }).moonratDebug, true);
  assert.equal(loadConfig({ MOONRAT_DEBUG: "false" }).moonratDebug, false);
  assert.deepEqual(loadConfig({
    MOONRAT_TEXT_COLOR: "#ff00aa",
    MOONRAT_OUTLINE_COLOR: "#1234",
    MOONRAT_GLOW_COLOR: "#abcdef88",
  }).moonratColors, {
    text: "#ff00aa",
    outline: "#1234",
    glow: "#abcdef88",
  });
  assert.throws(() => loadConfig({ MOONRAT_DEBUG: "yes" }), /MOONRAT_DEBUG/);
  assert.throws(() => loadConfig({ MOONRAT_TEXT_COLOR: "red" }), /MOONRAT_TEXT_COLOR/);
  assert.throws(() => loadConfig({ MOONRAT_OUTLINE_COLOR: "url\\(javascript:alert\\(1\\)\\)" }), /MOONRAT_OUTLINE_COLOR/);
  assert.throws(() => loadConfig({ GIF_QUEUE_INTERVAL_MS: "-1" }), /GIF_QUEUE_INTERVAL_MS/);
  assert.throws(() => loadConfig({ GIF_QUEUE_INTERVAL_MS: "60001" }), /GIF_QUEUE_INTERVAL_MS/);
  assert.throws(() => loadConfig({ TWITCH_CHANNEL: "not a channel" }), /TWITCH_CHANNEL/);
  assert.throws(() => loadConfig({ PORT: "70000" }), /PORT/);
  assert.throws(() => loadConfig({ TWITCH_CLIENT_ID: "client-id" }), /both be set/);
});
