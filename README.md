# Rats Rats Rats

A Docker-based Twitch chat GIF browser-source overlay.

Implementation is developed on feature branches and submitted through pull requests.

## Configuration

All runtime configuration lives directly in `docker-compose.yaml`. Edit the service's `environment` values and recreate the container to apply changes.

Each entry in `GIF_MAPPINGS` is an object with:
- `path`: GIF file path under `/assets/`.
- `yOffsetPx`: optional vertical offset in pixels (default `0`). Positive values move that GIF up; negative values move it down. Supported range: `-10000` to `10000`.

For example, set different `yOffsetPx` values for each keyword to arrange GIFs at different heights. This only changes vertical placement; horizontal travel and animation timing are unchanged.

Other Compose settings:
- `TWITCH_CHANNEL`: Twitch channel to monitor.
- `ANIMATION_DURATION_MS`: time for a GIF to cross the screen.
- `GIF_QUEUE_INTERVAL_MS`: delay between queued GIF spawns; `0` disables the delay.
- `GIF_SCALE`: GIF scale factor (`1`, `2`, `4`, or `8`).
- `PORT` and the published port mapping: container and host HTTP ports.
