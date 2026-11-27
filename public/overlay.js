import { createGifScheduler } from "./gif-scheduler.js";
import { getHorizontalTravel, getSpawnSpacingMs } from "./gif-motion.js";
import { createAlternatingGifDepth } from "./gif-depth.js";

const overlay = document.querySelector("#overlay");
const reconnectDelayMs = 1500;
const activeGifs = new Set();
const nextGifDepth = createAlternatingGifDepth();
let socket;

const gifScheduler = createGifScheduler({
  spawnRegularGif: (gif, onDisplayComplete, onSpawnReady) => spawnGif(gif, onDisplayComplete, onSpawnReady),
  spawnMoonwalkGif: (gif, onDisplayComplete) => spawnGif(gif, onDisplayComplete),
  onMoonratStageChange(active) {
    overlay.classList.toggle("moonrat-stage", active);
  },
});

function connect() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

  socket.addEventListener("message", (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    if (payload.type === "connected" && payload.moonratColors) {
      document.documentElement.style.setProperty("--moonrat-text-color", payload.moonratColors.text);
      document.documentElement.style.setProperty("--moonrat-outline-color", payload.moonratColors.outline);
      document.documentElement.style.setProperty("--moonrat-glow-color", payload.moonratColors.glow);
    } else if (payload.type === "spawn") {
      gifScheduler.enqueue(payload);
    }
  });

  socket.addEventListener("close", () => {
    window.setTimeout(connect, reconnectDelayMs);
  });

  socket.addEventListener("error", () => socket.close());
}

function announceMoonrat(text, durationMs) {
  const announcement = document.createElement("div");
  announcement.className = "moonrat-announcement";
  announcement.textContent = text || "MOONRAT";
  announcement.setAttribute("aria-hidden", "true");
  announcement.style.setProperty("--moonrat-duration", `${durationMs}ms`);
  overlay.append(announcement);
  announcement.addEventListener("animationend", () => announcement.remove(), { once: true });
}

function spawnGif({ src, durationMs, scale, yOffsetPx, flip = false, moonwalk = false, moonratText, queueIntervalMs }, onDisplayComplete, onSpawnReady) {
  const image = document.createElement("img");
  image.className = `rat-gif rat-gif--${nextGifDepth()}${moonwalk ? " moonrat-gif" : ""}`;
  image.alt = "";
  image.draggable = false;
  image.style.bottom = `${Number(yOffsetPx) || 0}px`;
  activeGifs.add(image);
  overlay.append(image);

  let completed = false;
  let spawnReady = false;
  const notifySpawnReady = (spacingMs) => {
    if (spawnReady) return;
    spawnReady = true;
    onSpawnReady?.(spacingMs);
  };
  const completeDisplay = () => {
    if (completed) return;
    completed = true;
    activeGifs.delete(image);
    image.remove();
    // A failed asset must release both the display slot and the FIFO scheduler.
    notifySpawnReady(0);
    onDisplayComplete?.();
  };

  image.addEventListener("load", () => {
    if (!image.isConnected) {
      completeDisplay();
      return;
    }
    if (moonwalk) announceMoonrat(moonratText, durationMs);

    const scaledWidth = image.naturalWidth * scale;
    image.style.width = `${image.naturalWidth}px`;
    image.style.height = "auto";

    const horizontalScale = flip !== moonwalk ? -1 : 1;
    const viewportWidth = window.innerWidth;
    const { startX, endX } = getHorizontalTravel({
      viewportWidth,
      scaledWidth,
      flipped: horizontalScale < 0,
    });
    const measuredSpacing = getSpawnSpacingMs({ viewportWidth, scaledWidth, durationMs });
    const configuredSpacing = Math.max(0, Number(queueIntervalMs) || 0);
    notifySpawnReady(Math.max(measuredSpacing, configuredSpacing));

    const animation = image.animate(
      [
        { transform: `translateX(${startX}px) scaleX(${horizontalScale}) scale(${scale})` },
        { transform: `translateX(${endX}px) scaleX(${horizontalScale}) scale(${scale})` },
      ],
      { duration: durationMs, easing: "linear", fill: "forwards" },
    );
    animation.addEventListener("finish", completeDisplay, { once: true });
  }, { once: true });

  image.addEventListener("error", completeDisplay, { once: true });

  // Attach lifecycle listeners before starting the request. This ensures a
  // cached or immediately failing asset cannot be missed by the scheduler.
  image.src = src;
}

connect();
