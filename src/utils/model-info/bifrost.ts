import type { ModelEnricher } from '../../core/model-enrichment'
import type { NormalizedModelLimit } from '../../core/model-types'

function hasUsableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function parseNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function getModalities(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined

  const supportedModalities = new Set(['text', 'audio', 'image', 'video', 'pdf'])
  const modalities = [...new Set(value
    .filter((modality): modality is string => typeof modality === 'string')
    .map((modality) => modality.trim().toLowerCase())
    .map((modality) => modality === 'speech' ? 'audio' : modality)
    .filter((modality) => supportedModalities.has(modality)))]
  return modalities.length > 0 ? modalities : undefined
}

export function createBifrostEnricher(_data: unknown): ModelEnricher {
  return {
    enrich(model) {
      const context = model.context_length
      const input = model.max_input_tokens
      const output = model.max_output_tokens
      const result: {
        metadataName?: string
        limit?: NormalizedModelLimit
        modalities?: { input?: string[]; output?: string[] }
        cost?: { input: number; output: number }
      } = {}

      if (hasUsableNumber(context) && hasUsableNumber(output)) {
        result.limit = {
          context,
          ...(hasUsableNumber(input) ? { input } : {}),
          output,
        }
      }

      const name = model.normalized_name
      if (typeof name === 'string' && name.length > 0) result.metadataName = name

      const architecture = model.architecture
      if (architecture && typeof architecture === 'object' && !Array.isArray(architecture)) {
        const inputModalities = getModalities((architecture as Record<string, unknown>).input_modalities)
        const outputModalities = getModalities((architecture as Record<string, unknown>).output_modalities)
        if (inputModalities || outputModalities) {
          result.modalities = {
            ...(inputModalities ? { input: inputModalities } : {}),
            ...(outputModalities ? { output: outputModalities } : {}),
          }
        }
      }

      const pricing = model.pricing
      if (pricing && typeof pricing === 'object' && !Array.isArray(pricing)) {
        const inputCost = parseNonNegativeNumber((pricing as Record<string, unknown>).prompt)
        const outputCost = parseNonNegativeNumber((pricing as Record<string, unknown>).completion)
        if (inputCost !== undefined && outputCost !== undefined) {
          result.cost = { input: inputCost * 1_000_000, output: outputCost * 1_000_000 }
        }
      }

      return result
    },
  }
}
