import test from "node:test";
import assert from "node:assert/strict";
import { createGifScheduler } from "../public/gif-scheduler.js";

function createHarness() {
  const calls = [];
  const timers = [];
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
    clearActiveGifs() {
      calls.push("clear-active");
    },
    spawnRegularGif(gif) {
      calls.push(`regular:${gif.keyword}`);
    },
    spawnMoonwalkGif(gif, onDisplayComplete) {
      calls.push(`moonwalk:${gif.keyword}`);
      calls.push({ completeMoonwalk: onDisplayComplete });
    },
    onMoonratStageChange(active) {
      calls.push(`stage:${active}`);
    },
  });

  function runTimer(timer) {
    assert.equal(timer.cancelled, false);
    timer.callback();
  }

  return { calls, timers, queue, scheduler, runTimer };
}

test("a MOONRAT immediately interrupts regular spawns and clears visible rats", () => {
  const { calls, timers, scheduler } = createHarness();
  scheduler.enqueue({ keyword: "first", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "second", queueIntervalMs: 500 });
  const regularTimer = timers[0];

  scheduler.enqueue({ keyword: "moonrat", moonwalk: true, durationMs: 8000 });

  assert.equal(regularTimer.cancelled, true);
  assert.deepEqual(calls.filter((call) => typeof call === "string"), [
    "regular:first",
    "clear-active",
    "stage:true",
    "moonwalk:moonrat",
  ]);
  assert.equal(typeof calls[4].completeMoonwalk, "function");
  assert.equal(scheduler.moonratStageActive, true);
});

test("the blank buffer begins after the MOONRAT animation finishes and lasts equally long", () => {
  const { calls, timers, scheduler, runTimer } = createHarness();
  scheduler.enqueue({ keyword: "moonrat", moonwalk: true, durationMs: 8000 });
  const completion = calls.find((call) => typeof call === "object").completeMoonwalk;

  completion();
  assert.equal(timers[0].delay, 8000);
  assert.equal(scheduler.moonratStageActive, true);
  assert.equal(calls.includes("stage:false"), false);

  runTimer(timers[0]);
  assert.equal(scheduler.moonratStageActive, false);
  assert.equal(calls.includes("stage:false"), true);
});

test("regular GIFs wait through the MOONRAT display and blank buffer", () => {
  const { calls, timers, scheduler, runTimer } = createHarness();
  scheduler.enqueue({ keyword: "moonrat", moonwalk: true, durationMs: 4000 });
  scheduler.enqueue({ keyword: "queued-regular", queueIntervalMs: 500 });
  const completion = calls.find((call) => typeof call === "object").completeMoonwalk;

  completion();
  assert.equal(calls.includes("regular:queued-regular"), false);
  runTimer(timers[0]);
  assert.equal(calls.includes("regular:queued-regular"), true);
});

test("moonwalks arriving during the exclusive stage are prioritized ahead of regulars", () => {
  const { calls, timers, scheduler, runTimer } = createHarness();
  scheduler.enqueue({ keyword: "first-moon", moonwalk: true, durationMs: 1000 });
  scheduler.enqueue({ keyword: "regular", queueIntervalMs: 100 });
  scheduler.enqueue({ keyword: "second-moon", moonwalk: true, durationMs: 2000 });

  const firstCompletion = calls.find((call) => typeof call === "object").completeMoonwalk;
  firstCompletion();
  runTimer(timers[0]);

  assert.deepEqual(calls.filter((call) => typeof call === "string" && /^(moonwalk|regular):/.test(call)), [
    "moonwalk:first-moon",
    "moonwalk:second-moon",
  ]);
});

test("a debug MOONRAT interrupts a regular cadence immediately and preserves queued FIFO", () => {
  const { calls, timers, scheduler, runTimer } = createHarness();
  scheduler.enqueue({ keyword: "rat-1", queueIntervalMs: 500 });
  scheduler.enqueue({ keyword: "rat-2", queueIntervalMs: 500 });
  const cadenceTimer = timers[0];

  scheduler.enqueue({ keyword: "debug-moonrat", moonwalk: true, durationMs: 1000 });

  assert.equal(cadenceTimer.cancelled, true);
  assert.equal(scheduler.moonratStageActive, true);
  assert.deepEqual(calls.filter((call) => typeof call === "string"), [
    "regular:rat-1",
    "clear-active",
    "stage:true",
    "moonwalk:debug-moonrat",
  ]);

  const completion = calls.find((call) => typeof call === "object").completeMoonwalk;
  completion();
  runTimer(timers.at(-1));
  assert.equal(calls.includes("regular:rat-2"), true);
});
