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
  paint.generateTexture("wall", 32, 32).clear();
  paint.fillStyle(0x5d352b).fillRect(5, 14, 22, 14).fillStyle(0xdd9c49).fillTriangle(3, 15, 16, 3, 29, 15).fillStyle(0xf4deb0).fillRect(14, 19, 4, 9);
  paint.generateTexture("landmark-camp", 32, 32).clear();
  paint.fillStyle(0x342434).fillRect(6, 5, 20, 22).fillStyle(0xa84949).fillTriangle(5, 25, 16, 4, 27, 25).fillStyle(0xf4deb0).fillRect(14, 14, 4, 4);
  paint.generateTexture("landmark-combat", 32, 32).clear();
  paint.fillStyle(0x315c6a).fillCircle(16, 17, 12).fillStyle(0x9bd3dc).fillCircle(16, 14, 7).fillStyle(0x1f3945).fillRect(5, 25, 22, 3);
  paint.generateTexture("landmark-discovery", 32, 32).clear();
  paint.fillStyle(0x4a715f).fillRect(12, 8, 8, 19).fillStyle(0xf4deb0).fillRect(14, 5, 4, 8).fillStyle(0xdd9c49).fillRect(12, 13, 8, 8);
  paint.generateTexture("landmark-social", 32, 32).clear();
  paint.fillStyle(0x5a496e).fillRect(5, 6, 22, 21).fillStyle(0xb99bdd).fillRect(9, 10, 14, 11).fillStyle(0x2c2540).fillRect(13, 13, 6, 5);
  paint.generateTexture("landmark-landmark", 32, 32).destroy();
}

export function seededTerrain(seed: number, x: number, y: number): number {
  let value = (seed ^ Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
  return value ^ (value >>> 16);
}
