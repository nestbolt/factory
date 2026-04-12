import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FactoryModule } from "../src/factory.module";
import { FactoryService } from "../src/factory.service";
import { FACTORY_OPTIONS } from "../src/factory.constants";
import { User, UserFactory } from "./helpers/test-entities";

describe("FactoryModule", () => {
  describe("forRoot()", () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [User],
            synchronize: true,
          }),
          FactoryModule.forRoot({
            factories: [UserFactory],
          }),
        ],
      }).compile();

      await module.init();
    });

    afterEach(async () => {
      await module?.close();
    });

    it("should provide FactoryService", () => {
      const service = module.get<FactoryService>(FactoryService);
      expect(service).toBeDefined();
    });

    it("should export FACTORY_OPTIONS", () => {
      const options = module.get(FACTORY_OPTIONS);
      expect(options).toBeDefined();
      expect(options.factories).toHaveLength(1);
    });
  });

  describe("forRoot() with defaults", () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [User],
            synchronize: true,
          }),
          FactoryModule.forRoot(),
        ],
      }).compile();

      await module.init();
    });

    afterEach(async () => {
      await module?.close();
    });

    it("should provide FactoryService with empty options", () => {
      const service = module.get<FactoryService>(FactoryService);
      expect(service).toBeDefined();
      expect(service.getOptions()).toEqual({});
    });
  });

  describe("forRootAsync()", () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "better-sqlite3",
            database: ":memory:",
            entities: [User],
            synchronize: true,
          }),
          FactoryModule.forRootAsync({
            useFactory: () => ({
              factories: [UserFactory],
            }),
          }),
        ],
      }).compile();

      await module.init();
    });

    afterEach(async () => {
      await module?.close();
    });

    it("should provide FactoryService", () => {
      const service = module.get<FactoryService>(FactoryService);
      expect(service).toBeDefined();
    });
  });
});
