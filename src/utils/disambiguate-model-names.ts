import { disambiguateModelNames as disambiguateSharedModelNames } from "../core/model-naming.js"

export interface NamedModel {
  readonly id: string
  name: string
}

/**
 * Adds an owner suffix only when smart display names collide within one provider.
 */
export function disambiguateModelNames<T extends NamedModel>(models: readonly T[]): void {
  disambiguateSharedModelNames(models)
}
