import test from "node:test";
import assert from "node:assert/strict";
import { getHorizontalTravel } from "../public/gif-motion.js";

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
