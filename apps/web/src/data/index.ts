export { DataError, toDataError, type DataErrorCode } from "./errors";
export { getDataStore } from "./store";
export { getRepositories, createRepositories, type Repositories } from "./repositories";
export { createUserRepository } from "./repositories/user-repository";
export { ensureUserSetup } from "./user-setup";
export type { Entity } from "./repositories/entity-repository";
export type { Preferences, PreferencesPatch, UserProfile } from "./models/user";
