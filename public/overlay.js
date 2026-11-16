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
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    image.style.width = `${image.naturalWidth}px`;
    image.style.height = `${image.naturalHeight}px`;
    image.style.transform = `scale(${scale})`;
    image.style.bottom = "0px";

    const distance = window.innerWidth + width;
    const animation = image.animate(
      [
        { transform: `translateX(-${width}px) scale(${scale})` },
        { transform: `translateX(${window.innerWidth}px) scale(${scale})` },
      ],
      { duration: durationMs, easing: "linear", fill: "forwards" },
    );
    animation.addEventListener("finish", () => image.remove(), { once: true });
    image.dataset.height = String(height);
    void distance;
  }, { once: true });

  image.addEventListener("error", () => image.remove(), { once: true });
}

connect();
