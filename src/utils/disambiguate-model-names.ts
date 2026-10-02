import { extractModelOwner } from "./format-model-name.js"

export interface NamedModel {
  readonly id: string
  name: string
}

function ownerLabel(modelID: string): string | undefined {
  const owner = extractModelOwner(modelID)
  if (!owner) return undefined
  return owner
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Adds an owner suffix only when smart display names collide within one provider.
 */
export function disambiguateModelNames<T extends NamedModel>(models: readonly T[]): void {
  const groups = new Map<string, T[]>()
  for (const model of models) {
    const group = groups.get(model.name) ?? []
    group.push(model)
    groups.set(model.name, group)
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue

    const labels = group.map((model) => ownerLabel(model.id))
    const uniqueLabels = labels.every((label, index) => label && labels.indexOf(label) === index)
    for (const [index, model] of group.entries()) {
      const suffix = uniqueLabels ? labels[index] : model.id
      model.name = `${model.name} (${suffix ?? model.id})`
    }
  }
}
