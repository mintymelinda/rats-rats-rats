import fs from "node:fs";
import path from "node:path";
import { parseTwitchEmotes } from "./twitch-emotes.js";

const TWITCH_API = "https://api.twitch.tv/helix";
const SEVENTV_API = "https://7tv.io/v3";
const BTTV_API = "https://api.betterttv.net/3";
const FFZ_API = "https://api.frankerfacez.com/v1";

function normalize(name) {
  return String(name).toLocaleLowerCase("en-US");
}

function twitchImage(emote) {
  if (typeof emote.template === "string") {
    return emote.template
      .replaceAll("{{id}}", emote.id)
      .replaceAll("{{format}}", emote.format?.includes("animated") ? "animated" : "static")
      .replaceAll("{{theme_mode}}", "dark")
      .replaceAll("{{scale}}", "3.0");
  }
  return `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/3.0`;
}

function sevenTvImage(emote) {
  const host = emote.host;
  if (!host?.url) return null;
  const files = host.files || [];
  const file = files.find((item) => item.name === "3x.webp")
    || files.find((item) => item.name === "2x.webp")
    || files.find((item) => item.name === "1x.webp")
    || files.find((item) => item.format === "WEBP");
  if (!file?.name) return null;
  const base = host.url.startsWith("http") ? host.url : `https:${host.url}`;
  return `${base.replace(/\/$/, "")}/${file.name}`;
}

function bttvImage(emote) {
  const extension = emote.animated ? "gif" : "webp";
  return `https://cdn.betterttv.net/emote/${emote.id}/3x.${extension}`;
}

function ffzImage(emote) {
  const url = emote.urls?.["4"] || emote.urls?.["2"] || emote.urls?.["1"];
  return typeof url === "string" ? (url.startsWith("//") ? `https:${url}` : url) : null;
}

