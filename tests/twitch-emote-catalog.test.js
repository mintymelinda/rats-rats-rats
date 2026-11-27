import test from "node:test";
import assert from "node:assert/strict";
import { createTwitchEmoteCatalog } from "../src/twitch-emote-catalog.js";

const template = "https://static-cdn.jtvnw.net/emoticons/v2/{id}/{format}/{theme_mode}/{scale}";

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function emote(id, name) {
  return { id, name, format: ["static", "animated"], theme_mode: ["dark", "light"], scale: ["1.0", "2.0", "3.0"] };
}

function createFetch({ channels = [], channelEmotes = {}, failGlobal = false } = {}) {
  const calls = [];
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(input);
    calls.push({ url, options });
    if (url.hostname === "id.twitch.tv") {
      const body = new URLSearchParams(options.body);
      assert.equal(body.get("grant_type"), "client_credentials");
      return response({ access_token: "app-token", expires_in: 3600 });
    }
    assert.equal(options.headers["Client-Id"], "client-id");
    assert.equal(options.headers.Authorization, "Bearer app-token");
    if (url.pathname === "/helix/chat/emotes/global") {
      if (failGlobal) return response({}, 503);
      return response({ data: [emote("global-id", "GlobalDance")], template });
    }
    if (url.pathname === "/helix/search/channels") {
      assert.equal(url.searchParams.get("query"), "sst");
      return response({ data: channels });
    }
    if (url.pathname === "/helix/chat/emotes") {
      return response({ data: channelEmotes[url.searchParams.get("broadcaster_id")] ?? [], template });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
  return { fetchImpl, calls };
}

test("loads global emotes without requiring a configured channel catalog", async () => {
  const { fetchImpl } = createFetch();
  const catalog = createTwitchEmoteCatalog({ clientId: "client-id", clientSecret: "client-secret", fetchImpl, logger: { info() {}, warn() {} } });
  assert.equal(await catalog.refresh(), true);
  assert.equal(catalog.find("globaldance")?.id, "global-id");
  assert.equal(await catalog.resolve("sstWiggle"), null);
});

test("discovers a channel from the emote prefix and verifies ownership in its emote catalog", async () => {
  const { fetchImpl, calls } = createFetch({
    channels: [{ id: "channel-123", display_name: "SuperSleepyT", broadcaster_login: "supersleepyt" }],
    channelEmotes: { "channel-123": [emote("sst-wiggle-id", "sstWiggle")] },
  });
  const catalog = createTwitchEmoteCatalog({ clientId: "client-id", clientSecret: "client-secret", fetchImpl, logger: { info() {}, warn() {} } });

  const found = await catalog.resolve("sstWiggle");
  assert.equal(found?.id, "sst-wiggle-id");
  assert.equal(found?.src, "https://static-cdn.jtvnw.net/emoticons/v2/sst-wiggle-id/animated/dark/3.0");
  assert.equal(calls.filter(({ url }) => url.pathname === "/helix/search/channels").length, 1);
  assert.equal(calls.filter(({ url }) => url.pathname === "/helix/chat/emotes").length, 1);
  assert.equal(await catalog.resolve("SSTWIGGLE")?.then((value) => value?.id), "sst-wiggle-id");
});

test("does not accept a prefix-matching channel unless its catalog contains the exact emote", async () => {
  const { fetchImpl } = createFetch({
    channels: [{ id: "channel-123", display_name: "SuperSleepyT", broadcaster_login: "supersleepyt" }],
    channelEmotes: { "channel-123": [emote("other-id", "sstOther")] },
  });
  const catalog = createTwitchEmoteCatalog({ clientId: "client-id", clientSecret: "client-secret", fetchImpl, logger: { info() {}, warn() {} } });
  assert.equal(await catalog.resolve("sstWiggle"), null);
});

test("keeps the existing global catalog when a refresh fails", async () => {
  let failGlobal = false;
  const { fetchImpl } = createFetch();
  const controlledFetch = async (input, options) => {
    const url = new URL(input);
    if (failGlobal && url.pathname === "/helix/chat/emotes/global") return response({}, 503);
    return fetchImpl(input, options);
  };
  const catalog = createTwitchEmoteCatalog({
    clientId: "client-id",
    clientSecret: "client-secret",
    fetchImpl: controlledFetch,
    logger: { info() {}, warn() {} },
  });

  await catalog.refresh();
  failGlobal = true;
  await assert.rejects(catalog.refresh(), /503/);
  assert.equal(catalog.find("globaldance")?.id, "global-id");
});

test("disables catalog lookup when app credentials are absent", async () => {
  let called = false;
  const catalog = createTwitchEmoteCatalog({ fetchImpl: async () => { called = true; } });
  assert.equal(catalog.enabled, false);
  assert.equal(await catalog.refresh(), false);
  assert.equal(await catalog.resolve("sstWiggle"), null);
  assert.equal(called, false);
});
