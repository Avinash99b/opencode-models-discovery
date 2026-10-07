import { describe, expect, it } from 'vitest'
import { discoverModelDrafts } from '../../src/core/discovery-pipeline'
import { mapToDiscoveredV2Model } from '../../src/v2/model-mapper'
import type { ProviderDiscoveryOptions } from '../../src/v2/provider-config'

const options: ProviderDiscoveryOptions = {
  enabled: true,
  endpoint: '/v1/models',
  timeoutMs: 5_000,
  includeRegex: [],
  excludeRegex: [],
  includeBy: [],
  excludeBy: [],
  smartModelName: true,
  filterNonChat: true,
}

describe('V1/V2 shared-core parity', () => {
  it('produces the same IDs and display names for equivalent raw responses', () => {
    const rawModels = [
      { id: 'openai/gpt-5', owned_by: 'openai' },
      { id: 'github-copilot/gpt-5', owned_by: 'github-copilot' },
      { id: 'qwen/qwen3-30b' },
      { id: 'text-embedding-3-large' },
    ]
    const filter = {
      includeBy: [],
      excludeBy: [],
      includeRegex: [],
      excludeRegex: [],
    }

    const drafts = discoverModelDrafts(rawModels, { filter, smartModelName: true })
    const v1Projection = drafts.map((draft) => ({ id: draft.id, name: draft.name }))
    const v2Projection = drafts.map((draft) => {
      const model = mapToDiscoveredV2Model(draft, options)
      return { id: model.modelID, name: model.name }
    })

    expect(v1Projection).toEqual(v2Projection)
    expect(v1Projection).toEqual([
      { id: 'openai/gpt-5', name: 'GPT 5 (Openai)' },
      { id: 'github-copilot/gpt-5', name: 'GPT 5 (Github Copilot)' },
      { id: 'qwen/qwen3-30b', name: 'Qwen3 30B' },
    ])
  })

  it('keeps IDs unchanged when smart names are disabled', () => {
    const rawModels = [{ id: 'openai/gpt-5' }]
    const drafts = discoverModelDrafts(rawModels, { filter: { includeBy: [], excludeBy: [], includeRegex: [], excludeRegex: [] }, smartModelName: false })
    const mapped = mapToDiscoveredV2Model(drafts[0], { ...options, smartModelName: false })

    expect(drafts[0]).toMatchObject({ id: 'openai/gpt-5', name: 'openai/gpt-5' })
    expect(mapped).toMatchObject({ id: 'openai/gpt-5', modelID: 'openai/gpt-5', name: 'openai/gpt-5' })
  })
})
