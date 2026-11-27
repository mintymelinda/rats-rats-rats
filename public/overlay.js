import { createGifScheduler } from "./gif-scheduler.js";

const overlay = document.querySelector("#overlay");
const reconnectDelayMs = 1500;
const activeGifs = new Set();
let socket;

function clearActiveGifs() {
  for (const image of activeGifs) {
    image.remove();
  }
  activeGifs.clear();
}

const gifScheduler = createGifScheduler({
  clearActiveGifs,
  spawnRegularGif: (gif) => spawnGif(gif),
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

function announceMoonrat(text) {
  const announcement = document.createElement("div");
  announcement.className = "moonrat-announcement";
  announcement.textContent = text || "MOONRAT";
  announcement.setAttribute("aria-hidden", "true");
  overlay.append(announcement);
  announcement.addEventListener("animationend", () => announcement.remove(), { once: true });
}

function spawnGif({ src, durationMs, scale, yOffsetPx, flip = false, moonwalk = false, moonratText }, onDisplayComplete) {
  const image = document.createElement("img");
  image.className = moonwalk ? "rat-gif moonrat-gif" : "rat-gif";
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

  if (moonwalk) announceMoonrat(moonratText);

  image.addEventListener("load", () => {
    if (!image.isConnected) {
      if (moonwalk) completeDisplay();
      return;
    }
    const scaledWidth = image.naturalWidth * scale;
    image.style.width = `${image.naturalWidth}px`;
    image.style.height = "auto";

    const horizontalScale = flip !== moonwalk ? -1 : 1;
    const animation = image.animate(
      [
        { transform: `translateX(-${scaledWidth}px) scaleX(${horizontalScale}) scale(${scale})` },
        { transform: `translateX(${window.innerWidth}px) scaleX(${horizontalScale}) scale(${scale})` },
      ],
      { duration: durationMs, easing: "linear", fill: "forwards" },
    );
    animation.addEventListener("finish", completeDisplay, { once: true });
  }, { once: true });

  image.addEventListener("error", () => {
    if (moonwalk) completeDisplay();
    else {
      activeGifs.delete(image);
      image.remove();
    }
  }, { once: true });
}

connect();
