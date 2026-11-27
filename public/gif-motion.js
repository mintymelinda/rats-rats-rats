export function getHorizontalTravel({ viewportWidth, scaledWidth, flipped }) {
  if (flipped) {
    // A bottom-left transform origin makes scaleX(-1) extend left of its anchor.
    // Move the anchor a full image width beyond the viewport on exit.
    return { startX: 0, endX: viewportWidth + scaledWidth };
  }

  return { startX: -scaledWidth, endX: viewportWidth };
}

// Keep successive GIFs separated by a fraction of one rendered image width.
// The interval is derived from their actual travel speed, so it scales with
// viewport size, GIF dimensions, scale, and traversal duration.
export function getSpawnSpacingMs({ viewportWidth, scaledWidth, durationMs, separationRatio = 0.75 }) {
  const travelDistance = Number(viewportWidth) + Number(scaledWidth);
  const width = Number(scaledWidth);
  const duration = Number(durationMs);
  const ratio = Number(separationRatio);

  if (![travelDistance, width, duration, ratio].every(Number.isFinite)
    || travelDistance <= 0 || width <= 0 || duration <= 0 || ratio < 0) {
    return 0;
  }

  return Math.ceil(duration * Math.min(width * ratio, travelDistance) / travelDistance);
}
