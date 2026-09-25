# Brain Draw

A one-finger drawing puzzle. Draw a line from one green dot to the other without touching any balls, and work your way from 85 to 161 IQ.

Open `index.html` in a browser (it works best on a phone or in mobile emulation). There is no build step.

## Rules
- Start the stroke on the pulsing green dot. Lifting your finger early ends the attempt.
- Touching a ball, leaving the circle or running out of ink ends the attempt.
- Moving balls can hit your line while you are still drawing, so speed counts.
- Stars: 1 for finishing, 1 for collecting every 💎, and 1 for using no more ink than the par mark (70%).
- IQ = 85 + 76 × (stars / 30). You need all 30 stars to reach 161.

Progress is saved in `localStorage`.
