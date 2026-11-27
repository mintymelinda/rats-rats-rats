import { parseMappings } from "./config.js";

const MANAGERS = new Set(["mintymelinda", "pyoshi"]);
const KEYWORD_PATTERN = /^[a-zA-Z0-9_]{1,64}$/;
const ALLOWED_PARAMETERS = new Set(["scale", "durationMs", "yOffsetPx", "flipped", "flip", "moonratText", "path"]);

export function isMappingCommand(message) {
  return typeof message === "string" && /^!(?:add|remove)(?:\s|$)/i.test(message.trim());
}

export function handleMappingCommand({ username, message, manager, logger = console }) {
  if (!isMappingCommand(message)) return { handled: false };
  if (typeof username !== "string" || !MANAGERS.has(username.toLocaleLowerCase("en-US"))) {
    return { handled: true, authorized: false };
  }

  const match = message.trim().match(/^!(add|remove)\s+(\S+)$/i);
  if (!match) {
    logger.warn(`Ignored malformed mapping command from ${username}`);
    return { handled: true, authorized: true, error: "Usage: !add keyword?scale=2&flipped=true or !remove keyword" };
  }

  const [, action, argument] = match;
  const separator = argument.indexOf("?");
  const keyword = separator === -1 ? argument : argument.slice(0, separator);
  const query = separator === -1 ? "" : argument.slice(separator + 1);
  if (!KEYWORD_PATTERN.test(keyword)) {
    return { handled: true, authorized: true, error: "Keyword must contain 1–64 letters, numbers, or underscores" };
  }

  try {
    if (action.toLowerCase() === "remove") {
      if (separator !== -1) throw new Error("!remove accepts only a keyword");
      const removed = manager.remove(keyword);
      logger.info(`Removed GIF mapping "${removed}" at chat request of ${username}`);
      return { handled: true, authorized: true, action: "remove", keyword: removed };
    }

    const settings = { durationMs: 8000, scale: 2, yOffsetPx: 0, flip: false };
    const params = new URLSearchParams(query);
    for (const key of params.keys()) {
      if (!ALLOWED_PARAMETERS.has(key)) throw new Error(`Unknown parameter "${key}"`);
      if ([...params.keys()].filter((candidate) => candidate === key).length > 1) {
        throw new Error(`Parameter "${key}" was specified more than once`);
      }
    }
    if (params.has("scale")) settings.scale = Number(params.get("scale"));
    if (params.has("durationMs")) settings.durationMs = Number(params.get("durationMs"));
    if (params.has("yOffsetPx")) settings.yOffsetPx = Number(params.get("yOffsetPx"));
    if (params.has("flipped") && params.has("flip")) throw new Error("Use either flipped or flip, not both");
    if (params.has("flipped")) settings.flip = params.get("flipped") === "true";
    if (params.has("flip")) settings.flip = params.get("flip") === "true";
    if (params.has("moonratText")) settings.moonratText = params.get("moonratText");
    if (params.has("path")) settings.path = params.get("path");
    parseMappings({ [keyword]: settings });

    const mapping = manager.add(keyword, settings);
    logger.info(`Added GIF mapping "${keyword}" (${JSON.stringify(settings)}) at chat request of ${username}`);
    return { handled: true, authorized: true, action: "add", keyword, mapping };
  } catch (error) {
    logger.warn(`Mapping command rejected from ${username}: ${error.message}`);
    return { handled: true, authorized: true, error: error.message };
  }
}
