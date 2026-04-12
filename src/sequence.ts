export class Sequence<T = any> {
  private index = 0;

  constructor(private readonly callback: (index: number) => T) {}

  static increment(start = 1): Sequence<number> {
    return new Sequence((i) => start + i);
  }

  static cycle<V>(values: V[]): Sequence<V> {
    return new Sequence((i) => values[i % values.length]);
  }

  static from<V>(callback: (index: number) => V): Sequence<V> {
    return new Sequence(callback);
  }

  next(): T {
    return this.callback(this.index++);
  }

  reset(): void {
    this.index = 0;
  }
}
