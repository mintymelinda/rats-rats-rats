import WebSocket from "ws";

const IRC_URL = "wss://irc-ws.chat.twitch.tv:443";
const MAX_BACKOFF_MS = 30000;

export class TwitchIrcClient {
  constructor({ channel, onMessage, logger = console }) {
    this.channel = channel;
    this.onMessage = onMessage;
    this.logger = logger;
    this.socket = null;
    this.stopped = true;
    this.reconnectTimer = null;
    this.reconnectDelay = 1000;
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
      const messageMatch = line.match(/\bPRIVMSG #\S+ :(.*)$/);
      if (messageMatch) this.onMessage(messageMatch[1]);
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
