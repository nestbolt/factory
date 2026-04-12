import { DynamicModule, Module, type Provider } from "@nestjs/common";
import { FACTORY_OPTIONS } from "./factory.constants";
import { FactoryService } from "./factory.service";
import type { FactoryModuleOptions, FactoryAsyncOptions } from "./interfaces";

@Module({})
export class FactoryModule {
  static forRoot(options: FactoryModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      { provide: FACTORY_OPTIONS, useValue: options },
      FactoryService,
    ];

    return {
      module: FactoryModule,
      global: true,
      providers,
      exports: [FactoryService, FACTORY_OPTIONS],
    };
  }

  static forRootAsync(asyncOptions: FactoryAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: FACTORY_OPTIONS,
        useFactory: asyncOptions.useFactory!,
        inject: asyncOptions.inject ?? [],
      },
      FactoryService,
    ];

    return {
      module: FactoryModule,
      global: true,
      imports: [...(asyncOptions.imports ?? [])],
      providers,
      exports: [FactoryService, FACTORY_OPTIONS],
    };
  }
}
