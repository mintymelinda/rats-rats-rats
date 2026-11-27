const DEBUG_MOONRAT_USERS = new Set(["mintymelinda", "pyoshi"]);
const DEBUG_MOONRAT_PREFIX = "debugMoonRat";

export function findDebugMoonratCommands(username, message, mappings = []) {
  if (typeof username !== "string" || typeof message !== "string" || !Array.isArray(mappings)) return [];
  if (!DEBUG_MOONRAT_USERS.has(username.toLocaleLowerCase("en-US"))) return [];

  const keywords = mappings
    .filter((mapping) => typeof mapping?.keyword === "string" && mapping.keyword.length > 0)
    .map((mapping) => mapping.keyword)
    .sort((a, b) => b.length - a.length);
  const commands = [];
  const tokenPattern = /\S+/g;
  let token;

  while ((token = tokenPattern.exec(message)) !== null) {
    const value = token[0];
    if (!value.toLocaleLowerCase("en-US").startsWith(DEBUG_MOONRAT_PREFIX.toLocaleLowerCase("en-US"))) continue;

    const suffix = value.slice(DEBUG_MOONRAT_PREFIX.length);
    const keyword = keywords.find((candidate) => candidate.toLocaleLowerCase("en-US") === suffix.toLocaleLowerCase("en-US"));
    if (!keyword) continue;

    commands.push({
      keyword,
      index: token.index,
      length: value.length,
    });
  }

  return commands;
}

export function findDebugMoonratCommand(username, message, mappings = []) {
  return findDebugMoonratCommands(username, message, mappings)[0] ?? null;
}

export function filterDebugMoonratKeywordMatch(events, debugCommands) {
  if (!Array.isArray(debugCommands) || debugCommands.length === 0) return events;
  const commandSuffixes = new Set(debugCommands.map((command) => (
    `${command.index + DEBUG_MOONRAT_PREFIX.length}:${command.keyword.toLocaleLowerCase("en-US")}`
  )));
  return events.filter((event) => !commandSuffixes.has(
    `${event.index}:${event.mapping.normalizedKeyword}`,
  ));
}

export function getDebugMoonratKeyword(username, message, mappings = []) {
  return findDebugMoonratCommand(username, message, mappings)?.keyword ?? null;
}
