import Phaser from "phaser";
import type { ExpeditionState } from "@/api/gameApi";
import { isMuted, toggleMuted } from "./AudioCue";
import { openBattlePresentation } from "./BattlePresentation";
import { openCampPresentation, openEndingPresentation } from "./ConclusionPresentation";
import { DodgePhase } from "./DodgePhase";
import { openEncounterDialogue } from "./DialoguePresentation";
import { prefersReducedMotion, toggleReducedMotion } from "./Settings";
import { ensureWorldTextures, seededTerrain } from "./WorldAssets";
import { VIEW_HEIGHT, VIEW_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import type { ExpeditionAction, ExpeditionGameProps } from "./types";

export class OverworldScene extends Phaser.Scene {
  private expedition: ExpeditionState;
  private previousExpedition?: ExpeditionState;
  private readonly submit: ExpeditionGameProps["onAction"];
  private player!: Phaser.Physics.Arcade.Sprite;
  private followers: Phaser.GameObjects.Sprite[] = [];
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interact!: Phaser.Input.Keyboard.Key;
  private soundToggle!: Phaser.Input.Keyboard.Key;
  private soundStatus!: Phaser.GameObjects.Text;
  private motionToggle!: Phaser.Input.Keyboard.Key;
  private motionStatus!: Phaser.GameObjects.Text;
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
    this.previousExpedition = this.expedition;
    this.expedition = expedition;
    if (!this.sys.isActive()) return;
    if (prefersReducedMotion()) {
      this.scene.restart();
      return;
    }
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart());
    this.cameras.main.fadeOut(170, 18, 16, 27);
  }

  create() {
    if (!prefersReducedMotion()) this.cameras.main.fadeIn(170, 18, 16, 27);
    ensureWorldTextures(this);
    this.drawMap();
    this.keys = this.input.keyboard!.createCursorKeys();
    this.interact = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.soundToggle = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.motionToggle = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.dodge = new DodgePhase(this, this.keys, this.submit);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);
    this.add.text(12, 10, "FOGBOUND MOOR", { fontFamily: "monospace", fontSize: "16px", color: "#f4deb0" }).setScrollFactor(0).setDepth(20);
    this.add.text(12, 32, "ARROWS: WALK   E: INTERACT   M: SOUND   R: MOTION", { fontFamily: "monospace", fontSize: "10px", color: "#b6a37c" }).setScrollFactor(0).setDepth(20);
    this.soundStatus = this.add.text(700, 10, isMuted() ? "MUTED" : "SOUND", { fontFamily: "monospace", fontSize: "10px", color: "#b6a37c" }).setOrigin(1, 0).setScrollFactor(0).setDepth(20);
    this.motionStatus = this.add.text(700, 24, prefersReducedMotion() ? "LOW MOTION" : "MOTION", { fontFamily: "monospace", fontSize: "10px", color: "#b6a37c" }).setOrigin(1, 0).setScrollFactor(0).setDepth(20);
    this.prompt = this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 34, "", { fontFamily: "monospace", fontSize: "13px", color: "#ffffff", backgroundColor: "#211b2c", padding: { x: 8, y: 5 } }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    if (this.expedition.combat?.status === "active") this.openBattle();
    else if (this.expedition.combat?.status === "victory" || this.expedition.combat?.status === "defeat") this.openCombatOutcome();
    else this.battleOpen = openEncounterDialogue(this, this.expedition, this.submit);
    this.showProgressFeedback();
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.soundToggle)) this.soundStatus.setText(toggleMuted() ? "MUTED" : "SOUND");
    if (Phaser.Input.Keyboard.JustDown(this.motionToggle)) this.motionStatus.setText(toggleReducedMotion() ? "LOW MOTION" : "MOTION");
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

  private showProgressFeedback() {
    if (!this.previousExpedition) return;
    const gold = this.expedition.resources.gold - this.previousExpedition.resources.gold;
    const experience = this.expedition.resources.experience - this.previousExpedition.resources.experience;
    const traits = Object.entries(this.expedition.traits)
      .filter(([key, trait]) => trait.tier !== this.previousExpedition!.traits[key as keyof ExpeditionState["traits"]].tier)
      .map(([key]) => key.toUpperCase());
    const bonds = this.expedition.party
      .map((member) => ({ name: member.name, delta: member.bond - (this.previousExpedition!.party.find((previous) => previous.role === member.role)?.bond ?? member.bond) }))
      .filter(({ delta }) => delta !== 0)
      .map(({ name, delta }) => `${name.toUpperCase()} BOND ${delta > 0 ? "+" : ""}${delta}`);
    const messages = [gold > 0 ? `+${gold} GOLD` : "", experience > 0 ? `+${experience} XP` : "", traits.length ? `${traits.join(" / ")} SHIFTED` : "", ...bonds].filter(Boolean);
    this.previousExpedition = undefined;
    if (!messages.length) return;
    const toast = this.add.text(VIEW_WIDTH / 2, 82, messages.join("  "), { fontFamily: "monospace", fontSize: "13px", color: "#f4deb0", backgroundColor: "#30283a", padding: { x: 10, y: 7 } }).setOrigin(0.5).setScrollFactor(0).setDepth(50);
    this.tweens.add({ targets: toast, y: 60, alpha: 0, delay: 900, duration: 700, onComplete: () => toast.destroy() });
  }

  private drawMap() {
    const terrainPalette = this.expedition.worldSeed % 3 === 0 ? [0x263f52, 0x31546b] : this.expedition.worldSeed % 3 === 1 ? [0x355548, 0x2d493f] : [0x4c4834, 0x635d42];
    for (let x = 0; x < WORLD_WIDTH; x += 32) for (let y = 0; y < WORLD_HEIGHT; y += 32) {
      const roll = seededTerrain(this.expedition.worldSeed, x, y);
      this.add.rectangle(x + 16, y + 16, 32, 32, terrainPalette[roll % terrainPalette.length]);
      if (roll % 19 === 0) this.add.image(x + 16, y + 16, "prop-tree").setScale(0.6).setDepth(1);
      if (roll % 41 === 0) this.add.image(x + 16, y + 16, "prop-stone").setScale(0.45).setDepth(1);
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
    const visible = this.expedition.region.locations.filter((location) => location.revealed || location.id === current);
    const positions = [[160, 160], [550, 180], [970, 220], [1320, 340], [1050, 660], [600, 640], [200, 580]];
    const currentIndex = visible.findIndex((location) => location.id === current);
    const [spawnX, spawnY] = positions[currentIndex] ?? [160, 160];
    this.player = this.physics.add.sprite(spawnX, spawnY + 42, "fighter-step-a").setDepth(5).play("fighter-walk");
    this.player.setCollideWorldBounds(true).setSize(12, 12).setOffset(2, 6);
    this.physics.add.collider(this.player, walls);
    this.followers = this.expedition.party.slice(1).map((member, index) => this.add.sprite(spawnX - 20 - index * 18, spawnY + 50, `${member.role}-step-a`).setDepth(4).play(`${member.role}-walk`));
    this.add.text(12, 54, this.expedition.party.map((member) => `${member.name} ${member.health}/${member.maxHealth}`).join("  "), { fontFamily: "monospace", fontSize: "10px", color: "#f4deb0" }).setScrollFactor(0).setDepth(20);
    const locationPositions = new Map(visible.map((location, index) => [location.id, positions[index] ?? [180 + index * 80, 180]]));
    const paths = this.add.graphics().setDepth(2);
    visible.forEach((location) => location.connectedTo.forEach((neighborId) => {
      const from = locationPositions.get(location.id);
      const to = locationPositions.get(neighborId);
      if (!from || !to || location.id > neighborId) return;
      paths.lineStyle(6, 0x1d2b35, 0.8).lineBetween(from[0], from[1], to[0], to[1]);
      paths.lineStyle(2, 0xb6a37c, 0.7).lineBetween(from[0], from[1], to[0], to[1]);
    }));
    visible.forEach((location, index) => {
      const [x, y] = positions[index] ?? [180 + index * 80, 180];
      const marker = this.add.container(x, y).setDepth(4);
      const landmarkRoll = seededTerrain(this.expedition.worldSeed, x, y);
      marker.add([this.add.rectangle(0, 18, 46, 9, 0x182333, 0.6), this.add.image(0, 0, `landmark-${location.type}`).setScale(1.2), this.add.circle(-22, 3, 6 + landmarkRoll % 5, 0x27392e), this.add.circle(22, 5, 5 + landmarkRoll % 4, 0x27392e), this.add.text(0, 28, location.name, { fontFamily: "monospace", fontSize: "10px", color: "#f4deb0", align: "center", wordWrap: { width: 110 } }).setOrigin(0.5, 0)]);
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
    const roleColor = actor === "fighter" ? 0xc95b4f : actor === "mage" ? 0x7561c7 : actor === "support" ? 0x58a98a : 0x7b3140;
    const announcement = this.add.text(VIEW_WIDTH / 2, 300, `${actor.toUpperCase()} — ${label}!`, { fontFamily: "monospace", fontSize: "18px", color: "#ffffff", backgroundColor: `#${roleColor.toString(16).padStart(6, "0")}`, padding: { x: 12, y: 8 } }).setOrigin(0.5).setDepth(40).setScrollFactor(0);
    const burst = Array.from({ length: 8 }, (_, index) => this.add.circle(VIEW_WIDTH / 2, 210, 4, roleColor).setDepth(39).setScrollFactor(0));
    if (prefersReducedMotion()) burst.forEach((spark) => spark.destroy());
    else {
      burst.forEach((spark, index) => this.tweens.add({ targets: spark, x: spark.x + Math.cos(index * Math.PI / 4) * 70, y: spark.y + Math.sin(index * Math.PI / 4) * 45, alpha: 0, duration: 360, onComplete: () => spark.destroy() }));
      this.tweens.add({ targets: announcement, scaleX: 1.12, scaleY: 1.12, duration: 160, yoyo: true });
    }
    this.time.delayedCall(430, () => {
      announcement.destroy();
      this.beginDodgePhase(action);
    });
  }

  private beginDodgePhase(action: ExpeditionAction) {
    this.actionSelecting = false;
    this.dodge.begin(action, `${this.expedition.worldSeed}:${this.expedition.combat?.enemy.name ?? "fog"}`);
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
      this.battleOpen = false;
      if (victory && this.expedition.ending) openEndingPresentation(this, this.expedition);
      if (!victory) openCampPresentation(this, this.expedition);
    };
    continueButton.on("pointerdown", close);
    this.input.keyboard!.once("keydown-ENTER", close);
    overlay.add(continueButton);
  }

}
