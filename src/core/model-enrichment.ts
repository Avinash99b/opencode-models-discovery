import type { ModelInfoEnricher } from '../utils/model-info/types'
import type { DiscoveredModelDraft } from './model-types'

export interface EnrichedModelDraft {
  readonly draft: DiscoveredModelDraft
  readonly metadataName?: string
  readonly skipped: boolean
}

/** Bridges the legacy provider enrichers into the host-independent draft shape. */
export function enrichModelDraft(
  draft: DiscoveredModelDraft,
  enricher?: ModelInfoEnricher,
): EnrichedModelDraft {
  if (!enricher) return { draft, skipped: false }
  if (enricher.shouldSkipModel(draft.id)) return { draft, skipped: true }

  const config: Record<string, any> = {
    id: draft.id,
    name: draft.name,
    ...(draft.organizationOwner ? { organizationOwner: draft.organizationOwner } : {}),
    ...(draft.capabilities ? { capabilities: { ...draft.capabilities } } : {}),
    ...(draft.limit ? { limit: { ...draft.limit } } : {}),
    ...(draft.modalities ? { modalities: { ...draft.modalities } } : {}),
    ...(draft.reasoning !== undefined ? { reasoning: draft.reasoning } : {}),
    ...(draft.attachment !== undefined ? { attachment: draft.attachment } : {}),
    ...(draft.toolCall !== undefined ? { tool_call: draft.toolCall } : {}),
    ...(draft.structuredOutput !== undefined ? { structured_output: draft.structuredOutput } : {}),
    ...(draft.temperature !== undefined ? { temperature: draft.temperature } : {}),
    ...(draft.cost !== undefined ? { cost: draft.cost } : {}),
    ...(draft.variants !== undefined ? { variants: draft.variants } : {}),
    ...(draft.compatibility ? { compatibility: { ...draft.compatibility } } : {}),
  }

  enricher.applyModelInfo(config, draft.id, draft.raw)

  return {
    skipped: false,
    metadataName: enricher.getModelName?.(draft.id, draft.raw),
    draft: {
      ...draft,
      ...(config.capabilities && typeof config.capabilities === 'object' ? { capabilities: config.capabilities } : {}),
      ...(config.limit && typeof config.limit === 'object' ? { limit: config.limit } : {}),
      ...(config.modalities && typeof config.modalities === 'object' ? { modalities: config.modalities } : {}),
      ...(typeof config.reasoning === 'boolean' ? { reasoning: config.reasoning } : {}),
      ...(typeof config.attachment === 'boolean' ? { attachment: config.attachment } : {}),
      ...(typeof config.tool_call === 'boolean' ? { toolCall: config.tool_call } : {}),
      ...(typeof config.structured_output === 'boolean' ? { structuredOutput: config.structured_output } : {}),
      ...(typeof config.temperature === 'boolean' ? { temperature: config.temperature } : {}),
      ...(config.cost !== undefined ? { cost: config.cost } : {}),
      ...(config.variants !== undefined ? { variants: config.variants } : {}),
      ...(config.compatibility && typeof config.compatibility === 'object' ? { compatibility: config.compatibility } : {}),
    },
  }
}
