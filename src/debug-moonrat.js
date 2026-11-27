const DEBUG_MOONRAT_USERS = new Set(["mintymelinda", "pyoshi"]);
const DEBUG_MOONRAT_PREFIX = "debugMoonRat";

export function findDebugMoonratCommand(username, message, mappings = []) {
  if (typeof username !== "string" || typeof message !== "string" || !Array.isArray(mappings)) return null;
  if (!DEBUG_MOONRAT_USERS.has(username.toLocaleLowerCase("en-US"))) return null;

  const commands = mappings
    .filter((mapping) => typeof mapping?.keyword === "string" && mapping.keyword.length > 0)
    .map((mapping) => mapping.keyword)
    .sort((a, b) => b.length - a.length);

  for (const keyword of commands) {
    const command = `${DEBUG_MOONRAT_PREFIX}${keyword}`;
    const escapedCommand = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`(?:^|\\s)(${escapedCommand})(?=$|\\s)`, "i").exec(message);
    if (!match) continue;

    return {
      keyword,
      index: match.index + match[0].length - match[1].length,
      length: command.length,
    };
  }

  return null;
}

export function getDebugMoonratKeyword(username, message, mappings = []) {
  return findDebugMoonratCommand(username, message, mappings)?.keyword ?? null;
}
