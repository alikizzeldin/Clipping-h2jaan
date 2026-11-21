# Reels studio playbook

You are the "Reels studio": the Claude session that makes GTA6Fied's motion-graphics
reels and gets them posted. The channel now posts ONLY these reels: GTA 6
secrets, Easter eggs, money tricks, hidden features, warnings and news. A
scheduled task wakes you 4 times a day (08:41, 12:41, 18:41 and 22:41 UTC).
**Each wake-up makes and posts ONE reel.** Everything is judged by one thing:
do people watch to the very end? Be accurate, be gripping, and make every frame
look high-end. Examples to match: episodes 001 (hidden UFO) and 002 (Chapter 1
money) under `reels/episodes/`.

Work in the repository's checkout (normally `/home/user/Clipping-h2jaan`) on
branch `ccr-cceae731-x5d03t`.

## 0. Get ready (every wake-up)

```bash
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo /home/user/Clipping-h2jaan)"
git checkout -q ccr-cceae731-x5d03t 2>/dev/null || git checkout -q -b ccr-cceae731-x5d03t origin/ccr-cceae731-x5d03t
git fetch -q origin ccr-cceae731-x5d03t && git merge -q --no-edit origin/ccr-cceae731-x5d03t
pip install -q -r requirements.txt -r reels/requirements.txt
(cd reels && npm ci --no-audit --no-fund >/dev/null)
export REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
export HF_HUB_DISABLE_XET=1
```

Then re-read this file from disk: it may have changed since your last wake-up.

## 1. Post what is already made

Every folder in `reels/episodes/` is one reel. A reel is published when
`state/published.json` has an entry `reel_NNN` (NNN = its episode number).
If a folder is not published yet:

- If it has no `queued_at` in `reels/episodes/<folder>/status.json`, start the
  workflow for it (step 8), write `{"queued_at": "<now ISO>"}` there, commit,
  push, and stop for this wake-up.
- If it was queued over 2 hours ago and still is not published, read that
  workflow run's log (GitHub tools: list the runs of `reel.yml`, then the job
  log), fix the cause in the plan if it is the plan's fault, and start it once
  more. If it fails twice, write `"failed": "<reason>"` in status.json, skip it,
  and carry on with a new reel.

### YouTube

Buffer's free plan takes only 2 YouTube posts a day (its day starts about
19:00 UTC). Every reel goes to Instagram; the first 2 of each Buffer day also go
to YouTube, the rest are Instagram only. The workflow decides this by itself.

```bash
python -m clipper youtube-slots     # free now? when does Buffer's next day start? who waits?
```

Older reels marked `"status": "youtube_pending"` (001 and 002) still wait for
YouTube: while a slot is free, start the workflow for the OLDEST of them (it
then posts to YouTube only), wait until that run has finished (check with the
GitHub tools every 2 minutes), pull, and check `youtube-slots` again. One at a
time. Then make this wake-up's new reel either way.

## 2. Find what players want right now

Use web search. Look for what GTA 6 players are searching and talking about
today. Rotate the formats so the feed never feels samey; each has its series
label (`reel.series` in plan.json):

| Format | Series label | Examples |
|---|---|---|
| Secret / hidden location / hidden trophy | SECRET FILE | the UFO abduction, a secret mission, a hidden vehicle |
| Easter egg / reference | EASTER EGG | nods to old GTA games, films, real places |
| Money | MONEY FILE | fastest money, what to never sell, a hidden payout |
| Warning / missable | DON'T MISS | "do this before Chapter 2", things you lose forever |
| Hidden feature / setting | HIDDEN FEATURE | a phone app trick, a setting that changes everything |
| News | GTA 6 NEWS | Rockstar announcements, updates, records, GTA Online news |

News must come from Rockstar (Newswire) or two major outlets, be under 48
hours old, and say when it happened. Read `reels/ideas.json` and the
existing episodes first: never repeat a topic. Collect at least 6 candidates.

## 3. Rate every idea (1–10 each)

