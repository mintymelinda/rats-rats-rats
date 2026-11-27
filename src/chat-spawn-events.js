import { findMatchesWithPositions } from "./matcher.js";
import { shouldMoonwalk } from "./moonwalk.js";
import { findTwitchEmote } from "./twitch-emotes.js";
import { filterDebugMoonratKeywordMatch, findDebugMoonratCommands } from "./debug-moonrat.js";

export async function resolveChatSpawnEvents({
  message,
  tags,
  username,
  mappings,
  emoteRegistry,
  queueIntervalMs,
  moonratDebug = false,
  random = Math.random,
}) {
  const debugCommands = findDebugMoonratCommands(username, message, mappings);
  let matches = findMatchesWithPositions(message, mappings);
  matches = filterDebugMoonratKeywordMatch(matches, debugCommands);

  for (const debugCommand of debugCommands) {
    const mappingIndex = mappings.findIndex(
      (mapping) => mapping.normalizedKeyword === debugCommand.keyword.toLocaleLowerCase("en-US"),
    );
    if (mappingIndex !== -1) {
      matches.push({
        mapping: mappings[mappingIndex],
        index: debugCommand.index,
        mappingIndex,
        debug: true,
      });
    }
  }

  matches.sort((a, b) => a.index - b.index || a.mappingIndex - b.mappingIndex);

  const events = [];
  for (const match of matches) {
    const mapping = match.mapping;
    let src = mapping.exists ? mapping.path : null;
    if (!src) {
      src = findTwitchEmote(message, tags.emotes, mapping.keyword)?.src
        || emoteRegistry.get(mapping.keyword)?.src
        || (await emoteRegistry.resolve(mapping.keyword))?.src;
    }
    if (!src) continue;

    events.push({
      type: "spawn",
      keyword: mapping.keyword,
      src,
      durationMs: mapping.durationMs,
      scale: mapping.scale,
      queueIntervalMs,
      yOffsetPx: mapping.yOffsetPx,
      flip: mapping.flip,
      moonratText: mapping.moonratText,
      moonwalk: match.debug ? true : shouldMoonwalk(random, moonratDebug),
    });
  }
  return events;
}
