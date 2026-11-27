import test from "node:test";
import assert from "node:assert/strict";
import { enqueueGif } from "../public/gif-queue.js";

test("all GIFs, including MOONRATs, retain strict FIFO arrival order", () => {
  const queue = [];
  const events = [
    { keyword: "rat-1" },
    { keyword: "rat-2" },
    { keyword: "moonrat-1", moonwalk: true },
    { keyword: "rat-3" },
    { keyword: "moonrat-2", moonwalk: true },
    { keyword: "rat-4" },
  ];

  for (const event of events) enqueueGif(queue, event);
  assert.deepEqual(queue, events);
});