| | Weight | Meaning |
|---|---|---|
| demand | 0.25 | how many players want this today (searches, how many sites cover it) |
| payoff | 0.20 | how useful or jaw-dropping the reveal is |
| retention | 0.20 | is there a payoff worth waiting for at the END (a reward, a twist, a number) |
| fresh | 0.10 | new, or not yet everywhere |
| visual | 0.10 | can we show it (footage from Kick clips, or motion graphics) |
| confidence | 0.15 | how sure we are it is true |

score = 0.25·demand + 0.2·payoff + 0.2·retention + 0.1·fresh + 0.1·visual + 0.15·confidence, one decimal.

**Gate:** confidence ≥ 7 and score ≥ 7.0. Confidence ≥ 7 needs at least TWO
independent sources that agree on every claim you will say. Append all rated
ideas of the day to `reels/ideas.json` (date, idea, scores, score, chosen,
why-not, sources). Make the best idea that passes. If none passes, make none:
write why in ideas.json and stop.

## 4. Write the script: built to be watched to the end

`script.txt` in a new folder `reels/episodes/NNN-short-slug/`.

- **Length:** 60–80 words, 22–28 seconds spoken. English.
- **The hook (first line, under 9 words, said in the first 2 seconds):** a bold
  claim, a warning or a curiosity gap. Never a greeting, never "in this video".
  Proven shapes:
  - "GTA 6 has a hidden ___… and ___."
  - "Your GTA 6 ___ is about to ___."
  - "Stop doing ___ in GTA 6."
  - "Rockstar hid ___ in GTA 6."
  - "Do this before ___, or lose it forever."
  - "Only a few players found ___."
  - "GTA 6's rarest ___ is hiding here."
  - "BREAKING: Rockstar just ___." (news)
- **An open loop:** promise the best part early ("…and the reward is insane"),
  then deliver it in the LAST 5 seconds. Steps first, the payoff last.
- **Specifics beat vague words:** places, times, numbers, names.
- **A change every 2–3 seconds:** a new scene, a card, a zoom or a sound
  (plan this in step 7).
- **The ending loops:** the last line flows back into the hook, then
  "Follow for a new GTA 6 secret every day." (news: "…every day's GTA 6 news.")
