import type { FactoryService } from "../factory.service";

export interface Seeder {
  order?: number;
  run(factory: FactoryService): Promise<void>;
}
