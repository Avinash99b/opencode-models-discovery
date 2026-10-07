import { createBifrostEnricher } from './bifrost'
import { createLiteLLMEnricher } from './litellm'
import { createLMStudioEnricher } from './lmstudio'
import { createLlamaSwapEnricher } from './llamaswap'
import { createModelsDevEnricher } from './models-dev'
import { createOmniRouteEnricher } from './omniroute'
import { createVLLMEnricher } from './vllm'
import { ModelInfoFormat } from '../../types/plugin-config'
import type { ModelInfoEnricher, ModelInfoEnricherOptions } from './types'
import { adaptLegacyModelInfoEnricher, type ModelEnricher } from '../../core/model-enrichment'

type ModelInfoEnricherFactory = (data: unknown, options?: ModelInfoEnricherOptions) => ModelInfoEnricher

const MODEL_INFO_ENRICHERS: Partial<Record<ModelInfoFormat, ModelInfoEnricherFactory>> = {
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
  if (format === ModelInfoFormat.ModelsDev) {
    return createModelsDevEnricher(data)
  }
  if (format === ModelInfoFormat.Bifrost) {
    return createBifrostEnricher(data)
  }
  if (format === ModelInfoFormat.VLLM) {
    return createVLLMEnricher(data)
  }
  if (format === ModelInfoFormat.LlamaSwap) {
    return createLlamaSwapEnricher(data)
  }
  if (format === ModelInfoFormat.OmniRoute) {
    return createOmniRouteEnricher(data)
  }
  if (format === ModelInfoFormat.LMStudio) {
    return createLMStudioEnricher(data)
  }
  if (format === ModelInfoFormat.LiteLLM) {
    return createLiteLLMEnricher(data)
  }

  const legacy = createModelInfoEnricher(format, data, options)
  return legacy ? adaptLegacyModelInfoEnricher(legacy) : undefined
}

export function isSupportedModelInfoFormat(format: ModelInfoFormat): boolean {
  return format === ModelInfoFormat.ModelsDev || format === ModelInfoFormat.Bifrost || format === ModelInfoFormat.VLLM || format === ModelInfoFormat.LlamaSwap || format === ModelInfoFormat.OmniRoute || format === ModelInfoFormat.LMStudio || format === ModelInfoFormat.LiteLLM || MODEL_INFO_ENRICHERS[format] !== undefined
}

export type { ModelInfoEnricher, ModelInfoEnricherOptions }
export { createModelsDevEnricher } from './models-dev'
export type { ModelEnricher, ModelEnrichmentContext, ModelEnrichmentResult } from '../../core/model-enrichment'
