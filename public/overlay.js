const overlay = document.querySelector("#overlay");
const reconnectDelayMs = 1500;
const gifQueue = [];
let queueTimer;
let socket;

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
      gifQueue.push(payload);
      processGifQueue();
    }
  });

  socket.addEventListener("close", () => {
    window.setTimeout(connect, reconnectDelayMs);
  });

  socket.addEventListener("error", () => socket.close());
}

function processGifQueue() {
  if (queueTimer || gifQueue.length === 0) return;

  const nextGif = gifQueue.shift();
  spawnGif(nextGif);

  queueTimer = window.setTimeout(() => {
    queueTimer = undefined;
    processGifQueue();
  }, Math.max(0, Number(nextGif.queueIntervalMs) || 0));
}

function announceMoonrat() {
  const announcement = document.createElement("div");
  announcement.className = "moonrat-announcement";
  announcement.textContent = "MOONRAT";
  announcement.setAttribute("aria-hidden", "true");
  overlay.append(announcement);
  announcement.addEventListener("animationend", () => announcement.remove(), { once: true });
}

function spawnGif({ src, durationMs, scale, yOffsetPx, flip = false, moonwalk = false }) {
  const image = document.createElement("img");
  image.className = "rat-gif";
  image.alt = "";
  image.draggable = false;
  image.style.bottom = `${(Number(yOffsetPx) || 0) * scale}px`;
  image.src = src;
  overlay.append(image);

  if (moonwalk) announceMoonrat();

  image.addEventListener("load", () => {
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
    animation.addEventListener("finish", () => image.remove(), { once: true });
  }, { once: true });

  image.addEventListener("error", () => image.remove(), { once: true });
}

connect();
