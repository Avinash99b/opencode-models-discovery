import type { ModelInfoEnricher } from './types'

const REASONING_EFFORTS = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function positiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function nonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function reasoningVariants(value: unknown): Record<string, { reasoningEffort: string }> | undefined {
  if (!Array.isArray(value)) return undefined

  const variants: Record<string, { reasoningEffort: string }> = {}
  for (const tier of value) {
    if (typeof tier !== 'string') continue
    const effort = tier.trim().toLowerCase()
    if (REASONING_EFFORTS.has(effort)) variants[effort] = { reasoningEffort: effort }
  }
  return variants
}

export function createAIProxyModelInfoEnricher(_data: unknown): ModelInfoEnricher {
  return {
    shouldSkipModel(): boolean {
      return false
    },
    applyModelInfo(modelConfig: any, _modelId: string, rawModel?: Record<string, unknown>): void {
      const limits = object(rawModel?.limits)
      const inputLimit = limits?.max_input_tokens
      const outputLimit = limits?.max_output_tokens
      if (positiveNumber(inputLimit) || positiveNumber(outputLimit)) {
        const existing = object(modelConfig.limit) ?? {}
        modelConfig.limit = {
          ...existing,
          ...(positiveNumber(inputLimit) ? { input: inputLimit } : {}),
          ...(positiveNumber(outputLimit) ? { output: outputLimit } : {}),
        }
      }

      const pricing = object(rawModel?.pricing)
      if (pricing) {
        const input = pricing.input_per_1m_usd
        const output = pricing.output_per_1m_usd
        const cacheRead = pricing.cache_read_per_1m_usd
        const updates = {
          ...(nonNegativeNumber(input) ? { input } : {}),
          ...(nonNegativeNumber(output) ? { output } : {}),
          ...(nonNegativeNumber(cacheRead) ? { cache_read: cacheRead } : {}),
        }
        if (Object.keys(updates).length > 0) {
          modelConfig.cost = { ...(object(modelConfig.cost) ?? {}), ...updates }
        }
      }

      const capabilities = object(rawModel?.capabilities)
      if (typeof capabilities?.reasoning === 'boolean') {
        modelConfig.reasoning = capabilities.reasoning
      }

      const variants = reasoningVariants(capabilities?.effort_tiers)
      if (variants) {
        modelConfig.variants = variants
        if (Object.keys(variants).length > 0) modelConfig.reasoning = true
      }
    },
  }
}
