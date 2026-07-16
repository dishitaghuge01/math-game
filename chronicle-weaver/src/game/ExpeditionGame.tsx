import Phaser from "phaser";
import { useEffect, useRef } from "react";
import type { ExpeditionState } from "@/api/gameApi";
import { openBattlePresentation } from "./BattlePresentation";
import { openCampPresentation, openEndingPresentation } from "./ConclusionPresentation";
import { openEncounterDialogue } from "./DialoguePresentation";
import type { ExpeditionAction, ExpeditionGameProps } from "./types";

const VIEW_WIDTH = 768;
const VIEW_HEIGHT = 432;
const WORLD_WIDTH = 1536;
const WORLD_HEIGHT = 864;

/**
 * Vertical-slice Phaser surface: walk, collide, interact with a reachable
 * landmark, then hand the Encounter outcome back to the authoritative API.
 */
export function ExpeditionGame({ expedition, onAction }: ExpeditionGameProps) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OverworldScene | null>(null);
  const callback = useRef(onAction);
  callback.current = onAction;

  useEffect(() => {
    if (!host.current) return;
    const scene = new OverworldScene(expedition, (action) => callback.current(action));
    sceneRef.current = scene;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT,
      backgroundColor: "#181c2c",
      pixelArt: true,
      physics: { default: "arcade", arcade: { debug: false } },
      scene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    });
    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
  }, [expedition.expeditionId]);

  useEffect(() => {
    sceneRef.current?.applyExpeditionState(expedition);
  }, [expedition]);

  return <div ref={host} className="w-full overflow-hidden rounded-sm border-4 border-[color:var(--color-ink)] shadow-xl" aria-label="Playable Expedition map" />;
}

class OverworldScene extends Phaser.Scene {
  private expedition: ExpeditionState;
  private readonly submit: ExpeditionGameProps["onAction"];
  private player!: Phaser.Physics.Arcade.Sprite;
  private followers: Phaser.GameObjects.Sprite[] = [];
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interact!: Phaser.Input.Keyboard.Key;
  private prompt!: Phaser.GameObjects.Text;
  private landmarks: Array<{ id: string; marker: Phaser.GameObjects.Container }> = [];
  private battleOpen = false;
  private dodgeAction: ExpeditionAction | null = null;
  private soul?: Phaser.GameObjects.Rectangle;
  private bullets?: Phaser.GameObjects.Group;
  private dodgeHits = 0;
  private invulnerableUntil = 0;
  private actionSelecting = false;

  constructor(expedition: ExpeditionState, submit: ExpeditionGameProps["onAction"]) {
    super("overworld");
    this.expedition = expedition;
    this.submit = submit;
  }

