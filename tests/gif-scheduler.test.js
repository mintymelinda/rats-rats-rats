import test from "node:test";
import assert from "node:assert/strict";
import { createGifScheduler } from "../public/gif-scheduler.js";

function createHarness() {
  const calls = [];
  const timers = [];
  const regularCompletions = [];
  const regularReady = [];
  const moonratCompletions = [];
  const queue = [];
  const scheduler = createGifScheduler({
    queue,
    setTimer(callback, delay) {
      const timer = { callback, delay, cancelled: false };
      timers.push(timer);
      return timer;
    },
    spawnRegularGif(gif, onDisplayComplete, onSpawnReady) {
      calls.push(`regular:${gif.keyword}`);
      regularCompletions.push(onDisplayComplete);
      regularReady.push(onSpawnReady);
    },
    spawnMoonwalkGif(gif, onDisplayComplete) {
      calls.push(`moonrat:${gif.keyword}`);
      moonratCompletions.push(onDisplayComplete);
    },
    onMoonratStageChange(active) {
      calls.push(`stage:${active}`);
    },
  });
  const runTimer = (timer) => {
    assert.equal(timer.cancelled, false);
    timer.callback();
  };
  return { calls, timers, regularCompletions, regularReady, moonratCompletions, queue, scheduler, runTimer };
}

test("regular GIFs overlap at measured spacing while remaining FIFO", () => {
  const { calls, timers, regularCompletions, regularReady, scheduler, runTimer } = createHarness();
  scheduler.enqueue({ keyword: "first", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "second", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "third", queueIntervalMs: 500 });

  assert.deepEqual(calls, ["regular:first"]);
  assert.equal(scheduler.activeRegularCount, 1);
  regularReady[0](1035);
  assert.equal(timers[0].delay, 1035);
  runTimer(timers[0]);
  assert.deepEqual(calls, ["regular:first", "regular:second"]);
  regularReady[1](900);
  runTimer(timers[1]);
  assert.deepEqual(calls, ["regular:first", "regular:second", "regular:third"]);
  regularReady[2](900);

  regularCompletions[0]();
  assert.equal(scheduler.activeRegularCount, 2);
  regularCompletions[1]();
  regularCompletions[2]();
  assert.equal(scheduler.activeRegularCount, 0);
});

test("a MOONRAT waits for every earlier regular GIF, then blocks later GIFs", () => {
  const { calls, timers, regularCompletions, regularReady, moonratCompletions, scheduler, runTimer } = createHarness();
  scheduler.enqueue({ keyword: "rat-1", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "rat-2", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "rat-3", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "rat-4", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "moonrat", moonwalk: true, durationMs: 8000 });
  scheduler.enqueue({ keyword: "rat-5", queueIntervalMs: 500 });

  regularReady[0](500); runTimer(timers[0]);
  regularReady[1](500); runTimer(timers[1]);
  regularReady[2](500); runTimer(timers[2]);
  assert.deepEqual(calls.filter((call) => call.startsWith("regular:")), [
    "regular:rat-1", "regular:rat-2", "regular:rat-3", "regular:rat-4",
  ]);

  regularCompletions[0]();
  regularCompletions[1]();
  regularCompletions[2]();
  assert.equal(moonratCompletions.length, 0);

  regularCompletions[3]();
  assert.deepEqual(calls.slice(-2), ["stage:true", "moonrat:moonrat"]);
  moonratCompletions[0]();
  assert.equal(calls.at(-1), "regular:rat-5");
});

test("debug and natural MOONRAT triggers follow identical FIFO barrier behavior", () => {
  for (const source of ["debug", "natural"]) {
    const { calls, timers, regularCompletions, regularReady, moonratCompletions, scheduler, runTimer } = createHarness();
    scheduler.enqueue({ keyword: "before", queueIntervalMs: 500 });
    scheduler.enqueue({ keyword: source, moonwalk: true, durationMs: 1000 });
    scheduler.enqueue({ keyword: "after", queueIntervalMs: 500 });

    regularReady[0](500); runTimer(timers[0]);
    assert.deepEqual(calls, ["regular:before"]);
    regularCompletions[0]();
    assert.deepEqual(calls.slice(-2), ["stage:true", `moonrat:${source}`]);
    moonratCompletions[0]();
    assert.equal(calls.at(-1), "regular:after");
  }
});

test("multiple MOONRATs retain FIFO positions among overlapping regular GIFs", () => {
  const { calls, timers, regularCompletions, regularReady, moonratCompletions, scheduler, runTimer } = createHarness();
  scheduler.enqueue({ keyword: "regular-1", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "moonrat-1", moonwalk: true });
  scheduler.enqueue({ keyword: "regular-2", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "moonrat-2", moonwalk: true });

  regularReady[0](500); runTimer(timers[0]);
  assert.deepEqual(calls, ["regular:regular-1"]);
  regularCompletions[0]();
  assert.equal(calls.at(-1), "moonrat:moonrat-1");

  moonratCompletions[0]();
  assert.equal(calls.at(-1), "regular:regular-2");
  regularReady[1](500); runTimer(timers[1]);
  regularCompletions[1]();
  assert.equal(calls.at(-1), "moonrat:moonrat-2");
  assert.equal(scheduler.moonratStageActive, true);
});

test("missing measured spacing falls back to the legacy 500ms cadence", () => {
  const { timers, regularReady, scheduler } = createHarness();
  scheduler.enqueue({ keyword: "default-delay" });
  regularReady[0]();
  assert.equal(timers[0].delay, 0);
  scheduler.enqueue({ keyword: "explicit", queueIntervalMs: 750 });
  // The first timer remains pending, so the second item is not started yet.
  assert.equal(scheduler.queuedCount, 1);
});

test("synchronous readiness and completion cannot bypass the configured spawn cadence", () => {
  const calls = [];
  const timers = [];
  const scheduler = createGifScheduler({
    setTimer(callback, delay) {
      const timer = { callback, delay };
      timers.push(timer);
      return timer;
    },
    spawnRegularGif(gif, onDisplayComplete, onSpawnReady) {
      calls.push(gif.keyword);
      onSpawnReady(500);
      onDisplayComplete();
    },
    spawnMoonwalkGif() {
      assert.fail("MOONRAT should not start before earlier queued regulars");
    },
  });

  scheduler.enqueue({ keyword: "first", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "second", queueIntervalMs: 500 });
  assert.deepEqual(calls, ["first"]);
  assert.equal(timers.length, 1);
  timers[0].callback();
  assert.deepEqual(calls, ["first", "second"]);
  assert.equal(timers.length, 2);
});
