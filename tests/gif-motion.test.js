import test from "node:test";
import assert from "node:assert/strict";
import { getHorizontalTravel, getSpawnSpacingMs } from "../public/gif-motion.js";

test("unflipped GIF travels from fully left of screen to fully right of screen", () => {
  assert.deepEqual(getHorizontalTravel({
    viewportWidth: 1920,
    scaledWidth: 320,
    flipped: false,
  }), {
    startX: -320,
    endX: 1920,
  });
});

test("flipped GIF travels far enough to leave the right edge completely", () => {
  assert.deepEqual(getHorizontalTravel({
    viewportWidth: 1920,
    scaledWidth: 320,
    flipped: true,
  }), {
    startX: 0,
    endX: 2240,
  });
});

test("spawn spacing creates a visible gap based on rendered width and travel speed", () => {
  assert.equal(getSpawnSpacingMs({
    viewportWidth: 1920,
    scaledWidth: 400,
    durationMs: 8000,
  }), 1035);
});

test("spawn spacing adapts to image scale, viewport, and duration", () => {
  const base = getSpawnSpacingMs({ viewportWidth: 1920, scaledWidth: 400, durationMs: 8000 });
  const larger = getSpawnSpacingMs({ viewportWidth: 1920, scaledWidth: 800, durationMs: 8000 });
  const faster = getSpawnSpacingMs({ viewportWidth: 1920, scaledWidth: 400, durationMs: 4000 });
  assert.ok(larger > base);
  assert.ok(faster < base);
});

test("invalid geometry produces no spacing delay", () => {
  assert.equal(getSpawnSpacingMs({ viewportWidth: 0, scaledWidth: 400, durationMs: 8000 }), 0);
});
