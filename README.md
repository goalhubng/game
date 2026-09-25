# Lane Out

A calm tap puzzle. Every line has an arrowhead. Tap a line and it slides off the board the way the arrow points, unless another line is in its lane. Clear the whole board.

Open `index.html` in a browser (it works best on a phone). There is no build step.

## How to play
- **Tap** a line to slide it out.
- A line that bumps into another costs a 💧. Lose all 3 and you restart the level.
- **Hold** a line down to preview its lane: blue means clear, red means blocked.
- 💡 **Hint** lights up a line that's free to go, choosing the one that unblocks the most others (3 per level).
- ▦ **Grid** toggles a dot grid to help you line things up.
- 🎨 switches themes (Paper, Night, Mint); ⚙ has sound, vibration and restart.

## Levels
Levels are generated from the level number, so level N is the same for everyone and there is no end. Boards grow from 5×7 up to 20×26 and cycle through picture shapes (heart, trophy, cat, butterfly, house …).

Every level is solvable by construction. Lines are placed one by one, and each new line's exit lane must be clear of every line placed before it. Removing lines in reverse order therefore always works; the puzzle is finding that order.

Progress, theme and settings are saved in `localStorage`.
