import { createBifrostEnricher } from './bifrost'
import { createLiteLLMEnricher } from './litellm'
import { createLMStudioEnricher } from './lmstudio'
import { createLlamaSwapEnricher } from './llamaswap'
import { createModelsDevEnricher } from './models-dev'
import { createOmniRouteEnricher } from './omniroute'
import { createVLLMEnricher } from './vllm'
import { createAIProxyEnricher } from './aiproxy'
import { ModelInfoFormat } from '../../types/plugin-config'
import type { ModelInfoEnricher, ModelInfoEnricherOptions } from './types'
import { adaptLegacyModelInfoEnricher, type ModelEnricher } from '../../core/model-enrichment'

type ModelInfoEnricherFactory = (data: unknown, options?: ModelInfoEnricherOptions) => ModelInfoEnricher
type ModelEnricherFactory = (data: unknown, options?: ModelInfoEnricherOptions) => ModelEnricher

const MODEL_INFO_ENRICHERS: Partial<Record<ModelInfoFormat, ModelInfoEnricherFactory>> = {
}

const MODEL_ENRICHERS: Partial<Record<ModelInfoFormat, ModelEnricherFactory>> = {
  [ModelInfoFormat.ModelsDev]: (data) => createModelsDevEnricher(data),
  [ModelInfoFormat.Bifrost]: (data) => createBifrostEnricher(data),
  [ModelInfoFormat.VLLM]: (data) => createVLLMEnricher(data),
  [ModelInfoFormat.LlamaSwap]: (data) => createLlamaSwapEnricher(data),
  [ModelInfoFormat.OmniRoute]: (data) => createOmniRouteEnricher(data),
  [ModelInfoFormat.LMStudio]: (data) => createLMStudioEnricher(data),
  [ModelInfoFormat.LiteLLM]: (data) => createLiteLLMEnricher(data),
  [ModelInfoFormat.AIProxy]: (data) => createAIProxyEnricher(data),
}

export function createModelInfoEnricher(
  format: ModelInfoFormat,
  data: unknown,
  options?: ModelInfoEnricherOptions
): ModelInfoEnricher | undefined {
  return MODEL_INFO_ENRICHERS[format]?.(data, options)
}

/** Creates the neutral contract used by the shared discovery pipeline. */
export function createModelEnricher(
  format: ModelInfoFormat,
  data: unknown,
  options?: ModelInfoEnricherOptions,
): ModelEnricher | undefined {
  const native = MODEL_ENRICHERS[format]
  if (native) return native(data, options)

  const legacy = createModelInfoEnricher(format, data, options)
  return legacy ? adaptLegacyModelInfoEnricher(legacy) : undefined
}

export function isSupportedModelInfoFormat(format: ModelInfoFormat): boolean {
  return MODEL_ENRICHERS[format] !== undefined || MODEL_INFO_ENRICHERS[format] !== undefined
}

export type { ModelInfoEnricher, ModelInfoEnricherOptions }
export { createModelsDevEnricher } from './models-dev'
export type { ModelEnricher, ModelEnrichmentContext, ModelEnrichmentResult } from '../../core/model-enrichment'
