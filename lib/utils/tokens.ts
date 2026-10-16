const CJK_RANGES: Array<[number, number]> = [
  [0x4e00, 0x9fff],
  [0x3400, 0x4dbf],
  [0x3000, 0x303f],
  [0xff00, 0xffef],
];

function isCjk(code: number) {
  return CJK_RANGES.some(([start, end]) => code >= start && code <= end);
}

/**
 * 粗估 token。不用 tiktoken，是为了少一个原生依赖，教学场景误差在 10%–20% 就够用。
 * CJK 大约 1.5 字一个 token，其他字符大约 4 字一个 token。
 */
export function estimateTokens(text: string): number {
  let cjk = 0;
  let other = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (isCjk(code)) cjk += 1;
    else other += 1;
  }
  return Math.ceil(cjk / 1.5 + other / 4);
}
