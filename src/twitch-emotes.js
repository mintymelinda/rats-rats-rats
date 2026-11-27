const TWITCH_EMOTE_CDN = "https://static-cdn.jtvnw.net/emoticons/v2";
const TWITCH_EMOTE_ID = /^(?:\d+|emotesv2_[\da-f]{32})$/i;

export function parseTwitchEmotes(message, emotesTag) {
  if (typeof message !== "string" || typeof emotesTag !== "string" || !emotesTag) return [];
  const discovered = [];
  for (const emoteEntry of emotesTag.split("/")) {
    const separator = emoteEntry.indexOf(":");
    if (separator <= 0) continue;
    const id = emoteEntry.slice(0, separator);
    if (!TWITCH_EMOTE_ID.test(id)) continue;
    for (const range of emoteEntry.slice(separator + 1).split(",")) {
      const match = range.match(/^(\d+)-(\d+)$/);
      if (!match) continue;
      const start = Number(match[1]);
      const end = Number(match[2]);
      if (end < start || end >= message.length) continue;
      const name = message.slice(start, end + 1);
      if (!name) continue;
      discovered.push({
        id,
        name,
        src: `${TWITCH_EMOTE_CDN}/${id}/default/dark/3.0`,
      });
    }
  }
  return discovered;
}

export function findTwitchEmote(message, emotesTag, keyword) {
  if (typeof keyword !== "string" || !keyword) return null;
  const normalizedKeyword = keyword.toLocaleLowerCase("en-US");
  return parseTwitchEmotes(message, emotesTag).find(
    (emote) => emote.name.toLocaleLowerCase("en-US") === normalizedKeyword,
  ) || null;
}
