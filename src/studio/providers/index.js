// `src/studio/providers/` 目录入口。
//
// v1 占位文件：在 Provider 适配器、Registry、Capability 等模块落地之前，
// 仅 re-export 已有的契约模块以触发 JSDoc 类型解析。后续任务（1.2、5.x）
// 会逐步把 `capabilities`、`registry`、`sub2api` 等命名导出补到这里。

export * from './contract.js';
