import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { FactoryService } from "../src/factory.service";
import { FactoryBuilder } from "../src/factory-builder";
import { FactoryNotRegisteredException } from "../src/exceptions/factory-not-registered.exception";
import { FactoryNotInitializedException } from "../src/exceptions/factory-not-initialized.exception";
import { FACTORY_OPTIONS } from "../src/factory.constants";
import { User, Post, Comment, UserFactory, PostFactory, CommentFactory, DatabaseSeeder } from "./helpers/test-entities";

describe("FactoryService", () => {
  let module: TestingModule;
  let service: FactoryService;

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
          },
        },
        FactoryService,
      ],
    }).compile();

    await module.init();
    service = module.get<FactoryService>(FactoryService);
  });

  afterEach(async () => {
    await module?.close();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should have static instance after init", () => {
    expect(FactoryService.getInstance()).toBe(service);
  });

  describe("use()", () => {
    it("should return a FactoryBuilder", () => {
      const builder = service.use(UserFactory);
      expect(builder).toBeInstanceOf(FactoryBuilder);
    });

    it("should throw for unregistered factory", () => {
      class UnregisteredFactory {
        get entity() {
          return User;
        }
        definition() {
          return {};
        }
      }
      expect(() => service.use(UnregisteredFactory as any)).toThrow(FactoryNotRegisteredException);
    });
  });

  describe("getFaker()", () => {
    it("should return a faker instance", () => {
      const faker = service.getFaker();
      expect(faker).toBeDefined();
      expect(typeof faker.person.fullName).toBe("function");
    });
  });

  describe("getOptions()", () => {
    it("should return module options", () => {
      const options = service.getOptions();
      expect(options.factories).toHaveLength(3);
    });
  });

  describe("seed option", () => {
    it("should produce reproducible data with same seed", async () => {
      const seededModule1 = await Test.createTestingModule({
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
            useValue: { factories: [UserFactory], seed: 12345 },
          },
          FactoryService,
        ],
      }).compile();
      await seededModule1.init();

      const svc1 = seededModule1.get<FactoryService>(FactoryService);
      const user1 = (await svc1.use(UserFactory).make()) as User;

      await seededModule1.close();

      const seededModule2 = await Test.createTestingModule({
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
            useValue: { factories: [UserFactory], seed: 12345 },
          },
          FactoryService,
        ],
      }).compile();
      await seededModule2.init();

      const svc2 = seededModule2.get<FactoryService>(FactoryService);
      const user2 = (await svc2.use(UserFactory).make()) as User;

      await seededModule2.close();

      expect(user1.name).toBe(user2.name);
      expect(user1.email).toBe(user2.email);
    });
  });

  describe("static instance lifecycle", () => {
    it("should clear instance on module destroy", async () => {
      expect(FactoryService.getInstance()).toBe(service);
      await module.close();
      expect(FactoryService.getInstance()).toBeNull();
      module = undefined as any;
    });
  });

  describe("FactoryNotInitializedException", () => {
    it("should have correct message and name", () => {
      const error = new FactoryNotInitializedException();
      expect(error.message).toContain("FactoryService has not been initialized");
      expect(error.name).toBe("FactoryNotInitializedException");
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("eventEmitter integration", () => {
    it("should emit events when eventEmitter is provided", async () => {
      const emitted: { event: string; payload: any }[] = [];
      const mockEventEmitter = {
        emit(event: string, payload: any) {
          emitted.push({ event, payload });
          return true;
        },
      };

      const eventModule = await Test.createTestingModule({
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
              seeders: [DatabaseSeeder],
            },
          },
          {
            provide: "EventEmitter2",
            useValue: mockEventEmitter,
          },
          FactoryService,
        ],
      }).compile();

      await eventModule.init();
      const eventService = eventModule.get<FactoryService>(FactoryService);

      await eventService.seed();

      expect(emitted.length).toBeGreaterThan(0);
      expect(emitted[0].event).toBe("factory.seed.all.started");
      expect(emitted[emitted.length - 1].event).toBe("factory.seed.all.completed");

      await eventModule.close();
    });
  });
});
