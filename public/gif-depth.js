export function createAlternatingGifDepth() {
  let nextDepth = "ahead";

  return function getNextGifDepth() {
    const depth = nextDepth;
    nextDepth = depth === "ahead" ? "behind" : "ahead";
    return depth;
  };
}
