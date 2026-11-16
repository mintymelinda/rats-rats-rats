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

test("spawns one match for every repeated occurrence of a keyword", () => {
  assert.deepEqual(
    findMatches("mindyfRatNes mindyfRatNes MINDYFRATNES", mappings).map(({ keyword }) => keyword),
    ["mindyfRatNes", "mindyfRatNes", "mindyfRatNes"],
  );
});

test("preserves the order of repeated and different keywords in the message", () => {
  assert.deepEqual(
    findMatches("mindyfRatDos mindyfRatNes mindyfRatDos", mappings).map(({ keyword }) => keyword),
    ["mindyfRatDos", "mindyfRatNes", "mindyfRatDos"],
  );
});

test("does not match absent keywords", () => {
  assert.deepEqual(findMatches("hello chat", mappings), []);
});
