import { describe, it, expect } from 'vitest'
import { createBifrostEnricher } from '../src/utils/model-info/bifrost'

describe('Bifrost model info enricher', () => {
  it('extracts documented inline metadata from a raw model', () => {
    const rawModel: Record<string, unknown> = {
      id: 'bedrock/anthropic.claude-sonnet-4-6',
      context_length: 200000,
      max_input_tokens: 200000,
      max_output_tokens: 8192,
      normalized_name: 'Claude Sonnet 4.6',
      architecture: {
        input_modalities: ['TEXT', 'IMAGE', 'SPEECH', 'unsupported'],
        output_modalities: ['TEXT'],
      },
      pricing: {
        prompt: '0.000003',
        completion: '0.000015',
      },
    }

    const result = createBifrostEnricher(null).enrich(rawModel as { id: string }, { filterNonChat: true })
    expect(result).toMatchObject({
      metadataName: 'Claude Sonnet 4.6',
      limit: { context: 200000, input: 200000, output: 8192 },
      modalities: { input: ['text', 'image', 'audio'], output: ['text'] },
      cost: { input: 3, output: 15 },
    })
  })

  it('leaves missing or malformed metadata unset', () => {
    const result = createBifrostEnricher(null).enrich({
      id: 'openai/gpt-4o',
      context_length: 0,
      max_input_tokens: '128000',
      max_output_tokens: -1,
      architecture: { input_modalities: ['TEXT', 1, 'unsupported'], output_modalities: [] },
      pricing: { prompt: 'invalid', completion: -1 },
    }, { filterNonChat: true })

    expect(result).toEqual({ modalities: { input: ['text'] } })
  })

  it('preserves a reported zero price', () => {
    const result = createBifrostEnricher(null).enrich({
      id: 'local/free-model',
      pricing: { prompt: '0', completion: '0.000001' },
    }, { filterNonChat: true })

    expect(result.cost).toEqual({ input: 0, output: 1 })
  })

  it('does not inject incomplete limits or costs', () => {
    const result = createBifrostEnricher(null).enrich({
      id: 'openai/gpt-4o',
      context_length: 128000,
      max_input_tokens: 128000,
      pricing: { prompt: '0.000003' },
    }, { filterNonChat: true })

    expect(result.limit).toBeUndefined()
    expect(result.cost).toBeUndefined()
  })
})
