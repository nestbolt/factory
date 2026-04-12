# Changelog

All notable changes to `@nestbolt/factory` will be documented in this file.

## v0.1.0 — Initial Release

### Features

- **BaseFactory** — Abstract class for defining entity factories with `definition()`, `afterCreate()`, and `afterMake()` hooks
- **FactoryBuilder** — Fluent API with `count()`, `state()`, `override()`, `sequence()`, `create()`, `make()`, `createMany()`, `makeMany()`
- **Sequence** — Auto-incrementing/cycling value helper with `increment()`, `cycle()`, and custom callbacks
- **Seeder system** — `Seeder` interface with `order` and `run()`, executed via `FactoryService.seed()` or `runSeeder()`
- **Faker integration** — `@faker-js/faker` integrated with optional reproducible seed
- **Events** — Emits seeder lifecycle events via optional `@nestjs/event-emitter`
- **Module configuration** — `forRoot()` and `forRootAsync()` with factory/seeder registration and faker seed option
