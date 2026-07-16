# Procedural Expedition RPG — Design Drill

**Status:** In discovery. This document records only decisions that have been confirmed during the design drill.

## Confirmed direction

- The project is an original procedural expedition RPG, inspired by the feel of a cinematic turn-based journey rather than any specific game’s content or IP.
- An **Expedition** is shaped by the player’s accumulated **Choice Vector**.
- Mathematical **Generation Rules** deterministically generate the world, assets, encounters, and campaign structure from the Choice Vector and World Seed.
- Generated narrative describes established game facts; it does not independently invent canonical world state.
- The core loop is: explore the generated overworld → encounter a combat, discovery, or social challenge → resolve it → gain or lose resources → make expedition-defining choices → encounter a world reshaped by the Choice Vector.
- An Expedition has up to three active, playable characters. Their distinct personalities, relationships, and character development are shaped by the player’s decisions and by how the player uses each character in play.
- Combat is turn-based with all three party members active. Each character has a basic attack, a defensive or support action, and 2–3 generated signature abilities. Character relationships and temperaments affect combat; a tactics grid and timing mechanics are deferred.
- Exploration uses an illustrated, procedurally generated region map. Players choose between connected reachable locations—such as ruins, camps, settlements, hazards, and landmarks—and travel produces an Encounter or discovery. Direct free-roaming movement is out of scope.
- Players see the Choice Vector as named Expedition Traits with descriptive tiers and recent shifts; raw values and equations remain hidden.

- A complete Expedition contains three generated regions, each with approximately 5–7 reachable locations and a major party or world decision. The third region ends in a generated final Encounter and ending shaped by Expedition Traits, party relationships, and resolved choices.
- Visuals use a coherent 2D illustrated SVG cut-paper-and-ink style. Generation Rules compose terrain, landmarks, party portraits and silhouettes, enemy forms, item icons, and region UI motifs from an authored shape and texture library plus the World Seed.
- Expeditions auto-save locally and server-side. An Expedition Code serializes the initial World Seed with compact choice and action history so it can be replayed exactly or imported to branch into a different outcome. Accounts are out of scope for the first version.
- The five player-facing Expedition Traits are Mercy, Resolve, Curiosity, Defiance, and Kinship. They are the interpretations of the Choice Vector that shape procedural content.
- Canonical story facts—regions, factions, character arcs, quests, discoveries, consequences, and endings—are produced by deterministic Generation Rules and a seeded narrative grammar. An optional LLM may polish those established facts into prose, but cannot introduce canonical facts or outcomes.
- Each Expedition begins with all three procedurally generated party members. The World Seed establishes each member’s visual identity, combat role, personal motive, and initial tensions; player choices and combat use develop or strain their relationships.
- Every party has three complementary role foundations: a Fighter who absorbs pressure and protects allies, a Mage who controls conditions and deals magical damage, and a Support character who heals, buffs, and alters turn economy. Seeded generation varies their identities and expressions while preserving these tactical responsibilities.
- Signature Ability mechanics come from a finite, balanced procedural grammar: damage, shield, heal, buff, debuff, and turn manipulation. Seeded generation determines names, visual motifs, elemental affinities, and combinations according to role, personality, relationships, and Expedition Traits.

## Open decisions

- Defeat and recovery model
- Choice Vector dimensions and how players perceive them
- Campaign structure and ending conditions
- Procedural asset style and production pipeline
- Save/replay/sharing model
