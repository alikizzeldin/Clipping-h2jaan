# Kick → YouTube clipping agent

Finds the best viewer-made clips of one game on Kick, re-cuts each into a
vertical Short inside a branded frame with captions of what the streamer
says, and publishes it to YouTube through Buffer. It runs on a schedule in
GitHub Actions and remembers what it has posted, so nothing goes up twice.

Set up for **GTA 6** (with a **Valorant** profile for testing).

## What a run does

1. Reads Kick's "top clips" for the game, plus the top clips of the biggest
   channels live in that game right now.
2. Drops clips that are from another category, marked mature, too short or
   long, too old, under the view bar, made before the start time, already
   posted, or from a blocked channel.
3. Ranks the rest by views with a discount for age, one clip per streamer per run.
4. Downloads the best one, transcribes the speech with Whisper, renders the
   Short, publishes it, and records it in `state/published.json`.

Everything is tunable in [`config.yaml`](config.yaml).

## The look

- **Frame.** Each game profile points at a theme under `themes:`. A theme is a
  1080×1920 background image plus where the gameplay window and captions sit
  on it. GTA 6 uses `assets/themes/gta6.png`; replace the file to change the
  design (keep the dark panel in the same place, or adjust `window_top`,
  `window_inset` and `caption_floor`).
- **Captions.** What the streamer says, a few words at a time, with the word
  being spoken highlighted. The language is detected per clip. Latin-script
  languages and Arabic are drawn (Arabic right-to-left, properly joined);
  clips in other scripts are published without captions.
- No streamer name or Kick link is drawn on the video. The YouTube title and
  description still credit the streamer and link the original clip; change
  `title_template` in `config.yaml` if you want a different title.

## Publishing through Buffer

Set one repository secret (**Settings → Secrets and variables → Actions →
New repository secret**):

| Name             | Value                                             |
|------------------|---------------------------------------------------|
| `BUFFER_API_KEY` | your key from [Buffer's developer page](https://developers.buffer.com/) |

`publish.buffer_channel_id` in `config.yaml` says which Buffer channel gets
the videos. To list the channels a key can post to:

```bash
BUFFER_API_KEY=... python -m clipper channels
```

How it works, and its limits:

- Buffer has no file upload; it downloads each video from a public URL. The
  agent pushes every rendered clip to its own `media/...` branch of this
  repository, hands Buffer the file's URL, and deletes the branch a day
  later. **The repository must be public** for this to work.
- Buffer only publishes **vertical Shorts** to YouTube.
- Buffer's free plan allows about 1,000 API requests per 30 days. The agent
  uses two per published clip (one to post, one later to confirm), so 12
  clips a day fits.
- Each run confirms the previous posts and reports any that Buffer could not
  publish in the run summary.

## Schedule

The workflow runs every 2 hours and publishes one clip per run (up to
`max_per_day`).

- **Start time.** Nothing is published before `publish.start_at`, and only
  clips created after it are used. It is set to 18 Nov 2026 13:00 Palestine
  time, which is midnight 19 Nov in New Zealand, the first place GTA 6 unlocks.
- **Pause.** Set the repository variable `CLIPPER_PAUSED` to `true`.
- **Other variables.** `CLIPPER_PROFILE` (`gta6` / `valorant`) and
  `CLIPPER_PRIVACY` (`private` / `unlisted` / `public`) override `config.yaml`.

To test without publishing: **Actions → Clip → Run workflow** with *dry run*
ticked. The rendered videos are attached to the run. Tick *check hosting* as
well to confirm a clip can be served publicly from this repository.

## Try it on your computer

Needs Python 3.11+ and ffmpeg. The first captioned run downloads the Whisper
model (about 1.5 GB).

```bash
pip install -r requirements.txt
python -m clipper discover                      # list what would be picked
python -m clipper --profile valorant run --dry-run   # render into out/, publish nothing
```

## Things to know

- **Other people's content.** Clips belong to the streamers, and the frame
  carries Rockstar's logos. Posting without permission can bring copyright or
  trademark complaints against the YouTube channel, and against this
  repository while clips are hosted on it. Use `allow_channels` to stick to
  streamers who welcome clipping, and `block_channels` for anyone who asks to
  be left out.
- **Languages.** By default clips in any language are used. Set
  `selection.languages` (for example `[English, Arabic]`) to narrow it.
- **Kick's clip feeds are unofficial.** Kick's public API has no clip
  endpoints, so the agent reads the feeds the website uses. If Kick changes
  them, discovery needs updating.
- **Direct YouTube upload** is still available with `publish.via: youtube`
  and the `YT_CLIENT_ID`, `YT_CLIENT_SECRET` and `YT_REFRESH_TOKEN` secrets
  (`python -m clipper auth` creates the refresh token). It needs your own
  Google Cloud project, and Google keeps uploads from unaudited projects
  private.
- **Twitch** is not wired in; clips are modelled source-neutrally so it can
  be added as a second source.
- `tools/make_themes.cjs` regenerates the Valorant background (needs
  Playwright); the GTA 6 frame is supplied artwork.
