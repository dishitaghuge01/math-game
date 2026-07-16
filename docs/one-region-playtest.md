# One-Region Phaser Playtest

Use this checklist against the Phaser Region Map (`/world`). Record the World Seed and every choice so a finding can be replayed through an Expedition Code.

## Before each run

1. Start a new Expedition and record its World Seed.
2. Confirm the Region loads with visible paths, Party sprites, landmarks, and a Camp.
3. Verify `M` mutes audio and `R` enables Low Motion.

## Core journey

1. Walk with arrow keys; verify map bounds and ridge collision.
2. Approach a connected landmark and press `E`; verify unreachable landmarks cannot be entered.
3. Resolve both a Discovery and Social Encounter through keyboard choice navigation.
4. Confirm trait/bond/reward feedback appears after resolution.
5. Complete a combat with Strike, Guard, Signature, and Item where available.
6. During the dodge phase, intentionally take a hit and then avoid all bullets; compare the resulting Party damage.
7. Verify Guard shield, Mage WEAK, and Support heal/shield appear in the battle HUD or combat log.
8. Retreat once; confirm the Camp scene, recovered Party, potion consequence, and rival advancement.
9. Continue through the Observatory decision and final Encounter; verify the Phaser ending reflects Party bonds and Traits.
10. Export an Expedition Code, import it, and replay the same route.

## Record for each issue

- World Seed / Expedition Code
- Location and active Party role
- Inputs/action sequence
- Expected vs actual result
- Screenshot or short recording
- Severity: blocker, balance, readability, visual, audio, accessibility

## Balance targets for this slice

- A no-hit dodge should make an ordinary combat reliably survivable.
- Taking several hits should create meaningful pressure but not force a restart.
- Guard should visibly mitigate the immediate enemy response.
- Potions should be valuable enough to use, but not erase all risk.
- The final Encounter should feel more demanding than the opening combat without requiring perfect dodge play.
