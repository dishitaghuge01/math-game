import Phaser from "phaser";
import { playCue } from "./AudioCue";
import type { ExpeditionAction } from "./types";

const WIDTH = 768;
const HEIGHT = 432;

export class DodgePhase {
  private action: ExpeditionAction | null = null;
  private soul?: Phaser.GameObjects.Rectangle;
  private bullets?: Phaser.GameObjects.Group;
  private hits = 0;
  private invulnerableUntil = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly keys: Phaser.Types.Input.Keyboard.CursorKeys,
    private readonly submit: (action: ExpeditionAction) => void,
  ) {}

  get active() { return this.action !== null; }

  begin(action: ExpeditionAction, worldSeed: number) {
    this.action = action;
    this.hits = 0;
    this.invulnerableUntil = 0;
    this.scene.children.getAll().filter((child) => child.depth === 30).forEach((child) => child.destroy());
    const arena = this.scene.add.rectangle(WIDTH / 2, HEIGHT / 2, 350, 180, 0x11101a).setStrokeStyle(4, 0xf4deb0).setDepth(31).setScrollFactor(0);
    this.scene.add.text(WIDTH / 2, 120, "DODGE THE FOG", { fontFamily: "monospace", fontSize: "16px", color: "#f4deb0" }).setOrigin(0.5).setDepth(32).setScrollFactor(0);
    this.soul = this.scene.add.rectangle(WIDTH / 2, HEIGHT / 2, 12, 12, 0xff4f6d).setDepth(32).setScrollFactor(0);
    this.bullets = this.scene.add.group();
    const pattern = worldSeed % 3;
    const spawn = this.scene.time.addEvent({ delay: pattern === 2 ? 180 : 260, repeat: pattern === 1 ? 16 : 11, callback: () => this.spawnProjectile(pattern) });
    this.scene.time.delayedCall(3300, () => {
      spawn.remove(false);
      this.bullets?.clear(true, true);
      arena.destroy();
      this.soul?.destroy();
      const resolved = this.action?.type === "combat" ? { ...this.action, dodgeHits: this.hits } : this.action!;
      this.action = null;
      this.submit(resolved);
    });
  }

  update() {
    if (!this.soul || !this.bullets) return;
    const speed = 3.2;
    if (this.keys.left.isDown) this.soul.x = Phaser.Math.Clamp(this.soul.x - speed, 222, 546);
    if (this.keys.right.isDown) this.soul.x = Phaser.Math.Clamp(this.soul.x + speed, 222, 546);
    if (this.keys.up.isDown) this.soul.y = Phaser.Math.Clamp(this.soul.y - speed, 148, 284);
    if (this.keys.down.isDown) this.soul.y = Phaser.Math.Clamp(this.soul.y + speed, 148, 284);
    this.bullets.getChildren().forEach((bullet) => {
      const projectile = bullet as Phaser.GameObjects.Rectangle;
      projectile.x += (projectile.getData("vx") ?? 0) / 60;
      projectile.y += (projectile.getData("vy") ?? projectile.getData("speed")) / 60;
      if (projectile.y > 302 || projectile.x < 208 || projectile.x > 560) projectile.destroy();
      if (Phaser.Geom.Intersects.RectangleToRectangle(this.soul!.getBounds(), projectile.getBounds())) {
        if (this.scene.time.now >= this.invulnerableUntil) {
          this.hits += 1;
          this.invulnerableUntil = this.scene.time.now + 450;
          this.soul!.setFillStyle(0xffffff);
          this.scene.time.delayedCall(120, () => this.soul?.setFillStyle(0xff4f6d));
          playCue("hit");
          this.scene.cameras.main.shake(80, 0.008);
        }
        projectile.destroy();
      }
    });
  }

  private spawnProjectile(pattern: number) {
    if (!this.bullets) return;
    const bullet = this.scene.add.rectangle(0, 0, 9, 9, 0xe8e4da).setDepth(32).setScrollFactor(0);
    if (pattern === 0) bullet.setPosition(Phaser.Math.Between(250, 518), 162).setData("vy", Phaser.Math.Between(85, 140));
    else if (pattern === 1) {
      const fromLeft = this.bullets.getLength() % 2 === 0;
      bullet.setPosition(fromLeft ? 222 : 546, Phaser.Math.Between(165, 280)).setData("vx", fromLeft ? 150 : -150).setData("vy", 0);
    } else {
      const angle = this.bullets.getLength() * 0.9;
      bullet.setPosition(384 + Math.cos(angle) * 145, 216 + Math.sin(angle) * 65).setData("vx", -Math.cos(angle) * 75).setData("vy", -Math.sin(angle) * 75);
    }
    this.bullets.add(bullet);
  }
}
