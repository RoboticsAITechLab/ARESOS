import { EventBus } from "./EventBus";

export class HealthSystem {
  private currentHp = 100;
  private maxHp = 100;
  private isDead = false;

  constructor(initialHp?: number, initialMaxHp?: number) {
    this.maxHp = initialMaxHp || 100;
    this.currentHp = initialHp !== undefined ? initialHp : this.maxHp;
    this.isDead = this.currentHp <= 0;
  }

  public takeDamage(amount: number): void {
    if (this.isDead) return;

    this.currentHp = Math.max(0, this.currentHp - amount);
    EventBus.emit("player_hp_changed", this.currentHp, this.maxHp);

    if (this.currentHp <= 0) {
      this.die();
    }
  }

  public heal(amount: number): void {
    if (this.isDead) return;

    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
    EventBus.emit("player_hp_changed", this.currentHp, this.maxHp);
  }

  public respawn(): void {
    this.currentHp = this.maxHp;
    this.isDead = false;
    EventBus.emit("player_hp_changed", this.currentHp, this.maxHp);
    EventBus.emit("player_respawned");
  }

  public getHp(): number {
    return this.currentHp;
  }

  public getMaxHp(): number {
    return this.maxHp;
  }

  public setHp(hp: number): void {
    this.currentHp = Math.max(0, Math.min(this.maxHp, hp));
    this.isDead = this.currentHp <= 0;
    EventBus.emit("player_hp_changed", this.currentHp, this.maxHp);
  }

  private die(): void {
    this.isDead = true;
    EventBus.emit("player_died");
  }
}