async function responseJson(fetchImpl, url, options) {
  const response = await fetchImpl(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${new URL(url).host}`);
  return response.json();
}

export function createEmoteRegistry({
  cacheFile = null,
  channel = null,
  clientId = "",
  clientSecret = "",
  fetchImpl = globalThis.fetch,
  logger = console,
  now = Date.now,
  missTtlMs = 10 * 60 * 1000,
} = {}) {
  const emotes = new Map();
  const misses = new Map();
  let token = null;
  let tokenExpiresAt = 0;
  let initialization = null;

  function register(name, src, provider, id) {
    if (typeof name !== "string" || !name || typeof src !== "string" || !/^https:\/\//i.test(src)) return false;
    const key = normalize(name);
    if (!emotes.has(key)) emotes.set(key, { name, src, provider, id: id || null });
    misses.delete(key);
    return true;
  }

  function persist() {
    if (!cacheFile) return;
    const discovered = [...emotes.values()].filter((item) => item.provider === "twitch-irc");
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    const temporaryPath = `${cacheFile}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(discovered, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(temporaryPath, cacheFile);
  }

  function loadCache() {
    if (!cacheFile || !fs.existsSync(cacheFile)) return;
    try {
      const stored = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      if (!Array.isArray(stored)) throw new Error("cache must be an array");
      for (const item of stored) {
        if (item?.provider === "twitch-irc") register(item.name, item.src, item.provider, item.id);
      }
    } catch (error) {
      logger.warn(`Ignoring invalid emote cache at ${cacheFile}: ${error.message}`);
    }
  }

  function learnFromIrc(message, emotesTag) {
    const discovered = parseTwitchEmotes(message, emotesTag);
    let changed = false;
    for (const emote of discovered) {
      changed = register(emote.name, emote.src, "twitch-irc", emote.id) || changed;
    }
    if (changed) persist();
    return discovered;
  }

  async function getAppToken() {
    if (!clientId || !clientSecret) return null;
    if (token && tokenExpiresAt > now() + 60_000) return token;
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    });
    const result = await responseJson(fetchImpl, "https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    token = result.access_token;
    tokenExpiresAt = now() + Number(result.expires_in || 0) * 1000;
    if (!token) throw new Error("Twitch app-token response did not include an access token");
    return token;
  }

  async function twitchRequest(endpoint, accessToken) {
    return responseJson(fetchImpl, `${TWITCH_API}${endpoint}`, {
      headers: { "Client-Id": clientId, Authorization: `Bearer ${accessToken}` },
    });
  }

  async function loadChannelProviderCatalogs(broadcasterId) {
    const jobs = [
      (async () => {
        const user = await responseJson(fetchImpl, `${SEVENTV_API}/users/twitch/${encodeURIComponent(broadcasterId)}`);
        let set = user.emote_set || null;
        if (!set && user.emote_set_id) {
          set = await responseJson(fetchImpl, `${SEVENTV_API}/emote-sets/${encodeURIComponent(user.emote_set_id)}`);
        }
        for (const entry of set?.emotes || []) {
          const emote = entry.data || entry.emote || entry;
          const src = sevenTvImage(emote);
          if (src) register(entry.name || entry.alias || emote.name, src, "7tv-channel", emote.id);
        }
      })(),
      (async () => {
        const user = await responseJson(fetchImpl, `${BTTV_API}/cached/users/twitch/${encodeURIComponent(broadcasterId)}`);
        for (const emote of [...(user.channelEmotes || []), ...(user.sharedEmotes || [])]) {
          register(emote.code, bttvImage(emote), "bttv-channel", emote.id);
        }
      })(),
      (async () => {
        const room = await responseJson(fetchImpl, `${FFZ_API}/room/id/${encodeURIComponent(broadcasterId)}`);
        for (const set of Object.values(room.sets || {})) {
          for (const emote of set.emoticons || []) {
            const src = ffzImage(emote);
            if (src) register(emote.name, src, "ffz-channel", emote.id);
          }
        }
      })(),
    ];
    const results = await Promise.allSettled(jobs);
    for (const result of results) {
      if (result.status === "rejected") logger.warn(`Channel emote catalog unavailable: ${result.reason?.message || result.reason}`);
    }
  }

  async function loadTwitchCatalog() {
    if (!clientId || !clientSecret) {
      logger.info("Twitch emote catalogs disabled: TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET are not configured");
      return;
    }
    try {
      const accessToken = await getAppToken();
      const global = await twitchRequest("/chat/emotes/global", accessToken);
      for (const emote of global.data || []) {
        register(emote.name, twitchImage(emote), "twitch-global", emote.id);
      }
      if (!channel) return;
      const users = await twitchRequest(`/users?login=${encodeURIComponent(channel)}`, accessToken);
      const broadcasterId = users.data?.[0]?.id;
      if (!broadcasterId) {
        logger.warn(`Could not find Twitch broadcaster ID for #${channel}; channel emotes were not loaded`);
        return;
      }
      const channelEmotes = await twitchRequest(`/chat/emotes?broadcaster_id=${encodeURIComponent(broadcasterId)}`, accessToken);
      for (const emote of channelEmotes.data || []) {
        register(emote.name, twitchImage(emote), "twitch-channel", emote.id);
      }
      await loadChannelProviderCatalogs(broadcasterId);
      logger.info(`Loaded Twitch and third-party emote catalogs for #${channel}`);
    } catch (error) {
      logger.warn(`Twitch emote catalog refresh failed: ${error.message}`);
    }
  }

  async function loadProviderGlobals() {
    const jobs = [
      (async () => {
        const data = await responseJson(fetchImpl, `${SEVENTV_API}/emote-sets/global`);
        for (const entry of data.emotes || []) {
          const emote = entry.data || entry;
          const src = sevenTvImage(emote);
          if (src) register(entry.name || emote.name, src, "7tv", emote.id);
        }
      })(),
      (async () => {
        const data = await responseJson(fetchImpl, `${BTTV_API}/cached/emotes/global`);
        for (const emote of data || []) register(emote.code, bttvImage(emote), "bttv", emote.id);
      })(),
      (async () => {
        const data = await responseJson(fetchImpl, `${FFZ_API}/set/global`);
        for (const set of Object.values(data.sets || {})) {
          for (const emote of set.emoticons || []) {
            const src = ffzImage(emote);
            if (src) register(emote.name, src, "ffz", emote.id);
          }
        }
      })(),
    ];
    const results = await Promise.allSettled(jobs);
    for (const result of results) {
      if (result.status === "rejected") logger.warn(`Third-party global emote catalog unavailable: ${result.reason?.message || result.reason}`);
    }
  }

  async function searchProviders(name) {
    const encoded = encodeURIComponent(name);
    const jobs = [
      (async () => {
        const data = await responseJson(fetchImpl, `${SEVENTV_API}/emotes?query=${encoded}`);
        const exact = (Array.isArray(data) ? data : data.emotes || []).find((item) => normalize(item.name) === normalize(name));
        if (exact) {
          const src = sevenTvImage(exact);
          if (src) register(exact.name, src, "7tv", exact.id);
        }
      })(),
      (async () => {
        const data = await responseJson(fetchImpl, `${FFZ_API}/emoticons?q=${encoded}`);
        const exact = (data.emoticons || []).find((item) => normalize(item.name) === normalize(name));
        if (exact) {
          const src = ffzImage(exact);
          if (src) register(exact.name, src, "ffz", exact.id);
        }
      })(),
    ];
    await Promise.allSettled(jobs);
  }

  async function initialize() {
    if (initialization) return initialization;
    initialization = (async () => {
      loadCache();
      await Promise.allSettled([loadTwitchCatalog(), loadProviderGlobals()]);
    })();
    return initialization;
  }

  async function resolve(name) {
    if (typeof name !== "string" || !name) return null;
    const key = normalize(name);
    const known = emotes.get(key);
    if (known) return { ...known };
    const missedAt = misses.get(key);
    if (missedAt && now() - missedAt < missTtlMs) return null;
    await searchProviders(name);
    const found = emotes.get(key);
    if (!found) misses.set(key, now());
    return found ? { ...found } : null;
  }

  return {
    initialize,
    learnFromIrc,
    resolve,
    get size() { return emotes.size; },
    get(name) {
      const item = emotes.get(normalize(name));
      return item ? { ...item } : null;
    },
  };
}
