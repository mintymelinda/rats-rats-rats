import fs from "node:fs";
import path from "node:path";

const DEFAULT_MAPPINGS = {
  mindyfRatNes: { path: "/assets/rat-nes.gif", durationMs: 8000, scale: 2, yOffsetPx: 0, flip: false },
  mindyfRatDos: { path: "/assets/rat-dos.gif", durationMs: 8000, scale: 2, yOffsetPx: 0, flip: false },
  mindyfRatSnes: { path: "/assets/rat-snes.gif", durationMs: 8000, scale: 2, yOffsetPx: 0, flip: false },
};

function positiveInteger(value, name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

function parseBoolean(value, name, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be "true" or "false"`);
}

function parseColor(value, name, fallback) {
  const color = value ?? fallback;
  if (!/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color)) {
    throw new Error(`${name} must be a 3, 4, 6, or 8 digit hexadecimal color (for example #ff36c8)`);
  }
  return color;
}

function parseYOffset(value, keyword) {
  const yOffsetPx = Number(value ?? 0);
  if (!Number.isInteger(yOffsetPx) || yOffsetPx < -10000 || yOffsetPx > 10000) {
    throw new Error(`GIF mapping "${keyword}" yOffsetPx must be an integer between -10000 and 10000`);
  }
  return yOffsetPx;
}

function inferMoonratText(keyword) {
  const animal = keyword.match(/[A-Z][a-z]+/)?.[0];
  return animal ? `MOON${animal.toLocaleUpperCase("en-US")}` : "MOONRAT";
}

function parseMoonratText(value, keyword) {
  if (value === undefined || value === null) return inferMoonratText(keyword);
  if (typeof value !== "string" || !value.trim() || value.trim().length > 40) {
    throw new Error(`GIF mapping "${keyword}" moonratText must be a non-empty string of at most 40 characters`);
  }
  return value.trim().toLocaleUpperCase("en-US");
}

export function parseMappings(raw = JSON.stringify(DEFAULT_MAPPINGS)) {
  let mappings;
  try {
    mappings = JSON.parse(raw);
  } catch {
    throw new Error("GIF_MAPPINGS must be a valid JSON object");
  }

  if (!mappings || Array.isArray(mappings) || typeof mappings !== "object") {
    throw new Error("GIF_MAPPINGS must be a JSON object of keyword-to-GIF mappings");
  }

  return Object.entries(mappings).map(([keyword, mapping]) => {
    if (!keyword.trim()) throw new Error("GIF_MAPPINGS keywords cannot be empty");
    if (!mapping || Array.isArray(mapping) || typeof mapping !== "object") {
      throw new Error(`GIF mapping "${keyword}" must be an object with optional path and display settings`);
    }

    const gifPath = mapping.path;
    if (gifPath !== undefined) {
      if (typeof gifPath !== "string" || !gifPath.startsWith("/assets/")) {
        throw new Error(`GIF mapping "${keyword}" path must point to a file under /assets/`);
      }
      if (path.extname(gifPath).toLowerCase() !== ".gif") {
        throw new Error(`GIF mapping "${keyword}" must reference a .gif file`);
      }
      const resolved = path.resolve("/assets", gifPath.slice("/assets/".length));
      if (resolved !== "/assets" && !resolved.startsWith("/assets/")) {
        throw new Error(`GIF mapping "${keyword}" escapes the assets directory`);
      }
    }

    const scale = positiveInteger(mapping.scale, `GIF mapping "${keyword}" scale`, 2);
    if (![1, 2, 4, 8].includes(scale)) {
      throw new Error(`GIF mapping "${keyword}" scale must be one of: 1, 2, 4, 8`);
    }
    const flip = mapping.flip ?? false;
    if (typeof flip !== "boolean") {
      throw new Error(`GIF mapping "${keyword}" flip must be a boolean`);
    }

    return {
      keyword,
      normalizedKeyword: keyword.toLocaleLowerCase("en-US"),
      path: gifPath ?? null,
      durationMs: positiveInteger(mapping.durationMs, `GIF mapping "${keyword}" durationMs`, 8000, { min: 250, max: 120000 }),
      scale,
      yOffsetPx: parseYOffset(mapping.yOffsetPx, keyword),
      flip,
      moonratText: parseMoonratText(mapping.moonratText, keyword),
      exists: Boolean(gifPath && fs.existsSync(gifPath) && fs.statSync(gifPath).isFile()),
    };
  });
}

export function loadConfig(env = process.env) {
  const channel = (env.TWITCH_CHANNEL || "mintymelinda").trim().replace(/^#/, "").toLowerCase();
  if (!/^[a-z0-9_]{1,25}$/.test(channel)) {
    throw new Error("TWITCH_CHANNEL must be a valid Twitch channel login");
  }

  return {
    channel,
    port: positiveInteger(env.PORT, "PORT", 3000, { min: 1, max: 65535 }),
    gifQueueIntervalMs: positiveInteger(env.GIF_QUEUE_INTERVAL_MS, "GIF_QUEUE_INTERVAL_MS", 500, { min: 0, max: 60000 }),
    moonratDebug: parseBoolean(env.MOONRAT_DEBUG, "MOONRAT_DEBUG"),
    moonratColors: {
      text: parseColor(env.MOONRAT_TEXT_COLOR, "MOONRAT_TEXT_COLOR", "#fff36b"),
      outline: parseColor(env.MOONRAT_OUTLINE_COLOR, "MOONRAT_OUTLINE_COLOR", "#a400a8"),
      glow: parseColor(env.MOONRAT_GLOW_COLOR, "MOONRAT_GLOW_COLOR", "#fff36b"),
    },
    mappings: parseMappings(env.GIF_MAPPINGS),
  };
}
