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
