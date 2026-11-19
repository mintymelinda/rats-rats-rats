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
    if (payload.type === "spawn") {
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

    const horizontalScale = flip ? -1 : 1;
    const startX = moonwalk ? window.innerWidth : -scaledWidth;
    const endX = moonwalk ? -scaledWidth : window.innerWidth;
    const animation = image.animate(
      [
        { transform: `translateX(${startX}px) scaleX(${horizontalScale}) scale(${scale})` },
        { transform: `translateX(${endX}px) scaleX(${horizontalScale}) scale(${scale})` },
      ],
      { duration: durationMs, easing: "linear", fill: "forwards" },
    );
    animation.addEventListener("finish", () => image.remove(), { once: true });
  }, { once: true });

  image.addEventListener("error", () => image.remove(), { once: true });
}

connect();
