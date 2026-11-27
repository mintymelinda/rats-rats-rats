import test from "node:test";
import assert from "node:assert/strict";
import { createAlternatingGifDepth } from "../public/gif-depth.js";

test("alternates each spawned GIF between ahead and behind depth", () => {
  const nextDepth = createAlternatingGifDepth();

  assert.deepEqual(
    Array.from({ length: 6 }, () => nextDepth()),
    ["ahead", "behind", "ahead", "behind", "ahead", "behind"],
  );
});

test("each overlay depth sequence starts independently with an ahead GIF", () => {
  const first = createAlternatingGifDepth();
  const second = createAlternatingGifDepth();

  assert.equal(first(), "ahead");
  assert.equal(first(), "behind");
  assert.equal(second(), "ahead");
});
