export function shouldMoonwalk(random = Math.random, force = false) {
  return force || random() < 0.01;
}
