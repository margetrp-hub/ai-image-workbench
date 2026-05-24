// Provider Adapter Contract
//
// 本模块只承载 JSDoc typedef 定义，不导出任何运行时值。
// 与 [design.md](../../../.kiro/specs/studio-ux-multi-provider/design.md) 的
// "Provider Adapter Contract" 节保持同形；任何对契约的修改都应同步更新设计文档。
//
// 该文件被 `src/studio/providers/index.js` re-export，以便其它模块通过
// `import {} from './providers/contract.js'` 触发 JSDoc 类型检查。

/**
 * @typedef {Object} ReferenceImage
 * @property {Blob}   blob       浏览器内的 Blob（File 可隐式上转）。
 * @property {string} [filename] 可选；用于 multipart 上传时填写文件名。
 * @property {string} [mime]     例如 `'image/png'`。
 */

/**
 * @typedef {Object} GenerationRequest
 * @property {string} providerId                          Provider Registry 中的 ID。
 * @property {string} model                               解析后的模型名。
 * @property {'image'|'edit'} mode                        文生图 / 参考图编辑。
 * @property {string} prompt
 * @property {string} [negativePrompt]
 * @property {string} size                                例如 `'1024x1024'` / `'auto'`。
 * @property {string} quality                             `'low' | 'medium' | 'high' | 'auto'` 或 provider 私有值。
 * @property {number} n                                   生成数量，1..maxN。
 * @property {ReferenceImage[]} [references]              参考图列表。
 * @property {Record<string,string>} authFields           apiKey 等运行时凭据。
 * @property {string} [baseUrl]                           Custom Provider / SiliconFlow / 自填网关时使用。
 * @property {Record<string,unknown>} [providerOptions]   透传 provider 私有参数。
 */

/**
 * @typedef {Object} GeneratedImage
 * @property {Blob}   blob
 * @property {string} mime           例如 `'image/png'`。
 * @property {number} width
 * @property {number} height
 * @property {string} [revisedPrompt] Provider 返回的改写后 prompt（如有）。
 */

/**
 * @typedef {Object} GenerationCostInfo
 * @property {boolean} authoritative   是否来自服务端权威报价。
 * @property {'USD'|'CREDIT'} currency
 * @property {number} amount
 * @property {unknown} [raw]           原始报价响应（脱敏）。
 */

/**
 * @typedef {Object} GenerationResult
 * @property {string} providerId
 * @property {string} model
 * @property {GeneratedImage[]} images
 * @property {GenerationCostInfo} [costInfo]
 * @property {unknown} [raw]            Provider 原始响应（脱敏后）。
 */

/**
 * @typedef {Object} ProgressEvent
 * @property {'submitting'|'waiting'|'streaming'|'finalizing'} stage
 * @property {number} [completed]
 * @property {number} [total]
 * @property {number} [partials]
 * @property {GeneratedImage[]} [partialImages]   `streaming` 阶段的预览图。
 */

/**
 * @callback ProgressCallback
 * @param   {ProgressEvent} event
 * @returns {void}
 */

/**
 * @typedef {Object} GenerateArgs
 * @property {GenerationRequest} request
 * @property {AbortSignal}       signal
 * @property {ProgressCallback}  [onProgress]
 */

/**
 * Provider 适配器的统一函数签名。
 *
 * @callback ProviderGenerate
 * @param   {GenerateArgs} args
 * @returns {Promise<GenerationResult>}
 */

/**
 * @typedef {Object} CapabilityAuthField
 * @property {string}  key
 * @property {string}  label
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
 * @property {string}   id
 * @property {string}   displayName
 * @property {string[]} sizes
 * @property {string[]} qualities
 * @property {[number, number]} nRange
 * @property {boolean}  supportsEdits
 * @property {boolean}  supportsReferenceImages
 * @property {string[]} acceptedFileTypes              例如 `['image/png', 'image/jpeg']`。
 * @property {number}   maxImages                       参考图最大上传数；0 表示不支持参考图。
 * @property {string}   defaultModel
 * @property {Record<string, CapabilityPricingEntry>} pricing  key 为模型名。
 * @property {'direct'|'proxy'} transport
 * @property {CapabilityAuthField[]} authFields
 * @property {boolean}  supportsStreaming
 */

/**
 * @typedef {Object} ProviderAdapter
 * @property {CapabilityDescriptor} capability
 * @property {ProviderGenerate}     generate
 */

// 仅 JSDoc 文件，无运行时导出。保留 `export {}` 让模块被解析为 ES module，
// 以便 `import './contract.js'` 在类型检查链路上可解析。
export {};
