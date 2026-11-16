import fs from "node:fs";
import path from "node:path";

const DEFAULT_MAPPINGS = {
  mindyfRatNes: "/assets/rat-nes.gif",
  mindyfRatDos: "/assets/rat-dos.gif",
  mindyfRatSnes: "/assets/rat-snes.gif",
};

function positiveInteger(value, name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

export function parseMappings(raw = JSON.stringify(DEFAULT_MAPPINGS)) {
  let mappings;
  try {
    mappings = JSON.parse(raw);
  } catch {
    throw new Error("GIF_MAPPINGS must be a valid JSON object");
  }

  if (!mappings || Array.isArray(mappings) || typeof mappings !== "object") {
    throw new Error("GIF_MAPPINGS must be a JSON object of keyword-to-path pairs");
  }

  for (const [keyword, gifPath] of Object.entries(mappings)) {
    if (!keyword.trim()) throw new Error("GIF_MAPPINGS keywords cannot be empty");
    if (typeof gifPath !== "string" || !gifPath.startsWith("/assets/")) {
      throw new Error(`GIF mapping "${keyword}" must point to a file under /assets/`);
    }
    if (path.extname(gifPath).toLowerCase() !== ".gif") {
      throw new Error(`GIF mapping "${keyword}" must reference a .gif file`);
    }
    const resolved = path.resolve("/assets", gifPath.slice("/assets/".length));
    if (resolved !== "/assets" && !resolved.startsWith("/assets/")) {
      throw new Error(`GIF mapping "${keyword}" escapes the assets directory`);
    }
  }

  return Object.entries(mappings).map(([keyword, gifPath]) => ({
    keyword,
    normalizedKeyword: keyword.toLocaleLowerCase("en-US"),
    path: gifPath,
    exists: fs.existsSync(gifPath) && fs.statSync(gifPath).isFile(),
  }));
}

export function loadConfig(env = process.env) {
  const channel = (env.TWITCH_CHANNEL || "mintymelinda").trim().replace(/^#/, "").toLowerCase();
  if (!/^[a-z0-9_]{1,25}$/.test(channel)) {
    throw new Error("TWITCH_CHANNEL must be a valid Twitch channel login");
  }

  const scale = positiveInteger(env.GIF_SCALE, "GIF_SCALE", 2);
  if (![1, 2, 4, 8].includes(scale)) {
    throw new Error("GIF_SCALE must be one of: 1, 2, 4, 8");
  }

  return {
    channel,
    port: positiveInteger(env.PORT, "PORT", 3000, { min: 1, max: 65535 }),
    gifQueueIntervalMs: positiveInteger(env.GIF_QUEUE_INTERVAL_MS, "GIF_QUEUE_INTERVAL_MS", 500, { min: 0, max: 60000 }),
    animationDurationMs: positiveInteger(
      env.ANIMATION_DURATION_MS,
      "ANIMATION_DURATION_MS",
      8000,
      { min: 250, max: 120000 },
    ),
    scale,
    mappings: parseMappings(env.GIF_MAPPINGS),
  };
}
