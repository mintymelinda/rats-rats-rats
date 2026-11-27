const DEBUG_MOONRAT_COMMANDS = new Map([
  ["mintymelinda:debugMoonRatmindyfRatNes", "mindyfRatNes"],
  ["pyoshi:debugMoonRatmindfRatNes", "mindyfRatNes"],
]);

export function getDebugMoonratKeyword(username, message) {
  if (typeof username !== "string" || typeof message !== "string") return null;
  return DEBUG_MOONRAT_COMMANDS.get(`${username.toLocaleLowerCase("en-US")}:${message}`) || null;
}
