export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private releaseFn?: (item: T) => void;

  constructor(createFn: () => T, releaseFn?: (item: T) => void) {
    this.createFn = createFn;
    this.releaseFn = releaseFn;
  }

  // Obtains an instance from the pool or creates a new one
  public get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  // Returns an instance back to the pool
  public release(item: T): void {
    if (this.releaseFn) {
      this.releaseFn(item);
    }
    this.pool.push(item);
  }

  // Clears the pool cache
  public clear(): void {
    this.pool = [];
  }

  // Returns current size of pooled items
  public size(): number {
    return this.pool.length;
  }
}
