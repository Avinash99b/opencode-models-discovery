import type { DiscoveredModelDraft } from './model-types'
import type { DiscoveredRawModel } from './model-types'

export interface ModelEnrichmentContext {
  readonly filterNonChat: boolean
}

export interface ModelEnrichmentResult {
  readonly skip?: boolean
  readonly metadataName?: string
  readonly capabilities?: Record<string, unknown>
  readonly limit?: Record<string, unknown>
  readonly modalities?: {
    readonly input?: readonly string[]
    readonly output?: readonly string[]
  }
  readonly reasoning?: boolean
  readonly attachment?: boolean
  readonly toolCall?: boolean
  readonly structuredOutput?: boolean
  readonly temperature?: boolean
  readonly cost?: unknown
  readonly variants?: unknown
  readonly compatibility?: Record<string, unknown>
}

export interface ModelEnricher {
  enrich(model: DiscoveredRawModel, context: ModelEnrichmentContext): ModelEnrichmentResult
}

export interface LegacyModelInfoEnricher {
  shouldSkipModel(modelId: string): boolean
  getModelName?(modelId: string, rawModel?: Record<string, unknown>): string | undefined
  applyModelInfo(modelConfig: any, modelId: string, rawModel?: Record<string, unknown>): void
}

export interface EnrichedModelDraft {
  readonly draft: DiscoveredModelDraft
  readonly metadataName?: string
  readonly skipped: boolean
}

export function adaptLegacyModelInfoEnricher(legacy: LegacyModelInfoEnricher): ModelEnricher {
  return {
    enrich(model) {
      if (legacy.shouldSkipModel(model.id)) return { skip: true }

      const config: Record<string, any> = { id: model.id, name: model.id }
      legacy.applyModelInfo(config, model.id, model)
      return {
        metadataName: legacy.getModelName?.(model.id, model),
        capabilities: config.capabilities,
        limit: config.limit,
        modalities: config.modalities,
        reasoning: config.reasoning,
        attachment: config.attachment,
        toolCall: config.tool_call,
        structuredOutput: config.structured_output,
        temperature: config.temperature,
        cost: config.cost,
        variants: config.variants,
        compatibility: config.compatibility,
      }
    },
  }
}

/** Bridges the legacy provider enrichers into the host-independent draft shape. */
export function enrichModelDraft(
  draft: DiscoveredModelDraft,
  enricher?: ModelEnricher,
  context: ModelEnrichmentContext = { filterNonChat: true },
): EnrichedModelDraft {
  if (!enricher) return { draft, skipped: false }
  const result = enricher.enrich(draft.raw, context)
  if (result.skip) return { draft, skipped: true }

  return {
    skipped: false,
    metadataName: result.metadataName,
    draft: {
      ...draft,
      ...(result.capabilities ? { capabilities: result.capabilities } : {}),
      ...(result.limit ? { limit: result.limit } : {}),
      ...(result.reasoning !== undefined ? { reasoning: result.reasoning } : {}),
      ...(result.attachment !== undefined ? { attachment: result.attachment } : {}),
      ...(result.toolCall !== undefined ? { toolCall: result.toolCall } : {}),
      ...(result.structuredOutput !== undefined ? { structuredOutput: result.structuredOutput } : {}),
      ...(result.temperature !== undefined ? { temperature: result.temperature } : {}),
      ...(result.cost !== undefined ? { cost: result.cost } : {}),
      ...(result.variants !== undefined ? { variants: result.variants } : {}),
      ...(result.compatibility ? { compatibility: result.compatibility } : {}),
      ...(result.modalities ? { modalities: {
        ...(result.modalities.input ? { input: [...result.modalities.input] } : {}),
        ...(result.modalities.output ? { output: [...result.modalities.output] } : {}),
      } } : {}),
    },
  }
}
