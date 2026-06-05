// Provider Adapter Contract
//
// This module only carries JSDoc typedefs. It intentionally exports no runtime
// values. Keep it in sync with the provider registry and adapter boundary when
// adding non-OpenAI-compatible providers.

/**
 * @typedef {Object} ReferenceImage
 * @property {Blob} blob Browser-side Blob or File.
 * @property {string} [filename] Optional multipart upload filename.
 * @property {string} [mime] MIME type such as "image/png".
 */

/**
 * @typedef {Object} GenerationRequest
 * @property {string} providerId Provider Registry id.
 * @property {string} model Resolved model name.
 * @property {'image'|'edit'} mode Text-to-image or reference/mask edit.
 * @property {string} prompt
 * @property {string} [negativePrompt]
 * @property {string} size Size such as "1024x1024", "1536x1024", or "auto".
 * @property {string} quality Provider quality value such as "low", "medium", "high", or "auto".
 * @property {number} n Number of requested images.
 * @property {ReferenceImage[]} [references] Reference images for edit flows.
 * @property {Record<string,string>} authFields Runtime credentials such as apiKey.
 * @property {string} [baseUrl] Custom provider or gateway base URL.
 * @property {Record<string,unknown>} [providerOptions] Provider-specific passthrough options.
 */

/**
 * @typedef {Object} GeneratedImage
 * @property {Blob} blob
 * @property {string} mime MIME type such as "image/png".
 * @property {number} width
 * @property {number} height
 * @property {string} [revisedPrompt] Provider-returned revised prompt, when available.
 */

/**
 * @typedef {Object} GenerationCostInfo
 * @property {boolean} authoritative Whether the value came from a trusted server-side quote.
 * @property {'USD'|'CREDIT'} currency
 * @property {number} amount
 * @property {unknown} [raw] Sanitized raw quote response.
 */

/**
 * @typedef {Object} GenerationResult
 * @property {string} providerId
 * @property {string} model
 * @property {GeneratedImage[]} images
 * @property {GenerationCostInfo} [costInfo]
 * @property {unknown} [raw] Sanitized raw provider response.
 */

/**
 * @typedef {Object} ProgressEvent
 * @property {'submitting'|'waiting'|'streaming'|'finalizing'} stage
 * @property {number} [completed]
 * @property {number} [total]
 * @property {number} [partials]
 * @property {GeneratedImage[]} [partialImages]
 */

/**
 * @callback ProgressCallback
 * @param {ProgressEvent} event
 * @returns {void}
 */

/**
 * @typedef {Object} GenerateArgs
 * @property {GenerationRequest} request
 * @property {AbortSignal} signal
 * @property {ProgressCallback} [onProgress]
 */

/**
 * @callback ProviderGenerate
 * @param {GenerateArgs} args
 * @returns {Promise<GenerationResult>}
 */

/**
 * @typedef {Object} CapabilityAuthField
 * @property {string} key
 * @property {string} label
 * @property {boolean} secret
 * @property {boolean} required
 */

/**
 * @typedef {Object} CapabilityPricingEntry
 * @property {number} perImage
 * @property {'USD'|'CREDIT'} currency
 */

/**
 * @typedef {Object} CapabilityDescriptor
 * @property {string} id
 * @property {string} displayName
 * @property {string[]} sizes
 * @property {string[]} qualities
 * @property {[number, number]} nRange
 * @property {boolean} supportsEdits
 * @property {boolean} supportsReferenceImages
 * @property {string[]} acceptedFileTypes
 * @property {number} maxImages Maximum reference image count. Use 0 when unsupported.
 * @property {string} defaultModel
 * @property {Record<string, CapabilityPricingEntry>} pricing Model-name keyed pricing map.
 * @property {'direct'|'proxy'} transport
 * @property {CapabilityAuthField[]} authFields
 * @property {boolean} supportsStreaming
 */

/**
 * @typedef {Object} ProviderAdapter
 * @property {CapabilityDescriptor} capability
 * @property {ProviderGenerate} generate
 */

export {};
