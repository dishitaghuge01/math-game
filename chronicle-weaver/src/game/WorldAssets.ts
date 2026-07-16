import Phaser from "phaser";

export function ensureWorldTextures(scene: Phaser.Scene) {
  if (scene.textures.exists("party-step-a")) return;
  const paint = scene.add.graphics();
  paint.fillStyle(0xf4deb0).fillRect(2, 0, 12, 14).fillStyle(0x251d2a).fillRect(1, 14, 5, 4).fillRect(10, 14, 5, 4);
  paint.generateTexture("party-step-a", 16, 18).clear();
  paint.fillStyle(0xf4deb0).fillRect(2, 0, 12, 14).fillStyle(0x251d2a).fillRect(3, 14, 5, 4).fillRect(9, 14, 5, 4);
  paint.generateTexture("party-step-b", 16, 18).clear();
  if (!scene.anims.exists("party-walk")) scene.anims.create({ key: "party-walk", frames: [{ key: "party-step-a" }, { key: "party-step-b" }], frameRate: 6, repeat: -1 });
  paint.fillStyle(0x355548).fillRect(0, 0, 32, 32).fillStyle(0x2d493f).fillRect(2, 2, 28, 28);
  paint.generateTexture("grass", 32, 32).clear();
  paint.fillStyle(0x253147).fillRect(0, 0, 32, 32).fillStyle(0x172337).fillRect(2, 2, 28, 28);
  paint.generateTexture("wall", 32, 32).destroy();
}

export function seededTerrain(seed: number, x: number, y: number): number {
  let value = (seed ^ Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
  return value ^ (value >>> 16);
}
