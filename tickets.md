# Tickets: Procedural Expedition RPG one-Region prologue

These tracer-bullet tickets build the complete one-Region prologue specified in [`docs/procedural-expedition-prologue-spec.md`](./docs/procedural-expedition-prologue-spec.md). Work the **frontier**: any ticket whose blockers are all done.

## Start a seeded Expedition

**What to build:** A player can begin or resume an auto-saved Expedition and see a generated Fighter, Mage, and Support Party with seeded identities, portraits, motives, relationships, and Expedition Traits.

**Blocked by:** None — can start immediately.

- [x] Starting an Expedition creates one authoritative, persisted Expedition State with a reproducible World Seed and Party Origin.
- [x] The player can begin a new Expedition and resume the same Expedition after refresh or server restart.
- [x] The UI presents the three generated Party members and player-facing Mercy, Resolve, Curiosity, Defiance, and Kinship traits.
- [x] A fixed World Seed produces the same Party Origin and initial visible Expedition State.

## Travel an illustrated Region Map

**What to build:** A player can choose connected reachable locations on a generated, cut-paper-and-ink Region Map; travel updates authoritative Expedition State and visibly reveals the Region.

**Blocked by:** Start a seeded Expedition.

- [x] The player sees a connected Region Map with a Camp, distinct location types, and only valid reachable routes.
- [x] Selecting a valid destination advances the Expedition Party and updates the displayed Region State.
- [x] The generated terrain, landmarks, palette, and map composition are reproducible from the Expedition’s Generation Rules.
- [x] The Region Map uses cohesive generated SVG Asset Grammar rather than ASCII or generic placeholder art.

## Resolve three-member Combat Encounters

**What to build:** A player can enter a Combat Encounter and command the Fighter, Mage, and Support with balanced generated Signature Abilities, rewards, and visible Party condition.

**Blocked by:** Start a seeded Expedition.

- [ ] A player can take turns with all three Party members against a generated enemy Encounter.
- [ ] Each role exposes a basic action, defensive/support action, and generated Signature Abilities made only from Ability Grammar effects.
- [ ] Combat produces clear victory, defeat, resource, and Party-condition outcomes.
- [ ] A fixed Expedition and action sequence resolve to the same combat state and rewards.

## Resolve Discovery and Social Encounters

**What to build:** A player can resolve non-combat location Encounters whose choices shift Expedition Traits, resources, Party relationships, and later generated content.

**Blocked by:** Start a seeded Expedition; Travel an illustrated Region Map.

- [ ] Reaching a Discovery location presents a meaningful hazard, resource, puzzle, or route decision.
- [ ] Reaching a Social location presents a Party, NPC, or faction decision grounded in canonical Expedition facts.
- [ ] Resolutions visibly describe Trait and relationship shifts without exposing raw Choice Vector values.
- [ ] Later available content changes deterministically after a resolved non-combat choice.

## Make defeat recoverable at Camps

**What to build:** A defeated Party returns to its latest Camp, loses consumables, and finds the Region changed while persistent decisions and development remain.

**Blocked by:** Travel an illustrated Region Map; Resolve three-member Combat Encounters.

- [ ] A Party defeat returns the Expedition to the latest reached Camp instead of deleting or restarting it.
- [ ] The recovery applies a visible consumable/resource consequence while preserving resolved choices and Party development.
- [ ] Recovery deterministically changes the Region through a route closure, rival advance, or new opportunity.
- [ ] The changed Region remains stable after saving and resuming the Expedition.

## Complete the one-Region prologue

**What to build:** A Region contains the intended Encounter mix, a major decision, a final Encounter, and a miniature ending shaped by Traits and Party relationships.

**Blocked by:** Resolve three-member Combat Encounters; Resolve Discovery and Social Encounters; Make defeat recoverable at Camps.

- [ ] A generated Region contains approximately 50% Combat, 30% Discovery, and 20% Social Encounters across its playable locations.
- [ ] Completing the Region’s required path reaches a major decision and final Encounter.
- [ ] The miniature ending reflects resolved choices, Expedition Traits, and Party relationships.
- [ ] A full predetermined prologue sequence is testable from Expedition start through ending at the Expedition API seam.

## Export, import, and branch Expeditions

**What to build:** A player can export an Expedition Code, reproduce the same Expedition exactly after import, or branch its outcome by making a different later choice.

**Blocked by:** Complete the one-Region prologue.

- [ ] An Expedition Code contains enough initial seed and compact action history to reproduce canonical Expedition State.
- [ ] Importing a Code reproduces the same Party, Region, resolved Encounters, resources, and ending for the same action history.
- [ ] A new action after import creates a valid divergent Expedition outcome without changing the original Code’s replay.
- [ ] Export/import is accessible in the player-facing UI and covered by deterministic API-level tests.
