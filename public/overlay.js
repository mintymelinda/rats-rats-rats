const overlay = document.querySelector("#overlay");
const reconnectDelayMs = 1500;
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
    if (payload.type === "spawn") spawnGif(payload);
  });

  socket.addEventListener("close", () => {
    window.setTimeout(connect, reconnectDelayMs);
  });

  socket.addEventListener("error", () => socket.close());
}

function spawnGif({ src, durationMs, scale }) {
  const image = document.createElement("img");
  image.className = "rat-gif";
  image.alt = "";
  image.draggable = false;
  image.src = src;
  overlay.append(image);

  image.addEventListener("load", () => {
    const scaledWidth = image.naturalWidth * scale;
    image.style.width = `${image.naturalWidth}px`;
    image.style.height = "auto";

    const animation = image.animate(
      [
        { transform: `translateX(-${scaledWidth}px) scale(${scale})` },
        { transform: `translateX(${window.innerWidth}px) scale(${scale})` },
      ],
      { duration: durationMs, easing: "linear", fill: "forwards" },
    );
    animation.addEventListener("finish", () => image.remove(), { once: true });
  }, { once: true });

  image.addEventListener("error", () => image.remove(), { once: true });
}

connect();
