const DEBUG_MOONRAT_USERS = new Set(["mintymelinda", "pyoshi"]);
const DEBUG_MOONRAT_COMMAND = "debugMoonRatmindyfRatNes";

export function getDebugMoonratKeyword(username, message) {
  if (typeof username !== "string" || typeof message !== "string") return null;
  if (!DEBUG_MOONRAT_USERS.has(username.toLocaleLowerCase("en-US"))) return null;
  return message === DEBUG_MOONRAT_COMMAND ? "mindyfRatNes" : null;
}
