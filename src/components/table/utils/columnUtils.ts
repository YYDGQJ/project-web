import type { CommonTableColumn, FilterValue } from '../types'

// 生成列唯一键：优先 columnKey，其次 prop，最后回退 label

export function getColumnKey(column: CommonTableColumn): string {
  return column.columnKey ?? column.prop ?? column.label
}

// 判断值是否可作为筛选项（仅支持字符串、数字、布尔）

export function isFilterPrimitive(value: unknown): value is FilterValue {
  return ['string', 'number', 'boolean'].includes(typeof value)
}

// 根据当前数据自动生成筛选项列表

export function buildAutoFilters(
  data: any[],
  prop?: string
): Array<{ text: string; value: FilterValue }> | undefined {
  if (!prop) return undefined
  const uniqueValues = Array.from(
    new Set(
      data
        .map((row) => row?.[prop])
        .filter((value) => value !== undefined && value !== null && isFilterPrimitive(value))
    )
  ) as FilterValue[]
  if (!uniqueValues.length) return undefined
  // 将筛选值转换为界面展示文本
  const formatFilterOptionText = (value: FilterValue) =>
    typeof value === 'boolean' ? (value ? '是' : '否') : String(value)
  return uniqueValues.map((value) => ({ text: formatFilterOptionText(value), value }))
}
