import test from "node:test";
import assert from "node:assert/strict";
import {
  filterDebugMoonratKeywordMatch,
  findDebugMoonratCommand,
  findDebugMoonratCommands,
  getDebugMoonratKeyword,
} from "../src/debug-moonrat.js";
import { findMatchesWithPositions } from "../src/matcher.js";

const mappings = [
  { keyword: "mindyfRatNes", normalizedKeyword: "mindyfratnes", moonratText: "MOONRAT" },
  { keyword: "mindyfCow", normalizedKeyword: "mindyfcow", moonratText: "MOONCOW" },
  { keyword: "mindyfDog", normalizedKeyword: "mindyfdog", moonratText: "MOONDOG" },
];

test("allows MintyMelinda's configured NES moonrat debug command", () => {
  assert.equal(getDebugMoonratKeyword("MintyMelinda", "debugMoonRatmindyfRatNes", mappings), "mindyfRatNes");
});

test("allows PYOSHI to use the same configured debug commands", () => {
  assert.equal(getDebugMoonratKeyword("PYOSHI", "debugMoonRatmindyfRatNes", mappings), "mindyfRatNes");
  assert.equal(getDebugMoonratKeyword("PYOSHI", "debugMoonRatmindyfCow", mappings), "mindyfCow");
});

test("selects the exact keyword mapping so its configured moonratText is used", () => {
  const command = findDebugMoonratCommand("MintyMelinda", "debugMoonRatmindyfCow", mappings);
  assert.deepEqual(command, {
    keyword: "mindyfCow",
    index: 0,
    length: "debugMoonRatmindyfCow".length,
  });
  assert.equal(mappings.find((mapping) => mapping.keyword === command.keyword).moonratText, "MOONCOW");
});

test("does not also treat the keyword suffix inside a debug command as a regular GIF match", () => {
  const message = "before debugMoonRatmindyfCow after";
  const commands = findDebugMoonratCommands("MintyMelinda", message, mappings);
  const regularEvents = findMatchesWithPositions(message, mappings);
  const filteredEvents = filterDebugMoonratKeywordMatch(regularEvents, commands);

  assert.equal(regularEvents.some((event) => event.mapping.keyword === "mindyfCow"), true);
  assert.deepEqual(filteredEvents, []);
});

test("recognizes keyword-specific debug commands as separate tokens in a burst", () => {
  const message = "mindyfRatDos mindyfRatNes mindyfRatDos mindyfRatSnes debugMoonRatmindyfCow mindyfRatDos";
  assert.deepEqual(findDebugMoonratCommand("MintyMelinda", message, mappings), {
    keyword: "mindyfCow",
    index: message.indexOf("debugMoonRatmindyfCow"),
    length: "debugMoonRatmindyfCow".length,
  });
  assert.equal(findDebugMoonratCommand("someoneelse", message, mappings), null);
});

test("finds every repeated debug command and preserves each command's position", () => {
  const message = "debugMoonRatmindyfDog debugMoonRatmindyfDog";
  assert.deepEqual(findDebugMoonratCommands("MintyMelinda", message, mappings), [
    { keyword: "mindyfDog", index: 0, length: "debugMoonRatmindyfDog".length },
    {
      keyword: "mindyfDog",
      index: message.indexOf("debugMoonRatmindyfDog", 1),
      length: "debugMoonRatmindyfDog".length,
    },
  ]);
});

test("filters every command suffix but retains ordinary keyword occurrences in the same message", () => {
  const message = "mindyfDog debugMoonRatmindyfDog debugMoonRatmindyfDog mindyfDog";
  const commands = findDebugMoonratCommands("MintyMelinda", message, mappings);
  const regularEvents = findMatchesWithPositions(message, mappings);
  const filteredEvents = filterDebugMoonratKeywordMatch(regularEvents, commands);

  assert.equal(commands.length, 2);
  assert.equal(filteredEvents.length, 2);
  assert.ok(filteredEvents.every((event) => event.mapping.keyword === "mindyfDog"));
  assert.deepEqual(filteredEvents.map((event) => event.index), [
    message.indexOf("mindyfDog"),
    message.lastIndexOf("mindyfDog"),
  ]);
});

test("rejects embedded command fragments and commands for unmapped keywords", () => {
  assert.equal(getDebugMoonratKeyword("MintyMelinda", "prefixdebugMoonRatmindyfRatNes", mappings), null);
  assert.equal(getDebugMoonratKeyword("MintyMelinda", "debugMoonRatmindyfRat", mappings), null);
  assert.equal(getDebugMoonratKeyword("MintyMelinda", "debugMoonRatmindyfUnknown", mappings), null);
  assert.equal(getDebugMoonratKeyword("PYOSHI", " debugMoonRatmindyfCow suffix", mappings), "mindyfCow");
});
