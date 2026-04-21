import type { FilterValue, EnhancedColumn } from '../types'

// 默认筛选逻辑：目标字段值与筛选值全等匹配

export function defaultFilterMethod(
  value: FilterValue,
  row: any,
  column: any
): boolean {
  const prop = column?.property
  if (!prop) return true
  return row?.[prop] === value
}

// 复制筛选值数组，避免引用被外部联动修改

export function cloneFilterValues(values: FilterValue[]): FilterValue[] {
  return values.slice()
}

// 生成筛选值唯一键，避免不同类型同文本值冲突

export function toFilterValueKey(value: FilterValue): string {
  return `${typeof value}:${String(value)}`
}

// 将筛选值映射为筛选面板展示文本

export function getFilterValueText(
  column: EnhancedColumn,
  value: FilterValue
): string {
  const target = column.filterOptions?.find((option) => option.value === value)
  return target ? target.text : String(value)
}
