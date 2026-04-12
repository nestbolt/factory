import type { Faker } from "@faker-js/faker";

export abstract class BaseFactory<T> {
  abstract get entity(): new () => T;
  abstract definition(faker: Faker): Partial<T>;

  afterCreate?(entity: T, faker: Faker): Promise<void>;
  afterMake?(entity: T, faker: Faker): Promise<void>;
}
