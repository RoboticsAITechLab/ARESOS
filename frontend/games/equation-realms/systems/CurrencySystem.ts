import { EventBus } from "./EventBus";

export class CurrencySystem {
  private coins = 0;

  constructor(initialCoins = 0) {
    this.coins = initialCoins;
  }

  public addCoins(amount: number): void {
    this.coins += amount;
    EventBus.emit("coins_changed", this.coins);
  }

  public removeCoins(amount: number): boolean {
    if (this.coins >= amount) {
      this.coins -= amount;
      EventBus.emit("coins_changed", this.coins);
      return true;
    }
    return false;
  }

  public getCoins(): number {
    return this.coins;
  }

  public setCoins(amount: number): void {
    this.coins = Math.max(0, amount);
    EventBus.emit("coins_changed", this.coins);
  }
}
