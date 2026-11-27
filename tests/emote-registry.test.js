import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createEmoteRegistry } from "../src/emote-registry.js";

function response(data) {
  return { ok: true, status: 200, json: async () => data };
}

test("learns all IRC-tagged Twitch emotes and persists discoveries across restarts", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "rats-emotes-"));
  const cacheFile = path.join(directory, "emotes.json");
  const id = "emotesv2_34a6cc63c24f41cc9d702d494ae09def";
  const registry = createEmoteRegistry({ cacheFile, logger: { warn() {}, info() {} } });

  const learned = registry.learnFromIrc("Kappa sstWiggle", `25:0-4/${id}:6-14`);
  assert.deepEqual(learned.map(({ name }) => name), ["Kappa", "sstWiggle"]);
  assert.equal(registry.get("SSTWIGGLE")?.id, id);

  const restored = createEmoteRegistry({ cacheFile, logger: { warn() {}, info() {} } });
  assert.equal(restored.get("sstWiggle")?.src, `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("loads Twitch global and monitored-channel catalogs using an app access token", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === "https://id.twitch.tv/oauth2/token") return response({ access_token: "app-token", expires_in: 3600 });
    if (url.endsWith("/chat/emotes/global")) {
      return response({ data: [{ id: "1", name: "GlobalRat", template: "https://cdn.test/{{id}}/{{format}}/{{theme_mode}}/{{scale}", format: ["static"] }] });
    }
    if (url.endsWith("/users?login=minty")) return response({ data: [{ id: "42" }] });
    if (url.endsWith("/chat/emotes?broadcaster_id=42")) {
      return response({ data: [{ id: "2", name: "ChannelRat", template: "https://cdn.test/{{id}}/{{format}}/{{theme_mode}}/{{scale}", format: ["animated"] }] });
    }
    if (url.includes("7tv.io")) return response({ emotes: [] });
    if (url.includes("betterttv.net")) return response(url.includes("/cached/emotes/global") ? [] : { channelEmotes: [], sharedEmotes: [] });
    if (url.includes("frankerfacez.com")) return response({ sets: {} });
    throw new Error(`Unexpected URL: ${url}`);
  };
  const registry = createEmoteRegistry({
    channel: "minty",
    clientId: "client",
    clientSecret: "secret",
    fetchImpl,
    logger: { warn() {}, info() {} },
  });

  await registry.initialize();
  assert.equal(registry.get("globalrat")?.provider, "twitch-global");
  assert.equal(registry.get("channelrat")?.provider, "twitch-channel");
  assert.equal(registry.get("globalrat")?.src, "https://cdn.test/1/static/dark/3.0");
  assert.equal(registry.get("channelrat")?.src, "https://cdn.test/2/animated/dark/3.0");
  assert.ok(calls.some(({ url }) => url.endsWith("/chat/emotes?broadcaster_id=42")));
});

test("provider fallback requires an exact case-insensitive emote-name match", async () => {
  const fetchImpl = async (url) => {
    if (url.includes("/emote-sets/global")) return response({ emotes: [] });
    if (url.includes("/cached/emotes/global")) return response([]);
    if (url.includes("/set/global")) return response({ sets: {} });
    if (url.includes("7tv.io/v3/emotes?query=")) return response([{ id: "wrong", name: "sstWiggles", host: { url: "//cdn.7tv.app/emote/wrong", files: [{ name: "3x.webp" }] } }]);
    if (url.includes("/emoticons?q=")) return response({
      emoticons: [{ id: 99, name: "SSTWIGGLE", urls: { "4": "//cdn.frankerfacez.com/emoticon/99/4" } }],
    });
    throw new Error(`Unexpected URL: ${url}`);
  };
  const registry = createEmoteRegistry({ fetchImpl, logger: { warn() {}, info() {} } });

  await registry.initialize();
  const result = await registry.resolve("sstWiggle");
  assert.equal(result?.provider, "ffz");
  assert.equal(result?.src, "https://cdn.frankerfacez.com/emoticon/99/4");
  assert.equal(await registry.resolve("notAnEmote"), null);
});

test("does not require Twitch credentials to learn and resolve observed emotes", async () => {
  const registry = createEmoteRegistry({ logger: { warn() {}, info() {} } });
  registry.learnFromIrc("sstWiggle", "25:0-9");
  assert.equal(registry.get("sstWiggle")?.provider, "twitch-irc");
});
