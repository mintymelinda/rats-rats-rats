import test from "node:test";
import assert from "node:assert/strict";
import { findTwitchEmote } from "../src/twitch-emotes.js";

test("resolves a legacy numeric Twitch emote ID from IRC tags", () => {
  assert.deepEqual(
    findTwitchEmote("Kappa rats", "25:0-4", "Kappa"),
    {
      id: "25",
      name: "Kappa",
      src: "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/3.0",
    },
  );
});

test("resolves modern emotesv2 IDs from IRC tags", () => {
  const id = "emotesv2_34a6cc63c24f41cc9d702d494ae09def";
  assert.deepEqual(findTwitchEmote("graped4Based", `${id}:0-11`, "graped4Based"), {
    id,
    name: "graped4Based",
    src: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`,
  });
});

test("resolves the supplied modern Twitch emote IDs", () => {
  const emotes = [
    ["mindyfRatSnes", "emotesv2_34a6cc63c24f41cc9d702d494ae09def"],
    ["mindyfRatDos", "emotesv2_1ee3612f45c64b4982de54b7c81a14b3"],
    ["mindyfRatNes", "emotesv2_2e34c404e5ab4cdcbbeeaac2d0072a90"],
    ["mindyfCow", "emotesv2_6f6d547adbf64162b7b831d47d12f1fb"],
    ["mindyfDog", "emotesv2_91113b802d7b480598290387ebf35143"],
  ];

  for (const [name, id] of emotes) {
    const message = name.repeat(3);
    const firstEnd = name.length - 1;
    const result = findTwitchEmote(message, `${id}:0-${firstEnd}`, name);
    assert.equal(result?.id, id, `failed to resolve ${name}`);
    assert.equal(result?.src, `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`);
  }
});

test("finds the matching emote among multiple IDs and occurrences", () => {
  assert.equal(findTwitchEmote("Kappa Keepo Kappa", "25:0-4,11-15/1902:6-10", "Keepo")?.id, "1902");
});

test("does not resolve ordinary text, partial matches, or malformed ranges and IDs", () => {
  assert.equal(findTwitchEmote("Kapp", "25:0-3", "Kappa"), null);
  assert.equal(findTwitchEmote("not an emote", "", "not"), null);
  assert.equal(findTwitchEmote("Kappa", "25:bad-range", "Kappa"), null);
  assert.equal(findTwitchEmote("Kappa", "invalid:0-4", "Kappa"), null);
  assert.equal(findTwitchEmote("Kappa", "emotesv2_not-a-valid-id:0-4", "Kappa"), null);
  assert.equal(findTwitchEmote("Kappa", "emotesv2_34a6cc63c24f41cc9d702d494ae09de:0-4", "Kappa"), null);
});
