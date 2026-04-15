import { faker as defaultFaker, Faker } from "@faker-js/faker";
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import type { BaseFactory } from "./base-factory";
import { FACTORY_EVENTS } from "./events/factory.events";
import { FactoryNotRegisteredException } from "./exceptions/factory-not-registered.exception";
import { FactoryBuilder } from "./factory-builder";
import { FACTORY_OPTIONS } from "./factory.constants";
import type {
  FactoryClass,
  FactoryModuleOptions,
  SeederClass,
} from "./interfaces";

interface EventEmitterLike {
  emit(event: string, ...args: any[]): boolean;
}

@Injectable()
export class FactoryService implements OnModuleInit, OnModuleDestroy {
  private static instance: FactoryService | null = null;
  private readonly logger = new Logger(FactoryService.name);
  private readonly factoryInstances = new Map<string, BaseFactory<any>>();
  private _faker: Faker;

  constructor(
    @Inject(FACTORY_OPTIONS) private readonly options: FactoryModuleOptions,
    @Optional() private readonly dataSource?: DataSource,
    @Optional()
    @Inject("EventEmitter2")
    private readonly eventEmitter?: EventEmitterLike,
  ) {
    this._faker = defaultFaker;

    if (options.seed != null) {
      defaultFaker.seed(options.seed);
    }

    if (options.factories) {
      for (const FactoryClass of options.factories) {
        const instance = new FactoryClass();
        this.factoryInstances.set(FactoryClass.name, instance);
      }
    }
  }

  onModuleInit(): void {
    FactoryService.instance = this;
    this.logger.log("FactoryService initialized");
  }

  onModuleDestroy(): void {
    if (FactoryService.instance === this) {
      FactoryService.instance = null;
    }
  }

  static getInstance(): FactoryService | null {
    return FactoryService.instance;
  }

  getOptions(): FactoryModuleOptions {
    return this.options;
  }

  getFaker(): Faker {
    return this._faker;
  }

  use<T>(factoryClass: FactoryClass<T>): FactoryBuilder<T> {
    const instance = this.factoryInstances.get(factoryClass.name);
    if (!instance) {
      throw new FactoryNotRegisteredException(factoryClass.name);
    }
    return new FactoryBuilder<T>(
      instance as BaseFactory<T>,
      this._faker,
      this.dataSource ?? null,
    );
  }

  async seed(): Promise<void> {
    const seeders = this.options.seeders ?? [];

    this.emit(FACTORY_EVENTS.SEED_ALL_STARTED, { seederCount: seeders.length });

    const sorted = [...seeders].sort((a, b) => {
      const orderA = new a().order ?? 0;
      const orderB = new b().order ?? 0;
      return orderA - orderB;
    });

    for (const SeederClass of sorted) {
      await this.runSeeder(SeederClass);
    }

    this.emit(FACTORY_EVENTS.SEED_ALL_COMPLETED, {
      seederCount: seeders.length,
    });
  }

  async runSeeder(seederClass: SeederClass): Promise<void> {
    const seeder = new seederClass();
    const name = seederClass.name;

    this.logger.log(`Running seeder: ${name}`);
    this.emit(FACTORY_EVENTS.SEEDER_STARTED, { seederClass: name });

    await seeder.run(this);

    this.logger.log(`Completed seeder: ${name}`);
    this.emit(FACTORY_EVENTS.SEEDER_COMPLETED, { seederClass: name });
  }

  private emit(event: string, payload: any): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit(event, payload);
    }
  }
}
