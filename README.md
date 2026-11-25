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

For example, each keyword can have its own animation speed, size, vertical placement, and facing direction. Horizontal travel and animation timing remain independent of the vertical offset. Every GIF spawn also has a 1% chance to moonwalk: its horizontal facing is inverted for that spawn, but it still travels left-to-right. The overlay displays a prominent `MOONRAT` announcement when this happens.

A MOONRAT spawn takes priority over regular queued GIFs. Any regular GIFs already on screen are cleared so MOONRAT has the screen to itself. It plays for its configured `durationMs`, followed by an equally long quiet buffer; regular queued GIFs then resume in their original order. Additional MOONRAT events wait ahead of regular queued GIFs without interrupting the one currently playing.

### MOONRAT announcement colors

These Compose environment values customize the announcement. Values must be hexadecimal colors:

- `MOONRAT_TEXT_COLOR`: fill color (default `#fff36b`).
- `MOONRAT_OUTLINE_COLOR`: text outline color (default `#a400a8`).
- `MOONRAT_GLOW_COLOR`: glow color (default `#fff36b`).

### MOONRAT debug mode

Set `MOONRAT_DEBUG: "true"` in the Compose `environment` to force every GIF spawn to moonwalk and display the `MOONRAT` announcement. This makes it easy to test without waiting for the 1% roll. Set it back to `"false"` for normal independent 1% chances. Recreate the container after changing the setting.

Other Compose settings:
- `TWITCH_CHANNEL`: Twitch channel to monitor.
- `GIF_QUEUE_INTERVAL_MS`: delay between queued GIF spawns; `0` disables the delay.
- `PORT` and the published port mapping: container and host HTTP ports.
