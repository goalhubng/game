# Sugar Scramble Deluxe

A match-3 candy game with a 1,000-stage road trip across Nigeria. The whole game is one file, `index.html`; open it in a browser to play. Progress is saved on the device (and in the cloud when played from the Claude link).

## How to play
- Tap two neighbouring candies, or swipe one, to swap them and line up 3+ of the same colour.
- **Match 4** → striped candy (clears a row or column). **L/T shape** → wrapped candy (3×3 blast). **Match 5** → colour bomb.
- **Swap two specials together** for combos: striped + striped (cross), striped + wrapped (giant cross), wrapped + wrapped (5×5), colour bomb + striped/wrapped (every candy of that colour turns special).
- Stage goals: clear **jelly**, melt **chocolate** (match on or next to it), drop **ingredients** 🥥🌶️ to the bottom, **collect** a colour, reach a score, or beat a **boss** every 10th stage.
- Obstacles: **traffic cones** (two nearby matches), **cages** (match once), **holes** in the board, and from stage 300 chocolate that **spreads**.
- Boosters: Hammer, Free Swap, Row Blaster and Shuffle during a stage; Striped Start and Bomb Start before one.
- Leftover moves become a **Sugar Rush** of striped candies. Out of moves? Buy +5 moves to keep your life.

## Extras
Daily Challenge with streaks, weekly events, a 24-sticker album, Lucky Spin, 7-day Transit Pass, bounties, trophies, a souvenir scrapbook, the Danfo garage, Quick Blitz, a pause menu and settings (volumes, music, vibration, reduced effects, hints, reset).

## Publishing it as a website (GitHub Pages)
The repo includes everything needed for an installable, offline-capable web app: `manifest.webmanifest`, `sw.js` and `icons/`, plus a deploy workflow in `.github/workflows/pages.yml`.

1. Merge this branch into `main`.
2. In the repository on GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The workflow deploys on every push to `main` (or run it by hand from the **Actions** tab). The site appears at `https://<owner>.github.io/<repo>/`.
4. On a phone, open the site and choose **Add to Home Screen** (iPhone: Share menu; Android: browser menu). It then opens full-screen and works offline.

The cloud save and live leaderboard only work in the Claude artifact version; the website version saves progress on each device.
