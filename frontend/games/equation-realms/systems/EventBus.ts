export class EventBus {
  private static listeners: Map<string, { callback: Function; context?: any }[]> = new Map();

  public static on(event: string, callback: Function, context?: any): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push({ callback, context });
  }

  public static off(event: string, callback: Function): void {
    if (!this.listeners.has(event)) return;
    const list = this.listeners.get(event)!;
    const index = list.findIndex((item) => item.callback === callback);
    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  public static emit(event: string, ...args: any[]): void {
    if (!this.listeners.has(event)) return;
    // Copy the list to prevent concurrent modification issues if a listener unbinds on trigger
    const list = [...this.listeners.get(event)!];
    for (const item of list) {
      item.callback.apply(item.context, args);
    }
  }

  public static clear(): void {
    this.listeners.clear();
  }
}
