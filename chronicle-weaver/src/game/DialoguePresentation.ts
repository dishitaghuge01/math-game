import Phaser from "phaser";
import type { ExpeditionState } from "@/api/gameApi";
import { playCue } from "./AudioCue";
import { prefersReducedMotion } from "./Settings";
import type { ExpeditionAction } from "./types";

const WIDTH = 768;
const HEIGHT = 432;

export function openEncounterDialogue(scene: Phaser.Scene, expedition: ExpeditionState, submit: (action: ExpeditionAction) => void): boolean {
  const current = expedition.region.locations.find((location) => location.id === expedition.region.currentLocationId)!;
  if (current.type !== "discovery" && current.type !== "social") return false;
  const social = current.type === "social";
  const speaker = social ? expedition.party[2] : expedition.party[1];
  const title = social ? "PILGRIM LANTERNS" : current.name.toUpperCase();
  const line = current.name === "The Splintered Observatory"
    ? "The broken lens shows two futures.\nWhich road will the Party keep?"
    : `${current.detail ?? (social ? "The Party reaches an uneasy crossroads." : "Something waits beneath the fog.")}\nWhat will the Party do?`;
  const choices: Array<[string, ExpeditionAction]> = social
    ? [["1. SHARE THE BURDEN", { type: "social", choice: "share" }], ["2. COMMAND THE PATH", { type: "social", choice: "command" }]]
    : [["1. SEARCH THE DEPTHS", { type: "discovery", choice: "search" }], ["2. PRESS INTO THE FOG", { type: "discovery", choice: "press-on" }]];
  const overlay = scene.add.container(0, 0).setDepth(30).setScrollFactor(0);
  overlay.add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x12111b, 0.94));
  overlay.add(scene.add.rectangle(104, 134, 116, 116, social ? 0x668e75 : 0x5596a3).setStrokeStyle(4, 0xf4deb0));
  overlay.add(scene.add.rectangle(104, 134, 42, 56, social ? 0xdca5e8 : 0x9fd6ff).setStrokeStyle(2, 0x251d2a));
  overlay.add(scene.add.text(182, 58, `${speaker.name.toUpperCase()} — ${speaker.role.toUpperCase()}`, { fontFamily: "monospace", fontSize: "11px", color: "#b6a37c" }));
  overlay.add(scene.add.text(182, 78, title, { fontFamily: "monospace", fontSize: "18px", color: "#f4deb0" }));
  overlay.add(addTypewriterText(scene, 182, 116, line));
  let selected = 0;
  const selector = scene.add.text(156, 258, "▶", { fontFamily: "monospace", fontSize: "14px", color: "#ffcf70" });
  const updateSelector = () => selector.setY(258 + selected * 48);
  const choose = () => { playCue("confirm"); submit(choices[selected][1]); };
  choices.forEach(([label, action], index) => {
    const option = scene.add.text(180, 250 + index * 48, label, { fontFamily: "monospace", fontSize: "15px", color: "#f4deb0", backgroundColor: "#30283a", padding: { x: 10, y: 8 } }).setInteractive({ useHandCursor: true });
    option.on("pointerdown", () => { playCue("confirm"); submit(action); });
    option.on("pointerover", () => { selected = index; updateSelector(); });
    overlay.add(option);
    scene.input.keyboard!.once(index === 0 ? "keydown-ONE" : "keydown-TWO", () => submit(action));
  });
  const moveUp = () => { selected = (selected + choices.length - 1) % choices.length; updateSelector(); bindNavigation(); };
  const moveDown = () => { selected = (selected + 1) % choices.length; updateSelector(); bindNavigation(); };
  const bindNavigation = () => {
    scene.input.keyboard!.once("keydown-UP", moveUp);
    scene.input.keyboard!.once("keydown-DOWN", moveDown);
  };
  bindNavigation();
  scene.input.keyboard!.once("keydown-ENTER", choose);
  overlay.add(selector);
  overlay.add(scene.add.text(WIDTH / 2, 390, "↑↓ SELECT · ENTER CONFIRM · 1/2 QUICK CHOOSE · SPACE SKIP", { fontFamily: "monospace", fontSize: "10px", color: "#b6a37c" }).setOrigin(0.5));
  return true;
}

function addTypewriterText(scene: Phaser.Scene, x: number, y: number, line: string) {
  const text = scene.add.text(x, y, prefersReducedMotion() ? line : "", { fontFamily: "monospace", fontSize: "14px", color: "#ffffff", lineSpacing: 8 });
  if (prefersReducedMotion()) return text;
  let cursor = 0;
  const reveal = () => {
    cursor += 1;
    text.setText(line.slice(0, cursor));
    if (cursor % 3 === 0) playCue("dialogue");
    if (cursor >= line.length) timer.remove(false);
  };
  const timer = scene.time.addEvent({ delay: 18, repeat: line.length - 1, callback: reveal });
  scene.input.keyboard!.once("keydown-SPACE", () => {
    timer.remove(false);
    text.setText(line);
  });
  return text;
}
