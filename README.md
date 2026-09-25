# Lane Out

A calm tap puzzle. Every line has an arrowhead. Tap a line and it slides off the board the way the arrow points, unless another line is in its lane. Clear the board to reveal the picture it was drawn from.

Open `index.html` in a browser (it works best on a phone). There is no build step.

## How to play
- **Tap** a line to slide it out. A bump costs a 💧; lose all 3 and you restart the board.
- **Hold** a line to preview its lane: blue means clear, red means blocked.
- 🔒 **Locked lines** (from level 8) show a number. They open after you clear that many other lines.
- **Combos:** clear lines quickly one after another for a rising ×N streak.
- 💡 **Hint** lights up the free line that unblocks the most others (3 per board, 5 on the daily).
- **Zoom:** pinch, scroll or double-tap empty space; drag to move around. The 🔍 button toggles zoom.
- ▦ grid dots, 🎨 themes (Paper, Night, Mint), ⚙ sound, vibration, line colours and restart.

## Modes
- **Levels:** endless. Boards grow from 6×7 to 30 columns. The level picker lets you replay any cleared level.
- **Daily puzzle:** one large board per calendar day.

## How levels are made
- Each board is traced from an emoji (🐱 🦋 🍩 🦊 …). The emoji is drawn to an offscreen canvas and sampled per cell, which gives the board's shape and each line's colour. If the device has no emoji font, built-in shapes are used instead. Emoji artwork differs between platforms, so the same level can look slightly different on iOS, Android and desktop.
- Lines are numbered in placement order. Each line's exit lane may only cross lines with a higher number, so removing from the highest number down always works. A lock never asks for more clears than that order provides, so no board can dead-end.
- A densify pass grows line tails, splices two-cell detours into lines, and seeds new lines in the gaps, all under the same rule. Boards come out about 96% filled.

Progress, theme and settings are saved in `localStorage`.
