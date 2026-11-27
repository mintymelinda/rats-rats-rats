import { createGifScheduler } from "./gif-scheduler.js";
import { getHorizontalTravel } from "./gif-motion.js";
import { createAlternatingGifDepth } from "./gif-depth.js";

const overlay = document.querySelector("#overlay");
const reconnectDelayMs = 1500;
const activeGifs = new Set();
const nextGifDepth = createAlternatingGifDepth();
const queueDebugEnabled = new URLSearchParams(window.location.search).get("debugQueue") === "1";
let debugPanel;
let debugLines = [];
let socket;

function queueDebug(message) {
  if (!queueDebugEnabled) return;
  const line = `${new Date().toLocaleTimeString()} ${message}`;
  console.info(`[gif-queue] ${line}`);
  debugLines.push(line);
  debugLines = debugLines.slice(-24);
  if (debugPanel) debugPanel.textContent = debugLines.join("\n");
}

if (queueDebugEnabled) {
  debugPanel = document.createElement("pre");
  debugPanel.setAttribute("aria-label", "GIF queue diagnostics");
  Object.assign(debugPanel.style, {
    position: "fixed",
    top: "8px",
    left: "8px",
    zIndex: "2147483647",
    maxWidth: "min(95vw, 900px)",
    maxHeight: "45vh",
    overflow: "hidden",
    margin: "0",
    padding: "8px",
    color: "#fff",
    background: "rgba(0, 0, 0, .85)",
    font: "12px/1.4 monospace",
    whiteSpace: "pre-wrap",
    pointerEvents: "none",
  });
  document.body.append(debugPanel);
  queueDebug("diagnostics enabled");
}

const gifScheduler = createGifScheduler({
  spawnRegularGif: (gif, onDisplayComplete) => {
    queueDebug(`DISPATCH regular keyword=${gif.keyword ?? "?"} interval=${gif.queueIntervalMs ?? "default"}ms queuedAfterDispatch=${gifScheduler.queuedCount} active=${gifScheduler.activeRegularCount}`);
    spawnGif(gif, onDisplayComplete);
  },
  spawnMoonwalkGif: (gif, onDisplayComplete) => {
    queueDebug(`DISPATCH MOONRAT keyword=${gif.keyword ?? "?"}`);
    spawnGif(gif, onDisplayComplete);
  },
  onMoonratStageChange(active) {
    overlay.classList.toggle("moonrat-stage", active);
  },
});

function connect() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

  socket.addEventListener("open", () => queueDebug("WebSocket connected"));
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
      if (!payload.moonwalk) {
        queueDebug(`RECEIVE regular keyword=${payload.keyword ?? "?"} interval=${payload.queueIntervalMs ?? "missing"}ms queuedBefore=${gifScheduler.queuedCount}`);
      }
      gifScheduler.enqueue(payload);
    }
  });

  socket.addEventListener("close", () => {
    queueDebug("WebSocket closed; reconnecting");
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

function spawnGif({ src, durationMs, scale, yOffsetPx, flip = false, moonwalk = false, moonratText }, onDisplayComplete) {
  const image = document.createElement("img");
  image.className = `rat-gif rat-gif--${nextGifDepth()}${moonwalk ? " moonrat-gif" : ""}`;
  image.alt = "";
  image.draggable = false;
  image.style.bottom = `${(Number(yOffsetPx) || 0) * scale}px`;
  image.src = src;
  activeGifs.add(image);
  overlay.append(image);

  let completed = false;
  const completeDisplay = () => {
    if (completed) return;
    completed = true;
    activeGifs.delete(image);
    image.remove();
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
    const { startX, endX } = getHorizontalTravel({
      viewportWidth: window.innerWidth,
      scaledWidth,
      flipped: horizontalScale < 0,
    });
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
}

connect();
