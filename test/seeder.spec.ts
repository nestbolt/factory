import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { FactoryService } from "../src/factory.service";
import { FACTORY_OPTIONS } from "../src/factory.constants";
import {
  User,
  Post,
  Comment,
  UserFactory,
  PostFactory,
  CommentFactory,
  DatabaseSeeder,
  SecondarySeeder,
} from "./helpers/test-entities";
import type { Seeder } from "../src/interfaces/seeder.interface";

describe("Seeder", () => {
  let module: TestingModule;
  let service: FactoryService;
  let dataSource: DataSource;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [User, Post, Comment],
          synchronize: true,
        }),
      ],
      providers: [
        {
          provide: FACTORY_OPTIONS,
          useValue: {
            factories: [UserFactory, PostFactory, CommentFactory],
            seeders: [SecondarySeeder, DatabaseSeeder],
          },
        },
        FactoryService,
      ],
    }).compile();

    await module.init();
    service = module.get<FactoryService>(FactoryService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    await module?.close();
  });

  describe("seed()", () => {
    it("should run all seeders", async () => {
      await service.seed();

      const userCount = await dataSource.getRepository(User).count();
      const postCount = await dataSource.getRepository(Post).count();
      const commentCount = await dataSource.getRepository(Comment).count();

      expect(userCount).toBe(3);
      expect(postCount).toBe(2);
      expect(commentCount).toBe(2);
    });

    it("should run seeders sorted by order", async () => {
      const executionOrder: string[] = [];

      class OrderedSeederA implements Seeder {
        order = 20;
        async run() {
          executionOrder.push("A");
        }
      }

      class OrderedSeederB implements Seeder {
        order = 5;
        async run() {
          executionOrder.push("B");
        }
      }

      class OrderedSeederC implements Seeder {
        order = 10;
        async run() {
          executionOrder.push("C");
        }
      }

      const orderedModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [User],
            synchronize: true,
          }),
        ],
        providers: [
          {
            provide: FACTORY_OPTIONS,
            useValue: {
              factories: [UserFactory],
              seeders: [OrderedSeederA, OrderedSeederC, OrderedSeederB],
            },
          },
          FactoryService,
        ],
      }).compile();

      await orderedModule.init();
      const orderedService = orderedModule.get<FactoryService>(FactoryService);

      await orderedService.seed();
      expect(executionOrder).toEqual(["B", "C", "A"]);

      await orderedModule.close();
    });
  });

  describe("runSeeder()", () => {
    it("should run a single seeder", async () => {
      await service.runSeeder(DatabaseSeeder);

      const userCount = await dataSource.getRepository(User).count();
      const postCount = await dataSource.getRepository(Post).count();

      expect(userCount).toBe(3);
      expect(postCount).toBe(2);
    });

    it("should not run other seeders", async () => {
      await service.runSeeder(DatabaseSeeder);

      const commentCount = await dataSource.getRepository(Comment).count();
      expect(commentCount).toBe(0);
    });
  });

  describe("seed() with no seeders", () => {
    it("should complete without error when no seeders configured", async () => {
      const noSeederModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [User],
            synchronize: true,
          }),
        ],
        providers: [
          {
            provide: FACTORY_OPTIONS,
            useValue: {
              factories: [UserFactory],
            },
          },
          FactoryService,
        ],
      }).compile();

      await noSeederModule.init();
      const noSeederService =
        noSeederModule.get<FactoryService>(FactoryService);

      await expect(noSeederService.seed()).resolves.toBeUndefined();

      await noSeederModule.close();
    });
  });

  describe("seeders without order property", () => {
    it("should default order to 0", async () => {
      const executionOrder: string[] = [];

      class NoOrderSeederA implements Seeder {
        async run() {
          executionOrder.push("A");
        }
      }

      class NoOrderSeederB implements Seeder {
        async run() {
          executionOrder.push("B");
        }
      }

      const orderedModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [User],
            synchronize: true,
          }),
        ],
        providers: [
          {
            provide: FACTORY_OPTIONS,
            useValue: {
              factories: [UserFactory],
              seeders: [NoOrderSeederA, NoOrderSeederB],
            },
          },
          FactoryService,
        ],
      }).compile();

      await orderedModule.init();
      const orderedService = orderedModule.get<FactoryService>(FactoryService);

      await orderedService.seed();
      expect(executionOrder).toEqual(["A", "B"]);

      await orderedModule.close();
    });
  });

  describe("seeder creates expected data", () => {
    it("should create users with expected fields", async () => {
      await service.runSeeder(DatabaseSeeder);

      const users = await dataSource.getRepository(User).find();
      expect(users).toHaveLength(3);

      for (const user of users) {
        expect(user.id).toBeDefined();
        expect(user.name).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.role).toBe("user");
      }
    });
  });
});
