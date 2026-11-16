# Rats Rats Rats

A Docker-based Twitch chat GIF browser-source overlay.

Implementation is developed on feature branches and submitted through pull requests.

## Configuration

Set `GIF_QUEUE_INTERVAL_MS` in your `.env` file to control the minimum delay between spawning queued GIFs. The default is `500` milliseconds; set it to `0` to disable the delay. Values from `0` to `60000` are supported.

Set `GIF_Y_OFFSET_PX` to position the GIFs vertically relative to the bottom edge of the overlay. The default is `0`; positive values move the GIFs up and negative values move them down. Only the Y position changes; horizontal travel and animation timing are unchanged. Integer values from `-10000` to `10000` are supported.
