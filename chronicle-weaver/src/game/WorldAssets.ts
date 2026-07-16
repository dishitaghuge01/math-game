import Phaser from "phaser";

export function ensureWorldTextures(scene: Phaser.Scene) {
  if (scene.textures.exists("fighter-step-a")) return;
  const paint = scene.add.graphics();
  const createParty = (role: "fighter" | "mage" | "support", body: number, accent: number) => {
    paint.fillStyle(0xf4deb0).fillRect(4, 1, 8, 7).fillStyle(body).fillRect(2, 8, 12, 7).fillStyle(accent).fillRect(1, 15, 5, 3).fillRect(10, 15, 5, 3);
    if (role === "fighter") paint.fillStyle(0xc95b4f).fillRect(1, 7, 14, 3);
    if (role === "mage") paint.fillStyle(0x7561c7).fillTriangle(1, 7, 8, 0, 15, 7);
    if (role === "support") paint.fillStyle(0x58a98a).fillRect(0, 10, 2, 7).fillRect(14, 10, 2, 7);
    paint.generateTexture(`${role}-step-a`, 16, 18).clear();
    paint.fillStyle(0xf4deb0).fillRect(4, 1, 8, 7).fillStyle(body).fillRect(2, 8, 12, 7).fillStyle(accent).fillRect(3, 15, 5, 3).fillRect(8, 15, 5, 3);
    if (role === "fighter") paint.fillStyle(0xc95b4f).fillRect(1, 7, 14, 3);
    if (role === "mage") paint.fillStyle(0x7561c7).fillTriangle(1, 7, 8, 0, 15, 7);
    if (role === "support") paint.fillStyle(0x58a98a).fillRect(0, 10, 2, 7).fillRect(14, 10, 2, 7);
    paint.generateTexture(`${role}-step-b`, 16, 18).clear();
    if (!scene.anims.exists(`${role}-walk`)) scene.anims.create({ key: `${role}-walk`, frames: [{ key: `${role}-step-a` }, { key: `${role}-step-b` }], frameRate: 6, repeat: -1 });
  };
  createParty("fighter", 0x7c3e38, 0x251d2a);
  createParty("mage", 0x514274, 0x251d2a);
  createParty("support", 0x376b5a, 0x251d2a);
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
  paint.generateTexture("landmark-landmark", 32, 32).clear();
  paint.fillStyle(0x4e3527).fillRect(13, 18, 6, 12).fillStyle(0x27392e).fillCircle(16, 12, 11).fillStyle(0x355548).fillCircle(12, 9, 7);
  paint.generateTexture("prop-tree", 32, 32).clear();
  paint.fillStyle(0x766e65).fillCircle(16, 18, 10).fillStyle(0xa89e8d).fillCircle(12, 14, 4).fillCircle(20, 17, 3);
  paint.generateTexture("prop-stone", 32, 32).clear();
  paint.fillStyle(0xdce9ef).fillRect(3, 0, 4, 4).fillRect(0, 4, 10, 4).fillRect(3, 8, 4, 4).fillStyle(0x78b7d2).fillRect(3, 4, 4, 4);
  paint.generateTexture("projectile-fog", 10, 12).clear();
  paint.fillStyle(0xc98c5f).fillRect(3, 0, 4, 10).fillStyle(0xffcf70).fillRect(0, 3, 10, 4).fillStyle(0x7a3d3c).fillRect(3, 3, 4, 4);
  paint.generateTexture("projectile-ash", 10, 10).clear();
  paint.fillStyle(0xc397e8).fillRect(2, 0, 6, 10).fillRect(0, 2, 10, 6).fillStyle(0xf4deb0).fillRect(3, 3, 4, 4);
  paint.generateTexture("projectile-wisp", 10, 10).destroy();
}

export function seededTerrain(seed: number, x: number, y: number): number {
  let value = (seed ^ Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
  return value ^ (value >>> 16);
}