  applyExpeditionState(expedition: ExpeditionState) {
    this.expedition = expedition;
    if (!this.sys.isActive()) return;
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart());
    this.cameras.main.fadeOut(170, 18, 16, 27);
  }

  create() {
    this.cameras.main.fadeIn(170, 18, 16, 27);
    this.createTextures();
    this.drawMap();
    this.keys = this.input.keyboard!.createCursorKeys();
    this.interact = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.2);
    this.add.text(12, 10, "FOGBOUND MOOR", { fontFamily: "monospace", fontSize: "16px", color: "#f4deb0" }).setScrollFactor(0).setDepth(20);
    this.add.text(12, 32, "ARROWS: WALK   E: INTERACT", { fontFamily: "monospace", fontSize: "10px", color: "#b6a37c" }).setScrollFactor(0).setDepth(20);
    this.prompt = this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 34, "", { fontFamily: "monospace", fontSize: "13px", color: "#ffffff", backgroundColor: "#211b2c", padding: { x: 8, y: 5 } }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    if (this.expedition.combat?.status === "active") this.openBattle();
    else if (this.expedition.combat?.status === "victory" || this.expedition.combat?.status === "defeat") this.openCombatOutcome();
    else this.battleOpen = openEncounterDialogue(this, this.expedition, this.submit);
  }

  update() {
    if (this.dodgeAction) {
      this.updateDodge();
      return;
    }
    if (this.battleOpen) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);
    const speed = 140;
    if (this.keys.left.isDown) body.setVelocityX(-speed);
    if (this.keys.right.isDown) body.setVelocityX(speed);
    if (this.keys.up.isDown) body.setVelocityY(-speed);
    if (this.keys.down.isDown) body.setVelocityY(speed);
    body.velocity.normalize().scale(speed);
    this.followers.forEach((follower, index) => {
      const leader = index === 0 ? this.player : this.followers[index - 1];
      follower.x = Phaser.Math.Linear(follower.x, leader.x - 18, 0.09);
      follower.y = Phaser.Math.Linear(follower.y, leader.y + 8, 0.09);
    });

    const target = this.nearbyReachableLandmark();
    this.prompt.setText(target ? `[E] Travel to ${this.locationName(target.id)}` : "");
    if (target && Phaser.Input.Keyboard.JustDown(this.interact)) this.submit({ type: "travel", destinationId: target.id });
  }

  private createTextures() {
    if (this.textures.exists("party-step-a")) return;
    const paint = this.add.graphics();
    paint.fillStyle(0xf4deb0).fillRect(2, 0, 12, 14).fillStyle(0x251d2a).fillRect(1, 14, 5, 4).fillRect(10, 14, 5, 4);
    paint.generateTexture("party-step-a", 16, 18).clear();
    paint.fillStyle(0xf4deb0).fillRect(2, 0, 12, 14).fillStyle(0x251d2a).fillRect(3, 14, 5, 4).fillRect(9, 14, 5, 4);
    paint.generateTexture("party-step-b", 16, 18).clear();
    if (!this.anims.exists("party-walk")) this.anims.create({ key: "party-walk", frames: [{ key: "party-step-a" }, { key: "party-step-b" }], frameRate: 6, repeat: -1 });
    paint.fillStyle(0x355548).fillRect(0, 0, 32, 32).fillStyle(0x2d493f).fillRect(2, 2, 28, 28);
    paint.generateTexture("grass", 32, 32).clear();
    paint.fillStyle(0x253147).fillRect(0, 0, 32, 32).fillStyle(0x172337).fillRect(2, 2, 28, 28);
    paint.generateTexture("wall", 32, 32).destroy();
  }

  private drawMap() {
    const terrainPalette = this.expedition.worldSeed % 3 === 0 ? [0x263f52, 0x31546b] : this.expedition.worldSeed % 3 === 1 ? [0x355548, 0x2d493f] : [0x4c4834, 0x635d42];
    for (let x = 0; x < WORLD_WIDTH; x += 32) for (let y = 0; y < WORLD_HEIGHT; y += 32) {
      const roll = seededTerrain(this.expedition.worldSeed, x, y);
      this.add.rectangle(x + 16, y + 16, 32, 32, terrainPalette[roll % terrainPalette.length]);
      if (roll % 19 === 0) this.add.rectangle(x + 16, y + 16, 5, 9, 0x8ba36d, 0.7);
      if (roll % 41 === 0) this.add.circle(x + 16, y + 16, 4, 0xb5a57d, 0.75);
    }
    const walls = this.physics.add.staticGroup();
    for (let x = 16; x < WORLD_WIDTH; x += 32) {
      walls.create(x, 16, "wall");
      walls.create(x, WORLD_HEIGHT - 16, "wall");
    }
    for (let y = 48; y < WORLD_HEIGHT - 32; y += 32) {
      walls.create(16, y, "wall");
      walls.create(WORLD_WIDTH - 16, y, "wall");
    }
    // A visible ridge makes collision and route choice tangible in this slice.
    for (let x = 352; x <= 704; x += 32) walls.create(x, 352, "wall");
    for (let x = 928; x <= 1216; x += 32) walls.create(x, 544, "wall");

    const current = this.expedition.region.currentLocationId;
    this.player = this.physics.add.sprite(128, WORLD_HEIGHT - 128, "party-step-a").setDepth(5).play("party-walk");
    this.player.setCollideWorldBounds(true).setSize(12, 12).setOffset(2, 6);
    this.physics.add.collider(this.player, walls);
    this.followers = this.expedition.party.slice(1).map((member, index) => this.add.sprite(104 - index * 18, WORLD_HEIGHT - 120, "party-step-a").setTint(index === 0 ? 0x9fd6ff : 0xdca5e8).setDepth(4).play("party-walk"));
    this.add.text(12, 54, this.expedition.party.map((member) => `${member.name} ${member.health}/${member.maxHealth}`).join("  "), { fontFamily: "monospace", fontSize: "10px", color: "#f4deb0" }).setScrollFactor(0).setDepth(20);

    const visible = this.expedition.region.locations.filter((location) => location.revealed || location.id === current);
    const positions = [[160, 160], [550, 180], [970, 220], [1320, 340], [1050, 660], [600, 640], [200, 580]];
    visible.forEach((location, index) => {
      const [x, y] = positions[index] ?? [180 + index * 80, 180];
      const color = location.type === "combat" ? 0xa84949 : location.type === "camp" ? 0xdd9c49 : location.type === "discovery" ? 0x5596a3 : location.type === "social" ? 0x668e75 : 0x8d659f;
      const marker = this.add.container(x, y).setDepth(4);
      const landmarkRoll = seededTerrain(this.expedition.worldSeed, x, y);
      marker.add([this.add.rectangle(0, 18, 46, 9, 0x182333, 0.6), this.add.rectangle(0, 0, 30, 34, color).setStrokeStyle(3, 0x201b27), this.add.circle(-22, 3, 6 + landmarkRoll % 5, 0x27392e), this.add.circle(22, 5, 5 + landmarkRoll % 4, 0x27392e), this.add.text(0, 28, location.name, { fontFamily: "monospace", fontSize: "10px", color: "#f4deb0", align: "center", wordWrap: { width: 110 } }).setOrigin(0.5, 0)]);
      if (location.id === current) marker.add(this.add.text(0, -28, "CAMP", { fontFamily: "monospace", fontSize: "10px", color: "#ffffff" }).setOrigin(0.5));
      this.landmarks.push({ id: location.id, marker });
    });
  }

  private nearbyReachableLandmark() {
    const current = this.expedition.region.locations.find((location) => location.id === this.expedition.region.currentLocationId)!;
    return this.landmarks.find(({ id, marker }) => id !== current.id && current.connectedTo.includes(id) && Phaser.Math.Distance.Between(this.player.x, this.player.y, marker.x, marker.y) < 54);
  }

  private locationName(id: string) {
    return this.expedition.region.locations.find((location) => location.id === id)?.name ?? "the road";
  }

  private openBattle() {
    this.battleOpen = true;
    openBattlePresentation(this, this.expedition, (action) => this.playActionIntro(action));
  }

  private playActionIntro(action: ExpeditionAction) {
    if (this.actionSelecting) return;
    this.actionSelecting = true;
    const actor = this.expedition.combat?.activeMemberRole ?? "party";
    const label = action.type === "combat" ? action.action.toUpperCase() : "RETREAT";
    const announcement = this.add.text(VIEW_WIDTH / 2, 300, `${actor.toUpperCase()} — ${label}!`, { fontFamily: "monospace", fontSize: "18px", color: "#ffffff", backgroundColor: "#7b3140", padding: { x: 12, y: 8 } }).setOrigin(0.5).setDepth(40).setScrollFactor(0);
    this.tweens.add({ targets: announcement, scaleX: 1.12, scaleY: 1.12, duration: 160, yoyo: true });
    this.time.delayedCall(430, () => {
      announcement.destroy();
      this.beginDodgePhase(action);
    });
  }

  private beginDodgePhase(action: ExpeditionAction) {
    this.dodgeAction = action;
    this.actionSelecting = false;
    this.dodgeHits = 0;
    this.invulnerableUntil = 0;
    this.children.getAll().filter((child) => child.depth === 30).forEach((child) => child.destroy());
    const arena = this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 350, 180, 0x11101a).setStrokeStyle(4, 0xf4deb0).setDepth(31).setScrollFactor(0);
    this.add.text(VIEW_WIDTH / 2, 120, "DODGE THE FOG", { fontFamily: "monospace", fontSize: "16px", color: "#f4deb0" }).setOrigin(0.5).setDepth(32).setScrollFactor(0);
    this.soul = this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 12, 12, 0xff4f6d).setDepth(32).setScrollFactor(0);
    this.bullets = this.add.group();
    const pattern = this.expedition.worldSeed % 3;
    const spawn = this.time.addEvent({ delay: pattern === 2 ? 180 : 260, repeat: pattern === 1 ? 16 : 11, callback: () => this.spawnEnemyProjectile(pattern) });
    this.time.delayedCall(3300, () => {
      spawn.remove(false);
      this.bullets?.clear(true, true);
      arena.destroy();
      this.soul?.destroy();
      const resolvedAction = this.dodgeAction?.type === "combat"
        ? { ...this.dodgeAction, dodgeHits: this.dodgeHits }
        : this.dodgeAction!;
      this.submit(resolvedAction);
      this.dodgeAction = null;
    });
  }

  private spawnEnemyProjectile(pattern: number) {
    if (!this.bullets) return;
    const bullet = this.add.rectangle(0, 0, 9, 9, 0xe8e4da).setDepth(32).setScrollFactor(0);
    if (pattern === 0) {
      bullet.setPosition(Phaser.Math.Between(250, 518), 162).setData("vy", Phaser.Math.Between(85, 140));
    } else if (pattern === 1) {
      const fromLeft = this.bullets.getLength() % 2 === 0;
      bullet.setPosition(fromLeft ? 222 : 546, Phaser.Math.Between(165, 280)).setData("vx", fromLeft ? 150 : -150).setData("vy", 0);
    } else {
      const angle = this.bullets.getLength() * 0.9;
      bullet.setPosition(384 + Math.cos(angle) * 145, 216 + Math.sin(angle) * 65).setData("vx", -Math.cos(angle) * 75).setData("vy", -Math.sin(angle) * 75);
    }
    this.bullets.add(bullet);
  }

  private updateDodge() {
    if (!this.soul || !this.bullets) return;
    const speed = 3.2;
    if (this.keys.left.isDown) this.soul.x = Phaser.Math.Clamp(this.soul.x - speed, 222, 546);
    if (this.keys.right.isDown) this.soul.x = Phaser.Math.Clamp(this.soul.x + speed, 222, 546);
    if (this.keys.up.isDown) this.soul.y = Phaser.Math.Clamp(this.soul.y - speed, 148, 284);
    if (this.keys.down.isDown) this.soul.y = Phaser.Math.Clamp(this.soul.y + speed, 148, 284);
    this.bullets.getChildren().forEach((bullet) => {
      const projectile = bullet as Phaser.GameObjects.Rectangle;
      projectile.x += (projectile.getData("vx") ?? 0) * (1 / 60);
      projectile.y += (projectile.getData("vy") ?? projectile.getData("speed")) * (1 / 60);
      if (projectile.y > 302 || projectile.x < 208 || projectile.x > 560) projectile.destroy();
      if (Phaser.Geom.Intersects.RectangleToRectangle(this.soul!.getBounds(), projectile.getBounds())) {
        if (this.time.now >= this.invulnerableUntil) {
          this.dodgeHits += 1;
          this.invulnerableUntil = this.time.now + 450;
          this.soul!.setFillStyle(0xffffff);
          this.time.delayedCall(120, () => this.soul?.setFillStyle(0xff4f6d));
          this.cameras.main.shake(80, 0.008);
        }
        projectile.destroy();
      }
    });
  }

  private openCombatOutcome() {
    this.battleOpen = true;
    const victory = this.expedition.combat?.status === "victory";
    const title = victory ? "VICTORY" : "THE PARTY RETREATS";
    const detail = victory
      ? "The road is clear. Rewards have been added to the Expedition."
      : "The Party recovers at Camp. A rival advances through the fog.";
    const overlay = this.add.container(0, 0).setDepth(30).setScrollFactor(0);
    overlay.add(this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0x12111b, 0.96));
    overlay.add(this.add.text(VIEW_WIDTH / 2, 155, title, { fontFamily: "monospace", fontSize: "26px", color: victory ? "#f4deb0" : "#ff8592" }).setOrigin(0.5));
    overlay.add(this.add.text(VIEW_WIDTH / 2, 215, detail, { fontFamily: "monospace", fontSize: "14px", color: "#ffffff", align: "center", wordWrap: { width: 480 } }).setOrigin(0.5));
    const continueButton = this.add.text(VIEW_WIDTH / 2, 320, "[ CONTINUE ]", { fontFamily: "monospace", fontSize: "16px", color: "#f4deb0", backgroundColor: "#30283a", padding: { x: 12, y: 9 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const close = () => {
      overlay.destroy(true);
      if (victory && this.expedition.ending) openEndingPresentation(this, this.expedition);
      if (!victory) openCampPresentation(this, this.expedition);
    };
    continueButton.on("pointerdown", close);
    this.input.keyboard!.once("keydown-ENTER", close);
    overlay.add(continueButton);
  }

}

function seededTerrain(seed: number, x: number, y: number): number {
  let value = (seed ^ Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
  return value ^ (value >>> 16);
}
