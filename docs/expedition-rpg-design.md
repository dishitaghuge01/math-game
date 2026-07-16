# Procedural Expedition RPG — Design Drill

**Status:** In discovery. This document records only decisions that have been confirmed during the design drill.

## Confirmed direction

- The project is an original procedural expedition RPG, inspired by the feel of a cinematic turn-based journey rather than any specific game’s content or IP.
- An **Expedition** is shaped by the player’s accumulated **Choice Vector**.
- Mathematical **Generation Rules** deterministically generate the world, assets, encounters, and campaign structure from the Choice Vector and World Seed.
- Generated narrative describes established game facts; it does not independently invent canonical world state.
- The core loop is: explore the generated overworld → encounter a combat, discovery, or social challenge → resolve it → gain or lose resources → make expedition-defining choices → encounter a world reshaped by the Choice Vector.
- An Expedition has up to three active, playable characters. Their distinct personalities, relationships, and character development are shaped by the player’s decisions and by how the player uses each character in play.

## Open decisions

- Combat model
- Exploration scale and movement model
- Choice Vector dimensions and how players perceive them
- Campaign structure and ending conditions
- Procedural asset style and production pipeline
- Save/replay/sharing model
