import fs from "node:fs";
import path from "node:path";
import { parseMappings } from "./config.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createMappingManager({ filePath, initialDefinitions }) {
  let definitions = clone(initialDefinitions);
  if (filePath && fs.existsSync(filePath)) {
    definitions = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  let mappings = parseMappings(definitions);

  function persist(nextDefinitions) {
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(nextDefinitions, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(temporaryPath, filePath);
  }

  if (filePath && !fs.existsSync(filePath)) persist(definitions);

  return {
    get mappings() {
      return mappings;
    },
    get definitions() {
      return clone(definitions);
    },
    add(keyword, settings) {
      if (Object.keys(definitions).some((name) => name.toLocaleLowerCase("en-US") === keyword.toLocaleLowerCase("en-US"))) {
        throw new Error(`"${keyword}" is already mapped`);
      }
      const next = { ...definitions, [keyword]: settings };
      const nextMappings = parseMappings(next);
      persist(next);
      definitions = next;
      mappings = nextMappings;
      return mappings.find((mapping) => mapping.keyword === keyword);
    },
    remove(keyword) {
      const existing = Object.keys(definitions).find(
        (name) => name.toLocaleLowerCase("en-US") === keyword.toLocaleLowerCase("en-US"),
      );
      if (!existing) throw new Error(`"${keyword}" is not mapped`);
      const next = { ...definitions };
      delete next[existing];
      const nextMappings = parseMappings(next);
      persist(next);
      definitions = next;
      mappings = nextMappings;
      return existing;
    },
  };
}
