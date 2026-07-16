import Phaser from "phaser";
import { useEffect, useRef } from "react";
import type { ExpeditionState } from "@/api/gameApi";

type ExpeditionAction =
  | { type: "travel"; destinationId: string }
  | { type: "combat"; action: "basic" | "guard" | "signature"; dodgeHits?: number }
  | { type: "discovery"; choice: "search" | "press-on" }
  | { type: "social"; choice: "share" | "command" }
  | { type: "retreat" };

type Props = { expedition: ExpeditionState; onAction: (action: ExpeditionAction) => void };

const VIEW_WIDTH = 768;
const VIEW_HEIGHT = 432;
const WORLD_WIDTH = 1536;
const WORLD_HEIGHT = 864;

/**
 * Vertical-slice Phaser surface: walk, collide, interact with a reachable
 * landmark, then hand the Encounter outcome back to the authoritative API.
 */
export function ExpeditionGame({ expedition, onAction }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onAction);
  callback.current = onAction;

  useEffect(() => {
    if (!host.current) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT,
      backgroundColor: "#181c2c",
      pixelArt: true,
      physics: { default: "arcade", arcade: { debug: false } },
      scene: new OverworldScene(expedition, (action) => callback.current(action)),
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    });
    return () => game.destroy(true);
  }, [expedition.expeditionId, expedition.region.currentLocationId, expedition.combat?.status]);

  return <div ref={host} className="w-full overflow-hidden rounded-sm border-4 border-[color:var(--color-ink)] shadow-xl" aria-label="Playable Expedition map" />;
}

class OverworldScene extends Phaser.Scene {
  private readonly expedition: ExpeditionState;
  private readonly submit: Props["onAction"];
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

  constructor(expedition: ExpeditionState, submit: Props["onAction"]) {
    super("overworld");
    this.expedition = expedition;
    this.submit = submit;
  }

  create() {
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
    else this.openEncounterDialogue();
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
    const paint = this.add.graphics();
    paint.fillStyle(0xf4deb0).fillRect(2, 0, 12, 16).fillStyle(0x251d2a).fillRect(0, 14, 16, 4);
    paint.generateTexture("party-leader", 16, 18).clear();
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
    this.player = this.physics.add.sprite(128, WORLD_HEIGHT - 128, "party-leader").setDepth(5);
    this.player.setCollideWorldBounds(true).setSize(12, 12).setOffset(2, 6);
    this.physics.add.collider(this.player, walls);
    this.followers = this.expedition.party.slice(1).map((member, index) => this.add.sprite(104 - index * 18, WORLD_HEIGHT - 120, "party-leader").setTint(index === 0 ? 0x9fd6ff : 0xdca5e8).setDepth(4));
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

  private openEncounterDialogue() {
    const current = this.expedition.region.locations.find((location) => location.id === this.expedition.region.currentLocationId)!;
    if (current.type !== "discovery" && current.type !== "social") return;
    this.battleOpen = true;
    const social = current.type === "social";
    const title = social ? "PILGRIM LANTERNS" : current.name.toUpperCase();
    const line = social
      ? "The distant lanterns split the Party.\nWho carries the burden?"
      : current.name === "The Splintered Observatory"
        ? "The broken lens shows two futures.\nWhich road will the Party keep?"
        : "The water reflects a road that does not yet exist.\nWhat will the Party do?";
    const choices = social
      ? [["1. SHARE THE BURDEN", { type: "social", choice: "share" } as const], ["2. COMMAND THE PATH", { type: "social", choice: "command" } as const]]
      : [["1. SEARCH THE DEPTHS", { type: "discovery", choice: "search" } as const], ["2. PRESS INTO THE FOG", { type: "discovery", choice: "press-on" } as const]];
    const overlay = this.add.container(0, 0).setDepth(30).setScrollFactor(0);
    overlay.add(this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0x12111b, 0.94));
    overlay.add(this.add.rectangle(104, 134, 116, 116, social ? 0x668e75 : 0x5596a3).setStrokeStyle(4, 0xf4deb0));
    overlay.add(this.add.text(182, 78, title, { fontFamily: "monospace", fontSize: "18px", color: "#f4deb0" }));
    overlay.add(this.add.text(182, 116, line, { fontFamily: "monospace", fontSize: "14px", color: "#ffffff", lineSpacing: 8 }));
    choices.forEach(([label, action], index) => {
      const option = this.add.text(180, 250 + index * 48, label, { fontFamily: "monospace", fontSize: "15px", color: "#f4deb0", backgroundColor: "#30283a", padding: { x: 10, y: 8 } }).setInteractive({ useHandCursor: true });
      option.on("pointerdown", () => this.submit(action));
      overlay.add(option);
      this.input.keyboard!.once(index === 0 ? "keydown-ONE" : "keydown-TWO", () => this.submit(action));
    });
    overlay.add(this.add.text(VIEW_WIDTH / 2, 390, "PRESS 1 OR 2", { fontFamily: "monospace", fontSize: "11px", color: "#b6a37c" }).setOrigin(0.5));
  }

