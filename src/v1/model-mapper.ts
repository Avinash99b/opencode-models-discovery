import type { DiscoveredModelDraft, NormalizedModelLimit } from '../core/model-types'

export interface DiscoveredV1Model {
  readonly id: string
  readonly name: string
  readonly organizationOwner?: string
  readonly capabilities?: Record<string, unknown>
  readonly modalities?: {
    readonly input?: readonly string[]
    readonly output?: readonly string[]
  }
  readonly limit?: NormalizedModelLimit
  readonly reasoning?: boolean
  readonly attachment?: boolean
  readonly tool_call?: boolean
  readonly structured_output?: boolean
  readonly temperature?: boolean
  readonly cost?: unknown
  readonly variants?: unknown
  readonly compatibility?: Record<string, unknown>
}

/**
 * Projects a shared discovery draft into the V1 provider model shape.
 * Host-specific field names are kept at this boundary; discovery semantics
 * remain owned by the shared draft and enrichment pipeline.
 */
export function mapToV1Model(draft: DiscoveredModelDraft): DiscoveredV1Model {
  return {
    id: draft.id,
    name: draft.name,
    ...(draft.organizationOwner ? { organizationOwner: draft.organizationOwner } : {}),
    ...(draft.modalities ? { modalities: draft.modalities } : {}),
    ...(draft.capabilities ? { capabilities: draft.capabilities } : {}),
    ...(draft.limit ? { limit: draft.limit } : {}),
    ...(draft.reasoning !== undefined ? { reasoning: draft.reasoning } : {}),
    ...(draft.attachment !== undefined ? { attachment: draft.attachment } : {}),
    ...(draft.toolCall !== undefined ? { tool_call: draft.toolCall } : {}),
    ...(draft.structuredOutput !== undefined ? { structured_output: draft.structuredOutput } : {}),
    ...(draft.temperature !== undefined ? { temperature: draft.temperature } : {}),
    ...(draft.cost !== undefined ? { cost: draft.cost } : {}),
    ...(draft.variants !== undefined ? { variants: draft.variants } : {}),
    ...(draft.compatibility ? { compatibility: draft.compatibility } : {}),
  }
}
