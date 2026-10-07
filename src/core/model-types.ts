export interface DiscoveredRawModel {
  readonly id: string
  readonly owned_by?: string
  readonly object?: string
  readonly created?: number
  readonly [key: string]: unknown
}

export interface DiscoveredModelDraft {
  readonly id: string
  name: string
  organizationOwner?: string
  readonly raw: DiscoveredRawModel
  capabilities?: Record<string, unknown>
  limit?: Record<string, unknown>
  modalities?: {
    input?: string[]
    output?: string[]
  }
  reasoning?: boolean
  attachment?: boolean
  toolCall?: boolean
  structuredOutput?: boolean
  temperature?: boolean
  cost?: unknown
  variants?: unknown
  compatibility?: Record<string, unknown>
}

export function normalizeDiscoveredRawModel(value: unknown): DiscoveredRawModel | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const candidate = value as Record<string, unknown>
  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) return undefined

  return candidate as DiscoveredRawModel
}
