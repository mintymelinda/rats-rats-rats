# Rats Rats Rats

A Docker-based Twitch chat GIF browser-source overlay.

## Persistent chat-managed mappings

GIF mappings are stored in the persistent Docker volume `mappings-data` at `/data/gif-mappings.json`. The server creates this file from the `GIF_MAPPINGS` value in Compose on first startup (or built-in defaults if it is omitted). After that, the JSON file is authoritative; changes made through chat are saved immediately and remain in place across container restarts and image rebuilds. Do not use `docker-compose down -v` unless you intend to delete the mappings volume.

The following commands are available to the channel owner and the existing authorized account `PYOSHI`:

- `!add kintBee` adds a Twitch-emote-only mapping with the default animation settings.
- `!add kintBee?flipped=true&scale=4` adds the mapping with horizontal flipping and scale 4.
- `!add kintBee ?flip=true&scale=4&durationMs=8000` also works; the space before `?` is accepted because Twitch may separate an emote from following text.
- `!remove kintBee` removes the mapping.

Commands are case-insensitive. The keyword may contain 1–64 letters, numbers, or underscores. If the keyword already exists, `!add` updates its settings in place; omitted parameters reset to their defaults. Keyword matching is case-insensitive and the original keyword spelling is preserved. Unauthorized commands are ignored. Management commands do not trigger GIF matching.

Supported `!add` query parameters:

| Parameter | Default | Allowed values |
| --- | --- | --- |
| `scale` | `2` | `1`, `2`, `4`, or `8` |
| `flipped` (or `flip`) | `false` | `true` or `false` |
| `durationMs` | `8000` | integer from `250` to `120000` |
| `yOffsetPx` | `0` | integer from `-10000` to `10000` |
| `moonratText` | inferred from keyword | non-empty text up to 40 characters |
| `path` | none | optional GIF path under `/assets/` |

URL-encode spaces or special characters in parameter values. Emote-only mappings need no local GIF file: the server resolves the keyword through its emote registry.

The server applies changes immediately. No container restart or browser-source refresh is required for new chat messages to use the updated mappings.

## Emote discovery

The registry uses several evidence sources instead of guessing an emote owner from its spelling:

1. Twitch global emotes and the monitored channel's Twitch emotes, loaded with an app access token.
2. 7TV, BetterTTV, and FrankerFaceZ global catalogs, plus channel catalogs where their public APIs expose them. Provider search is exact-name checked before a result is accepted.
3. Every Twitch emote explicitly identified in an incoming IRC `emotes` tag is learned by its exact name and ID. These discoveries are saved in `/data/emote-cache.json`, so an emote used by any viewer in chat can be resolved later even if the anonymous bot account cannot itself use that emote.

Put the Twitch application credentials you already created in the project `.env` file:

```dotenv
TWITCH_CLIENT_ID=your_twitch_application_client_id
TWITCH_CLIENT_SECRET=your_twitch_application_client_secret
```

Compose passes these values into the container. No redirect URL, user login, or recurring viewer authorization is needed; the app uses Twitch's client-credentials flow. If credentials are absent, observed IRC emotes and third-party catalogs still work.

Twitch does not provide a public endpoint that can find every custom Twitch emote from an arbitrary name. A private subscriber emote from an unrelated channel cannot be discovered until someone who can use it posts it in the monitored chat (or it is found through a third-party provider). The resolver deliberately avoids inferring an owner from keyword prefixes.

## Static configuration

Runtime settings remain in `docker-compose.yaml`:

- `TWITCH_CHANNEL`: Twitch channel to monitor.
- `GIF_QUEUE_INTERVAL_MS`: delay between queued spawns; `0` disables the delay.
- `MOONRAT_DEBUG`: force every GIF spawn to moonwalk when set to `true`.
- `MOONRAT_TEXT_COLOR`, `MOONRAT_OUTLINE_COLOR`, `MOONRAT_GLOW_COLOR`: announcement colors.
- `GIF_MAPPINGS_FILE`: path to the persistent JSON mapping file (default in Compose: `/data/gif-mappings.json`).
- `EMOTE_CACHE_FILE`: path to the persistent learned-emote cache (default in Compose: `/data/emote-cache.json`).
- `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`: Twitch application credentials, supplied to Compose from `.env` for official global/channel catalogs.
- `GIF_MAPPINGS`: initial seed data only; edits after first startup are stored in the JSON file.

Existing mapping settings remain supported: `path` (optional), `durationMs`, `scale`, `yOffsetPx`, `flip`, and `moonratText`. If a configured local GIF exists it is used first. Otherwise, emote resolution checks the current IRC message, the persistent learned-emote cache, and the in-memory catalogs.

## MOONRAT behavior

A moonwalk-triggered animation waits until regular GIFs already ahead of it have completed their traversal, then runs as an exclusive stage. Later GIFs remain queued in FIFO order until the moonwalk animation completes. The announcement text is inferred from the first PascalCase segment in the keyword (for example, `mindyfCow` announces `MOONCOW`) and can be overridden with `moonratText`.

## Authorized MOONRAT debug commands

These exact chat messages force the configured NES rat animation to moonwalk, bypassing the normal 1% chance:

- `MintyMelinda`: `debugMoonRatmindyfRatNes`
- `PYOSHI`: `debugMoonRatmindyfRatNes`
