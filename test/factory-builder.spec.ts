import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { FactoryService } from "../src/factory.service";
import { FactoryBuilder } from "../src/factory-builder";
import { Sequence } from "../src/sequence";
import { FACTORY_OPTIONS } from "../src/factory.constants";
import { User, Post, UserFactory, PostFactory, CommentFactory, UserFactoryWithHooks } from "./helpers/test-entities";

describe("FactoryBuilder", () => {
  let module: TestingModule;
  let service: FactoryService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [User, Post],
          synchronize: true,
        }),
      ],
      providers: [
        {
          provide: FACTORY_OPTIONS,
          useValue: {
            factories: [UserFactory, PostFactory, CommentFactory, UserFactoryWithHooks],
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

  describe("make()", () => {
    it("should make a single entity without persisting", async () => {
      const user = (await service.use(UserFactory).make()) as User;
      expect(user).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.role).toBe("user");
      expect(user.id).toBeUndefined();
    });

    it("should return an array when count > 1", async () => {
      const users = (await service.use(UserFactory).count(3).make()) as User[];
      expect(users).toHaveLength(3);
      expect(users[0].name).toBeDefined();
    });
  });

  describe("makeMany()", () => {
    it("should always return an array", async () => {
      const users = await service.use(UserFactory).count(2).makeMany();
      expect(Array.isArray(users)).toBe(true);
      expect(users).toHaveLength(2);
    });

    it("should return array even for count 1", async () => {
      const users = await service.use(UserFactory).makeMany();
      expect(Array.isArray(users)).toBe(true);
      expect(users).toHaveLength(1);
    });
  });

  describe("create()", () => {
    it("should create and persist a single entity", async () => {
      const user = (await service.use(UserFactory).create()) as User;
      expect(user.id).toBeDefined();
      expect(user.name).toBeDefined();

      const dataSource = module.get<DataSource>(DataSource);
      const found = await dataSource.getRepository(User).findOneBy({ id: user.id });
      expect(found).toBeDefined();
      expect(found!.name).toBe(user.name);
    });

    it("should return an array when count > 1", async () => {
      const users = (await service.use(UserFactory).count(3).create()) as User[];
      expect(users).toHaveLength(3);
      expect(users[0].id).toBeDefined();
    });
  });

  describe("createMany()", () => {
    it("should always return an array", async () => {
      const users = await service.use(UserFactory).count(2).createMany();
      expect(Array.isArray(users)).toBe(true);
      expect(users).toHaveLength(2);
      expect(users[0].id).toBeDefined();
    });
  });

  describe("state()", () => {
    it("should apply named state method", async () => {
      const user = (await service.use(UserFactory).state("admin").make()) as User;
      expect(user.role).toBe("admin");
    });

    it("should ignore non-existent named state", async () => {
      const user = (await service.use(UserFactory).state("nonExistentState").make()) as User;
      expect(user).toBeDefined();
      expect(user.role).toBe("user");
    });

    it("should apply object state", async () => {
      const user = (await service.use(UserFactory).state({ role: "moderator" }).make()) as User;
      expect(user.role).toBe("moderator");
    });

    it("should apply function state", async () => {
      const user = (await service
        .use(UserFactory)
        .state((faker) => ({ name: "Custom Name" }))
        .make()) as User;
      expect(user.name).toBe("Custom Name");
    });

    it("should apply multiple states in order", async () => {
      const user = (await service
        .use(UserFactory)
        .state("admin")
        .state({ age: 30 })
        .make()) as User;
      expect(user.role).toBe("admin");
      expect(user.age).toBe(30);
    });
  });

  describe("override()", () => {
    it("should override specific fields", async () => {
      const user = (await service
        .use(UserFactory)
        .override({ email: "test@test.com" })
        .make()) as User;
      expect(user.email).toBe("test@test.com");
    });

    it("should take priority over states", async () => {
      const user = (await service
        .use(UserFactory)
        .state("admin")
        .override({ role: "superadmin" })
        .make()) as User;
      expect(user.role).toBe("superadmin");
    });
  });

  describe("sequence()", () => {
    it("should apply sequence to field", async () => {
      const users = (await service
        .use(UserFactory)
        .count(3)
        .sequence("email", Sequence.from((i) => `user${i}@test.com`))
        .make()) as User[];

      expect(users[0].email).toBe("user0@test.com");
      expect(users[1].email).toBe("user1@test.com");
      expect(users[2].email).toBe("user2@test.com");
    });

    it("should be overridden by override()", async () => {
      const user = (await service
        .use(UserFactory)
        .sequence("email", Sequence.from((i) => `user${i}@test.com`))
        .override({ email: "forced@test.com" })
        .make()) as User;

      expect(user.email).toBe("forced@test.com");
    });
  });

  describe("afterCreating()", () => {
    it("should call callback after persisting", async () => {
      let callbackEntity: User | null = null;

      const user = (await service
        .use(UserFactory)
        .afterCreating(async (entity) => {
          callbackEntity = entity;
        })
        .create()) as User;

      expect(callbackEntity).toBeDefined();
      expect(callbackEntity!.id).toBe(user.id);
    });
  });

  describe("afterMaking()", () => {
    it("should call callback after making", async () => {
      let callbackEntity: User | null = null;

      const user = (await service
        .use(UserFactory)
        .afterMaking(async (entity) => {
          callbackEntity = entity;
        })
        .make()) as User;

      expect(callbackEntity).toBeDefined();
      expect(callbackEntity!.name).toBe(user.name);
    });
  });

  describe("factory afterMake hook", () => {
    it("should call factory afterMake when defined", async () => {
      const user = (await service.use(UserFactoryWithHooks).make()) as User;
      expect(user.name).toMatch(/^\[made\] /);
    });
  });

  describe("factory afterCreate hook", () => {
    it("should call factory afterCreate when defined", async () => {
      const user = (await service.use(UserFactoryWithHooks).create()) as User;
      expect(user.name).toMatch(/^\[created\] /);
    });
  });

  describe("create() without DataSource", () => {
    it("should throw when DataSource is not available", async () => {
      const noDbModule = await Test.createTestingModule({
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

      await noDbModule.init();
      const noDbService = noDbModule.get<FactoryService>(FactoryService);

      await expect(noDbService.use(UserFactory).create()).rejects.toThrow(
        "DataSource is not available",
      );

      await noDbModule.close();
    });
  });
});
