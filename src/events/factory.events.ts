export const FACTORY_EVENTS = {
  SEEDER_STARTED: "factory.seeder.started",
  SEEDER_COMPLETED: "factory.seeder.completed",
  SEED_ALL_STARTED: "factory.seed.all.started",
  SEED_ALL_COMPLETED: "factory.seed.all.completed",
} as const;

export interface SeederStartedEvent {
  seederClass: string;
}

export interface SeederCompletedEvent {
  seederClass: string;
}

export interface SeedAllStartedEvent {
  seederCount: number;
}

export interface SeedAllCompletedEvent {
  seederCount: number;
}
