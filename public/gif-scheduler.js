import { enqueueGif } from "./gif-queue.js";

export function createGifScheduler({
  queue = [],
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  clearActiveGifs,
  spawnRegularGif,
  spawnMoonwalkGif,
  onMoonratStageChange = () => {},
}) {
  let regularTimer;
  let moonratStageActive = false;

  function startMoonratStage(gif) {
    if (regularTimer !== undefined) {
      clearTimer(regularTimer);
      regularTimer = undefined;
    }

    moonratStageActive = true;
    clearActiveGifs();
    onMoonratStageChange(true);

    let completed = false;
    const finishDisplay = () => {
      if (completed) return;
      completed = true;
      setTimer(() => {
        moonratStageActive = false;
        onMoonratStageChange(false);
        processQueue();
      }, gif.durationMs);
    };

    spawnMoonwalkGif(gif, finishDisplay);
  }

  function processQueue() {
    if (moonratStageActive || regularTimer !== undefined || queue.length === 0) return;

    const nextGif = queue.shift();
    if (nextGif.moonwalk) {
      startMoonratStage(nextGif);
      return;
    }

    spawnRegularGif(nextGif);
    regularTimer = setTimer(() => {
      regularTimer = undefined;
      processQueue();
    }, Math.max(0, Number(nextGif.queueIntervalMs) || 0));
  }

  function enqueue(gif) {
    if (gif.moonwalk && regularTimer !== undefined && !moonratStageActive) {
      clearTimer(regularTimer);
      regularTimer = undefined;
    }
    enqueueGif(queue, gif);
    processQueue();
  }

  return {
    enqueue,
    get moonratStageActive() {
      return moonratStageActive;
    },
    get queuedCount() {
      return queue.length;
    },
  };
}
