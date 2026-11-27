import test from "node:test";
import assert from "node:assert/strict";
import { TwitchIrcClient } from "../src/twitch-irc.js";

test("extracts chat text, emote tags, and sender from Twitch IRC PRIVMSG lines", () => {
  const messages = [];
  const client = new TwitchIrcClient({
    channel: "example",
    onMessage: (message, tags, username) => messages.push({ message, tags, username }),
    logger: { info() {}, warn() {}, error() {} },
  });

  client.handleData(
    "@badge-info=;badges=;emotes=25:0-4 :MintyMelinda!mintymelinda@mintymelinda.tmi.twitch.tv PRIVMSG #example :Kappa rats\\r\\n" +
    ":PYOSHI!pyoshi@pyoshi.tmi.twitch.tv PRIVMSG #example :debugMoonRatmindfRatNes\\r\\n",
  );

  assert.deepEqual(messages, [
    { message: "Kappa rats", tags: { emotes: "25:0-4" }, username: "MintyMelinda" },
    { message: "debugMoonRatmindfRatNes", tags: { emotes: "" }, username: "PYOSHI" },
  ]);
  client.stop();
});
