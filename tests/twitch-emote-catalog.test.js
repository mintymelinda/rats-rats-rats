import test from "node:test";
import assert from "node:assert/strict";
import { createTwitchEmoteCatalog } from "../src/twitch-emote-catalog.js";

const template = "https://static-cdn.jtvnw.net/emoticons/v2/{id}/{format}/{theme_mode}/{scale}";

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

test("loads global and configured channel emotes with a server app token", async () => {
  const calls = [];
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(input);
    calls.push({ url, options });

    if (url.hostname === "id.twitch.tv") {
      const body = new URLSearchParams(options.body);
      assert.equal(body.get("grant_type"), "client_credentials");
      assert.equal(body.get("client_id"), "client-id");
      assert.equal(body.get("client_secret"), "client-secret");
      return response({ access_token: "app-token", expires_in: 3600 });
    }

    assert.equal(options.headers["Client-Id"], "client-id");
    assert.equal(options.headers.Authorization, "Bearer app-token");

    if (url.pathname === "/helix/chat/emotes/global") {
      return response({
        data: [{ id: "global-id", name: "GlobalDance", format: ["static"], theme_mode: ["dark"], scale: ["1.0", "2.0", "3.0"] }],
        template,
      });
    }
    if (url.pathname === "/helix/users") {
      assert.equal(url.searchParams.get("login"), "supersleepyt");
      return response({ data: [{ id: "broadcaster-123" }] });
    }
    if (url.pathname === "/helix/chat/emotes") {
      assert.equal(url.searchParams.get("broadcaster_id"), "broadcaster-123");
      return response({
        data: [{ id: "channel-emote-id", name: "sstWiggle", format: ["static", "animated"], theme_mode: ["light", "dark"], scale: ["1.0", "2.0", "3.0"] }],
        template,
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const catalog = createTwitchEmoteCatalog({
    channel: "SuperSleepyT",
    clientId: "client-id",
    clientSecret: "client-secret",
    fetchImpl,
    logger: { info() {}, warn() {} },
  });

  assert.equal(await catalog.refresh(), true);
  assert.equal(catalog.size, 2);
  assert.deepEqual(catalog.find("SSTWIGGLE"), {
    id: "channel-emote-id",
    name: "sstWiggle",
    src: "https://static-cdn.jtvnw.net/emoticons/v2/channel-emote-id/animated/dark/3.0",
  });
  assert.equal(catalog.find("globaldance")?.src, "https://static-cdn.jtvnw.net/emoticons/v2/global-id/static/dark/3.0");
  assert.equal(calls.filter(({ url }) => url.hostname === "id.twitch.tv").length, 1);
});

test("follows Twitch pagination when loading emote catalogs", async () => {
  const fetchImpl = async (input) => {
    const url = new URL(input);
    if (url.hostname === "id.twitch.tv") return response({ access_token: "app-token", expires_in: 3600 });
    if (url.pathname === "/helix/chat/emotes/global" && !url.searchParams.has("after")) {
      return response({
        data: [{ id: "one", name: "First", format: ["static"], theme_mode: ["dark"], scale: ["3.0"] }],
        pagination: { cursor: "next-page" },
        template,
      });
    }
    if (url.pathname === "/helix/chat/emotes/global" && url.searchParams.get("after") === "next-page") {
      return response({
        data: [{ id: "two", name: "Second", format: ["static"], theme_mode: ["dark"], scale: ["3.0"] }],
        template,
      });
    }
    if (url.pathname === "/helix/users") return response({ data: [{ id: "channel-id" }] });
    if (url.pathname === "/helix/chat/emotes") return response({ data: [], template });
    throw new Error(`Unexpected URL: ${url}`);
  };

  const catalog = createTwitchEmoteCatalog({
    channel: "mintymelinda",
    clientId: "client-id",
    clientSecret: "client-secret",
    fetchImpl,
    logger: { info() {}, warn() {} },
  });

  await catalog.refresh();
  assert.equal(catalog.find("First")?.id, "one");
  assert.equal(catalog.find("Second")?.id, "two");
});

test("keeps the existing catalog when a refresh fails", async () => {
  let fail = false;
  const fetchImpl = async (input) => {
    const url = new URL(input);
    if (url.hostname === "id.twitch.tv") return response({ access_token: "app-token", expires_in: 3600 });
    if (fail) return response({}, 503);
    if (url.pathname === "/helix/chat/emotes/global") return response({
      data: [{ id: "stable", name: "StableEmote", format: ["static"], theme_mode: ["dark"], scale: ["3.0"] }],
      template,
    });
    if (url.pathname === "/helix/users") return response({ data: [{ id: "channel-id" }] });
    if (url.pathname === "/helix/chat/emotes") return response({ data: [], template });
    throw new Error(`Unexpected URL: ${url}`);
  };

  const catalog = createTwitchEmoteCatalog({
    channel: "mintymelinda",
    clientId: "client-id",
    clientSecret: "client-secret",
    fetchImpl,
    logger: { info() {}, warn() {} },
  });

  await catalog.refresh();
  fail = true;
  await assert.rejects(catalog.refresh(), /503/);
  assert.equal(catalog.find("stableemote")?.id, "stable");
});

test("disables catalog lookup when app credentials are absent", async () => {
  let called = false;
  const catalog = createTwitchEmoteCatalog({
    channel: "mintymelinda",
    fetchImpl: async () => { called = true; },
  });

  assert.equal(catalog.enabled, false);
  assert.equal(await catalog.refresh(), false);
  assert.equal(catalog.find("sstWiggle"), null);
  assert.equal(called, false);
});
