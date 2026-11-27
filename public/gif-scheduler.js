import { enqueueGif } from "./gif-queue.js";

export function createGifScheduler({
  queue = [],
  setTimer = setTimeout,
  spawnRegularGif,
  spawnMoonwalkGif,
  onMoonratStageChange = () => {},
}) {
  let regularTimer;
  let activeRegularGifs = 0;
  let moonratStageActive = false;

  function startMoonratStage(gif) {
    moonratStageActive = true;
    onMoonratStageChange(true);

    let completed = false;
    const finishDisplay = () => {
      if (completed) return;
      completed = true;
      moonratStageActive = false;
      onMoonratStageChange(false);
      processQueue();
    };

    spawnMoonwalkGif(gif, finishDisplay);
  }

  function regularGifFinished() {
    if (activeRegularGifs === 0) return;
    activeRegularGifs -= 1;
    processQueue();
  }

  function processQueue() {
    if (moonratStageActive || regularTimer !== undefined || queue.length === 0) return;

    const nextGif = queue[0];
    if (nextGif.moonwalk) {
      // A MOONRAT is a FIFO barrier: all earlier regular GIFs must finish
      // their traversal before the exclusive MOONRAT stage can begin.
      if (activeRegularGifs > 0) return;
      queue.shift();
      startMoonratStage(nextGif);
      return;
    }

    queue.shift();
    activeRegularGifs += 1;

    const configuredInterval = nextGif.queueIntervalMs;
    const queueIntervalMs = configuredInterval === undefined || configuredInterval === null
      ? 500
      : Math.max(0, Number(configuredInterval) || 0);

    // Arm the cadence before spawning. This keeps synchronous completion
    // callbacks (e.g. a failed or immediately-completed asset) from re-entering
    // the queue and bypassing the configured spacing.
    regularTimer = setTimer(() => {
      regularTimer = undefined;
      processQueue();
    }, queueIntervalMs);

    spawnRegularGif(nextGif, regularGifFinished);
  }

  function enqueue(gif) {
    enqueueGif(queue, gif);
    processQueue();
  }

  return {
    enqueue,
    get moonratStageActive() {
      return moonratStageActive;
    },
    get activeRegularCount() {
      return activeRegularGifs;
    },
    get queuedCount() {
      return queue.length;
    },
  };
}
