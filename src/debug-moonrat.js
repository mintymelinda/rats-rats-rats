const DEBUG_MOONRAT_USERS = new Set(["mintymelinda", "pyoshi"]);
const DEBUG_MOONRAT_COMMAND = "debugMoonRatmindyfRatNes";

export function findDebugMoonratCommand(username, message) {
  if (typeof username !== "string" || typeof message !== "string") return null;
  if (!DEBUG_MOONRAT_USERS.has(username.toLocaleLowerCase("en-US"))) return null;

  const escapedCommand = DEBUG_MOONRAT_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\s)(${escapedCommand})(?=$|\\s)`).exec(message);
  if (!match) return null;

  return {
    keyword: "mindyfRatNes",
    index: match.index + (match[0].startsWith(" ") ? 1 : 0),
    length: DEBUG_MOONRAT_COMMAND.length,
  };
}

export function getDebugMoonratKeyword(username, message) {
  return findDebugMoonratCommand(username, message)?.keyword ?? null;
}
