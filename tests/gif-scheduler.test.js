import test from "node:test";
import assert from "node:assert/strict";
import { createGifScheduler } from "../public/gif-scheduler.js";

function createHarness() {
  const calls = [];
  const timers = [];
  const regularCompletions = [];
  const moonratCompletions = [];
  const queue = [];
  const scheduler = createGifScheduler({
    queue,
    setTimer(callback, delay) {
      const timer = { callback, delay, cancelled: false };
      timers.push(timer);
      return timer;
    },
    clearTimer(timer) {
      timer.cancelled = true;
    },
    spawnRegularGif(gif, onDisplayComplete) {
      calls.push(`regular:${gif.keyword}`);
      regularCompletions.push(onDisplayComplete);
    },
    spawnMoonwalkGif(gif, onDisplayComplete) {
      calls.push(`moonrat:${gif.keyword}`);
      moonratCompletions.push(onDisplayComplete);
    },
    onMoonratStageChange(active) {
      calls.push(`stage:${active}`);
    },
  });

  function runTimer(timer) {
    assert.equal(timer.cancelled, false);
    timer.callback();
  }

  return { calls, timers, regularCompletions, moonratCompletions, queue, scheduler, runTimer };
}

test("regular GIFs spawn at the configured cadence and report when fully off-screen", () => {
  const { calls, timers, regularCompletions, scheduler, runTimer } = createHarness();
  scheduler.enqueue({ keyword: "first", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "second", queueIntervalMs: 500 });

  assert.deepEqual(calls, ["regular:first"]);
  runTimer(timers[0]);
  assert.deepEqual(calls, ["regular:first", "regular:second"]);
  assert.equal(scheduler.activeRegularCount, 2);

  regularCompletions[0]();
  assert.equal(scheduler.activeRegularCount, 1);
  regularCompletions[1]();
  assert.equal(scheduler.activeRegularCount, 0);
});

test("a MOONRAT waits for every earlier regular GIF to leave the viewport, then blocks later GIFs until it exits", () => {
  const { calls, timers, regularCompletions, moonratCompletions, scheduler, runTimer } = createHarness();

  scheduler.enqueue({ keyword: "rat-1", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "rat-2", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "rat-3", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "rat-4", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "moonrat", moonwalk: true, durationMs: 8000 });
  scheduler.enqueue({ keyword: "rat-5", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "rat-6", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "rat-7", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "rat-8", queueIntervalMs: 500 });

  runTimer(timers[0]);
  runTimer(timers[1]);
  runTimer(timers[2]);
  runTimer(timers[3]);

  assert.deepEqual(calls.filter((call) => call.startsWith("regular:")), [
    "regular:rat-1", "regular:rat-2", "regular:rat-3", "regular:rat-4",
  ]);
  assert.equal(scheduler.queuedCount, 5);

  regularCompletions[0]();
  regularCompletions[1]();
  regularCompletions[2]();
  assert.equal(moonratCompletions.length, 0);

  regularCompletions[3]();
  assert.deepEqual(calls.slice(-2), ["stage:true", "moonrat:moonrat"]);
  assert.equal(scheduler.moonratStageActive, true);

  moonratCompletions[0]();
  assert.equal(scheduler.moonratStageActive, false);
  assert.equal(calls.at(-1), "regular:rat-5");
});

test("debug and natural MOONRAT triggers follow identical FIFO behavior", () => {
  for (const source of ["debug", "natural"]) {
    const { calls, timers, regularCompletions, moonratCompletions, scheduler, runTimer } = createHarness();
    scheduler.enqueue({ keyword: "before", queueIntervalMs: 0 });
    scheduler.enqueue({ keyword: source, moonwalk: true, durationMs: 1000 });
    scheduler.enqueue({ keyword: "after", queueIntervalMs: 0 });

    runTimer(timers[0]);
    assert.deepEqual(calls, ["regular:before"]);
    regularCompletions[0]();
    assert.deepEqual(calls.slice(-2), ["stage:true", `moonrat:${source}`]);

    moonratCompletions[0]();
    assert.equal(calls.at(-1), "regular:after");
  }
});

test("multiple MOONRATs retain their exact FIFO positions among regular GIFs", () => {
  const { calls, timers, regularCompletions, moonratCompletions, scheduler, runTimer } = createHarness();
  scheduler.enqueue({ keyword: "regular-1", queueIntervalMs: 0 });
  scheduler.enqueue({ keyword: "moonrat-1", moonwalk: true });
  scheduler.enqueue({ keyword: "regular-2", queueIntervalMs: 0 });
  scheduler.enqueue({ keyword: "moonrat-2", moonwalk: true });

  runTimer(timers[0]);
  regularCompletions[0]();
  assert.equal(calls.at(-1), "moonrat:moonrat-1");

  moonratCompletions[0]();
  assert.equal(calls.at(-1), "regular:regular-2");
  runTimer(timers[1]);
  regularCompletions[1]();
  assert.equal(calls.at(-1), "moonrat:moonrat-2");
  assert.equal(scheduler.moonratStageActive, true);
});
