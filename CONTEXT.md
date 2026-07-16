# Wayfarer's Codex

A procedural expedition RPG in which each playthrough becomes a distinct world and campaign. The player’s accumulated choices are the inputs that shape the expedition rather than a fixed authored branch.

## Language

**Expedition**:
A complete playable run through one generated campaign world, from its opening state to its ending.
_Avoid_: session, playthrough

**Choice Vector**:
The normalized record of a player’s accumulated decisions. It is the canonical expression of the kind of expedition they are creating.
_Avoid_: alignment, personality score

**World Seed**:
The deterministic value derived from an Expedition’s identity and Choice Vector that reproduces its world geometry, encounters, palette, and assets.
_Avoid_: random seed

**Generation Rules**:
The mathematical mappings that transform a World Seed and Choice Vector into world content.
_Avoid_: random generation

**Expedition State**:
The evolving game facts within an Expedition, including location, party condition, inventory, quests, and resolved events.
_Avoid_: game state, save data

**Encounter**:
A bounded tactical challenge triggered by exploration, such as a battle, discovery, hazard, or social confrontation.
_Avoid_: event

**Expedition Cycle**:
The repeating player loop of exploration, Encounter resolution, resource change, and an expedition-defining choice that reshapes later content.
_Avoid_: gameplay loop

**Expedition Party**:
The group of up to three playable characters travelling through an Expedition. Each character has a distinct personality and a development arc shaped by the player’s decisions and use of that character.
_Avoid_: roster, squad

**Signature Ability**:
A character-specific combat action generated for an Expedition Party member. Its availability and effects express that character’s personality and development.
_Avoid_: skill, spell

**Region Map**:
An illustrated network of generated, connected locations that the Expedition Party can reach. Choosing a location advances travel and produces an Encounter or discovery.
_Avoid_: overworld, free-roam map

**Expedition Trait**:
A player-facing, named interpretation of the hidden Choice Vector. It communicates a direction and recent change without exposing raw values or equations.
_Avoid_: stat, alignment meter