  private openBattle() {
    this.battleOpen = true;
    const enemy = this.expedition.combat!.enemy;
    const overlay = this.add.container(0, 0).setDepth(30).setScrollFactor(0);
    overlay.add(this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0x12111b, 0.96));
    overlay.add(this.add.rectangle(VIEW_WIDTH / 2, 154, 76, 76, 0x9f4851).setStrokeStyle(4, 0xf4deb0));
    overlay.add(this.add.text(VIEW_WIDTH / 2, 212, `${enemy.name}\nHP ${enemy.health}/${enemy.maxHealth}`, { fontFamily: "monospace", fontSize: "16px", color: "#f4deb0", align: "center" }).setOrigin(0.5));
    overlay.add(this.add.text(VIEW_WIDTH / 2, 264, `${this.expedition.combat!.activeMemberRole.toUpperCase()}'S TURN`, { fontFamily: "monospace", fontSize: "13px", color: "#ffffff" }).setOrigin(0.5));
    this.expedition.party.forEach((member, index) => {
      overlay.add(this.add.text(24, 290 + index * 18, `${member.role.toUpperCase().padEnd(7)} ${member.health}/${member.maxHealth}`, { fontFamily: "monospace", fontSize: "11px", color: member.health > 0 ? "#f4deb0" : "#a84949" }));
    });
    (["STRIKE", "GUARD", "SIGNATURE", "RETREAT"] as const).forEach((label, index) => {
      const button = this.add.text(95 + index * 150, 350, `[ ${label} ]`, { fontFamily: "monospace", fontSize: "15px", color: "#f4deb0", backgroundColor: "#30283a", padding: { x: 8, y: 8 } }).setInteractive({ useHandCursor: true });
      const action = label === "RETREAT" ? { type: "retreat" } as const : { type: "combat", action: label === "STRIKE" ? "basic" : label === "GUARD" ? "guard" : "signature" } as const;
      button.on("pointerdown", () => this.beginDodgePhase(action));
      this.input.keyboard!.once(["keydown-ONE", "keydown-TWO", "keydown-THREE", "keydown-FOUR"][index], () => this.beginDodgePhase(action));
      overlay.add(button);
    });
  }

  private beginDodgePhase(action: ExpeditionAction) {
    this.dodgeAction = action;
    this.dodgeHits = 0;
    this.invulnerableUntil = 0;
    this.children.getAll().filter((child) => child.depth === 30).forEach((child) => child.destroy());
    const arena = this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 350, 180, 0x11101a).setStrokeStyle(4, 0xf4deb0).setDepth(31).setScrollFactor(0);
    this.add.text(VIEW_WIDTH / 2, 120, "DODGE THE FOG", { fontFamily: "monospace", fontSize: "16px", color: "#f4deb0" }).setOrigin(0.5).setDepth(32).setScrollFactor(0);
    this.soul = this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 12, 12, 0xff4f6d).setDepth(32).setScrollFactor(0);
    this.bullets = this.add.group();
    const spawn = this.time.addEvent({ delay: 260, repeat: 11, callback: () => {
      const x = Phaser.Math.Between(250, 518);
      const bullet = this.add.rectangle(x, 162, 9, 9, 0xe8e4da).setDepth(32).setScrollFactor(0);
      bullet.setData("speed", Phaser.Math.Between(85, 140));
      this.bullets!.add(bullet);
    }});
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

  private updateDodge() {
    if (!this.soul || !this.bullets) return;
    const speed = 3.2;
    if (this.keys.left.isDown) this.soul.x = Phaser.Math.Clamp(this.soul.x - speed, 222, 546);
    if (this.keys.right.isDown) this.soul.x = Phaser.Math.Clamp(this.soul.x + speed, 222, 546);
    if (this.keys.up.isDown) this.soul.y = Phaser.Math.Clamp(this.soul.y - speed, 148, 284);
    if (this.keys.down.isDown) this.soul.y = Phaser.Math.Clamp(this.soul.y + speed, 148, 284);
    this.bullets.getChildren().forEach((bullet) => {
      const projectile = bullet as Phaser.GameObjects.Rectangle;
      projectile.y += projectile.getData("speed") * (1 / 60);
      if (projectile.y > 292) projectile.destroy();
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
    const close = () => overlay.destroy(true);
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
