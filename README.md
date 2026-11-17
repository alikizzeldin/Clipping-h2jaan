# Kick → YouTube clipping agent

Finds the best viewer-made clips of one game on Kick, re-cuts each into a
vertical Short (or a landscape video) with the streamer credited, and uploads
it to YouTube. It runs on a schedule in GitHub Actions and remembers what it
has posted, so nothing goes up twice.

Set up for **Valorant** now; switching to **GTA 6** is one setting.

## How it picks clips

1. Reads Kick's "top clips" for the game, plus the top clips of the biggest
   channels live in that game right now.
2. Drops clips that are from another category, marked mature, too short or
   long, too old, under the view bar, already posted, or from a blocked channel.
3. Ranks the rest by views with a discount for age, one clip per streamer per run.
4. Downloads, renders, uploads the top few, and records them in
   `state/published.json`.

Everything in steps 2–3 is tunable in [`config.yaml`](config.yaml).

## Try it on your computer

Needs Python 3.11+ and ffmpeg.

```bash
pip install -r requirements.txt
python -m clipper discover            # list what would be picked, upload nothing
python -m clipper run --dry-run       # also render them into out/
```

## Connect a YouTube channel (once)

1. In [Google Cloud Console](https://console.cloud.google.com/) create a
   project and enable **YouTube Data API v3**.
2. Configure the OAuth consent screen as **External** and set its publishing
   status to **In production**. (Left on "Testing", Google expires the sign-in
   after 7 days and uploads stop.)
3. Create credentials → **OAuth client ID** → type **Desktop app**. Note the
   client ID and client secret.
4. On your own computer, signed in to the YouTube channel:

   ```bash
   python -m clipper auth
   ```

   Approve the prompt (Google shows an "unverified app" warning for your own
   project — choose Advanced → continue). The command prints a refresh token.

## Run it on GitHub

In the repository's **Settings → Secrets and variables → Actions**:

| Kind     | Name               | Value                                              |
|----------|--------------------|----------------------------------------------------|
| Secret   | `YT_CLIENT_ID`     | from step 3                                        |
| Secret   | `YT_CLIENT_SECRET` | from step 3                                        |
| Secret   | `YT_REFRESH_TOKEN` | from step 4                                        |
| Variable | `CLIPPER_ENABLED`  | `true` to turn the 3-hourly schedule on            |
| Variable | `CLIPPER_PROFILE`  | optional: `valorant` or `gta6` (overrides config)  |
| Variable | `CLIPPER_PRIVACY`  | optional: `private`, `unlisted` or `public`        |

To test without uploading: **Actions → Clip → Run workflow** with *dry run*
ticked. The rendered videos are attached to the run.

## Switch to GTA 6

Set the `CLIPPER_PROFILE` variable to `gta6` (or change `profile:` in
`config.yaml`). The profile points at Kick's `grand-theft-auto-vi` category.

## Things to know

- **Uploads start private.** `publish.privacy` is `private` until you change
  it. Separately, Google's API docs say videos uploaded through an API project
  that has not passed YouTube's API audit are locked to private. Do one real
  upload first and check in YouTube Studio whether you can make it public; if
  it is locked, request the audit from the project's YouTube API quota page.
- **Daily limit.** `publish.max_per_day` defaults to 6, which fits YouTube's
  classic default API quota. Raise it if your project's quota allows more.
- **Other people's content.** Clips belong to the streamers. Posting them
  without permission can bring copyright claims or strikes against the
  channel. Use `allow_channels` to stick to streamers who welcome clipping,
  and `block_channels` for anyone who asks to be left out.
- **Kick's clip feeds are unofficial.** Kick's public API has no clip
  endpoints, so the agent reads the feeds the website uses. If Kick changes
  them, discovery needs updating.
- **Twitch** is not wired in yet; clips are modelled source-neutrally so it
  can be added as a second source.
