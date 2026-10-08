import { type DiscoveredV2Model } from "./catalog.js"
import { type ProviderDiscoveryOptions } from "./provider-config.js"
import { createModelLimits, DEFAULT_CONTEXT_TOKEN_LIMIT, type DiscoveredModelDraft } from "../core/model-types.js"

export function mapToDiscoveredV2Model(
  draft: DiscoveredModelDraft,
  options: ProviderDiscoveryOptions,
): DiscoveredV2Model {
  const resultDraft = draft
  const rawModel = resultDraft.raw

  // Map to V2 Model.Info shape
  const name = options.smartModelName ? resultDraft.name : resultDraft.id

  // Capabilities mapping
  const capabilities: Record<string, unknown> = {
    tools: resultDraft.toolCall !== false && resultDraft.capabilities?.tools !== false,
  }

  // Input modalities
  const inputModalities = resultDraft.modalities?.input ?? resultDraft.capabilities?.input ?? ["text"]
  if (Array.isArray(inputModalities) && inputModalities.length > 0) {
    capabilities.input = inputModalities
  }

  // Output modalities
  const outputModalities = resultDraft.modalities?.output ?? resultDraft.capabilities?.output ?? ["text"]
  if (Array.isArray(outputModalities) && outputModalities.length > 0) {
    capabilities.output = outputModalities
  }

  // Limits mapping
  const rawLimit = resultDraft.limit
  const rawContext = typeof rawLimit?.context === "number" && rawLimit.context > 0 ? rawLimit.context : undefined
  const rawOutput = typeof rawLimit?.output === "number" && rawLimit.output > 0 ? rawLimit.output : undefined
  const rawInput = typeof rawLimit?.input === "number" && rawLimit.input > 0 ? rawLimit.input : undefined

  const resolvedLimits = createModelLimits(rawContext ?? DEFAULT_CONTEXT_TOKEN_LIMIT, rawOutput, rawInput)!
  const limit: Record<string, unknown> = {
    context: resolvedLimits.context,
    output: resolvedLimits.output,
    ...(resolvedLimits.input !== undefined ? { input: resolvedLimits.input } : {}),
  }

  const mapped: Record<string, any> = {
    id: resultDraft.id,
    modelID: resultDraft.id,
    name,
    capabilities,
    limit,
  }

  // Reasoning capability: from enricher or rawModel
  const isReasoning = typeof resultDraft.reasoning === "boolean"
    ? resultDraft.reasoning
    : (
        rawModel.supports_reasoning === true ||
        (rawModel.capabilities && typeof rawModel.capabilities === "object" && (rawModel.capabilities as Record<string, unknown>).reasoning === true) ||
        /(?:^|[-_/])(r1|reasoner|thinking|reasoning)(?:[-_/]|$)/i.test(resultDraft.id)
      )

  if (isReasoning) {
    mapped.reasoning = true
    mapped.compatibility = {
      ...mapped.compatibility,
      reasoningField: "reasoning_content",
    }
  }

  // Variants mapping: convert V1 Record<string, Variant> to V2 Array<{ id, settings }>
  if (Array.isArray(resultDraft.variants)) {
    mapped.variants = resultDraft.variants
  } else if (resultDraft.variants && typeof resultDraft.variants === "object") {
    mapped.variants = Object.entries(resultDraft.variants).map(([id, settings]) => ({
      id,
      settings: settings as Record<string, unknown>,
    }))
  } else if (isReasoning && !mapped.variants) {
    // If reasoning is supported but no variants provided, define default reasoning effort variants
    mapped.variants = [
      { id: "low", settings: { reasoningEffort: "low" } },
      { id: "medium", settings: { reasoningEffort: "medium" } },
      { id: "high", settings: { reasoningEffort: "high" } },
    ]
  }

  // Attachment capability
  if (typeof resultDraft.attachment === "boolean") {
    mapped.attachment = resultDraft.attachment
  }

  // Cost mapping (V1 cost.input/output -> V2 cost array of tiers)
  if (resultDraft.cost && typeof resultDraft.cost === "object") {
    if (Array.isArray(resultDraft.cost)) {
      mapped.cost = resultDraft.cost
    } else {
      mapped.cost = [
        {
          input: (resultDraft.cost as Record<string, any>).input ?? 0,
          output: (resultDraft.cost as Record<string, any>).output ?? 0,
          cache: {
            read: (resultDraft.cost as Record<string, any>).cache_read ?? (resultDraft.cost as Record<string, any>).cache?.read ?? 0,
            write: (resultDraft.cost as Record<string, any>).cache_write ?? (resultDraft.cost as Record<string, any>).cache?.write ?? 0,
          },
        },
      ]
    }
  }

  return mapped as DiscoveredV2Model
}
