import test from "node:test";
import assert from "node:assert/strict";
import { shouldMoonwalk } from "../src/moonwalk.js";

test("moonwalk chance is exactly one percent", () => {
  assert.equal(shouldMoonwalk(() => 0), true);
  assert.equal(shouldMoonwalk(() => 0.009999), true);
  assert.equal(shouldMoonwalk(() => 0.01), false);
  assert.equal(shouldMoonwalk(() => 0.5), false);
  assert.equal(shouldMoonwalk(() => 0.999999), false);
});
