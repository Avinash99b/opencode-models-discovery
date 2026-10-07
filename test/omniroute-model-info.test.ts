import { describe, expect, it } from 'vitest'
import { createOmniRouteEnricher } from '../src/utils/model-info/omniroute'

describe('native OmniRoute enricher', () => {
  it('maps inline limits, modalities, capabilities, and variants', () => {
    const result = createOmniRouteEnricher(null).enrich({
      id: 'oc/vision-model',
      context_length: 128000,
      max_input_tokens: 120000,
      max_output_tokens: 8192,
      input_modalities: ['TEXT', 'IMAGE', 'SPEECH', 'unsupported'],
      output_modalities: ['TEXT'],
      capabilities: {
        attachment: true,
        reasoning: true,
        tool_calling: true,
        structured_output: true,
        temperature: false,
        vision: true,
        effort_tiers: ['LOW', 'medium', 'high', 'xhigh', 'ultra'],
      },
    }, { filterNonChat: true })

    expect(result).toEqual({
      limit: { context: 128000, input: 120000, output: 8192 },
      modalities: { input: ['text', 'image', 'audio'], output: ['text'] },
      attachment: true,
      reasoning: true,
      toolCall: true,
      structuredOutput: true,
      temperature: false,
      variants: {
        low: { reasoningEffort: 'low' },
        medium: { reasoningEffort: 'medium' },
        high: { reasoningEffort: 'high' },
        xhigh: { reasoningEffort: 'xhigh' },
        ultra: { reasoningEffort: 'ultra' },
      },
    })
  })

  it('uses vision as an image-input fallback', () => {
    const result = createOmniRouteEnricher(null).enrich({ id: 'oc/vision-only', capabilities: { vision: true } }, { filterNonChat: true })
    expect(result.modalities).toEqual({ input: ['text', 'image'] })
  })

  it('ignores malformed metadata and incomplete limits', () => {
    const result = createOmniRouteEnricher(null).enrich({
      id: 'oc/partial',
      context_length: 128000,
      max_input_tokens: '128000',
      input_modalities: ['unsupported', 1],
      output_modalities: [],
      capabilities: 'invalid',
    }, { filterNonChat: true })
    expect(result).toEqual({})
  })
})
