export class FactoryNotRegisteredException extends Error {
  constructor(factoryName: string) {
    super(
      `Factory "${factoryName}" is not registered. Make sure it is included in the factories array of FactoryModule.forRoot().`,
    );
    this.name = "FactoryNotRegisteredException";
  }
}
