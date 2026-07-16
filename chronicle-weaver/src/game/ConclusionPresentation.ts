import Phaser from "phaser";
import type { ExpeditionState } from "@/api/gameApi";
import { playCue } from "./AudioCue";

const WIDTH = 768;
const HEIGHT = 432;

export function openCampPresentation(scene: Phaser.Scene, expedition: ExpeditionState) {
  const overlay = scene.add.container(0, 0).setDepth(35).setScrollFactor(0);
  overlay.add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x2b2030, 0.98));
  overlay.add(scene.add.circle(WIDTH / 2, 150, 46, 0xdd9c49, 0.35));
  overlay.add(scene.add.circle(WIDTH / 2, 160, 25, 0xf4deb0, 0.9));
  overlay.add(scene.add.text(WIDTH / 2, 225, "HEARTH OF REEDS", { fontFamily: "monospace", fontSize: "25px", color: "#f4deb0" }).setOrigin(0.5));
  overlay.add(scene.add.text(WIDTH / 2, 262, `The Party regroups. Potions remaining: ${expedition.resources.potions}.\nA rival has advanced through the fog.`, { fontFamily: "monospace", fontSize: "14px", color: "#ffffff", align: "center", lineSpacing: 8 }).setOrigin(0.5));
  const leave = scene.add.text(WIDTH / 2, 350, "[ RETURN TO THE ROAD ]", { fontFamily: "monospace", fontSize: "14px", color: "#f4deb0", backgroundColor: "#30283a", padding: { x: 10, y: 8 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  leave.on("pointerdown", () => overlay.destroy(true));
  scene.input.keyboard!.once("keydown-ENTER", () => overlay.destroy(true));
  overlay.add(leave);
}

export function openEndingPresentation(scene: Phaser.Scene, expedition: ExpeditionState) {
  playCue("victory");
  const ending = expedition.ending!;
  const overlay = scene.add.container(0, 0).setDepth(35).setScrollFactor(0);
  overlay.add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x172337, 0.98));
  for (let index = 0; index < 18; index += 1) {
    const x = 70 + (index * 97) % 650;
    const y = 60 + (index * 53) % 300;
    overlay.add(scene.add.circle(x, y, 2 + index % 3, 0xf4deb0, 0.7));
  }
  overlay.add(scene.add.text(WIDTH / 2, 105, "PROLOGUE COMPLETE", { fontFamily: "monospace", fontSize: "13px", color: "#b6a37c" }).setOrigin(0.5));
  overlay.add(scene.add.text(WIDTH / 2, 160, ending.title.toUpperCase(), { fontFamily: "monospace", fontSize: "28px", color: "#f4deb0" }).setOrigin(0.5));
  overlay.add(scene.add.text(WIDTH / 2, 230, ending.summary, { fontFamily: "monospace", fontSize: "15px", color: "#ffffff", align: "center", lineSpacing: 8, wordWrap: { width: 520 } }).setOrigin(0.5));
  const close = scene.add.text(WIDTH / 2, 350, "[ RETURN TO THE MOOR ]", { fontFamily: "monospace", fontSize: "14px", color: "#f4deb0", backgroundColor: "#30283a", padding: { x: 10, y: 8 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  close.on("pointerdown", () => overlay.destroy(true));
  scene.input.keyboard!.once("keydown-ENTER", () => overlay.destroy(true));
  overlay.add(close);
}
