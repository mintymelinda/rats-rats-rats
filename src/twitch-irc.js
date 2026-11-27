import WebSocket from "ws";

const IRC_URL = "wss://irc-ws.chat.twitch.tv:443";
const MAX_BACKOFF_MS = 30000;

function parseTags(line) {
  if (!line.startsWith("@")) return {};
  const separator = line.indexOf(" ");
  if (separator === -1) return {};
  return Object.fromEntries(
    line.slice(1, separator).split(";").map((entry) => {
      const equals = entry.indexOf("=");
      return equals === -1 ? [entry, ""] : [entry.slice(0, equals), entry.slice(equals + 1)];
    }),
  );
}

export class TwitchIrcClient {
  constructor({ channel, onMessage, logger = console }) {
    this.channel = channel;
    this.onMessage = onMessage;
    this.logger = logger;
    this.socket = null;
    this.stopped = true;
    this.reconnectTimer = null;
    this.reconnectDelay = 1000;
    this.messageQueue = Promise.resolve();
  }

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.connect();
  }

  connect() {
    if (this.stopped) return;
    this.logger.info(`Connecting to Twitch chat #${this.channel}`);
    const socket = new WebSocket(IRC_URL);
    this.socket = socket;

    socket.on("open", () => {
      this.reconnectDelay = 1000;
      const nickname = `justinfan${Math.floor(100000 + Math.random() * 900000)}`;
      socket.send("PASS SCHMOOPIIE");
      socket.send(`NICK ${nickname}`);
      socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      socket.send(`JOIN #${this.channel}`);
      this.logger.info(`Joined Twitch chat #${this.channel}`);
    });

    socket.on("message", (data) => this.handleData(data.toString()));
    socket.on("error", (error) => this.logger.error("Twitch IRC socket error:", error.message));
    socket.on("close", () => {
      if (this.socket === socket) this.socket = null;
      this.scheduleReconnect();
    });
  }

  handleData(data) {
    for (const line of data.split("\r\n")) {
      if (!line) continue;
      if (line.startsWith("PING ")) {
        this.socket?.send(line.replace(/^PING/, "PONG"));
        continue;
      }
      const tags = parseTags(line);
      const messageMatch = line.match(/\bPRIVMSG #\S+ :(.*)$/);
      const usernameMatch = line.match(/(?:^| ):([^! ]+)!/);
      if (messageMatch) {
        const message = messageMatch[1];
        const messageTags = { emotes: tags.emotes || "" };
        const username = usernameMatch?.[1] || "";
        this.messageQueue = this.messageQueue
          .then(() => this.onMessage(message, messageTags, username))
          .catch((error) => this.logger.error("Twitch chat message handler failed:", error?.message || error));
      }
    }
  }

  scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_BACKOFF_MS);
    this.logger.warn(`Twitch IRC disconnected; reconnecting in ${delay}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
    this.reconnectTimer.unref?.();
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.socket = null;
  }
}
