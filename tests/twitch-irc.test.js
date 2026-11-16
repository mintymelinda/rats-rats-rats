import test from "node:test";
import assert from "node:assert/strict";
import { TwitchIrcClient } from "../src/twitch-irc.js";

test("extracts chat text from Twitch IRC PRIVMSG lines", () => {
  const messages = [];
  const client = new TwitchIrcClient({
    channel: "example",
    onMessage: (message) => messages.push(message),
    logger: { info() {}, warn() {}, error() {} },
  });

  client.handleData(
    "@badge-info=;badges= :someuser!someuser@someuser.tmi.twitch.tv PRIVMSG #example :hello rats\r\n" +
    ":anotheruser!anotheruser@anotheruser.tmi.twitch.tv PRIVMSG #example :mindyfRatNes\r\n",
  );

  assert.deepEqual(messages, ["hello rats", "mindyfRatNes"]);
  client.stop();
});
