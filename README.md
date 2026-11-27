# Rats Rats Rats

A Docker-based Twitch chat GIF browser-source overlay.

## Persistent chat-managed mappings

GIF mappings are stored in the persistent Docker volume `mappings-data` at `/data/gif-mappings.json`. The server creates this file from the `GIF_MAPPINGS` value in Compose on first startup (or built-in defaults if it is omitted). After that, the JSON file is authoritative; changes made through chat are saved immediately and remain in place across container restarts and image rebuilds. Do not use `docker-compose down -v` unless you intend to delete the mappings volume.

The following commands are available to the channel owner and the existing authorized account `PYOSHI`:

- `!add kintBee` adds a Twitch-emote-only mapping with the default animation settings.
- `!add kintBee?flipped=true&scale=4` adds the mapping with horizontal flipping and scale 4.
- `!remove kintBee` removes the mapping.

Commands are case-insensitive. The keyword may contain 1–64 letters, numbers, or underscores. An existing mapping cannot be added a second time; remove it first if you want to replace it. Unauthorized commands are ignored. Management commands do not trigger GIF matching.

Supported `!add` query parameters:

| Parameter | Default | Allowed values |
| --- | --- | --- |
| `scale` | `2` | `1`, `2`, `4`, or `8` |
| `flipped` (or `flip`) | `false` | `true` or `false` |
| `durationMs` | `8000` | integer from `250` to `120000` |
| `yOffsetPx` | `0` | integer from `-10000` to `10000` |
| `moonratText` | inferred from keyword | non-empty text up to 40 characters |
| `path` | none | optional GIF path under `/assets/` |

URL-encode spaces or special characters in parameter values. Twitch emote-only mappings need no local GIF file: the server resolves the emote ID from Twitch IRC tags when that keyword appears as an emote in chat.

The server applies changes immediately. No container restart or browser-source refresh is required for new chat messages to use the updated mappings.

## Static configuration

Runtime settings remain in `docker-compose.yaml`:

- `TWITCH_CHANNEL`: Twitch channel to monitor.
- `GIF_QUEUE_INTERVAL_MS`: delay between queued spawns; `0` disables the delay.
- `MOONRAT_DEBUG`: force every GIF spawn to moonwalk when set to `true`.
- `MOONRAT_TEXT_COLOR`, `MOONRAT_OUTLINE_COLOR`, `MOONRAT_GLOW_COLOR`: announcement colors.
- `GIF_MAPPINGS_FILE`: path to the persistent JSON mapping file (default in Compose: `/data/gif-mappings.json`).
- `GIF_MAPPINGS`: initial seed data only; edits after first startup are stored in the JSON file.

Existing mapping settings remain supported: `path` (optional), `durationMs`, `scale`, `yOffsetPx`, `flip`, and `moonratText`. If a configured local GIF exists it is used; otherwise the server falls back to the matching Twitch emote ID from the message's IRC `emotes` tag.

## MOONRAT behavior

A moonwalk-triggered animation waits until regular GIFs already ahead of it have completed their traversal, then runs as an exclusive stage. Later GIFs remain queued in FIFO order until the moonwalk animation completes. The announcement text is inferred from the first PascalCase segment in the keyword (for example, `mindyfCow` announces `MOONCOW`) and can be overridden with `moonratText`.

## Authorized MOONRAT debug commands

These exact chat messages force the configured NES rat animation to moonwalk, bypassing the normal 1% chance:

- `MintyMelinda`: `debugMoonRatmindyfRatNes`
- `PYOSHI`: `debugMoonRatmindyfRatNes`
