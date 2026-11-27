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

    let spacingScheduled = false;
    const scheduleNext = (spacingMs) => {
      if (spacingScheduled) return;
      spacingScheduled = true;
      regularTimer = setTimer(() => {
        regularTimer = undefined;
        processQueue();
      }, spacingMs === undefined || spacingMs === null
        ? Math.max(0, Number(nextGif.queueIntervalMs ?? 500) || 0)
        : Math.max(0, Number(spacingMs) || 0));
    };

    // The browser calls onSpawnReady after loading the asset and measuring its
    // rendered width. This spaces starts by screen distance, not an arbitrary
    // fixed delay, while allowing all earlier GIFs to remain in flight.
    spawnRegularGif(nextGif, regularGifFinished, scheduleNext);
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
