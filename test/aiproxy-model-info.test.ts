import { describe, expect, it } from 'vitest'
import { ModelInfoFormat } from '../src/types/plugin-config'
import { createModelInfoEnricher } from '../src/utils/model-info'

describe('AIProxy model info enricher', () => {
  it('overlays inline pricing, token limits, and supported reasoning efforts', () => {
    const enricher = createModelInfoEnricher(ModelInfoFormat.AIProxy, null)
    expect(enricher).toBeDefined()

    const config: any = {
      id: 'gpt-6-luna',
      reasoning: true,
      limit: { context: 1_050_000, input: 900_000, output: 32_000 },
    }

    enricher!.applyModelInfo(config, config.id, {
      id: config.id,
      limits: { max_input_tokens: 922_000, max_output_tokens: 128_000 },
      pricing: {
        input_per_1m_usd: 0.1,
        output_per_1m_usd: 0.5,
        cache_read_per_1m_usd: 0.01,
        cache_write_5m_per_1m_usd: 0.125,
      },
      capabilities: {
        reasoning: true,
        effort_tiers: ['low', 'medium', 'high', 'xhigh', 'max'],
      },
    })

    expect(config.limit).toEqual({ context: 1_050_000, input: 922_000, output: 128_000 })
    expect(config.cost).toEqual({ input: 0.1, output: 0.5, cache_read: 0.01 })
    expect(config.variants).toEqual({
      low: { reasoningEffort: 'low' },
      medium: { reasoningEffort: 'medium' },
      high: { reasoningEffort: 'high' },
      xhigh: { reasoningEffort: 'xhigh' },
      max: { reasoningEffort: 'max' },
    })
  })

  it('preserves valid zero prices and ignores malformed or unsupported metadata', () => {
    const enricher = createModelInfoEnricher(ModelInfoFormat.AIProxy, null)
    expect(enricher).toBeDefined()

    const config: any = {
      id: 'custom-model',
      limit: { context: 32_000, output: 4_000 },
      cost: { input: 2, output: 3 },
    }

    enricher!.applyModelInfo(config, config.id, {
      id: config.id,
      limits: { max_input_tokens: '32000', max_output_tokens: Number.POSITIVE_INFINITY },
      pricing: { input_per_1m_usd: 0, output_per_1m_usd: 'unknown', cache_read_per_1m_usd: -1 },
      capabilities: { reasoning: true, effort_tiers: ['xhigh', 'ultra', 1] },
    })

    expect(config.limit).toEqual({ context: 32_000, output: 4_000 })
    expect(config.cost).toEqual({ input: 0, output: 3 })
    expect(config.variants).toEqual({ xhigh: { reasoningEffort: 'xhigh' } })
  })

  it('leaves absent or malformed inline metadata unset', () => {
    const enricher = createModelInfoEnricher(ModelInfoFormat.AIProxy, null)
    expect(enricher).toBeDefined()

    const config: any = { id: 'unknown-model' }
    enricher!.applyModelInfo(config, config.id, {
      id: config.id,
      limits: 'invalid',
      pricing: null,
      capabilities: { effort_tiers: ['unsupported'] },
    })

    expect(config).toEqual({ id: 'unknown-model', variants: {} })
  })
})