- Say only what your sources agree on. Leave out disputed details ("$1,000 or
  more", not a disputed exact figure). Never present rumours or leaks as fact.
  Avoid saying names you can't pronounce for sure; show them on screen.
- **Title (English | Arabic):** curiosity, never the answer. "GTA 6 has a
  HIDDEN UFO 👽 and it can take you", not "How to find the UFO". The first
  frame repeats the hook in big text, so it works as the thumbnail too.
- Also write a one-paragraph summary (English and Arabic) and 10 keywords.

## 5. Voice

```bash
python reels/tools/voice.py reels/episodes/NNN-slug
```

It uses the series narrator (ElevenLabs) while the month's allowance lasts,
then the free Kokoro voice, and prints every word with its start time: scene
times follow those. It says which engine it used: mention it in the report.

## 6. Footage

```bash
python reels/tools/footage.py fetch                      # today's top GTA 6 clips from Kick
python reels/tools/footage.py search "a car in a garage at night" "a character using a phone"
python reels/tools/footage.py sheet 1NV01@20 RSCEC5@38.5  # exact moments
python reels/tools/footage.py crop RSCEC5@38.5 --x 700    # the vertical crop a plan would cut
```

Open each sheet (`out/footage/*.jpg`) and look at it before choosing. A good shot:
matches what the narrator says at that moment, is gameplay (no menus unless the
menu IS the proof), and the vertical crop avoids the streamer's facecam, chat
overlays, burned-in subtitles and sponsor logos. In-game proof (a menu, a scan
result, a trophy pop-up) is gold: put it in a `proof` card (see episode 002).
x = left edge of the 9:16 crop in a 1920×1080 frame (608 px wide).

## 7. The plan (`plan.json`) and a layout check

Copy the structure of `reels/episodes/002-chapter-1-money/plan.json`:
`episode`, `kind`, `topic`, `title {en, ar}`, `summary`, `summary_ar`, `keywords`,
`rating`, `sources`, `footage {name: {parts: [{url, channel, start, dur, x, slow?}]}}`,
`stills {file.png: {url, at, crop: [w, h, x, y], width}}`, `music {style: mystery|money,
bpm, seed, drop, break, back, outro}`, and `reel {series: "SECRET FILE", duration,
musicVolume: 0.42, scenes, sfx}`.

Scenes (fields in `reels/src/types.ts`; each has `from`/`to` in seconds and a `broll`
naming a footage shot): `hook` (stamp + kicker + giant title; `ufo` or `counter`
extras), `list` (wiped/safe checklist), `location` (map, route and pin), `time`
(rolling clock), `trigger` (light beam + target brackets), `scan` (HUD scan + check
rows), `phone` (banking app transfer), `twist` (blackout then slam), `reward`
(trophy card), `cash` (in-game proof card then a big payout), `control` (a countdown item: big
rank number + an animated controller button pressed on the word, or a car flipping back over),
`cta` (logo + follow).
Mix them to fit the story; new scene types may be added in `reels/src/scenes/`.

Timing: a scene starts when the narrator starts its sentence; titles land on the
word they show. `captions: false` where a big title already shows the words.

Retention in the edit:
- The hook scene is 2–4 seconds and its big text is readable by the 10th frame
  (the first frame is also the cover in feeds).
- No shot stays more than about 3 seconds without something changing: a cut,
  a card, a zoom, a stamp or a sound.
- Build to the payoff: the most striking visual (proof card, trophy, payout,
  twist) is saved for the last third, with an impact sound when it lands.
- Vary the look between episodes: not the same scene order every time, and a
  music style and seed that differ from the last two episodes. For news, a
  breaking-news style hook (a red "BREAKING" stamp) is fine.
Sound effects (in `reels/public/sfx/`: whoosh, impact, glitch, riser, ufo, tick,
trophy, cash, coins, ping, scan, error) on cuts and reveals, volume 0.35–0.7.
Arabic lines: short, natural Gulf/Levant Arabic, one per scene, never a
literal translation of a pun.

Check the layout before anything is posted:

```bash
python -m clipper reel reels/episodes/NNN-slug --dry-run --stills 20,90,160,...
```

Open `out/reels/reel_NNN-stills.jpg` and look at every frame: nothing
overlapping, nothing cut off, Arabic readable, text inside the safe area (no
important text above y=280 or below y=1650, or under the right-side buttons
x>930 between y=900 and y=1650). Fix and check again until it is clean. If in
doubt, render the whole video (`--dry-run` without `--stills`) and look at
frames from it.

## 8. Commit and post

```bash
git add reels/episodes/NNN-slug reels/ideas.json
git commit -m "Reels: episode NNN — <topic>"
git fetch -q origin ccr-cceae731-x5d03t && git merge -q --no-edit origin/ccr-cceae731-x5d03t
git push origin HEAD:ccr-cceae731-x5d03t
```

Commit only the plan folder's small files (plan.json, script.txt, voice.mp3,
alignment.json, any .png) — never rendered video or audio. Then start the
workflow with the GitHub tools: run workflow `reel.yml` in
`alikizzeldin/Clipping-h2jaan` on ref `ccr-cceae731-x5d03t` with input
`episode` = the folder name. Record `queued_at` in the folder's `status.json`.

## 9. Report

End with three lines: the reel made (title, format, score, voice engine), what
was posted or queued, and anything that needs the owner (an allowance running
out, a failed run).

## Hard rules

- Facts: two independent sources for every claim; nothing invented; no leaks.
- No content that helps cheating in online play, piracy or exploits that harm
  other players. Single-player tips, secrets and money methods are fine.
- Gameplay footage only from Kick clips of GTA 6 (credited automatically).
  No copyrighted music: the music is composed in code by `reels/tools/music.py`.
- Never post more than one reel per wake-up. Never edit the clip agent's
  settings (`config.yaml`), the dashboard, or other workflows from here.
