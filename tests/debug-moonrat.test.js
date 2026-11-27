import test from "node:test";
import assert from "node:assert/strict";
import { getDebugMoonratKeyword } from "../src/debug-moonrat.js";

test("allows MintyMelinda's exact NES moonrat debug command", () => {
  assert.equal(getDebugMoonratKeyword("MintyMelinda", "debugMoonRatmindyfRatNes"), "mindyfRatNes");
});

test("allows PYOSHI to use the same exact NES moonrat debug command", () => {
  assert.equal(getDebugMoonratKeyword("PYOSHI", "debugMoonRatmindyfRatNes"), "mindyfRatNes");
});

test("rejects other users and non-exact command text", () => {
  assert.equal(getDebugMoonratKeyword("someoneelse", "debugMoonRatmindyfRatNes"), null);
  assert.equal(getDebugMoonratKeyword("MintyMelinda", "debugMoonRatmindfRatNes"), null);
  assert.equal(getDebugMoonratKeyword("PYOSHI", "debugMoonRatmindfRatNes"), null);
  assert.equal(getDebugMoonratKeyword("PYOSHI", " debugMoonRatmindyfRatNes"), null);
});
