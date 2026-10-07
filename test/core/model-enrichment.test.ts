import { describe, expect, it } from 'vitest'
import { enrichModelDraft } from '../../src/core/model-enrichment'

describe('shared model enrichment contract', () => {
  it('adapts legacy enricher output into a neutral draft', () => {
    const result = enrichModelDraft({
      id: 'provider/model',
      name: 'provider/model',
      raw: { id: 'provider/model' },
      capabilities: { tools: true },
      limit: { context: 100 },
    }, {
      shouldSkipModel: () => false,
      getModelName: () => 'Readable Model',
      applyModelInfo: (config) => {
        config.reasoning = true
        config.tool_call = false
        config.cost = { input: 1, output: 2 }
        config.modalities = { input: ['text', 'image'] }
      },
    })

    expect(result.skipped).toBe(false)
    expect(result.metadataName).toBe('Readable Model')
    expect(result.draft.reasoning).toBe(true)
    expect(result.draft.toolCall).toBe(false)
    expect(result.draft.cost).toEqual({ input: 1, output: 2 })
    expect(result.draft.modalities).toEqual({ input: ['text', 'image'] })
  })

  it('preserves skip decisions without applying enrichment', () => {
    let applied = false
    const result = enrichModelDraft({ id: 'skip-me', name: 'skip-me', raw: { id: 'skip-me' } }, {
      shouldSkipModel: () => true,
      applyModelInfo: () => { applied = true },
    })

    expect(result.skipped).toBe(true)
    expect(applied).toBe(false)
  })
})
