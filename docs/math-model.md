# Math Model — Procedural Story/World/Mechanics Engine

## 1. Decision Vector

The single source of truth every generator reads from. All fields are bounded, continuous, and updated smoothly — no discrete states, no branching flags.

```ts
interface DecisionVector {
  morality: number;        // -1 (cruel) .. 1 (kind)
  aggression: number;      // 0 (avoidant) .. 1 (violent)
  curiosity: number;       // 0 .. 1
  riskTolerance: number;   // 0 .. 1
  socialAffinity: number;  // -1 (loner) .. 1 (collector of allies)
  allegiance: Record<string, number>; // factionId -> -1..1
  volatility: number;      // 0 .. 1, derived — see 1.3
}

function createInitialVector(): DecisionVector {
  return {
    morality: 0,
    aggression: 0.3,
    curiosity: 0.5,
    riskTolerance: 0.4,
    socialAffinity: 0,
    allegiance: {},
    volatility: 0,
  };
}
```

Starting values are mildly biased toward curious/cautious/neutral rather than all-zero — a completely flat vector produces bland early-game generation.

## 2. Update Rule (exponential smoothing)

```
D_t = α · impact_t + (1 − α) · D_(t-1)
```

**α = 0.20** — a single decision noticeably nudges the vector, but it takes 4–5 consistent decisions in one direction before the vector is "captured" by that behavior (one cruel act doesn't instantly make the player a cruel character).

Allegiance entries update independently per faction, same α:

```
allegiance[f]_t = α · impact.allegiance[f] + (1 − α) · allegiance[f]_(t-1)
```

## 3. Volatility (arc memory)

Tracks how much the vector has swung recently, so late-game generation can react to "this player has been erratic" independent of current-state values:

```
volatility_t = β · |impact_t − D_(t-1)| + (1 − β) · volatility_(t-1)
```

**β = 0.30** — volatility reacts faster than the base vector so a sudden swing is visible immediately, but decays within a few decisions if the player settles down.

`|impact_t − D_(t-1)|` = mean absolute difference across all scalar fields (exclude `allegiance` and `volatility` itself).

## 4. Seed Derivation

Every generator call needs a deterministic, reproducible seed:

```ts
function deriveSeed(vector: DecisionVector, sessionId: string, namespace: string): number {
  const input = JSON.stringify(vector) + sessionId + namespace;
  return fnv1a(input);
}

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

`namespace` examples: `"world:chunk:12"`, `"narrative:node:7"`, `"loot:encounter:3"`. This stops the world generator and narrative generator from correlating just because they share a vector — each generator call gets its own seed derived from the same underlying state.

## 5. Vector → Parameter Mapping Functions

All mappings are smooth (sigmoid/softmax), never if/else on ranges — a 0.51 vs 0.49 aggression should never produce categorically different output.

**Difficulty scaling:**
```
enemyHealth(base, aggression) = base · (1 + 0.6 · sigmoid(6 · (aggression − 0.5)))
enemyCount(base, aggression)  = round(base · (1 + 0.4 · aggression))
```
Sigmoid steepness `6` keeps the curve roughly linear across 0.3–0.7 but flattens near the extremes (diminishing returns on very high/low aggression).

**Loot rarity weights** (softmax over a hand-tuned weight matrix):
```
W_loot = {
  common:    { morality: 0,   aggression: -0.2, curiosity: 0,   riskTolerance: -0.5 },
  rare:      { morality: 0,   aggression: 0.1,  curiosity: 0.3, riskTolerance: 0.2  },
  legendary: { morality: 0.2, aggression: 0.3,  curiosity: 0.4, riskTolerance: 0.7  },
}
lootWeights(D) = softmax([ W_loot[tier] · D  for tier in tiers ])
```

**Terrain harshness** (noise amplitude/frequency):
```
amplitude(riskTolerance, volatility) = 0.4 + 0.5 · riskTolerance + 0.3 · volatility
frequency(curiosity)                 = 0.02 + 0.03 · curiosity
```

## 6. Narrative Grammar (the "math writes the story" layer)

The LLM is never allowed to decide *what happens*. A weighted context-free grammar does that, and its production weights are driven by the same vector.

```ts
type Symbol = string;
interface WeightedRule { tokens: Symbol[]; weight: number }

class StoryGrammar {
  productions: Map<Symbol, WeightedRule[]>;

  expand(symbol: Symbol, rng: () => number): Symbol[] {
    const rules = this.productions.get(symbol)!;
    const total = rules.reduce((sum, r) => sum + r.weight, 0);
    let roll = rng() * total;
    for (const rule of rules) {
      roll -= rule.weight;
      if (roll <= 0) return rule.tokens;
    }
    return rules[rules.length - 1].tokens;
  }
}
```

Rule weights aren't static — they're recomputed per expansion from `toneWeights(D)`:

```
W_tone = {
  tragic:     { morality: -0.6, volatility: 0.4 },
  triumphant: { morality: 0.5,  aggression: 0.3 },
  mysterious: { curiosity: 0.7, socialAffinity: -0.3 },
  communal:   { socialAffinity: 0.6, morality: 0.2 },
}
toneWeights(D) = softmax([ W_tone[tone] · D  for tone in tones ])
```

Example production for the symbol `NEXT_BEAT`, weights populated from `toneWeights(D)` at expansion time:

```
NEXT_BEAT →
  [BETRAYAL, CONSEQUENCE]      weight = toneWeights(D).tragic
  [ALLY_WIN, CELEBRATION]      weight = toneWeights(D).triumphant
  [DISCOVERY, REVELATION]      weight = toneWeights(D).mysterious
  [GATHERING, ALLIANCE]        weight = toneWeights(D).communal
```

Plot skeleton generation is pure math — `PlotNode[]` come out of repeated `grammar.expand()` calls seeded by `deriveSeed(D_t, sessionId, "narrative:skeleton")`. **Only after the full skeleton exists** does an LLM call turn each `PlotNode` into prose, conditioned on Supermemory-retrieved continuity context. The LLM narrates; it never authors structure.

## 7. Tunable Constants (single source, don't inline elsewhere)

```ts
export const ALPHA_SMOOTHING = 0.20;
export const BETA_VOLATILITY = 0.30;
export const SIGMOID_STEEPNESS = 6;
export const W_LOOT = { /* as above */ };
export const W_TONE = { /* as above */ };
```

## 8. Determinism Guarantee

For any generator `G`, `G(deriveSeed(D_t, sessionId, ns))` must return an identical result on every call given identical inputs. This is what lets saves store only `(vector history, seed log)` instead of generated content — write a test for this before building anything else.