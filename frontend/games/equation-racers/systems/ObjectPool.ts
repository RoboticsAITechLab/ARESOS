export class ObjectPool<T> {
  private factory: () => T;
  private reset: (item: T) => void;
  private pool: T[] = [];

  constructor(factory: () => T, reset: (item: T) => void) {
    this.factory = factory;
    this.reset = reset;
  }

  public get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  public release(item: T): void {
    this.reset(item);
    this.pool.push(item);
  }

  public clear(): void {
    this.pool = [];
  }
}
