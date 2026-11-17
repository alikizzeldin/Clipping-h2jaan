# Kick → YouTube clipping agent

Finds the best viewer-made clips of one game on Kick, re-cuts each into a
vertical Short inside a branded frame with captions of what the streamer
says, and publishes it to YouTube through Buffer. It runs on a schedule in
GitHub Actions and remembers what it has posted, so nothing goes up twice.

Set up for **GTA 6** (with a **Valorant** profile for testing).

## What a run does

1. Reads Kick's "top clips" for the game, plus the clips of the biggest
   channels and of your featured channels. For featured channels it can also
   **cut its own clips**: it samples how fast the chat is moving across the
   last two hours of their stream and cuts the 50 seconds around each spike.
2. Keeps only clips from the **biggest channels**: the ones with the most
   live viewers right now, and the most-followed ones among the day's clips.
   Featured channels are always included.
3. Drops clips that are from another category, marked mature, have a slur in
   the title, are too short or long, too old, under the view bar, made before
   the start time, or already posted.
4. Ranks the rest by views with a discount for age, adjusted by the rules it
   has **learned** and the ones you taught it.
5. For the best one: skips it if the **same moment** was already posted (many
   viewers clip the same seconds) or if there is **no game on screen**.
6. Transcribes the speech with Whisper, adds an **English line** under
   captions in another language, and writes a title from what is said when
   the viewer's title is junk.
7. Renders the Short, publishes it, and records it under `state/`.

Everything is tunable in [`config.yaml`](config.yaml), and the main switches
are also on the dashboard's Settings page.

## How many, and from whom

- `publish.max_per_day` clips go out per 24 hours (3), at least
  `min_gap_hours` apart (7), so they are spread across the day.
- `selection.featured_channels` (currently `sxb`) are favourites:
  `publish.featured_per_day` (2) of the daily clips are reserved for them,
  and their clips need only `featured_min_views` views.
- The remaining slot goes to the best clip from the other big channels.
- A reserved slot is not wasted: if nothing has been posted for
  `fill_after_hours` (12), any qualifying clip may take it.
- Featured clips still have to be in the game's category, so a featured
  streamer who is not playing the game that day gets no clips.

## The look

- **Frame.** Each game profile points at a theme under `themes:`. A theme is a
  1080×1920 background image plus where the gameplay window and captions sit
  on it. GTA 6 uses `assets/themes/gta6.png`; replace the file to change the
  design (keep the dark panel in the same place, or adjust `window_top`,
  `window_inset` and `caption_floor`).
- **Gameplay.** The whole picture is shown, scaled to fit the window; nothing
  is cropped. (`render.zoom` above 1.0 enlarges it and crops the sides.)
- **Captions.** What the streamer says, a few words at a time, with the word
  being spoken highlighted. Themes choose `caption_style`: `neon` (glowing,
  with `caption_glow` from 0 to 1 for how strong the light is) or `outline`.
  The language is detected per clip. Latin-script languages and Arabic are
  drawn (Arabic right-to-left, properly joined); clips in other scripts are
  published without captions.
- A 4-second sample of the GTA 6 frame is in
  [`docs/sample-short.mp4`](docs/sample-short.mp4).
- No streamer name or Kick link is drawn on the video. The YouTube title and
  description still credit the streamer and link the original clip; change
  `title_template` in `config.yaml` if you want a different title.

## Learning from results

Once a day the agent reads each published clip's view count from Buffer and
compares groups of clips: by streamer, by length, by language. When a group's
typical views clearly beat (or trail) the rest, it writes a rule that raises
(or lowers) those clips' priority. It waits until 8 clips have been measured,
and compares typical rather than average views so one viral clip can't
mislead it.

You stay in charge on the dashboard's **Learning** page: switch a learned
rule off, remove it for good (it is never learned again), or teach rules of
your own about a streamer, a clip length, a language, or a word in the title
or speech. Learned rules live in `state/learned.json`; your choices in
`control/rules.json`.

## Alerts

To get a message when a clip is published or something fails, add either or
both as repository secrets:

| Secret | What it is |
|--------|------------|
| `DISCORD_WEBHOOK_URL` | a webhook URL from a Discord channel's **Integrations → Webhooks** |
| `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` | a bot made with @BotFather, and the chat it should write to |

## Admin dashboard

A web dashboard in [`dashboard/`](dashboard) shows what the agent is doing:
views, published clips, how the day's slots are filled, the agent's runs, and
what it has learned. It has two layouts to choose from, **Cinematic** (a wide
banner) and **Showroom** (the 3D logo in the centre, which follows the
pointer and can be dragged or spun).

- **Open it:** switch GitHub Pages on once (**Settings → Pages → Source:
  GitHub Actions**). The `Dashboard` workflow then publishes it at
  `https://<your-user>.github.io/<this-repo>/` on every change.
- **Anyone can view it, only you can change things.** Saving settings,
  editing learning rules and starting runs need a GitHub key with Contents
  and Actions write access to this repository, pasted once on the Settings
  page. It is kept in that browser only.
- **What it changes.** Settings are saved to `control/settings.json` and
  rules to `control/rules.json`; the agent reads both at the start of each
  run. Everything else stays in `config.yaml`.
- **Demo mode** (Settings, or add `?demo` to the address) fills it with
  made-up numbers to preview the design.
- **Run it locally:** `cd dashboard && npm install && npm run dev`.

## Publishing through Buffer

Set one repository secret (**Settings → Secrets and variables → Actions →
New repository secret**):

| Name             | Value                                             |
|------------------|---------------------------------------------------|
| `BUFFER_API_KEY` (or `BUFFER`) | your key from [Buffer's developer page](https://developers.buffer.com/) |

To confirm the key works on GitHub without publishing anything: **Actions →
Clip → Run workflow** with *check setup* ticked.

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
  uses two per published clip (one to post, one later to confirm), far
  below that at 3 clips a day.
- Each run confirms the previous posts and reports any that Buffer could not
  publish in the run summary.

## Schedule

The workflow checks every 2 hours and publishes at most one clip per check,
within the daily limits above.

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
- **Models are downloaded on first use.** Speech (about 3 GB for the two
  Whisper models) and the gameplay check (about 0.6 GB) are cached between
  runs on GitHub.
- **Kick's clip feeds are unofficial.** Kick's public API has no clip
  endpoints, so the agent reads the feeds the website uses. If Kick changes
  them, discovery needs updating.
- **Direct YouTube upload** is still available with `publish.via: youtube`
  and the `YT_CLIENT_ID`, `YT_CLIENT_SECRET` and `YT_REFRESH_TOKEN` secrets
  (`python -m clipper auth` creates the refresh token). It needs your own
  Google Cloud project, and Google keeps uploads from unaudited projects
  private.
- **Twitch** is not wired in. Twitch offers no official way to download
  other channels' clips; the only route is its private website API.
- `tools/make_themes.cjs` regenerates the Valorant background (needs
  Playwright); the GTA 6 frame is supplied artwork.
