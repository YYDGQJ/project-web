import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { EnhancedColumn, CalculationMode } from '../types'
import { calculationModeLabels } from '../types'

interface CalculationProps {
  calculationEnabled: boolean
  calculationDefaultMode: CalculationMode
  calculationRowLabel: string
}

// 管理列汇总计算模式与汇总行生成

export function useCalculation(
  props: CalculationProps,
  visibleOrderedColumns: ComputedRef<EnhancedColumn[]>,
  displayData: ComputedRef<any[]>
) {
  const calculationModes = ref<Record<string, CalculationMode>>({})

  // 获取指定列的计算模式（支持默认模式）

  const getCalculationMode = (columnKey: string): CalculationMode => {
    return calculationModes.value[columnKey] ?? props.calculationDefaultMode ?? 'none'
  }

  const hasActiveCalculation = computed(() => {
    return visibleOrderedColumns.value.some(
      (column) => column.prop && getCalculationMode(column.key) !== 'none'
    )
  })

  const showSummaryRow = computed(() => {
    return props.calculationEnabled && hasActiveCalculation.value && displayData.value.length > 0
  })

  // 更新指定列的计算模式

  const updateCalculationMode = (columnKey: string, mode: CalculationMode) => {
    calculationModes.value = { ...calculationModes.value, [columnKey]: mode }
  }

  // 将单元格值转换为可参与计算的数字

  const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return null
      const parsed = Number(trimmed)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }

  // 格式化平均值，控制小数位长度

  const formatAverage = (value: number): string => {
    const text = String(value)
    const parts = text.split('.')
    if (parts.length === 2 && parts[1].length > 3) {
      return value.toFixed(3)
    }
    return text
  }

  // 计算某列汇总单元格文本（求和/均值/最值）

  const getSummaryCellText = (column: EnhancedColumn, _index: number): string => {
    if (!column.prop) return ''
    const mode = getCalculationMode(column.key)
    if (mode === 'none') return ''

    const values: number[] = []
    displayData.value.forEach((row) => {
      const value = toNumber(row?.[column.prop as string])
      if (value !== null) values.push(value)
    })
    if (!values.length) return ''

    let result: number | null = null
    let formatted: string | null = null
    if (mode === 'sum') {
      result = values.reduce((acc, v) => acc + v, 0)
    } else if (mode === 'avg') {
      result = values.reduce((acc, v) => acc + v, 0) / values.length
      formatted = formatAverage(result)
    } else if (mode === 'min') {
      result = Math.min(...values)
    } else if (mode === 'max') {
      result = Math.max(...values)
    }

    if (result === null || Number.isNaN(result)) return ''
    const label = calculationModeLabels[mode]
    const valueText = formatted ?? `${result}`
    return label ? `${label}: ${valueText}` : valueText
  }

  // 生成汇总行记录对象，供表格底部冻结行显示

  const buildSummaryRecord = (): Record<string, string> | null => {
    if (!showSummaryRow.value) return null
    const summaryRecord: Record<string, string> = {}
    visibleOrderedColumns.value.forEach((column, index) => {
      if (!column.prop) return
      summaryRecord[column.prop] = getSummaryCellText(column, index)
    })
    return summaryRecord
  }

  return {
    calculationModes,
    getCalculationMode,
    hasActiveCalculation,
    showSummaryRow,
    updateCalculationMode,
    toNumber,
    formatAverage,
    getSummaryCellText,
    buildSummaryRecord
  }
}
