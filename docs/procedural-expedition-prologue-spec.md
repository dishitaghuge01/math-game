# Procedural Expedition RPG — One-Region Prologue

## Problem Statement

The current project presents a generated narrative and decorative map rather than a playable RPG. Players cannot take an Expedition through a coherent world where exploration, combat, party development, choices, visuals, and endings are all generated from their prior decisions.

## Solution

Deliver a complete, replayable one-Region prologue for an original procedural Expedition RPG. A player begins with a seeded Fighter, Mage, and Support character, travels an illustrated Region Map, resolves combat, Discovery, and Social Encounters, develops named Expedition Traits and party relationships, recovers at Camps after defeat, and reaches a miniature ending. The same Expedition Code must reproduce the same canonical Expedition; a changed choice must branch later content.

## User Stories

1. As a player, I want to begin a new Expedition with a generated three-member Party, so that each run starts with a distinct ensemble.
2. As a player, I want each Party member to have a generated portrait, silhouette, name, motive, and personality, so that the Party feels specific to my Expedition.
3. As a player, I want one Fighter, one Mage, and one Support member, so that every Party can handle protection, magical control/damage, and healing/buffs.
4. As a player, I want to see an illustrated Region Map of connected locations, so that I can make route choices.
5. As a player, I want reachable locations to communicate their known risk and opportunity, so that travel choices are informed but not solved.
6. As a player, I want the Region Map, its landmarks, and its palette to be generated from my World Seed and Choice Vector, so that my choices visibly shape the Expedition.
7. As a player, I want each location to resolve into a Combat, Discovery, or Social Encounter, so that travelling is meaningful.
8. As a player, I want Combat Encounters to use all three Party members in turn-based play, so that party composition matters.
9. As a player, I want every Party member to have a basic action, a defensive/support action, and generated Signature Abilities, so that combat is tactical and characters are distinct.
10. As a player, I want Signature Abilities to remain legible and balanced, so that procedural generation does not make combat unfair.
11. As a player, I want Discovery Encounters to offer hazards, resources, puzzles, or route decisions, so that exploration is more than combat.
12. As a player, I want Social Encounters to affect relationships, factions, and Expedition Traits, so that role-playing changes the campaign.
13. As a player, I want to see Mercy, Resolve, Curiosity, Defiance, and Kinship as descriptive Expedition Traits, so that I understand the direction of my choices without optimizing hidden equations.
14. As a player, I want Trait changes to affect later locations, Encounters, assets, and story facts, so that decisions have material consequences.
15. As a player, I want Party members to react differently to decisions and their own combat use, so that their development responds to my play.
16. As a player, I want to receive resources and development after resolving an Encounter, so that progress is tangible.
17. As a player, I want defeat to return the Party to the most recent Camp with a consequence, so that failure is meaningful without erasing the Expedition.
18. As a player, I want defeat consequences to change the Region Map, so that recovery creates a new strategic situation.
19. As a player, I want a major decision and a miniature ending at the end of the Region, so that the prologue has a complete arc.
20. As a player, I want all canonical story facts to remain consistent with the Expedition State, so that generated prose never contradicts gameplay.
21. As a player, I want an Expedition to auto-save, so that I can leave and resume safely.
22. As a player, I want to export an Expedition Code, so that I can replay or share the exact same run.
23. As a player importing an Expedition Code, I want the original Expedition reproduced exactly, so that sharing is trustworthy.
24. As a player replaying an imported Expedition, I want divergent choices to create a new branch, so that the system supports experimentation.
25. As a player, I want the visual style to be cohesive, generated SVG cut-paper-and-ink art rather than ASCII or unrelated generated images, so that the game has a recognizable identity.

## Implementation Decisions

- The one-Region prologue is the first release. The three-Region Expedition is a follow-on once the prologue loop is validated.
- One authoritative Expedition State owns World Seed, Choice Vector, Party Origin, Region Map, location resolution, resources, Camps, relationships, resolved Encounters, and ending state.
- Generation Rules are deterministic functions of the World Seed, Choice Vector, and resolved action history. They produce canonical Region, Encounter, Party, and asset facts.
- The existing single action API evolves into the primary boundary: clients read an Expedition State and submit a typed Expedition action; the response is the next authoritative Expedition State. Actions include travel, combat, Discovery/Social resolution, Camp recovery, and export/import.
- Persist Expedition State and action history instead of relying on the current in-memory RPG state. Expedition Code serializes the initial World Seed and compact action history.
- The current generic decision vector is mapped to the five Expedition Traits: Mercy, Resolve, Curiosity, Defiance, and Kinship. Raw values remain server-side; the client receives descriptive tiers and recent shifts.
- Party generation always creates Fighter, Mage, and Support foundations. Party Origin varies their identity, motives, visual motifs, interpersonal tensions, and generated Signature Ability combinations.
- Signature Abilities are constructed only from Ability Grammar effects: damage, shields, healing, buffs, debuffs, and turn manipulation. Names, visuals, elemental affinities, and combinations are procedural.
- Region generation creates a connected, illustrated location graph with 5–7 locations. The prologue enforces a mix close to 50% Combat, 30% Discovery, and 20% Social Encounters, plus a Camp, major decision, and final Encounter.
- Defeat returns the Party to the latest Camp, removes consumables, and applies a deterministic Region change. Persistent decisions and party development remain.
- The Asset Grammar is an authored SVG shape, texture, and palette library. Procedural composition creates terrain, landmarks, portraits/silhouettes, enemies, items, and UI motifs; no external generative image service is required.
- Narrative Grammar produces canonical event and dialogue structures solely from Expedition State. Optional LLM prose polishing is non-canonical and cannot add facts, names, rewards, locations, or outcomes.

## Testing Decisions

- The primary test seam is the external Expedition API: read Expedition State, submit an action, and assert the returned observable state. Tests must assert player-visible behavior and deterministic reproduction, not private generator internals.
- Add deterministic tests for a fixed Expedition Code covering Party Origin, Region Map connectivity, Encounter mix, location resolution, Trait shifts, Camp recovery, final Encounter, and miniature ending.
- Add API-level action-sequence tests proving travel blocks during active Combat, combat rewards resolve once, defeat returns to Camp with a Region change, and import/replay produces the same state.
- Add client-level tests for rendering authoritative Expedition State and issuing valid actions. Existing generator Vitest suites are prior art for deterministic unit tests; the new API seam is the higher-level regression boundary.
- Include a single end-to-end prologue test that begins an Expedition and reaches an ending through a predetermined action sequence.

## Out of Scope

- The complete three-Region campaign.
- Real-time or free-roaming movement.
- A combat positioning grid, timing, dodge, or parry system.
- User accounts, cloud identity, multiplayer, or social features beyond portable Expedition Codes.
- Procedural photorealistic art, third-party generative image APIs, or any use of another game’s protected characters, names, story, or assets.
- An LLM as the source of canonical game facts.

## Further Notes

The existing map-and-combat prototype is a disposable technical slice. It is not the target game model because it lacks Party Origin, a connected Region Map, multiple Encounter types, persisted Expedition State, Trait semantics, Camp changes, and replayable deterministic action history.
