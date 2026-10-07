import { describe, expect, it } from 'vitest'
import { discoverModelDrafts } from '../../src/core/discovery-pipeline'

describe('shared discovery pipeline', () => {
  it('normalizes, filters, classifies, enriches, names, and disambiguates', () => {
    const drafts = discoverModelDrafts([
      { id: 'openai/gpt-5', owned_by: 'openai', available: true },
      { id: 'github-copilot/gpt-5', owned_by: 'github-copilot', available: true },
      { id: 'text-embedding-3-large' },
      { id: 'ignored', available: false },
      { id: 'invalid', available: true },
      null,
    ], {
      filter: {
        includeBy: [{ field: 'available', equals: true }],
        excludeBy: [],
        includeRegex: [/gpt/],
        excludeRegex: [],
      },
      smartModelName: true,
    })

    expect(drafts.map((draft) => draft.id)).toEqual(['openai/gpt-5', 'github-copilot/gpt-5'])
    expect(drafts.map((draft) => draft.name)).toEqual(['GPT 5 (Openai)', 'GPT 5 (Github Copilot)'])
  })
})
