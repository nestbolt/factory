export class FactoryNotInitializedException extends Error {
  constructor() {
    super(
      "FactoryService has not been initialized. Make sure FactoryModule is imported in your application.",
    );
    this.name = "FactoryNotInitializedException";
  }
}
