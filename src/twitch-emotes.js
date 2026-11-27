const TWITCH_EMOTE_CDN = "https://static-cdn.jtvnw.net/emoticons/v2";

export function findTwitchEmote(message, emotesTag, keyword) {
  if (typeof message !== "string" || typeof emotesTag !== "string" || !emotesTag || !keyword) {
    return null;
  }

  for (const emoteEntry of emotesTag.split("/")) {
    const separator = emoteEntry.indexOf(":");
    if (separator <= 0) continue;
    const id = emoteEntry.slice(0, separator);
    if (!/^\d+$/.test(id)) continue;

    for (const range of emoteEntry.slice(separator + 1).split(",")) {
      const match = range.match(/^(\d+)-(\d+)$/);
      if (!match) continue;
      const start = Number(match[1]);
      const end = Number(match[2]);
      if (end < start || end >= message.length) continue;

      const emoteName = message.slice(start, end + 1);
      if (emoteName.toLocaleLowerCase("en-US") !== keyword.toLocaleLowerCase("en-US")) continue;

      return {
        id,
        name: emoteName,
        src: `${TWITCH_EMOTE_CDN}/${id}/default/dark/3.0`,
      };
    }
  }

  return null;
}
