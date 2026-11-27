# Rats Rats Rats

A Docker-based Twitch chat GIF browser-source overlay.

## Configuration

All runtime configuration lives directly in `docker-compose.yaml`. Edit the service's `environment` values and recreate the container to apply changes.

Each keyword can have its own animation speed, size, vertical placement, facing direction, and MOONRAT announcement text.
Each entry in `GIF_MAPPINGS` is an object with:
- `path`: GIF file path under `/assets/`.
- `durationMs`: time for that GIF to cross the screen in milliseconds (default `8000`, range `250`–`120000`).
- `scale`: display scale for that GIF (default `2`; supported values `1`, `2`, `4`, or `8`).
- `yOffsetPx`: vertical offset in unscaled GIF pixels (default `0`). Positive values move that GIF up; negative values move it down. The offset is multiplied by the GIF's scale, so it remains proportional to the image size. Supported range: `-10000` to `10000`.
- `flip`: horizontally mirror the GIF (default `false`). Set to `true` to make it face the opposite direction.
- `moonratText`: optional announcement text for this GIF's moonwalk (default is inferred from the first PascalCase segment in its keyword, prefixed with `MOON`; maximum 40 characters).

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
    }
  }
```

## MOONRAT takeover

A moonwalk-triggered GIF immediately takes over the overlay: all currently visible regular GIFs are cleared, and no regular GIFs spawn during its solo animation. After the moonwalking GIF finishes, the overlay stays empty for an additional buffer equal to that GIF's configured `durationMs`. Queued regular GIFs then resume in their original order. Additional moonwalk events wait ahead of regular GIFs.

Other Compose settings:
- `TWITCH_CHANNEL`: Twitch channel to monitor.
- `GIF_QUEUE_INTERVAL_MS`: delay between queued GIF spawns; `0` disables the delay.
- `PORT` and the published port mapping: container and host HTTP ports.
