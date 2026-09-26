# TYPE//TANK ⚡

> **Terminal Ballistic Defense Combat Simulation**  
> An authentic retro DOS / arcade typing defense game built using pure **HTML5 Canvas, CSS, and Vanilla JavaScript** with 100% native procedural Web Audio API synthesis.

---

## 🎮 Game Overview

In **TYPE//TANK**, you command an armored defense turret anchored at the bottom-center of the terminal display. Hostile threat vectors descend from the upper sector toward your perimeter defense threshold. Neutralize every threat before it breaches the perimeter and compromises your tank's hull integrity!

---

## 🚀 Key Features

- **Authentic Retro DOS / CRT Aesthetic**:
  - Phosphor green and crimson red color palette.
  - Realistic CRT scanline shader with dynamic cathode bloom and on/off toggle.
  - Classic arcade typography and angular DOS-style ASCII bracketed containers.
- **Dynamic Arcade Cabinet Viewport Architecture**:
  - **`AUTO [SCREEN FIT]`**: Fluidly scales to fill any browser window and resolution without letterboxing.
  - **`16:9 [WIDESCREEN]`**: Centers the cabinet with authentic widescreen bezels and cathode inset shadows.
  - **`4:3 [CLASSIC CRT]`**: Centers the cabinet in a vintage 4:3 arcade monitor aspect ratio.
  - Zero zoom-out needed: All screens fit 100% viewport zoom without scroll clipping.
- **180° Rotating Turret & Ballistic Bullets**:
  - Semicircular dome turret with armor plating, tank tread chassis, and active cannon barrel.
  - Turret smoothly rotates across a 180° arc (-180° to 0°) pointing directly at the active target.
  - High-velocity ballistic projectiles with tracer trails, recoil kick, and muzzle sparks.
- **Lowest-First Priority Target Locking**:
  - Typing a character automatically locks onto the lowest threat on screen (maximum Y coordinate).
  - Subsequent keystrokes continue targeting that threat until destroyed.
  - Typed characters immediately fade to ~35–40% opacity with an active glowing cursor under the current letter.
- **Crimson Bonus Targets (3.5× Multiplier)**:
  - Descend faster and grant 3.5× score multipliers.
  - Conflicting words starting with the same character are suppressed, followed by a 3-second cooldown window after resolution.
- **4 Arsenal Modes**:
  1. **Mode 1 [Alpha]**: Lowercase military threats (`tank`, `radar`, `artillery`).
  2. **Mode 2 [Bravo]**: Lowercase + Uppercase callsigns (`Tank`, `RadarX`, `DeltaForce`).
  3. **Mode 3 [Charlie]**: Alphanumeric designations (`Squad5`, `Tank99`, `v2.0`, `M1A2`).
  4. **Mode 4 [Delta]**: Encrypted special characters (`[tank-01]`, `{cmd-9}`, `!alert!`, `<fire_0>`).
- **100% Native Procedural Web Audio API (Zero Audio Files)**:
  - Procedurally synthesized laser shots, bass explosions, radar pings, hull damage crunches, and 8-bit triumphant fanfare chords.
- **Local Storage Flight Logs & Record Celebration**:
  - Tracks lifetime stats (Peak Score, Max WPM, Peak Accuracy, Total Threats Neutralized).
  - Mode Bests quad for all 4 arsenal modes.
  - Flashing arcade celebration banner and confetti celebration when achieving a new personal record!

---

## 🕹️ Controls & Navigation

| Key / Action | Function |
| :--- | :--- |
| **Enter / Space** | Advance screens, confirm arsenal, engage sortie, play again |
| **1 – 4** | Quick-select Arsenal Mode on the Settings screen |
| **Keystrokes (A-Z, 0-9, Specials)** | Fire cannon at falling target threats |
| **Esc** | Pause combat / open abort confirmation modal |
| **R** | Open Flight Logs from Debrief screen or Marquee Header |
| **S** | Change Arsenal Mode from Debrief screen |
| **Header Buttons** | Toggle Aspect Ratio (`AUTO / 16:9 / 4:3`), CRT Overlay (`ON / OFF`), Audio (`ON / OFF`), or Switch Callsign |

---

## 🛠️ Tech Stack

- **HTML5**: Semantic markup, HUD, and Canvas elements.
- **Vanilla CSS**: Authentic retro styling, CRT scanlines, responsive flex/grid layouts.
- **Vanilla JavaScript**: 60 FPS Canvas 2D engine, ballistic physics, state machine, and Web Audio synthesizer.
- **No dependencies**: Zero React, zero external libraries, zero npm packages.

---

## ⚡ Quick Start

Simply open `index.html` in any modern web browser, or serve it locally:

```bash
# Using Python 3
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080) in your browser.
