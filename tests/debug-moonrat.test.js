import test from "node:test";
import assert from "node:assert/strict";
import { findDebugMoonratCommand, getDebugMoonratKeyword } from "../src/debug-moonrat.js";

test("allows MintyMelinda's exact NES moonrat debug command", () => {
  assert.equal(getDebugMoonratKeyword("MintyMelinda", "debugMoonRatmindyfRatNes"), "mindyfRatNes");
});

test("allows PYOSHI to use the same exact NES moonrat debug command", () => {
  assert.equal(getDebugMoonratKeyword("PYOSHI", "debugMoonRatmindyfRatNes"), "mindyfRatNes");
});

test("recognizes the debug command as a separate token in a burst of emotes", () => {
  const message = "mindyfRatDos mindyfRatNes mindyfRatDos mindyfRatSnes debugMoonRatmindyfRatNes mindyfRatDos mindyfRatNes mindyfRatDos mindyfRatSnes";
  assert.deepEqual(findDebugMoonratCommand("MintyMelinda", message), {
    keyword: "mindyfRatNes",
    index: message.indexOf("debugMoonRatmindyfRatNes"),
    length: "debugMoonRatmindyfRatNes".length,
  });
  assert.equal(findDebugMoonratCommand("someoneelse", message), null);
});

test("rejects embedded command fragments and altered command text", () => {
  assert.equal(getDebugMoonratKeyword("MintyMelinda", "prefixdebugMoonRatmindyfRatNes"), null);
  assert.equal(getDebugMoonratKeyword("MintyMelinda", "debugMoonRatmindfRatNes"), null);
  assert.equal(getDebugMoonratKeyword("PYOSHI", " debugMoonRatmindyfRatNes suffix"), "mindyfRatNes");
});
