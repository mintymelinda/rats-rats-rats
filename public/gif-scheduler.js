import { enqueueGif } from "./gif-queue.js";

export function createGifScheduler({
  queue = [],
  setTimer = setTimeout,
  clearTimer = clearTimeout,
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
    activeRegularGifs = Math.max(0, activeRegularGifs - 1);
    processQueue();
  }

  function processQueue() {
    if (moonratStageActive || regularTimer !== undefined || queue.length === 0) return;

    const nextGif = queue[0];
    if (nextGif.moonwalk) {
      // A MOONRAT is a FIFO barrier: don't start it until every earlier
      // regular GIF has completely left the viewport.
      if (activeRegularGifs > 0) return;
      queue.shift();
      startMoonratStage(nextGif);
      return;
    }

    queue.shift();
    activeRegularGifs += 1;
    spawnRegularGif(nextGif, regularGifFinished);
    regularTimer = setTimer(() => {
      regularTimer = undefined;
      processQueue();
    }, Math.max(0, Number(nextGif.queueIntervalMs) || 0));
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
