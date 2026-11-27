const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const HELIX_URL = "https://api.twitch.tv/helix";
const DEFAULT_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

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

export function createTwitchEmoteCatalog({
  channel,
  channels = [],
  clientId,
  clientSecret,
  fetchImpl = globalThis.fetch,
  refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS,
  logger = console,
}) {
  const configured = Boolean(clientId && clientSecret);
  const channelLogins = [...new Set([channel, ...channels]
    .filter(Boolean)
    .map((login) => login.trim().replace(/^#/, "").toLowerCase()))];
  let emotes = new Map();
  let accessToken = null;
  let tokenExpiresAt = 0;
  let refreshTimer = null;

  async function requestJson(url, options) {
    const response = await fetchImpl(url, options);
    if (!response.ok) {
      throw new Error(`Twitch API request failed (${response.status})`);
    }
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
      headers: {
        "Client-Id": clientId,
        Authorization: `Bearer ${token}`,
      },
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

  async function getBroadcasterId(login) {
    const url = new URL(`${HELIX_URL}/users`);
    url.searchParams.set("login", login);
    const payload = await helix(url.toString());
    const id = payload.data?.[0]?.id;
    if (!id) throw new Error(`Twitch channel not found: ${login}`);
    return id;
  }

  async function refresh() {
    if (!configured) return false;

    const next = new Map();
    const globalUrl = `${HELIX_URL}/chat/emotes/global`;
    const globalEmotes = await fetchAllPages(globalUrl);
    addEmotes(next, globalEmotes);

    for (const login of channelLogins) {
      try {
        const broadcasterId = await getBroadcasterId(login);
        const url = new URL(`${HELIX_URL}/chat/emotes`);
        url.searchParams.set("broadcaster_id", broadcasterId);
        const channelEmotes = await fetchAllPages(url.toString());
        addEmotes(next, channelEmotes);
      } catch (error) {
        logger.warn(`Unable to load Twitch emotes for #${login}: ${error.message}`);
      }
    }

    emotes = next;
    logger.info(`Loaded ${emotes.size} Twitch emote(s) from global and ${channelLogins.length} channel catalog(s)`);
    return true;
  }

  function start() {
    if (!configured || refreshTimer) return;
    refreshTimer = setInterval(() => {
      refresh().catch((error) => logger.warn(`Unable to refresh Twitch emote catalog: ${error.message}`));
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
