const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const HELIX_URL = "https://api.twitch.tv/helix";
const DEFAULT_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const MISS_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CHANNEL_CANDIDATES = 25;

function emoteImageUrl(template, emote) {
  const formats = Array.isArray(emote.format) ? emote.format : ["static"];
  const themes = Array.isArray(emote.theme_mode) ? emote.theme_mode : ["dark"];
  const scales = Array.isArray(emote.scale) ? emote.scale : ["3.0"];
  const format = formats.includes("animated") ? "animated" : formats[0];
  const theme = themes.includes("dark") ? "dark" : themes[0];
  const scale = scales.includes("3.0") ? "3.0" : scales.at(-1);

  return template
    .replaceAll("{id}", encodeURIComponent(emote.id))
    .replaceAll("{format}", encodeURIComponent(format))
    .replaceAll("{theme_mode}", encodeURIComponent(theme))
    .replaceAll("{scale}", encodeURIComponent(scale));
}

function addEmotes(target, payload) {
  if (!payload || !Array.isArray(payload.data) || typeof payload.template !== "string") {
    throw new Error("Twitch returned an invalid emote catalog response");
  }

  for (const emote of payload.data) {
    if (typeof emote.name !== "string" || typeof emote.id !== "string") continue;
    target.set(emote.name.toLocaleLowerCase("en-US"), {
      id: emote.id,
      name: emote.name,
      src: emoteImageUrl(payload.template, emote),
    });
  }
}

function emotePrefix(keyword) {
  // Twitch emote prefixes commonly end immediately before the PascalCase suffix:
  // sstWiggle -> sst, mindyfRatNes -> mindyf.
  const match = keyword.match(/^([a-z0-9]+)(?=[A-Z])/);
  return match?.[1]?.toLocaleLowerCase("en-US") ?? null;
}

function channelInitials(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part[0].toLocaleLowerCase("en-US"))
    .join("");
}

export function createTwitchEmoteCatalog({
  clientId,
  clientSecret,
  fetchImpl = globalThis.fetch,
  refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS,
  missCacheTtlMs = MISS_CACHE_TTL_MS,
  logger = console,
}) {
  const configured = Boolean(clientId && clientSecret);
  let emotes = new Map();
  let accessToken = null;
  let tokenExpiresAt = 0;
  let refreshTimer = null;
  const misses = new Map();
  const pendingLookups = new Map();

  async function requestJson(url, options) {
    const response = await fetchImpl(url, options);
    if (!response.ok) throw new Error(`Twitch API request failed (${response.status})`);
    return response.json();
  }

  async function getAccessToken() {
    if (accessToken && Date.now() < tokenExpiresAt - 60_000) return accessToken;

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    });
    const payload = await requestJson(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (typeof payload.access_token !== "string" || !Number.isFinite(payload.expires_in)) {
      throw new Error("Twitch did not return a valid app access token");
    }
    accessToken = payload.access_token;
    tokenExpiresAt = Date.now() + payload.expires_in * 1000;
    return accessToken;
  }

  async function helix(url) {
    const token = await getAccessToken();
    return requestJson(url, {
      headers: { "Client-Id": clientId, Authorization: `Bearer ${token}` },
    });
  }

  async function fetchAllPages(url) {
    const all = [];
    let template = null;
    let nextUrl = url;
    while (nextUrl) {
      const payload = await helix(nextUrl);
      if (!Array.isArray(payload.data)) throw new Error("Twitch returned an invalid emote list");
      if (typeof payload.template === "string") template = payload.template;
      all.push(...payload.data);
      const cursor = payload.pagination?.cursor;
      if (!cursor) break;
      const pageUrl = new URL(url);
      pageUrl.searchParams.set("after", cursor);
      nextUrl = pageUrl.toString();
    }
    if (!template) throw new Error("Twitch did not return an emote image URL template");
    return { data: all, template };
  }

  async function refresh() {
    if (!configured) return false;
    const next = new Map();
    addEmotes(next, await fetchAllPages(`${HELIX_URL}/chat/emotes/global`));
    emotes = next;
    misses.clear();
    logger.info(`Loaded ${emotes.size} global Twitch emote(s); channel emotes resolve on demand`);
    return true;
  }

  async function searchChannels(prefix) {
    const url = new URL(`${HELIX_URL}/search/channels`);
    url.searchParams.set("query", prefix);
    url.searchParams.set("first", "100");
    const payload = await helix(url.toString());
    if (!Array.isArray(payload.data)) throw new Error("Twitch returned an invalid channel search response");

    // Search is only a candidate generator. Verify the emote against each candidate's
    // actual channel catalog; never assume a similarly named channel owns the emote.
    return payload.data
      .filter((channel) => {
        const displayName = channel.display_name ?? "";
        const login = channel.broadcaster_login ?? channel.name ?? "";
        return channelInitials(displayName) === prefix
          || channelInitials(login) === prefix
          || displayName.toLocaleLowerCase("en-US").startsWith(prefix)
          || login.toLocaleLowerCase("en-US").startsWith(prefix);
      })
      .slice(0, MAX_CHANNEL_CANDIDATES);
  }

  async function getChannelEmotes(channelId) {
    const url = new URL(`${HELIX_URL}/chat/emotes`);
    url.searchParams.set("broadcaster_id", channelId);
    return fetchAllPages(url.toString());
  }

  async function resolveUncached(keyword) {
    const prefix = emotePrefix(keyword);
    if (!prefix) return null;

    const candidates = await searchChannels(prefix);
    for (const candidate of candidates) {
      const catalog = await getChannelEmotes(candidate.id);
      const found = catalog.data.find((emote) =>
        typeof emote.name === "string"
        && emote.name.toLocaleLowerCase("en-US") === keyword.toLocaleLowerCase("en-US"));
      if (found) {
        const result = {
          id: found.id,
          name: found.name,
          src: emoteImageUrl(catalog.template, found),
        };
        emotes.set(keyword.toLocaleLowerCase("en-US"), result);
        logger.info(`Resolved Twitch emote ${keyword} from channel ${candidate.display_name ?? candidate.id}`);
        return result;
      }
    }
    return null;
  }

  async function resolve(keyword) {
    if (typeof keyword !== "string" || !configured) return null;
    const normalized = keyword.toLocaleLowerCase("en-US");
    const cached = emotes.get(normalized);
    if (cached) return cached;
    const missUntil = misses.get(normalized) ?? 0;
    if (Date.now() < missUntil) return null;
    if (pendingLookups.has(normalized)) return pendingLookups.get(normalized);

    const lookup = resolveUncached(keyword)
      .then((result) => {
        if (!result) misses.set(normalized, Date.now() + missCacheTtlMs);
        return result;
      })
      .catch((error) => {
        logger.warn(`Unable to discover Twitch emote ${keyword}: ${error.message}`);
        misses.set(normalized, Date.now() + missCacheTtlMs);
        return null;
      })
      .finally(() => pendingLookups.delete(normalized));
    pendingLookups.set(normalized, lookup);
    return lookup;
  }

  function start() {
    if (!configured || refreshTimer) return;
    refreshTimer = setInterval(() => {
      refresh().catch((error) => logger.warn(`Unable to refresh Twitch global emotes: ${error.message}`));
    }, refreshIntervalMs);
    refreshTimer.unref?.();
  }

  function stop() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
  }

  return {
    enabled: configured,
    refresh,
    resolve,
    start,
    stop,
    find(keyword) {
      if (typeof keyword !== "string") return null;
      return emotes.get(keyword.toLocaleLowerCase("en-US")) ?? null;
    },
    get size() {
      return emotes.size;
    },
  };
}
