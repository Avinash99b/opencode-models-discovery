import type { ModelEnricher } from '../../core/model-enrichment'

function hasUsableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function getModalities(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined

  const supportedModalities = new Set(['text', 'audio', 'image', 'video', 'pdf'])
  const modalities = [...new Set(value
    .filter((modality): modality is string => typeof modality === 'string')
    .map(modality => modality.trim().toLowerCase())
    .map(modality => modality === 'speech' ? 'audio' : modality)
    .filter(modality => supportedModalities.has(modality)))]
  return modalities.length > 0 ? modalities : undefined
}

function getCapabilities(rawModel: Record<string, unknown>): Record<string, unknown> | undefined {
  const capabilities = rawModel.capabilities
  return capabilities && typeof capabilities === 'object' && !Array.isArray(capabilities)
    ? capabilities as Record<string, unknown>
    : undefined
}

function getReasoningVariants(capabilities: Record<string, unknown> | undefined): Record<string, { reasoningEffort: string }> | undefined {
  if (capabilities?.reasoning !== true || !Array.isArray(capabilities.effort_tiers)) return undefined

  const supportedTiers: Record<string, true> = {
    none: true,
    minimal: true,
    low: true,
    medium: true,
    high: true,
    xhigh: true,
    max: true,
    ultra: true,
  }
  const variants = Object.fromEntries(
    capabilities.effort_tiers
      .filter((tier): tier is string => typeof tier === 'string')
      .map(tier => tier.trim().toLowerCase())
      .filter(tier => supportedTiers[tier] === true)
      .map(tier => [tier, { reasoningEffort: tier }])
  )
  return Object.keys(variants).length > 0 ? variants : undefined
}

export function createOmniRouteEnricher(_data: unknown): ModelEnricher {
  return {
    enrich(model) {
      const context = model.context_length
      const inputLimit = model.max_input_tokens
      const output = model.max_output_tokens
      const result: Record<string, unknown> = {}
      if (hasUsableNumber(context) && hasUsableNumber(output)) {
        result.limit = {
          context,
          ...(hasUsableNumber(inputLimit) ? { input: inputLimit } : {}),
          output,
        }
      }

      const capabilities = getCapabilities(model)
      const inputModalities = getModalities(model.input_modalities)
      const outputModalities = getModalities(model.output_modalities)
      const input = inputModalities ?? (capabilities?.vision === true ? ['text', 'image'] : undefined)
      if (input || outputModalities) {
        result.modalities = {
          ...(input ? { input } : {}),
          ...(outputModalities ? { output: outputModalities } : {}),
        }
      }

      if (typeof capabilities?.attachment === 'boolean') result.attachment = capabilities.attachment
      if (typeof capabilities?.reasoning === 'boolean') result.reasoning = capabilities.reasoning
      if (typeof capabilities?.tool_calling === 'boolean') result.toolCall = capabilities.tool_calling
      if (typeof capabilities?.structured_output === 'boolean') result.structuredOutput = capabilities.structured_output
      if (typeof capabilities?.temperature === 'boolean') result.temperature = capabilities.temperature

      const variants = getReasoningVariants(capabilities)
      if (variants) result.variants = variants
      return result
    },
  }
}
