import Phaser from "phaser";
import type { ExpeditionState } from "@/api/gameApi";
import { playCue } from "./AudioCue";
import { prefersReducedMotion } from "./Settings";
import type { ExpeditionAction } from "./types";

const WIDTH = 768;
const HEIGHT = 432;

export function openBattlePresentation(scene: Phaser.Scene, expedition: ExpeditionState, selectAction: (action: ExpeditionAction) => void) {
  const enemy = expedition.combat!.enemy;
  const overlay = scene.add.container(0, 0).setDepth(30).setScrollFactor(0);
  overlay.add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x12111b, 0.96));
  const enemyVariant = [...enemy.name].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 0) % 3;
  const enemyBody = enemyVariant === 0
    ? scene.add.rectangle(WIDTH / 2, 154, 76, 76, 0x9f4851).setStrokeStyle(4, 0xf4deb0)
    : enemyVariant === 1
      ? scene.add.triangle(WIDTH / 2, 154, 0, 72, 38, 0, 76, 72, 0x7159a8).setStrokeStyle(4, 0xf4deb0)
      : scene.add.circle(WIDTH / 2, 154, 42, 0x4d8c88).setStrokeStyle(4, 0xf4deb0);
  if (!prefersReducedMotion()) scene.tweens.add({ targets: enemyBody, y: 148, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  overlay.add(enemyBody);
  const eyeColor = enemyVariant === 0 ? 0xf4deb0 : enemyVariant === 1 ? 0x9bd3dc : 0xffcf70;
  overlay.add(scene.add.circle(WIDTH / 2 - 11, 148, 4, eyeColor));
  overlay.add(scene.add.circle(WIDTH / 2 + 11, 148, 4, eyeColor));
  overlay.add(scene.add.text(WIDTH / 2, 212, `${enemy.name}\nHP ${enemy.health}/${enemy.maxHealth}${enemy.weakened ? "  WEAK" : ""}`, { fontFamily: "monospace", fontSize: "16px", color: "#f4deb0", align: "center" }).setOrigin(0.5));
  if (enemy.weakened) {
    const weakenMarks = [-1, 1].map((side) => scene.add.circle(WIDTH / 2 + side * 48, 142, 5, 0xc397e8));
    weakenMarks.forEach((mark, index) => {
      if (!prefersReducedMotion()) scene.tweens.add({ targets: mark, y: 128 + index * 28, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
      overlay.add(mark);
    });
  }
  const actor = expedition.party.find((member) => member.role === expedition.combat!.activeMemberRole)!;
  overlay.add(scene.add.text(WIDTH / 2, 264, `${actor.name.toUpperCase()}'S TURN`, { fontFamily: "monospace", fontSize: "13px", color: "#ffffff" }).setOrigin(0.5));
  overlay.add(scene.add.text(WIDTH / 2, 280, `SIGNATURE: ${actor.signatureAbility.name.toUpperCase()}`, { fontFamily: "monospace", fontSize: "10px", color: "#b6a37c" }).setOrigin(0.5));
  expedition.party.forEach((member, index) => {
    const y = 290 + index * 18;
    overlay.add(scene.add.text(24, y, `${member.role.toUpperCase().padEnd(7)} ${member.health}/${member.maxHealth}${member.shield ? `  ◈${member.shield}` : ""}`, { fontFamily: "monospace", fontSize: "11px", color: member.health > 0 ? "#f4deb0" : "#a84949" }));
    if (member.shield) {
      const barrier = scene.add.circle(214, y + 5, 8, 0x7cbde2, 0.18).setStrokeStyle(1, 0xa9e1ff, 0.9);
      if (!prefersReducedMotion()) scene.tweens.add({ targets: barrier, alpha: 0.45, duration: 550, yoyo: true, repeat: -1 });
      overlay.add(barrier);
    }
  });
  overlay.add(scene.add.text(620, 290, `POTIONS ${expedition.resources.potions}`, { fontFamily: "monospace", fontSize: "11px", color: "#f4deb0" }));
  const latestLog = expedition.combat!.log.at(-1) ?? "Choose an action.";
  overlay.add(scene.add.text(WIDTH / 2, 332, latestLog, { fontFamily: "monospace", fontSize: "11px", color: "#b6a37c", align: "center", wordWrap: { width: 650 } }).setOrigin(0.5));
  if (latestLog.includes("recovers")) {
    const sparks = [-18, 0, 18].map((offset) => scene.add.circle(210 + offset, 300, 4, 0x7ee0a2));
    sparks.forEach((spark) => {
      if (prefersReducedMotion()) spark.setAlpha(0);
      else scene.tweens.add({ targets: spark, y: 270, alpha: 0, duration: 650, onComplete: () => spark.destroy() });
      overlay.add(spark);
    });
  }
  const damage = /for (\d+) damage/.exec(latestLog)?.[1];
  if (damage) {
    const targetX = latestLog.includes("strikes") ? 620 : WIDTH / 2;
    const targetY = latestLog.includes("strikes") ? 268 : 126;
    const number = scene.add.text(targetX, targetY, `-${damage}`, { fontFamily: "monospace", fontSize: "24px", color: "#ff8592", stroke: "#251d2a", strokeThickness: 4 }).setOrigin(0.5);
    if (prefersReducedMotion()) number.setAlpha(0);
    else scene.tweens.add({ targets: number, y: targetY - 34, alpha: 0, duration: 750, onComplete: () => number.destroy() });
    overlay.add(number);
  }
  (["STRIKE", "GUARD", "SIGNATURE", "ITEM", "RETREAT"] as const).forEach((label, index) => {
    const unavailable = label === "ITEM" && expedition.resources.potions === 0;
    const button = scene.add.text(38 + index * 146, 370, `[ ${label} ]`, { fontFamily: "monospace", fontSize: "15px", color: unavailable ? "#7b7180" : "#f4deb0", backgroundColor: "#30283a", padding: { x: 8, y: 8 } });
    const action = label === "RETREAT" ? { type: "retreat" } as const : { type: "combat", action: label === "STRIKE" ? "basic" : label === "GUARD" ? "guard" : label === "SIGNATURE" ? "signature" : "item" } as const;
    const choose = () => { playCue(action.type === "combat" && action.action === "item" ? "heal" : "confirm"); selectAction(action); };
    if (!unavailable) {
      button.setInteractive({ useHandCursor: true }).on("pointerdown", choose);
      scene.input.keyboard!.once(["keydown-ONE", "keydown-TWO", "keydown-THREE", "keydown-FOUR", "keydown-FIVE"][index], choose);
    }
    overlay.add(button);
  });
}
