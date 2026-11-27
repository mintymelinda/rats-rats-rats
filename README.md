# Rats Rats Rats

A Docker-based Twitch chat GIF browser-source overlay.

## Configuration

All runtime configuration lives directly in `docker-compose.yaml`. Edit the service's `environment` values and recreate the container to apply changes.

Each keyword can have its own animation speed, size, vertical placement, facing direction, and MOONRAT announcement text.
Each entry in `GIF_MAPPINGS` is an object with:
- `path` (optional): GIF file path under `/assets/`. Omit this field to use the matching Twitch emote exclusively. If a configured local file is missing, the overlay will also try the matching Twitch emote when that emote appears in chat.
- `durationMs`: time for that animation to cross the screen in milliseconds (default `8000`, range `250`–`120000`).
- `scale`: display scale for that animation (default `2`; supported values `1`, `2`, `4`, or `8`).
- `yOffsetPx`: vertical offset in unscaled image pixels (default `0`). Positive values move that animation up; negative values move it down. The offset is multiplied by the image's scale, so it remains proportional to the image size. Supported range: `-10000` to `10000`.
- `flip`: horizontally mirror the animation (default `false`). Set to `true` to make it face the opposite direction.
- `moonratText`: optional announcement text for this animation's moonwalk (default is inferred from the first PascalCase segment in its keyword, prefixed with `MOON`; maximum 40 characters).

For example, `mindyfRatNes` and `mindyfRatSnes` announce `MOONRAT`, `mindyfCow` announces `MOONCOW`, and `mindyfDog` announces `MOONDOG`. You can override the inferred value per mapping:

```yaml
GIF_MAPPINGS: >-
  {
    "mindyfCow": {
      "path": "/assets/cow.gif",
      "moonratText": "MOONCOW"
    },
    "mindyfDragon": {
      "path": "/assets/dragon.gif",
      "moonratText": "MOON DRAGON!"
    },
    "graped4Based": {
      "durationMs": 4000,
      "scale": 1
    }
  }
```

When a configured keyword's local GIF exists, it is always used. If no local GIF path is configured, or the configured file is missing, the bot uses the matching Twitch emote ID supplied in that chat message's IRC `emotes` tag. This requires no Twitch OAuth credentials. If Twitch does not identify that exact keyword as an emote in the message, that spawn is silently skipped. Keywords not declared in `GIF_MAPPINGS` are never spawned.

## MOONRAT takeover

A moonwalk-triggered animation immediately takes over the overlay: all currently visible regular animations are cleared, and no regular animations spawn during its solo animation. After the moonwalking animation finishes, the overlay stays empty for an additional buffer equal to that animation's configured `durationMs`. Queued regular animations then resume in their original order. Additional moonwalk events wait ahead of regular animations.

Other Compose settings:
- `TWITCH_CHANNEL`: Twitch channel to monitor.
- `GIF_QUEUE_INTERVAL_MS`: delay between queued spawns; `0` disables the delay.
- `PORT` and the published port mapping: container and host HTTP ports.

## Authorized MOONRAT debug commands

These exact chat messages force the configured NES rat animation to moonwalk, bypassing the normal 1% chance:

- `MintyMelinda`: `debugMoonRatmindyfRatNes`
- `PYOSHI`: `debugMoonRatmindyfRatNes`

The sender and full message must match; other users, extra text, or altered command spelling do not trigger the debug spawn.
