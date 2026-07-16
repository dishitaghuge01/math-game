export type AudioCue = "confirm" | "dialogue" | "hit" | "heal" | "victory";

let context: AudioContext | null = null;
let muted = typeof window !== "undefined" && localStorage.getItem("wayfarer:muted") === "true";

export function toggleMuted() {
  muted = !muted;
  if (typeof window !== "undefined") localStorage.setItem("wayfarer:muted", String(muted));
  return muted;
}
export function isMuted() { return muted; }

/** Small original synthesized cues; works without external audio assets. */
export function playCue(cue: AudioCue) {
  if (muted || typeof window === "undefined") return;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  const spec: Record<AudioCue, [number, number, OscillatorType]> = {
    confirm: [520, 0.07, "square"],
    dialogue: [210, 0.025, "square"],
    hit: [92, 0.13, "sawtooth"],
    heal: [660, 0.16, "sine"],
    victory: [740, 0.28, "triangle"],
  };
  const [frequency, duration, type] = spec[cue];
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (cue === "victory" || cue === "heal") oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + duration);
  gain.gain.setValueAtTime(0.045, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}
