// src/studio/util/sizeMath.js
//
// 尺寸数学工具：把 `auto+ratio+custom` 的 Size_Input_Mode 折叠为 `WIDTHxHEIGHT`
// 字符串，并对 "自定义" 子模式下用户填写的宽高跑 Custom_Size_Constraints。
//
// 设计依据：
//   - requirements.md Requirement 16.5 / 16.6 / 16.7（Size_Input_Mode 与 Custom_Size_Constraints）
//   - design.md "Size Input Mode" 节（`tierRatioToSize` / `validateCustomSize` 代码块）
//   - tasks.md Task 1.3
//
// 使用方：
//   - `src/studio/state/sizeInput.js` 内部把 `subMode='ratio'` 的状态折叠为
//     `resolvedSize` 时调用 `tierRatioToSize`；
//   - CreationDesk 的 Custom 子模式在每次输入后调用 `validateCustomSize`，
//     把返回的 errors 数组渲染到字段下方红字，errors.length > 0 时禁用生成按钮。
//
// 设计要点：
//   - `TIER_LONG_SIDE` 把人类可读的 tier 名称映射到长边像素：
//     '1K' = 1024、'2K' = 2048、'4K' = 4096。
//   - `tierRatioToSize` 用比例的较大边作为长边，较短边按比例换算后对齐到 16 的倍数
//     （`Math.round(... / 16) * 16`）。
//   - `validateCustomSize` 不在第一条错误处提前返回，而是把所有违规一次性收集，
//     方便 UI 一次性给出全部红字提示；error.field 取值固定在
//     'width' | 'height' | 'size' | 'ratio' | 'pixels'，UI 根据 field 决定挂哪个输入框。
//   - 错误文案统一中文，匹配项目其它面板的语调。

/**
 * 各 tier 对应的"长边"像素数。
 * 比例 → 宽高换算时，长边固定为该值，短边按比例缩放后对齐到 16 的倍数。
 *
 * @type {Readonly<Record<'1K'|'2K'|'4K', number>>}
 */
export const TIER_LONG_SIDE = Object.freeze({
  '1K': 1024,
  '2K': 2048,
  '4K': 4096,
});

/**
 * Custom_Size_Constraints 的硬阈值（与 design.md 的 validateCustomSize 实现保持同形）。
 *
 *   - `MULTIPLE_OF`：宽高必须是 16 的整数倍；
 *   - `MAX_SIDE`：最大边不允许超过 3840px；
 *   - `MAX_RATIO`：长宽比不允许超过 3:1；
 *   - `MIN_PIXELS` / `MAX_PIXELS`：像素总量需在闭区间 [655 360, 8 294 400]。
 */
export const CUSTOM_SIZE_CONSTRAINTS = Object.freeze({
  MULTIPLE_OF: 16,
  MAX_SIDE: 3840,
  MAX_RATIO: 3,
  MIN_PIXELS: 655360,
  MAX_PIXELS: 8294400,
});

/**
 * 把 (tier, ratio) 折叠为 `WIDTHxHEIGHT` 字符串。
 *
 * 算法：
 *   1) 解析 ratio 为 `[w, h]`（如 `'16:9'` → `[16, 9]`）；
 *   2) 取该 tier 的长边像素 `long`；
 *   3) 较大比例分量对应的边设为 `long`，较短边用 `long * (短/长)` 换算并对齐到 16 的倍数；
 *   4) 返回 `${width}x${height}`。
 *
 * 该函数不做范围校验：调用方应保证 ratio 已在 Capability_Descriptor 的 ratios 列表内、
 * tier 在 TIER_LONG_SIDE 的键集合内（否则 long 为 undefined 时计算结果为 NaN）。
 *
 * @param {'1K'|'2K'|'4K'} tier
 * @param {string} ratio  形如 `'1:1'` / `'16:9'`，必须是 `W:H` 形式。
 * @returns {string}      形如 `'1024x576'`。
 */
export function tierRatioToSize(tier, ratio) {
  const [w, h] = String(ratio).split(':').map(Number);
  const long = TIER_LONG_SIDE[tier];
  if (w >= h) {
    const width = long;
    const height = Math.round((long * (h / w)) / 16) * 16;
    return `${width}x${height}`;
  }
  const height = long;
  const width = Math.round((long * (w / h)) / 16) * 16;
  return `${width}x${height}`;
}

/**
 * 校验 "自定义" 子模式下用户填写的宽高，返回所有违反 Custom_Size_Constraints 的错误。
 *
 * 该函数 **不在第一条错误处返回**，而是把全部违规一次性收集，便于 UI 同时点亮多条
 * 字段红字提示。error.field 取值固定如下：
 *
 *   - `'width'`  —— 宽度不是 16 的倍数；
 *   - `'height'` —— 高度不是 16 的倍数；
 *   - `'size'`   —— 最大边超过 3840px；
 *   - `'ratio'`  —— 长宽比超过 3:1；
 *   - `'pixels'` —— 像素总量越界。
 *
 * @param {{ width: number, height: number }} input
 * @returns {Array<{ field: 'width'|'height'|'size'|'ratio'|'pixels', message: string }>}
 */
export function validateCustomSize({ width, height }) {
  /** @type {Array<{ field: 'width'|'height'|'size'|'ratio'|'pixels', message: string }>} */
  const errors = [];
  if (width % CUSTOM_SIZE_CONSTRAINTS.MULTIPLE_OF !== 0) {
    errors.push({ field: 'width', message: '宽度需是 16 的倍数' });
  }
  if (height % CUSTOM_SIZE_CONSTRAINTS.MULTIPLE_OF !== 0) {
    errors.push({ field: 'height', message: '高度需是 16 的倍数' });
  }
  if (Math.max(width, height) > CUSTOM_SIZE_CONSTRAINTS.MAX_SIDE) {
    errors.push({ field: 'size', message: '最大边不能超过 3840px' });
  }
  const ratio = Math.max(width, height) / Math.min(width, height);
  if (ratio > CUSTOM_SIZE_CONSTRAINTS.MAX_RATIO) {
    errors.push({ field: 'ratio', message: '长宽比不能超过 3:1' });
  }
  const pixels = width * height;
  if (
    pixels < CUSTOM_SIZE_CONSTRAINTS.MIN_PIXELS ||
    pixels > CUSTOM_SIZE_CONSTRAINTS.MAX_PIXELS
  ) {
    errors.push({
      field: 'pixels',
      message: '像素总量需在 655 360 到 8 294 400 之间',
    });
  }
  return errors;
}
