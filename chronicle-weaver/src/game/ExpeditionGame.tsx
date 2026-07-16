import Phaser from "phaser";
import { useEffect, useRef } from "react";
import type { ExpeditionState } from "@/api/gameApi";

type ExpeditionAction =
  | { type: "travel"; destinationId: string }
  | { type: "combat"; action: "basic" | "guard" | "signature" }
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
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interact!: Phaser.Input.Keyboard.Key;
  private prompt!: Phaser.GameObjects.Text;
  private landmarks: Array<{ id: string; marker: Phaser.GameObjects.Container }> = [];
  private battleOpen = false;

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
  }

  update() {
    if (this.battleOpen) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);
    const speed = 140;
    if (this.keys.left.isDown) body.setVelocityX(-speed);
    if (this.keys.right.isDown) body.setVelocityX(speed);
    if (this.keys.up.isDown) body.setVelocityY(-speed);
    if (this.keys.down.isDown) body.setVelocityY(speed);
    body.velocity.normalize().scale(speed);

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
    for (let x = 0; x < WORLD_WIDTH; x += 32) for (let y = 0; y < WORLD_HEIGHT; y += 32) this.add.image(x + 16, y + 16, "grass");
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

    const visible = this.expedition.region.locations.filter((location) => location.revealed || location.id === current);
    const positions = [[160, 160], [550, 180], [970, 220], [1320, 340], [1050, 660], [600, 640], [200, 580]];
    visible.forEach((location, index) => {
      const [x, y] = positions[index] ?? [180 + index * 80, 180];
      const color = location.type === "combat" ? 0xa84949 : location.type === "camp" ? 0xdd9c49 : location.type === "discovery" ? 0x5596a3 : location.type === "social" ? 0x668e75 : 0x8d659f;
      const marker = this.add.container(x, y).setDepth(4);
      marker.add([this.add.rectangle(0, 18, 46, 9, 0x182333, 0.6), this.add.rectangle(0, 0, 30, 34, color).setStrokeStyle(3, 0x201b27), this.add.text(0, 28, location.name, { fontFamily: "monospace", fontSize: "10px", color: "#f4deb0", align: "center", wordWrap: { width: 110 } }).setOrigin(0.5, 0)]);
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
    const enemy = this.expedition.combat!.enemy;
    const overlay = this.add.container(0, 0).setDepth(30).setScrollFactor(0);
    overlay.add(this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0x12111b, 0.96));
    overlay.add(this.add.rectangle(VIEW_WIDTH / 2, 154, 76, 76, 0x9f4851).setStrokeStyle(4, 0xf4deb0));
    overlay.add(this.add.text(VIEW_WIDTH / 2, 212, `${enemy.name}\nHP ${enemy.health}/${enemy.maxHealth}`, { fontFamily: "monospace", fontSize: "16px", color: "#f4deb0", align: "center" }).setOrigin(0.5));
    overlay.add(this.add.text(VIEW_WIDTH / 2, 264, `${this.expedition.combat!.activeMemberRole.toUpperCase()}'S TURN`, { fontFamily: "monospace", fontSize: "13px", color: "#ffffff" }).setOrigin(0.5));
    (["STRIKE", "GUARD", "SIGNATURE", "RETREAT"] as const).forEach((label, index) => {
      const button = this.add.text(95 + index * 150, 350, `[ ${label} ]`, { fontFamily: "monospace", fontSize: "15px", color: "#f4deb0", backgroundColor: "#30283a", padding: { x: 8, y: 8 } }).setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => this.submit(label === "RETREAT" ? { type: "retreat" } : { type: "combat", action: label === "STRIKE" ? "basic" : label === "GUARD" ? "guard" : "signature" }));
      overlay.add(button);
    });
  }
}
