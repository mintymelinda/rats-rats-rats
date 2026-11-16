import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig, parseMappings } from "../src/config.js";

test("loads the documented defaults", () => {
  const config = loadConfig({});
  assert.equal(config.channel, "mintymelinda");
  assert.equal(config.port, 3000);
  assert.equal(config.animationDurationMs, 8000);
  assert.equal(config.gifQueueIntervalMs, 500);
  assert.equal(config.gifYOffsetPx, 0);
  assert.equal(config.scale, 2);
  assert.deepEqual(config.mappings.map(({ keyword }) => keyword), [
    "mindyfRatNes",
    "mindyfRatDos",
    "mindyfRatSnes",
  ]);
});

test("accepts configurable keyword-to-GIF pairs", () => {
  const mappings = parseMappings(JSON.stringify({
    rat: "/assets/rat.gif",
    "another rat": "/assets/another-rat.gif",
  }));
  assert.deepEqual(mappings.map(({ keyword, path }) => [keyword, path]), [
    ["rat", "/assets/rat.gif"],
    ["another rat", "/assets/another-rat.gif"],
  ]);
});

test("rejects invalid mapping JSON, values, and paths", () => {
  assert.throws(() => parseMappings("{"), /valid JSON object/);
  assert.throws(() => parseMappings("[]"), /JSON object/);
  assert.throws(() => parseMappings('{"rat":"/etc/passwd.gif"}'), /under \/assets\//);
  assert.throws(() => parseMappings('{"rat":"/assets/../outside.gif"}'), /escapes/);
  assert.throws(() => parseMappings('{"rat":"/assets/rat.png"}'), /\.gif file/);
});

test("validates scale, channel, duration, and port", () => {
  for (const scale of ["0", "3", "16", "1.5"]) {
    assert.throws(() => loadConfig({ GIF_SCALE: scale }), /GIF_SCALE/);
  }
  assert.equal(loadConfig({ GIF_SCALE: "8", TWITCH_CHANNEL: "#Example_Channel" }).scale, 8);
  assert.equal(loadConfig({ GIF_QUEUE_INTERVAL_MS: "1250" }).gifQueueIntervalMs, 1250);
  assert.equal(loadConfig({ GIF_Y_OFFSET_PX: "120" }).gifYOffsetPx, 120);
  assert.equal(loadConfig({ GIF_Y_OFFSET_PX: "-35" }).gifYOffsetPx, -35);
  assert.throws(() => loadConfig({ GIF_Y_OFFSET_PX: "1.5" }), /GIF_Y_OFFSET_PX/);
  assert.throws(() => loadConfig({ GIF_Y_OFFSET_PX: "10001" }), /GIF_Y_OFFSET_PX/);
  assert.equal(loadConfig({ GIF_QUEUE_INTERVAL_MS: "0" }).gifQueueIntervalMs, 0);
  assert.throws(() => loadConfig({ GIF_QUEUE_INTERVAL_MS: "-1" }), /GIF_QUEUE_INTERVAL_MS/);
  assert.throws(() => loadConfig({ GIF_QUEUE_INTERVAL_MS: "60001" }), /GIF_QUEUE_INTERVAL_MS/);
  assert.throws(() => loadConfig({ TWITCH_CHANNEL: "not a channel" }), /TWITCH_CHANNEL/);
  assert.throws(() => loadConfig({ ANIMATION_DURATION_MS: "0" }), /ANIMATION_DURATION_MS/);
  assert.throws(() => loadConfig({ PORT: "70000" }), /PORT/);
});
