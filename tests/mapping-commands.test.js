import test from "node:test";
import assert from "node:assert/strict";
import { createMappingManager } from "../src/mapping-manager.js";
import { handleMappingCommand, isMappingCommand } from "../src/mapping-commands.js";

function setup() {
  const manager = createMappingManager({ initialDefinitions: { mindyfRatNes: {} } });
  const logs = [];
  const logger = { info: (message) => logs.push(message), warn: (message) => logs.push(message) };
  return { manager, logger, logs };
}

test("recognizes only add and remove command prefixes", () => {
  assert.equal(isMappingCommand("!add kintBee"), true);
  assert.equal(isMappingCommand("!REMOVE kintBee"), true);
  assert.equal(isMappingCommand("hello !add kintBee"), false);
});

test("authorized !add parses flipped and scale parameters and persists in manager", () => {
  const { manager, logger } = setup();
  const result = handleMappingCommand({
    username: "MintyMelinda",
    message: "!add kintBee?flipped=true&scale=4",
    manager,
    logger,
  });
  assert.equal(result.action, "add");
  assert.equal(result.mapping.flip, true);
  assert.equal(result.mapping.scale, 4);
  assert.equal(manager.mappings.at(-1).keyword, "kintBee");
});

test("authorized !add supports defaults and other validated options", () => {
  const { manager, logger } = setup();
  const result = handleMappingCommand({
    username: "PYOSHI",
    message: "!add graped4Based?durationMs=4000&yOffsetPx=-12&moonratText=MOONGRAPE",
    manager,
    logger,
  });
  assert.equal(result.mapping.durationMs, 4000);
  assert.equal(result.mapping.yOffsetPx, -12);
  assert.equal(result.mapping.moonratText, "MOONGRAPE");
  assert.equal(result.mapping.flip, false);
});

test("unauthorized commands are consumed without changing mappings", () => {
  const { manager, logger } = setup();
  const result = handleMappingCommand({
    username: "someoneelse",
    message: "!add kintBee",
    manager,
    logger,
  });
  assert.equal(result.handled, true);
  assert.equal(result.authorized, false);
  assert.equal(manager.mappings.length, 1);
});

test("removes an existing mapping and rejects unknown keywords", () => {
  const { manager, logger } = setup();
  handleMappingCommand({ username: "mintymelinda", message: "!add kintBee", manager, logger });
  const result = handleMappingCommand({ username: "mintymelinda", message: "!remove kintBee", manager, logger });
  assert.equal(result.action, "remove");
  assert.deepEqual(manager.mappings.map(({ keyword }) => keyword), ["mindyfRatNes"]);
  assert.match(handleMappingCommand({ username: "mintymelinda", message: "!remove missing", manager, logger }).error, /not mapped/);
});

test("rejects invalid or unsupported add parameters without writing a mapping", () => {
  const { manager, logger } = setup();
  for (const message of [
    "!add kintBee?scale=3",
    "!add kintBee?flipped=yes",
    "!add kintBee?unknown=1",
    "!add kintBee?scale=2&scale=4",
    "!add bad-keyword",
    "!add kintBee?durationMs=100",
  ]) {
    assert.ok(handleMappingCommand({ username: "mintymelinda", message, manager, logger }).error, message);
  }
  assert.equal(manager.mappings.length, 1);
});

test("does not allow remove parameters or adding a duplicate", () => {
  const { manager, logger } = setup();
  assert.match(handleMappingCommand({ username: "mintymelinda", message: "!remove mindyfRatNes?x=1", manager, logger }).error, /only a keyword/);
  assert.match(handleMappingCommand({ username: "mintymelinda", message: "!add mindyfRatNes", manager, logger }).error, /already mapped/);
});
