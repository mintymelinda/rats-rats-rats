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

URL-encode spaces or special characters in parameter values. Twitch emote-only mappings need no local GIF file: the server resolves the image from the Twitch emote catalog, with IRC emote tags as a fallback.

The server applies changes immediately. No container restart or browser-source refresh is required for new chat messages to use the updated mappings.

### Twitch emote catalog lookup

The bot can resolve emotes even when nobody in the monitored chat is subscribed to the emote's channel. It loads global Twitch emotes and the channel emote catalogs configured in `TWITCH_EMOTE_CHANNELS`, then matches names case-insensitively. IRC emote tags remain the fallback when a catalog entry is unavailable.

Add your Twitch application credentials to the project `.env` file (it is git-ignored):

```dotenv
TWITCH_CLIENT_ID=your_twitch_application_client_id
TWITCH_CLIENT_SECRET=your_twitch_application_client_secret
```

Docker Compose passes these values into the container. The default external emote catalog source is `SuperSleepyT`, which includes `sstWiggle`. To load additional channels, set `TWITCH_EMOTE_CHANNELS` to a comma-separated list of Twitch channel logins, for example `SuperSleepyT,AnotherChannel`. The monitored channel's own emotes are always included.

The catalog refreshes every 30 minutes. Twitch app access tokens are obtained server-to-server; the registered redirect URL is not used. If the API is temporarily unavailable, the overlay continues running and keeps the last successfully loaded catalog.

## Static configuration

Runtime settings remain in `docker-compose.yaml`:

- `TWITCH_CHANNEL`: Twitch channel to monitor.
- `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`: optional Twitch application credentials for emote catalog lookup (set in `.env`).
- `TWITCH_EMOTE_CHANNELS`: optional comma-separated external channels whose custom emotes should be cataloged (defaults to `SuperSleepyT`).
- `GIF_QUEUE_INTERVAL_MS`: delay between queued spawns; `0` disables the delay.
- `MOONRAT_DEBUG`: force every GIF spawn to moonwalk when set to `true`.
- `MOONRAT_TEXT_COLOR`, `MOONRAT_OUTLINE_COLOR`, `MOONRAT_GLOW_COLOR`: announcement colors.
- `GIF_MAPPINGS_FILE`: path to the persistent JSON mapping file (default in Compose: `/data/gif-mappings.json`).
- `GIF_MAPPINGS`: initial seed data only; edits after first startup are stored in the JSON file.

Existing mapping settings remain supported: `path` (optional), `durationMs`, `scale`, `yOffsetPx`, `flip`, and `moonratText`. If a configured local GIF exists it is used; otherwise the server looks up the keyword in the Twitch emote catalog and falls back to the message's IRC `emotes` tag.

## MOONRAT behavior

A moonwalk-triggered animation waits until regular GIFs already ahead of it have completed their traversal, then runs as an exclusive stage. Later GIFs remain queued in FIFO order until the moonwalk animation completes. The announcement text is inferred from the first PascalCase segment in the keyword (for example, `mindyfCow` announces `MOONCOW`) and can be overridden with `moonratText`.

## Authorized MOONRAT debug commands

These exact chat messages force the configured NES rat animation to moonwalk, bypassing the normal 1% chance:

- `MintyMelinda`: `debugMoonRatmindyfRatNes`
- `PYOSHI`: `debugMoonRatmindyfRatNes`
