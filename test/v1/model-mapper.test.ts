import { describe, expect, it } from 'vitest'
import { mapToV1Model } from '../../src/v1/model-mapper'
import type { DiscoveredModelDraft } from '../../src/core/model-types'

function draft(overrides: Partial<DiscoveredModelDraft> = {}): DiscoveredModelDraft {
  return {
    id: 'openai/gpt-5',
    name: 'GPT 5',
    raw: { id: 'openai/gpt-5' },
    ...overrides,
  }
}

describe('V1 model mapper', () => {
  it('maps shared draft fields to the V1 provider model shape', () => {
    const result = mapToV1Model(draft({
      organizationOwner: 'openai',
      capabilities: { vision: true },
      modalities: { input: ['text', 'image'], output: ['text'] },
      limit: { context: 128_000, output: 16_384 },
      reasoning: true,
      attachment: true,
      toolCall: true,
      structuredOutput: true,
      temperature: true,
      cost: { input: 1, output: 2 },
      variants: { low: { reasoningEffort: 'low' } },
      compatibility: { reasoningField: 'reasoning_content' },
    }))

    expect(result).toEqual({
      id: 'openai/gpt-5',
      name: 'GPT 5',
      organizationOwner: 'openai',
      capabilities: { vision: true },
      modalities: { input: ['text', 'image'], output: ['text'] },
      limit: { context: 128_000, output: 16_384 },
      reasoning: true,
      attachment: true,
      tool_call: true,
      structured_output: true,
      temperature: true,
      cost: { input: 1, output: 2 },
      variants: { low: { reasoningEffort: 'low' } },
      compatibility: { reasoningField: 'reasoning_content' },
    })
  })

  it('omits optional fields that are absent from the draft', () => {
    expect(mapToV1Model(draft())).toEqual({
      id: 'openai/gpt-5',
      name: 'GPT 5',
    })
  })

  it('preserves explicit false capability values', () => {
    expect(mapToV1Model(draft({
      reasoning: false,
      attachment: false,
      toolCall: false,
      structuredOutput: false,
      temperature: false,
    }))).toMatchObject({
      reasoning: false,
      attachment: false,
      tool_call: false,
      structured_output: false,
      temperature: false,
    })
  })
})
