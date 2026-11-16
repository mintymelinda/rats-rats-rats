# Rats Rats Rats

A Docker-based Twitch chat GIF browser-source overlay.

Implementation is developed on feature branches and submitted through pull requests.

## Configuration

Set `GIF_QUEUE_INTERVAL_MS` in your `.env` file to control the minimum delay between spawning queued GIFs. The default is `500` milliseconds; set it to `0` to disable the delay. Values from `0` to `60000` are supported.
