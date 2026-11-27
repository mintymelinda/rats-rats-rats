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

test("updates an existing mapping case-insensitively and persists replacement settings", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "rats-mappings-"));
  const filePath = path.join(directory, "gif-mappings.json");
  try {
    const manager = createMappingManager({
      filePath,
      initialDefinitions: { KintBee: { scale: 2, flip: false, durationMs: 4000 } },
    });
    const updated = manager.add("kintbee", { scale: 4, flip: true, durationMs: 8000 });
    assert.equal(updated.keyword, "KintBee");
    assert.equal(updated.scale, 4);
    assert.equal(updated.flip, true);
    assert.equal(updated.durationMs, 8000);
    assert.deepEqual(Object.keys(manager.definitions), ["KintBee"]);

    const restarted = createMappingManager({ filePath, initialDefinitions: {} });
    assert.equal(restarted.mappings.length, 1);
    assert.equal(restarted.mappings[0].scale, 4);
    assert.equal(restarted.mappings[0].flip, true);
    assert.equal(restarted.mappings[0].durationMs, 8000);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
