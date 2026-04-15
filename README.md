<p align="center">
    <h1 align="center">@nestbolt/factory</h1>
    <p align="center">Model factories and database seeders for NestJS with TypeORM.</p>
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@nestbolt/factory"><img src="https://img.shields.io/npm/v/@nestbolt/factory.svg?style=flat-square" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/@nestbolt/factory"><img src="https://img.shields.io/npm/dt/@nestbolt/factory.svg?style=flat-square" alt="npm downloads"></a>
    <a href="https://github.com/nestbolt/factory/actions"><img src="https://img.shields.io/github/actions/workflow/status/nestbolt/factory/tests.yml?branch=main&style=flat-square&label=tests" alt="tests"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square" alt="license"></a>
</p>

<hr>

This package provides **model factories and database seeders** for [NestJS](https://nestjs.com) that let you generate fake data for any TypeORM entity with a fluent, chainable API.

Once installed, using it is as simple as:

```typescript
class UserFactory extends BaseFactory<User> {
  get entity() { return User; }
  definition(faker: Faker) {
    return { name: faker.person.fullName(), email: faker.internet.email() };
  }
}

await factoryService.use(UserFactory).count(5).state("admin").create();
```

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Module Configuration](#module-configuration)
  - [Static Configuration (forRoot)](#static-configuration-forroot)
  - [Async Configuration (forRootAsync)](#async-configuration-forrootasync)
- [Defining Factories](#defining-factories)
- [Using the Factory Builder](#using-the-factory-builder)
- [States](#states)
- [Sequences](#sequences)
- [Seeders](#seeders)
- [Events](#events)
- [Using the Service Directly](#using-the-service-directly)
- [Configuration Options](#configuration-options)
- [Testing](#testing)
- [Changelog](#changelog)
- [Contributing](#contributing)
- [Security](#security)
- [Credits](#credits)
- [License](#license)

## Installation

Install the package via npm:

```bash
npm install @nestbolt/factory
```

Or via yarn:

```bash
yarn add @nestbolt/factory
```

Or via pnpm:

```bash
pnpm add @nestbolt/factory
```

### Peer Dependencies

This package requires the following peer dependencies, which you likely already have in a NestJS project:

```
@nestjs/common      ^10.0.0 || ^11.0.0
@nestjs/core        ^10.0.0 || ^11.0.0
@nestjs/typeorm     ^10.0.0 || ^11.0.0
typeorm             ^0.3.0
reflect-metadata    ^0.1.13 || ^0.2.0
```

### Included

```
@faker-js/faker     ^9.0.0   # Bundled — no need to install separately
```

### Optional

```bash
npm install @nestjs/event-emitter   # For seeder lifecycle events
```

## Quick Start

### 1. Define a factory

```typescript
import { BaseFactory } from "@nestbolt/factory";
import { Faker } from "@faker-js/faker";

export class UserFactory extends BaseFactory<User> {
  get entity() { return User; }

  definition(faker: Faker): Partial<User> {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: "user",
    };
  }

  admin(): Partial<User> {
    return { role: "admin" };
  }
}
```

### 2. Register the module

```typescript
import { FactoryModule } from "@nestbolt/factory";

@Module({
  imports: [
    TypeOrmModule.forRoot({ /* ... */ }),
    FactoryModule.forRoot({
      factories: [UserFactory, PostFactory],
    }),
  ],
})
export class AppModule {}
```

### 3. Use in your code

```typescript
import { FactoryService } from "@nestbolt/factory";

@Injectable()
export class SeedService {
  constructor(private readonly factory: FactoryService) {}

  async seed() {
    await this.factory.use(UserFactory).count(10).create();
    await this.factory.use(UserFactory).state("admin").create();
  }
}
```

## Module Configuration

The module is registered globally — you only need to import it once.

### Static Configuration (forRoot)

```typescript
FactoryModule.forRoot({
  factories: [UserFactory, PostFactory],
  seeders: [DatabaseSeeder],
  seed: 12345,  // optional: reproducible faker data
});
```

### Async Configuration (forRootAsync)

```typescript
FactoryModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    factories: [UserFactory, PostFactory],
    seed: config.get("FAKER_SEED"),
  }),
});
```

## Defining Factories

Extend `BaseFactory<T>` and implement the `entity` getter and `definition()` method:

```typescript
export class PostFactory extends BaseFactory<Post> {
  get entity() { return Post; }

  definition(faker: Faker): Partial<Post> {
    return {
      title: faker.lorem.sentence(),
      body: faker.lorem.paragraphs(2),
      status: "draft",
    };
  }

  // Optional lifecycle hooks
  async afterMake(entity: Post, faker: Faker) {
    // Called after make() — entity is NOT persisted yet
  }

  async afterCreate(entity: Post, faker: Faker) {
    // Called after create() — entity IS persisted
  }
}
```

## Using the Factory Builder

The `FactoryBuilder` provides a fluent API for generating entities:

```typescript
// Make without persisting
const user = await factoryService.use(UserFactory).make();

// Create and persist to database
const user = await factoryService.use(UserFactory).create();

// Multiple entities
const users = await factoryService.use(UserFactory).count(10).create();

// Always get an array (even for count=1)
const users = await factoryService.use(UserFactory).createMany();
const users = await factoryService.use(UserFactory).makeMany();
```

| Method | Returns | Description |
|--------|---------|-------------|
| `count(n)` | `this` | Set number of entities to generate |
| `state(name \| object \| fn)` | `this` | Apply a state (see States) |
| `override(attrs)` | `this` | Override specific fields (highest priority) |
| `sequence(field, seq)` | `this` | Apply a sequence to a field |
| `afterCreating(fn)` | `this` | Callback after persist |
| `afterMaking(fn)` | `this` | Callback after instantiation |
| `create()` | `T \| T[]` | Persist and return |
| `make()` | `T \| T[]` | Instantiate without persisting |
| `createMany()` | `T[]` | Persist and always return array |
| `makeMany()` | `T[]` | Instantiate and always return array |

**Override priority:** `definition()` → `state()` → `sequence()` → `override()` (highest)

## States

States let you define named variations of a factory:

```typescript
export class UserFactory extends BaseFactory<User> {
  // ... definition

  admin(): Partial<User> {
    return { role: "admin" };
  }

  inactive(): Partial<User> {
    return { active: false };
  }
}

// Usage
await factoryService.use(UserFactory).state("admin").create();
await factoryService.use(UserFactory).state("admin").state("inactive").create();

// Object and function states also work
await factoryService.use(UserFactory).state({ role: "moderator" }).create();
await factoryService.use(UserFactory).state((faker) => ({ age: faker.number.int({ min: 18, max: 30 }) })).create();
```

## Sequences

Use `Sequence` for auto-incrementing or cycling values:

```typescript
import { Sequence } from "@nestbolt/factory";

// Auto-increment
await factoryService.use(UserFactory)
  .count(3)
  .sequence("email", Sequence.from(i => `user${i}@test.com`))
  .create();
// → user0@test.com, user1@test.com, user2@test.com

// Increment numbers
Sequence.increment()       // 1, 2, 3, ...
Sequence.increment(100)    // 100, 101, 102, ...

// Cycle through values
Sequence.cycle(["draft", "published", "archived"])
// → draft, published, archived, draft, ...
```

## Seeders

Seeders are classes that populate your database with test data:

```typescript
import { Seeder, FactoryService } from "@nestbolt/factory";

export class DatabaseSeeder implements Seeder {
  order = 0;  // lower runs first

  async run(factory: FactoryService): Promise<void> {
    await factory.use(UserFactory).count(10).create();
    await factory.use(UserFactory).state("admin").count(2).create();
    await factory.use(PostFactory).count(20).create();
  }
}
```

Register and run seeders:

```typescript
// Register in module
FactoryModule.forRoot({
  factories: [UserFactory, PostFactory],
  seeders: [DatabaseSeeder],
});

// Run all seeders (sorted by order)
await factoryService.seed();

// Run a single seeder
await factoryService.runSeeder(DatabaseSeeder);
```

## Events

When `@nestjs/event-emitter` is installed, the package emits:

| Event | Payload | When |
|-------|---------|------|
| `factory.seeder.started` | `{ seederClass }` | Before a seeder runs |
| `factory.seeder.completed` | `{ seederClass }` | After a seeder completes |
| `factory.seed.all.started` | `{ seederCount }` | Before `seed()` runs all seeders |
| `factory.seed.all.completed` | `{ seederCount }` | After `seed()` completes all seeders |

```typescript
import { FACTORY_EVENTS, SeederCompletedEvent } from "@nestbolt/factory";
import { OnEvent } from "@nestjs/event-emitter";

@OnEvent(FACTORY_EVENTS.SEEDER_COMPLETED)
handleSeederCompleted(event: SeederCompletedEvent) {
  console.log(`Seeder ${event.seederClass} completed`);
}
```

## Using the Service Directly

Inject `FactoryService` for factory and seeder management:

```typescript
import { FactoryService } from "@nestbolt/factory";

@Injectable()
export class SeedService {
  constructor(private readonly factory: FactoryService) {}

  async seedDatabase() {
    const users = await this.factory.use(UserFactory).count(10).createMany();
    const faker = this.factory.getFaker();
    await this.factory.seed();
  }
}
```

| Method | Returns | Description |
|--------|---------|-------------|
| `use(FactoryClass)` | `FactoryBuilder<T>` | Get builder for a registered factory |
| `getFaker()` | `Faker` | Get the configured Faker instance |
| `seed()` | `Promise<void>` | Run all registered seeders (sorted by order) |
| `runSeeder(SeederClass)` | `Promise<void>` | Run a single seeder |
| `getOptions()` | `FactoryModuleOptions` | Get module configuration |

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `factories` | `FactoryClass[]` | `[]` | Factory classes to register |
| `seeders` | `SeederClass[]` | `[]` | Seeder classes to register |
| `seed` | `number` | `undefined` | Faker seed for reproducible data |

## Testing

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:cov
```

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## Security

If you discover any security-related issues, please report them via [GitHub Issues](https://github.com/nestbolt/factory/issues) with the **security** label instead of using the public issue tracker.

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
