export function getHorizontalTravel({ viewportWidth, scaledWidth, flipped }) {
  if (flipped) {
    // A bottom-left transform origin makes scaleX(-1) extend left of its anchor.
    // Move the anchor a full image width beyond the viewport on exit.
    return { startX: 0, endX: viewportWidth + scaledWidth };
  }

  return { startX: -scaledWidth, endX: viewportWidth };
}