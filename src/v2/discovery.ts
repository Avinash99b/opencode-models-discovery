import { type ConfiguredProvider, type DiscoveredV2Model, type Inventory } from "./catalog.js"
import { type ProviderDiscoveryOptions } from "./provider-config.js"
import { mapToDiscoveredV2Model } from "./model-mapper.js"
import { createModelEnricher, type ModelEnricher } from "../utils/model-info/index.js"
import { ModelInfoFormat } from "../types/plugin-config.js"
import { fetchModelsDevData, DEFAULT_MODELS_DEV_URL } from "../utils/models-dev-fetcher.js"
import { discoverModelDrafts } from "../core/discovery-pipeline.js"

export interface CatalogProvider extends ConfiguredProvider {
  /** Ephemeral request credential resolved by the plugin refresh orchestration. */
  readonly apiKey?: string
}

const DEFAULT_LITELLM_ENDPOINT = "/v1/model/info"
const DEFAULT_LMSTUDIO_ENDPOINT = "/api/v1/models"

async function resolveModelInfoEnricher(
  baseURL: string,
  apiKey: string | undefined,
  config: ProviderDiscoveryOptions,
  fetcher: typeof fetch,
): Promise<ModelEnricher | undefined> {
  const format = config.modelInfoFormat
  if (!format) return undefined

  if (format === ModelInfoFormat.ModelsDev || format === ModelInfoFormat.AIProxy) {
    const endpoint = config.modelInfoEndpoint ?? DEFAULT_MODELS_DEV_URL
    const data = await fetchModelsDevData(endpoint)
    return createModelEnricher(format, data, { filterNonChat: config.filterNonChat })
  }

  if (
    format === ModelInfoFormat.Bifrost ||
    format === ModelInfoFormat.VLLM ||
    format === ModelInfoFormat.LlamaSwap ||
    format === ModelInfoFormat.OmniRoute
  ) {
    return createModelEnricher(format, null)
  }

  if (format === ModelInfoFormat.LiteLLM || format === ModelInfoFormat.LMStudio) {
    const defaultEndpoint = format === ModelInfoFormat.LiteLLM ? DEFAULT_LITELLM_ENDPOINT : DEFAULT_LMSTUDIO_ENDPOINT
    const targetEndpoint = config.modelInfoEndpoint ?? defaultEndpoint
    const infoUrl = /^https?:\/\//i.test(targetEndpoint)
      ? targetEndpoint
      : targetEndpoint.startsWith("/")
        ? new URL(targetEndpoint, new URL(baseURL).origin).toString()
        : new URL(targetEndpoint, baseURL.endsWith("/") ? baseURL : `${baseURL}/`).toString()

    const headers = new Headers({ accept: "application/json" })
    if (apiKey) headers.set("authorization", `Bearer ${apiKey}`)

    try {
      const res = await fetcher(infoUrl, {
        headers,
        signal: AbortSignal.timeout(config.timeoutMs),
      })
      if (res.ok) {
        const data = await res.json()
        return createModelEnricher(format, data, { filterNonChat: config.filterNonChat })
      }
    } catch {
      // Endpoint query failed; fallback without enricher
    }
  }

  return undefined
}

export async function discoverInventory(
  providers: readonly CatalogProvider[],
  discovery: ReadonlyMap<string, ProviderDiscoveryOptions>,
  fetcher: typeof fetch = fetch,
): Promise<Inventory> {
  const inventory: Inventory = new Map()

  await Promise.all(providers.map(async (provider) => {
    const config = discovery.get(provider.id)
    if (!config) return

    const baseURL = typeof provider.settings.baseURL === "string" ? provider.settings.baseURL : undefined
    if (!baseURL) return

    const resolvedApiKey = typeof provider.apiKey === "string" && provider.apiKey.trim().length > 0
      ? provider.apiKey.trim()
      : (typeof provider.settings.apiKey === "string" && provider.settings.apiKey.trim().length > 0 ? provider.settings.apiKey.trim() : undefined)

    const url = new URL(config.endpoint, new URL(baseURL).origin).toString()
    const headers = new Headers({ accept: "application/json" })
    if (resolvedApiKey) headers.set("authorization", `Bearer ${resolvedApiKey}`)

    try {
      const [modelsResponse, enricher] = await Promise.all([
        fetcher(url, {
          headers,
          signal: AbortSignal.timeout(config.timeoutMs),
        }),
        resolveModelInfoEnricher(baseURL, resolvedApiKey, config, fetcher),
      ])

      if (!modelsResponse.ok) return

      const payload = await modelsResponse.json() as { data?: unknown }
      if (!Array.isArray(payload?.data)) return

       const drafts = discoverModelDrafts(payload.data, {
         filter: {
           includeBy: config.includeBy.map((filter) => ({ ...filter, match: filter.match ? new RegExp(filter.match) : undefined })),
           excludeBy: config.excludeBy.map((filter) => ({ ...filter, match: filter.match ? new RegExp(filter.match) : undefined })),
           includeRegex: config.includeRegex,
           excludeRegex: config.excludeRegex,
         },
         smartModelName: config.smartModelName,
         enricher,
         enrichmentContext: { filterNonChat: config.filterNonChat },
       })
       const models = new Map<string, DiscoveredV2Model>(drafts.map((draft) => [draft.id, mapToDiscoveredV2Model(draft, config)]))

       inventory.set(provider.id, models)
    } catch {
      // Network and parsing failures are non-fatal; existing discovered models remain untouched.
    }
  }))

  return inventory
}
