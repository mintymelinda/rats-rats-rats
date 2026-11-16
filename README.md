# Rats Rats Rats

A Docker-based Twitch chat GIF browser-source overlay.

Implementation is developed on feature branches and submitted through pull requests.

## Configuration

All runtime configuration lives directly in `docker-compose.yaml`. Edit the service's `environment` values and recreate the container to apply changes.

Each entry in `GIF_MAPPINGS` is an object with:
- `path`: GIF file path under `/assets/`.
- `durationMs`: time for that GIF to cross the screen in milliseconds (default `8000`, range `250`–`120000`).
- `scale`: display scale for that GIF (default `2`; supported values `1`, `2`, `4`, or `8`).
- `yOffsetPx`: vertical offset in unscaled GIF pixels (default `0`). Positive values move that GIF up; negative values move it down. The offset is multiplied by the GIF's scale, so it remains proportional to the image size. Supported range: `-10000` to `10000`.
- `flip`: horizontally mirror the GIF (default `false`). Set to `true` to make it face the opposite direction.

For example, each keyword can have its own animation speed, size, vertical placement, and facing direction. Horizontal travel and animation timing remain independent of the vertical offset.

Other Compose settings:
- `TWITCH_CHANNEL`: Twitch channel to monitor.
- `GIF_QUEUE_INTERVAL_MS`: delay between queued GIF spawns; `0` disables the delay.
- `PORT` and the published port mapping: container and host HTTP ports.
