import type { BaseFactory } from "../base-factory";
import type { Seeder } from "./seeder.interface";

export type FactoryClass<T = any> = new () => BaseFactory<T>;
export type SeederClass = new () => Seeder;

export interface FactoryModuleOptions {
  factories?: FactoryClass[];
  seeders?: SeederClass[];
  seed?: number;
}

export interface FactoryAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory?: (
    ...args: any[]
  ) => Promise<FactoryModuleOptions> | FactoryModuleOptions;
}
