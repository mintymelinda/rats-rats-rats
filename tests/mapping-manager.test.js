import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createMappingManager } from "../src/mapping-manager.js";

test("seeds the persistent mapping file and retains changes across manager restarts", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "rats-mappings-"));
  const filePath = path.join(directory, "gif-mappings.json");
  const initialDefinitions = { mindyfRatNes: { path: "/assets/rat-nes.gif" } };

  try {
    const first = createMappingManager({ filePath, initialDefinitions });
    assert.equal(first.mappings.length, 1);
    first.add("kintBee", { scale: 4, flip: true });

    const restarted = createMappingManager({ filePath, initialDefinitions });
    assert.deepEqual(restarted.mappings.map(({ keyword }) => keyword), ["mindyfRatNes", "kintBee"]);
    assert.equal(restarted.mappings[1].scale, 4);
    assert.equal(restarted.mappings[1].flip, true);
    assert.equal(restarted.remove("kintBee"), "kintBee");
    assert.equal(createMappingManager({ filePath, initialDefinitions }).mappings.length, 1);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects duplicate mappings without changing persisted data", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "rats-mappings-"));
  const filePath = path.join(directory, "gif-mappings.json");
  try {
    const manager = createMappingManager({ filePath, initialDefinitions: { Rat: {} } });
    assert.throws(() => manager.add("rat", {}), /already mapped/);
    assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(filePath, "utf8"))), ["Rat"]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
