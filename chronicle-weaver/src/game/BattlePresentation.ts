import Phaser from "phaser";
import type { ExpeditionState } from "@/api/gameApi";
import type { ExpeditionAction } from "./types";

const WIDTH = 768;
const HEIGHT = 432;

export function openBattlePresentation(scene: Phaser.Scene, expedition: ExpeditionState, selectAction: (action: ExpeditionAction) => void) {
  const enemy = expedition.combat!.enemy;
  const overlay = scene.add.container(0, 0).setDepth(30).setScrollFactor(0);
  overlay.add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x12111b, 0.96));
  const enemyVariant = expedition.worldSeed % 3;
  const enemyBody = enemyVariant === 0
    ? scene.add.rectangle(WIDTH / 2, 154, 76, 76, 0x9f4851).setStrokeStyle(4, 0xf4deb0)
    : enemyVariant === 1
      ? scene.add.triangle(WIDTH / 2, 154, 0, 72, 38, 0, 76, 72, 0x7159a8).setStrokeStyle(4, 0xf4deb0)
      : scene.add.circle(WIDTH / 2, 154, 42, 0x4d8c88).setStrokeStyle(4, 0xf4deb0);
  scene.tweens.add({ targets: enemyBody, y: 148, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  overlay.add(enemyBody);
  overlay.add(scene.add.text(WIDTH / 2, 212, `${enemy.name}\nHP ${enemy.health}/${enemy.maxHealth}${enemy.weakened ? "  WEAK" : ""}`, { fontFamily: "monospace", fontSize: "16px", color: "#f4deb0", align: "center" }).setOrigin(0.5));
  overlay.add(scene.add.text(WIDTH / 2, 264, `${expedition.combat!.activeMemberRole.toUpperCase()}'S TURN`, { fontFamily: "monospace", fontSize: "13px", color: "#ffffff" }).setOrigin(0.5));
  expedition.party.forEach((member, index) => overlay.add(scene.add.text(24, 290 + index * 18, `${member.role.toUpperCase().padEnd(7)} ${member.health}/${member.maxHealth}${member.shield ? `  ◈${member.shield}` : ""}`, { fontFamily: "monospace", fontSize: "11px", color: member.health > 0 ? "#f4deb0" : "#a84949" })));
  overlay.add(scene.add.text(620, 290, `POTIONS ${expedition.resources.potions}`, { fontFamily: "monospace", fontSize: "11px", color: "#f4deb0" }));
  overlay.add(scene.add.text(WIDTH / 2, 332, expedition.combat!.log.at(-1) ?? "Choose an action.", { fontFamily: "monospace", fontSize: "11px", color: "#b6a37c", align: "center", wordWrap: { width: 650 } }).setOrigin(0.5));
  (["STRIKE", "GUARD", "SIGNATURE", "ITEM", "RETREAT"] as const).forEach((label, index) => {
    const button = scene.add.text(38 + index * 146, 370, `[ ${label} ]`, { fontFamily: "monospace", fontSize: "15px", color: "#f4deb0", backgroundColor: "#30283a", padding: { x: 8, y: 8 } }).setInteractive({ useHandCursor: true });
    const action = label === "RETREAT" ? { type: "retreat" } as const : { type: "combat", action: label === "STRIKE" ? "basic" : label === "GUARD" ? "guard" : label === "SIGNATURE" ? "signature" : "item" } as const;
    button.on("pointerdown", () => selectAction(action));
    scene.input.keyboard!.once(["keydown-ONE", "keydown-TWO", "keydown-THREE", "keydown-FOUR", "keydown-FIVE"][index], () => selectAction(action));
    overlay.add(button);
  });
}
