import Phaser from "phaser";
import { useEffect, useRef } from "react";
import type { ExpeditionState } from "@/api/gameApi";

type Props = {
  expedition: ExpeditionState;
  onAction: (action: { type: "travel"; destinationId: string } | { type: "combat"; action: "basic" | "guard" | "signature" } | { type: "retreat" }) => void;
};

const WIDTH = 768;
const HEIGHT = 432;

/** A pixel-art play surface driven by the authoritative Expedition State. */
export function ExpeditionGame({ expedition, onAction }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onAction);
  callback.current = onAction;

  useEffect(() => {
    if (!host.current) return;
    const scene = new ExpeditionScene(expedition, (action) => callback.current(action));
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      width: WIDTH,
      height: HEIGHT,
      backgroundColor: "#181c2c",
      pixelArt: true,
      scene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    });
    return () => game.destroy(true);
  }, [expedition.expeditionId, expedition.region.currentLocationId, expedition.combat?.status]);

  return <div ref={host} className="w-full overflow-hidden rounded-sm border-4 border-[color:var(--color-ink)] shadow-xl" aria-label="Playable Expedition map" />;
}

class ExpeditionScene extends Phaser.Scene {
  private readonly expedition: ExpeditionState;
  private readonly submit: Props["onAction"];
  private player!: Phaser.GameObjects.Rectangle;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interact!: Phaser.Input.Keyboard.Key;
  private locations: Array<{ id: string; sprite: Phaser.GameObjects.Container }> = [];
  private battleOpen = false;

  constructor(expedition: ExpeditionState, submit: Props["onAction"]) {
    super("expedition");
    this.expedition = expedition;
    this.submit = submit;
  }

  create() {
    this.drawWorld();
    this.keys = this.input.keyboard!.createCursorKeys();
    this.interact = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.add.text(12, 10, "FOGBOUND MOOR", { fontFamily: "monospace", fontSize: "16px", color: "#f4deb0" });
    this.add.text(12, 32, "ARROWS: WALK   E: INTERACT", { fontFamily: "monospace", fontSize: "10px", color: "#b6a37c" });
    if (this.expedition.combat?.status === "active") this.openBattle();
  }

  update() {
    if (this.battleOpen) return;
    const speed = 2;
    if (this.keys.left.isDown) this.player.x = Phaser.Math.Clamp(this.player.x - speed, 20, WIDTH - 20);
    if (this.keys.right.isDown) this.player.x = Phaser.Math.Clamp(this.player.x + speed, 20, WIDTH - 20);
    if (this.keys.up.isDown) this.player.y = Phaser.Math.Clamp(this.player.y - speed, 64, HEIGHT - 20);
    if (this.keys.down.isDown) this.player.y = Phaser.Math.Clamp(this.player.y + speed, 64, HEIGHT - 20);
    if (Phaser.Input.Keyboard.JustDown(this.interact)) this.interactWithLocation();
  }

  private drawWorld() {
    for (let x = 0; x < WIDTH; x += 24) for (let y = 56; y < HEIGHT; y += 24) {
      this.add.rectangle(x + 12, y + 12, 23, 23, (x / 24 + y / 24) % 2 ? 0x355548 : 0x2d493f);
    }
    const current = this.expedition.region.currentLocationId;
    this.player = this.add.rectangle(WIDTH / 2, HEIGHT - 54, 14, 18, 0xf4deb0).setStrokeStyle(2, 0x251d2a);
    this.add.rectangle(this.player.x, this.player.y + 11, 22, 5, 0x251d2a, 0.45);
    const visible = this.expedition.region.locations.filter((location) => location.revealed || location.id === current);
    visible.forEach((location, index) => {
      const x = 90 + (index % 4) * 195;
      const y = 120 + Math.floor(index / 4) * 150;
      const color = location.type === "combat" ? 0xa84949 : location.type === "camp" ? 0xdd9c49 : location.type === "discovery" ? 0x5596a3 : 0x8d659f;
      const marker = this.add.container(x, y);
      marker.add([this.add.rectangle(0, 9, 42, 8, 0x182333, 0.6), this.add.rectangle(0, 0, 26, 28, color).setStrokeStyle(2, 0x201b27), this.add.text(-43, 22, location.name, { fontFamily: "monospace", fontSize: "9px", color: "#f4deb0", align: "center", wordWrap: { width: 86 } }).setOrigin(0.5, 0)]);
      if (location.id === current) marker.add(this.add.text(0, -27, "HERE", { fontFamily: "monospace", fontSize: "9px", color: "#ffffff" }).setOrigin(0.5));
      this.locations.push({ id: location.id, sprite: marker });
    });
  }

  private interactWithLocation() {
    const nearby = this.locations.find(({ sprite }) => Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y) < 48);
    if (!nearby || nearby.id === this.expedition.region.currentLocationId) return;
    const current = this.expedition.region.locations.find((location) => location.id === this.expedition.region.currentLocationId)!;
    if (current.connectedTo.includes(nearby.id)) this.submit({ type: "travel", destinationId: nearby.id });
  }

  private openBattle() {
    this.battleOpen = true;
    const enemy = this.expedition.combat!.enemy;
    const overlay = this.add.container(0, 0).setDepth(10);
    overlay.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x12111b, 0.96));
    overlay.add(this.add.rectangle(WIDTH / 2, 154, 76, 76, 0x9f4851).setStrokeStyle(4, 0xf4deb0));
    overlay.add(this.add.text(WIDTH / 2, 212, `${enemy.name}\nHP ${enemy.health}/${enemy.maxHealth}`, { fontFamily: "monospace", fontSize: "16px", color: "#f4deb0", align: "center" }).setOrigin(0.5));
    overlay.add(this.add.text(WIDTH / 2, 264, `${this.expedition.combat!.activeMemberRole.toUpperCase()}'S TURN`, { fontFamily: "monospace", fontSize: "13px", color: "#ffffff" }).setOrigin(0.5));
    (["STRIKE", "GUARD", "SIGNATURE", "RETREAT"] as const).forEach((label, index) => {
      const button = this.add.text(95 + index * 150, 350, `[ ${label} ]`, { fontFamily: "monospace", fontSize: "15px", color: "#f4deb0", backgroundColor: "#30283a", padding: { x: 8, y: 8 } }).setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => this.submit(label === "RETREAT" ? { type: "retreat" } : { type: "combat", action: label === "STRIKE" ? "basic" : label === "GUARD" ? "guard" : "signature" }));
      overlay.add(button);
    });
  }
}
