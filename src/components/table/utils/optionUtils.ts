/**
 * 深度合并表格配置：对象递归合并，数组与原子值以 override 为准覆盖。
 */
export function mergeTableOptions<T extends Record<string, any>>(base: T, override?: Record<string, any>): T {
  if (!override) return base

  const next = { ...base } as Record<string, any>

  Object.keys(override).forEach((key) => {
    const overrideValue = override[key]
    const baseValue = next[key]

    if (
      overrideValue &&
      typeof overrideValue === 'object' &&
      !Array.isArray(overrideValue) &&
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue)
    ) {
      next[key] = mergeTableOptions(baseValue, overrideValue)
      return
    }

    next[key] = overrideValue
  })

  return next as T
}