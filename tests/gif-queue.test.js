import test from "node:test";
import assert from "node:assert/strict";
import { enqueueGif } from "../public/gif-queue.js";

test("MOONRAT is promoted ahead of waiting regular GIFs without changing their order", () => {
  const queue = [];
  const keyword1 = { keyword: "keyword1" };
  const keyword2 = { keyword: "keyword2" };
  const moonrat = { keyword: "trigger", moonwalk: true };
  const keyword3 = { keyword: "keyword3" };

  enqueueGif(queue, keyword1);
  enqueueGif(queue, keyword2);
  enqueueGif(queue, moonrat);
  enqueueGif(queue, keyword3);

  assert.deepEqual(queue, [moonrat, keyword1, keyword2, keyword3]);
});

test("multiple waiting MOONRAT events retain arrival order ahead of regular GIFs", () => {
  const queue = [];
  const firstMoonrat = { keyword: "first", moonwalk: true };
  const secondMoonrat = { keyword: "second", moonwalk: true };
  enqueueGif(queue, { keyword: "regular1" });
  enqueueGif(queue, firstMoonrat);
  enqueueGif(queue, { keyword: "regular2" });
  enqueueGif(queue, secondMoonrat);

  assert.deepEqual(queue, [
    firstMoonrat,
    secondMoonrat,
    { keyword: "regular1" },
    { keyword: "regular2" },
  ]);
});
