import { type DiscoveredV2Model } from "./catalog.js"
import { type ProviderDiscoveryOptions } from "./provider-config.js"
import { type ModelInfoEnricher } from "../utils/model-info/types.js"
import { resolveModelDisplayName } from "../core/model-naming.js"
import { enrichModelDraft } from "../core/model-enrichment.js"
import type { DiscoveredModelDraft } from "../core/model-types.js"

export interface RawOpenAIModel {
  readonly id: string
  readonly [key: string]: unknown
}

export function mapToDiscoveredV2Model(
  model: RawOpenAIModel,
  options: ProviderDiscoveryOptions,
  enricher?: ModelInfoEnricher,
): DiscoveredV2Model {
  const draft: DiscoveredModelDraft = {
    id: model.id,
    name: model.id,
    raw: model,
    capabilities: {
      tools: true,
      input: ["text"],
      output: ["text"],
    },
    limit: {
      context: 200_000,
      output: 32_000,
    },
  }

  const enriched = enrichModelDraft(draft, enricher)
  const resultDraft = enriched.draft

  // Map to V2 Model.Info shape
  const name = resolveModelDisplayName(model, options.smartModelName, enriched.metadataName)

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
  const limit: Record<string, unknown> = {}
  const rawLimit = resultDraft.limit ?? {}
  if (typeof rawLimit.context === "number" && rawLimit.context > 0) {
    limit.context = rawLimit.context
  } else {
    limit.context = 200_000
  }
  if (typeof rawLimit.output === "number" && rawLimit.output > 0) {
    limit.output = rawLimit.output
  } else {
    limit.output = 32_000
  }
  if (typeof rawLimit.input === "number" && rawLimit.input > 0) {
    limit.input = rawLimit.input
  }

  const result: Record<string, any> = {
    id: model.id,
    modelID: model.id,
    name,
    capabilities,
    limit,
  }

  // Reasoning capability: from enricher or rawModel
  const isReasoning = typeof resultDraft.reasoning === "boolean"
    ? resultDraft.reasoning
    : (
        model.supports_reasoning === true ||
        (model.capabilities && typeof model.capabilities === "object" && (model.capabilities as Record<string, unknown>).reasoning === true) ||
        /(?:^|[-_/])(r1|reasoner|thinking|reasoning)(?:[-_/]|$)/i.test(model.id)
      )

  if (isReasoning) {
    result.reasoning = true
    result.compatibility = {
      ...result.compatibility,
      reasoningField: "reasoning_content",
    }
  }

  // Variants mapping: convert V1 Record<string, Variant> to V2 Array<{ id, settings }>
  if (Array.isArray(resultDraft.variants)) {
    result.variants = resultDraft.variants
  } else if (resultDraft.variants && typeof resultDraft.variants === "object") {
    result.variants = Object.entries(resultDraft.variants).map(([id, settings]) => ({
      id,
      settings: settings as Record<string, unknown>,
    }))
  } else if (isReasoning && !result.variants) {
    // If reasoning is supported but no variants provided, define default reasoning effort variants
    result.variants = [
      { id: "low", settings: { reasoningEffort: "low" } },
      { id: "medium", settings: { reasoningEffort: "medium" } },
      { id: "high", settings: { reasoningEffort: "high" } },
    ]
  }

  // Attachment capability
  if (typeof resultDraft.attachment === "boolean") {
    result.attachment = resultDraft.attachment
  }

  // Cost mapping (V1 cost.input/output -> V2 cost array of tiers)
  if (resultDraft.cost && typeof resultDraft.cost === "object") {
    if (Array.isArray(resultDraft.cost)) {
      result.cost = resultDraft.cost
    } else {
      result.cost = [
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

  return result as DiscoveredV2Model
}
