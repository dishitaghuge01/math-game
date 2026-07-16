import Phaser from "phaser";
import type { ExpeditionState } from "@/api/gameApi";
import { openBattlePresentation } from "./BattlePresentation";
import { openCampPresentation, openEndingPresentation } from "./ConclusionPresentation";
import { DodgePhase } from "./DodgePhase";
import { openEncounterDialogue } from "./DialoguePresentation";
import { ensureWorldTextures, seededTerrain } from "./WorldAssets";
import { VIEW_HEIGHT, VIEW_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import type { ExpeditionAction, ExpeditionGameProps } from "./types";

export class OverworldScene extends Phaser.Scene {
  private expedition: ExpeditionState;
  private readonly submit: ExpeditionGameProps["onAction"];
  private player!: Phaser.Physics.Arcade.Sprite;
  private followers: Phaser.GameObjects.Sprite[] = [];
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interact!: Phaser.Input.Keyboard.Key;
  private prompt!: Phaser.GameObjects.Text;
  private landmarks: Array<{ id: string; marker: Phaser.GameObjects.Container }> = [];
  private battleOpen = false;
  private dodge!: DodgePhase;
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
    ensureWorldTextures(this);
    this.drawMap();
    this.keys = this.input.keyboard!.createCursorKeys();
    this.interact = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.dodge = new DodgePhase(this, this.keys, this.submit);
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
    if (this.dodge.active) {
      this.dodge.update();
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
    this.actionSelecting = false;
    this.dodge.begin(action, this.expedition.worldSeed);
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
