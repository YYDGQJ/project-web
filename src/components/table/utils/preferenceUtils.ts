/**
 * 过滤并去重：只保留 validKeys 中存在的 keys，且无重复
 */
// 过滤并去重偏好键，只保留当前可用列
export function sanitizePreferenceKeys(
  keys: string[],
  validKeys: string[]
): string[] {
  const validKeySet = new Set(validKeys)
  const normalized: string[] = []
  keys.forEach((key) => {
    if (validKeySet.has(key) && !normalized.includes(key)) {
      normalized.push(key)
    }
  })
  return normalized
}

/**
 * 以 keys 为顺序基准，追加 validKeys 中缺失的项
 */
// 合并偏好顺序与当前列定义，补齐新增列
export function mergePreferenceOrderKeys(
  keys: string[],
  validKeys: string[]
): string[] {
  const normalized = sanitizePreferenceKeys(keys, validKeys)
  const missing = validKeys.filter((key) => !normalized.includes(key))
  return [...normalized, ...missing]
}

/**
 * 过滤掉不在 validKeys 中的列宽记录，并丢弃非正数值
 */
// 清洗列宽映射，剔除无效键与非法数值
export function sanitizePreferenceWidths(
  raw: Record<string, number>,
  validKeys: string[]
): Record<string, number> {
  const validKeySet = new Set(validKeys)
  const normalized: Record<string, number> = {}
  Object.entries(raw).forEach(([key, width]) => {
    if (!validKeySet.has(key)) return
    const nextWidth = Number(width)
    if (Number.isFinite(nextWidth) && nextWidth > 0) {
      normalized[key] = nextWidth
    }
  })
  return normalized
}
