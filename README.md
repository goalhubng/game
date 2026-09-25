# Lane Out

A calm tap puzzle. Every line has an arrowhead. Tap a line and it slides off the board the way the arrow points, unless another line is in its lane. Clear the board to reveal the picture it was drawn from.

Open `index.html` in a browser (it works best on a phone). There is no build step.

## How to play
- **Tap** a line to slide it out. A bump costs a 💧; lose all 3 and you restart the board.
- **Hold** a line to preview its lane: blue means clear, red means blocked.
- **Two-headed lines** (from level 6) have an arrow at both ends. Tap the half of the line nearest the end you want it to leave from.
- **Undo** (↶, once per board) gives back the 💧 from your last bump. It is also offered on the Out of drops screen.
- **Streaks:** clear lines without bumping and each clear plays a higher note.
- 💡 **Hint** lights up the free line that unblocks the most others (3 per board).
- **Zoom:** pinch, scroll or double-tap empty space; drag to move around.
- ▦ grid dots, 🎨 themes (Paper, Night, Sage), ⚙ sound, vibration and restart.

## Modes
- **Home page:** a demo board that clears itself, with Play, Levels, Daily, Album and your stats (levels cleared, perfect clears, daily streak).
- **Album:** every picture you reveal is kept. Pictures you haven't found show as shadows; tap a found one to replay its level.
- **Levels:** endless. Boards grow from 7×8 to 40 columns. The level picker lets you replay any cleared level.
- **Daily puzzle:** one large 34-column board per calendar day.

## How levels are made
1. **Picture.** An emoji silhouette (🏆 🦋 🐱 🦊 …) is drawn to an offscreen canvas and sampled per cell to get the board's shape. Only the outline is used; the full-colour emoji is revealed when you clear the board. If the device has no emoji font, built-in shapes are used. Emoji artwork differs by platform, so the same level can look slightly different on iOS, Android and desktop.
2. **Tidy paths.** The shape is cut into long paths that cover every cell. Paths prefer straight runs of 2–7 cells and turn toward the neighbour with the fewest open neighbours, which keeps the fill tight and avoids stranded pockets.
3. **Arrows.** Each path gets its arrowhead on the end that faces deeper into the picture, so most lines start out blocked.
4. **Repair.** A greedy clear is run; this is safe because removing a line only ever frees lanes. While lines are stuck, one is flipped, an end cell is peeled off, or, as a last resort, the top-most stuck cell becomes a one-cell arrow pointing up (always free). The loop ends with a full clearing order, so every board is solvable.
5. **Two-headed lines.** Some lines get a second arrow, favouring ones whose back end starts blocked. A second way out can only help, so solvability is kept.
6. **Tidy up.** One-cell arrows left by the repair step are merged into a neighbouring line's end whenever the board stays solvable.
7. **Pick the hardest.** Several candidates are generated. The one that needs the most clearing rounds and starts with the fewest free lines wins.

Progress, theme and settings are saved in `localStorage`.
