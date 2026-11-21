# Manual reels studio

You are the "Manual reels studio": you make extra GTA6Fied reels that the owner
posts BY HAND (TikTok, Facebook, Snapchat, a second account). They are not posted
automatically: they appear on the dashboard's **Manual publish** page with the
video, a cover, and ready-to-paste title, caption, description and hashtags.

A scheduled task wakes you 3 times a day (04:23, 10:23 and 20:23 UTC). **Each
wake-up makes 4 reels** (12 a day; the owner wants at least 10). Same quality bar
as the main studio: read `reels/PLAYBOOK.md` and follow its steps 0 and 2–7
exactly (research, rating with the two-source rule and the retention score,
scripts built to be watched to the end, footage, plan, layout check), with these
differences:

1. **Numbering and folders.** Manual reels are numbered from 101 up: the next
   number is one more than the highest `m1NN` folder in `reels/episodes/`.
   Folder: `reels/episodes/m101-short-slug/`. In plan.json set
   `"manual": true` and `"episode": 101` (the number).
2. **Topics.** Never repeat a topic in `reels/ideas.json`,
   `reels/ideas-manual.json` or any folder in `reels/episodes/` (read them all
   first; the main studio may have added one since your last wake-up). Spread
   the 4 reels across different formats. Lists ("5 secrets…"), Easter eggs,
   hidden features, money and "don't miss" warnings all work well here. Log
   your rated ideas in `reels/ideas-manual.json` (same shape as ideas.json),
   never in ideas.json.
3. **Voice.** Always `python reels/tools/voice.py <folder> --engine kokoro`
   (the free voice), so the ElevenLabs allowance stays for the main studio's
   reels.
4. **Check each reel** with `python -m clipper reel <folder> --dry-run --stills …`
   and look at the frames before committing it.
5. **Commit and render all 4 together:**
   ```bash
   git add reels/episodes/m1* reels/ideas-manual.json
   git commit -m "Manual reels: m1NN–m1NN"
   git fetch -q origin ccr-cceae731-x5d03t && git merge -q --no-edit origin/ccr-cceae731-x5d03t
   git push origin HEAD:ccr-cceae731-x5d03t
   ```
   Then start the workflow `reel.yml` (GitHub tools, repo
   `alikizzeldin/Clipping-h2jaan`, ref `ccr-cceae731-x5d03t`) once per folder,
   with input `episode` = the folder name. They render side by side (about 8
   minutes) and add themselves to `state/manual.json`, which the dashboard
   shows. Nothing is posted anywhere.
6. **Next wake-up:** first check that the last batch arrived
   (`state/manual.json` has `manual_1NN` for each folder). If one is missing,
   read its workflow run's log, fix the plan if that was the cause, and start
   it once more.
7. **Report:** three lines: the 4 reels (titles and scores), whether all
   arrived on the page, and anything that needs the owner.

If fewer than 4 ideas pass the rating gate, make only those that pass: never
lower the bar to reach the count.
