import test from "node:test";
import assert from "node:assert/strict";
import { TwitchIrcClient } from "../src/twitch-irc.js";

test("extracts chat text, emote tags, and sender from Twitch IRC PRIVMSG lines", async () => {
  const messages = [];
  const client = new TwitchIrcClient({
    channel: "example",
    onMessage: (message, tags, username) => messages.push({ message, tags, username }),
    logger: { info() {}, warn() {}, error() {} },
  });

  client.handleData(
    "@badge-info=;badges=;emotes=25:0-4 :MintyMelinda!mintymelinda@mintymelinda.tmi.twitch.tv PRIVMSG #example :Kappa rats\r\n" +
    ":PYOSHI!pyoshi@pyoshi.tmi.twitch.tv PRIVMSG #example :debugMoonRatmindfRatNes\r\n",
  );

  await client.messageQueue;

  assert.deepEqual(messages, [
    { message: "Kappa rats", tags: { emotes: "25:0-4" }, username: "MintyMelinda" },
    { message: "debugMoonRatmindfRatNes", tags: { emotes: "" }, username: "PYOSHI" },
  ]);
  client.stop();
});


test("processes asynchronous chat handlers in message order", async () => {
  const processed = [];
  const client = new TwitchIrcClient({
    channel: "example",
    onMessage: async (message) => {
      if (message === "first") await new Promise((resolve) => setTimeout(resolve, 10));
      processed.push(message);
    },
    logger: { info() {}, warn() {}, error() {} },
  });

  client.handleData(
    ":viewer!viewer@viewer.tmi.twitch.tv PRIVMSG #example :first\\r\\n" +
    ":viewer!viewer@viewer.tmi.twitch.tv PRIVMSG #example :second\\r\\n",
  );
  await client.messageQueue;
  assert.deepEqual(processed, ["first", "second"]);
  client.stop();
});
