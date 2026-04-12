import type { Faker } from "@faker-js/faker";
import type { DataSource } from "typeorm";
import type { BaseFactory } from "./base-factory";
import type { Sequence } from "./sequence";

export class FactoryBuilder<T> {
  private _count = 1;
  private _states: (string | Partial<T> | ((faker: Faker) => Partial<T>))[] = [];
  private _overrides: Partial<T> = {};
  private _sequences: Map<keyof T, Sequence> = new Map();
  private _afterCreating: ((entity: T, faker: Faker) => Promise<void>)[] = [];
  private _afterMaking: ((entity: T, faker: Faker) => Promise<void>)[] = [];

  constructor(
    private readonly factory: BaseFactory<T>,
    private readonly faker: Faker,
    private readonly dataSource: DataSource | null,
  ) {}

  count(n: number): this {
    this._count = n;
    return this;
  }

  state(stateOrOverrides: string | Partial<T> | ((faker: Faker) => Partial<T>)): this {
    this._states.push(stateOrOverrides);
    return this;
  }

  override(overrides: Partial<T>): this {
    this._overrides = { ...this._overrides, ...overrides };
    return this;
  }

  sequence<K extends keyof T>(field: K, seq: Sequence<T[K]>): this {
    this._sequences.set(field, seq);
    return this;
  }

  afterCreating(callback: (entity: T, faker: Faker) => Promise<void>): this {
    this._afterCreating.push(callback);
    return this;
  }

  afterMaking(callback: (entity: T, faker: Faker) => Promise<void>): this {
    this._afterMaking.push(callback);
    return this;
  }

  async make(): Promise<T | T[]> {
    const results = await this.buildMany(false);
    return this._count === 1 ? results[0] : results;
  }

  async makeMany(): Promise<T[]> {
    return this.buildMany(false);
  }

  async create(): Promise<T | T[]> {
    const results = await this.buildMany(true);
    return this._count === 1 ? results[0] : results;
  }

  async createMany(): Promise<T[]> {
    return this.buildMany(true);
  }

  private async buildMany(persist: boolean): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < this._count; i++) {
      const entity = await this.buildOne(persist);
      results.push(entity);
    }

    return results;
  }

  private async buildOne(persist: boolean): Promise<T> {
    let attrs: Record<string, any> = { ...this.factory.definition(this.faker) };

    for (const s of this._states) {
      if (typeof s === "string") {
        const method = (this.factory as any)[s];
        if (typeof method === "function") {
          attrs = { ...attrs, ...method.call(this.factory) };
        }
      } else if (typeof s === "function") {
        attrs = { ...attrs, ...s(this.faker) };
      } else {
        attrs = { ...attrs, ...s };
      }
    }

    for (const [field, seq] of this._sequences) {
      attrs[field as string] = seq.next();
    }

    attrs = { ...attrs, ...this._overrides };

    const EntityClass = this.factory.entity;
    const entity = Object.assign(new EntityClass() as any, attrs) as T;

    if (this.factory.afterMake) {
      await this.factory.afterMake(entity, this.faker);
    }
    for (const cb of this._afterMaking) {
      await cb(entity, this.faker);
    }

    if (persist) {
      if (!this.dataSource) {
        throw new Error("DataSource is not available. Cannot persist entities without a database connection.");
      }
      const repo = this.dataSource.getRepository(EntityClass);
      const saved = await repo.save(entity as any);
      Object.assign(entity as any, saved);

      if (this.factory.afterCreate) {
        await this.factory.afterCreate(entity, this.faker);
      }
      for (const cb of this._afterCreating) {
        await cb(entity, this.faker);
      }
    }

    return entity;
  }
}
