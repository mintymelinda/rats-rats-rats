export function enqueueGif(queue, gif) {
  if (!gif.moonwalk) {
    queue.push(gif);
    return;
  }

  const firstRegularGif = queue.findIndex((queuedGif) => !queuedGif.moonwalk);
  if (firstRegularGif === -1) {
    queue.push(gif);
  } else {
    queue.splice(firstRegularGif, 0, gif);
  }
}

export function getGifQueueDelay(gif) {
  if (gif.moonwalk) {
    const durationMs = Number(gif.durationMs);
    return Number.isFinite(durationMs) && durationMs > 0 ? durationMs * 2 : 16000;
  }

  return Math.max(0, Number(gif.queueIntervalMs) || 0);
}
