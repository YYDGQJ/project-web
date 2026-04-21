import type { VTableSortOrder, EnhancedColumn } from '../types'

// 将组件排序状态转换为 VTable 所需排序枚举

export function toVTableSortOrder(
  order: 'ascending' | 'descending' | null
): VTableSortOrder {
  if (order === 'ascending') return 'asc'
  if (order === 'descending') return 'desc'
  return 'normal'
}

// 将 VTable 排序状态转换为组件内部排序枚举

export function fromVTableSortOrder(
  order: string
): 'ascending' | 'descending' | null {
  const normalized = String(order).toLowerCase()
  if (normalized === 'asc') return 'ascending'
  if (normalized === 'desc') return 'descending'
  return null
}

// 按列配置提取用于排序比较的值

export function getSortValue(row: any, column: EnhancedColumn, index: number): any {
  if (typeof column.sortBy === 'function') {
    return column.sortBy(row, index)
  }
  if (typeof column.sortBy === 'string') {
    return row?.[column.sortBy]
  }
  if (Array.isArray(column.sortBy)) {
    for (const key of column.sortBy) {
      const value = row?.[key]
      if (value !== undefined && value !== null) {
        return value
      }
    }
  }
  return column.prop ? row?.[column.prop] : undefined
}

// 对两个排序值执行统一比较（空值、数字、文本）

export function compareValues(left: any, right: any): number {
  if (left == null && right == null) return 0
  if (left == null) return -1
  if (right == null) return 1
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }
  return String(left).localeCompare(String(right), 'zh-CN', {
    numeric: true,
    sensitivity: 'base'
  })
}
