import test from "node:test";
import assert from "node:assert/strict";
import { findMatches } from "../src/matcher.js";

const mappings = [
  { keyword: "mindyfRatNes", normalizedKeyword: "mindyfratnes" },
  { keyword: "mindyfRatDos", normalizedKeyword: "mindyfratdos" },
  { keyword: "mindyfRatSnes", normalizedKeyword: "mindyfratsnes" },
];

test("matches keywords case-insensitively within chat messages", () => {
  assert.deepEqual(
    findMatches("Look at MINDYFRATNES!", mappings).map(({ keyword }) => keyword),
    ["mindyfRatNes"],
  );
});

test("matches every configured keyword found in a message", () => {
  assert.deepEqual(
    findMatches("mindyfRatDos and mindyfRatSnes", mappings).map(({ keyword }) => keyword),
    ["mindyfRatDos", "mindyfRatSnes"],
  );
});

test("does not match absent keywords", () => {
  assert.deepEqual(findMatches("hello chat", mappings), []);
});
