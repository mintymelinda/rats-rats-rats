import test from "node:test";
import assert from "node:assert/strict";
import { TwitchIrcClient } from "../src/twitch-irc.js";

test("extracts chat text and emote tags from Twitch IRC PRIVMSG lines", () => {
  const messages = [];
  const client = new TwitchIrcClient({
    channel: "example",
    onMessage: (message, tags) => messages.push({ message, tags }),
    logger: { info() {}, warn() {}, error() {} },
  });

  client.handleData(
    "@badge-info=;badges=;emotes=25:0-4 :someuser!someuser@someuser.tmi.twitch.tv PRIVMSG #example :Kappa rats\r\n" +
    ":anotheruser!anotheruser@anotheruser.tmi.twitch.tv PRIVMSG #example :mindyfRatNes\r\n",
  );

  assert.deepEqual(messages, [
    { message: "Kappa rats", tags: { emotes: "25:0-4" } },
    { message: "mindyfRatNes", tags: { emotes: "" } },
  ]);
  client.stop();
});
