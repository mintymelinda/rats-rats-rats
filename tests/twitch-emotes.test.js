import test from "node:test";
import assert from "node:assert/strict";
import { findTwitchEmote } from "../src/twitch-emotes.js";

test("resolves a configured keyword to the Twitch emote ID in IRC tags", () => {
  assert.deepEqual(
    findTwitchEmote("Kappa rats", "25:0-4", "Kappa"),
    {
      id: "25",
      name: "Kappa",
      src: "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/3.0",
    },
  );
});

test("finds the matching emote among multiple IDs and occurrences", () => {
  assert.equal(findTwitchEmote("Kappa Keepo Kappa", "25:0-4,11-15/1902:6-10", "Keepo")?.id, "1902");
});

test("does not resolve ordinary text, partial matches, or malformed ranges", () => {
  assert.equal(findTwitchEmote("Kapp", "25:0-3", "Kappa"), null);
  assert.equal(findTwitchEmote("not an emote", "", "not"), null);
  assert.equal(findTwitchEmote("Kappa", "25:bad-range", "Kappa"), null);
  assert.equal(findTwitchEmote("Kappa", "invalid:0-4", "Kappa"), null);
});
