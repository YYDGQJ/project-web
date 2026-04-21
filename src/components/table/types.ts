/**
 * 通用表格的公开类型定义。
 * 该文件承载对外契约，变更时需关注兼容性。
 */
export interface CommonTableColumn {
  prop?: string
  label: string
  width?: string | number
  minWidth?: string | number
  align?: 'left' | 'center' | 'right'
  slotName?: string
  className?: string
  showOverflowTooltip?: boolean
  sortable?: boolean | 'custom'
  sortMethod?: (a: any, b: any) => number
  sortBy?: string | string[] | ((row: any, index: number) => any)
  sortOrders?: Array<'ascending' | 'descending' | null>
  filters?: Array<{ text: string; value: string | number | boolean }>
  filterMethod?: (value: string | number | boolean, row: any, column: any) => boolean
  filterPlacement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end'
  filterMultiple?: boolean
  filteredValue?: Array<string | number | boolean>
  columnKey?: string
  formatter?: (row: any, column: any, cellValue: any, index: number) => string
  editable?: boolean
  createEditable?: boolean
  editorType?: CommonTableEditorType
  editorOptions?: CommonTableEditorOption[]
  editorProps?: Record<string, unknown>
  required?: boolean | string
  validator?: (value: any, row: any, column: CommonTableColumn) => string | void
}

export interface EnhancedColumn extends CommonTableColumn {
  key: string
  filterOptions?: Array<{ text: string; value: FilterValue }>
  canSort: boolean
  isSortable: boolean
}

export type FilterValue = string | number | boolean

export type CommonTableEditorType = 'input' | 'number' | 'select' | 'date' | 'datetime'

export interface CommonTableEditorOption {
  label: string
  value: string | number | boolean
}

export type CommonTableOperationMode = 'idle' | 'edit' | 'create' | 'delete'

export type CommonTableSelectionMode = 'none' | 'single' | 'multiple'

export interface CommonTableSelectionConfig {
  mode?: CommonTableSelectionMode
  keyField?: string
}

export interface CommonTableEditingConfig {
  enabled?: boolean
  allowCreate?: boolean
  allowDelete?: boolean
}

export interface CommonTableToolbarConfig {
  showExpandCollapse?: boolean
  showColumnManager?: boolean
  showExport?: boolean
  disabled?: boolean
}

export interface CommonTablePaginationConfig {
  showTotal?: boolean
}

export interface CommonTableVTableOverrides {
  emptyTip?: Record<string, unknown>
  dragOrder?: Record<string, unknown>
  menu?: Record<string, unknown>
  select?: Record<string, unknown>
  theme?: Record<string, unknown>
  frameStyle?: Record<string, unknown>
  widthMode?: string
  heightMode?: string
  autoFillWidth?: boolean
  autoFillHeight?: boolean
  containerFit?: Record<string, unknown>
  hierarchyExpandLevel?: number
  hierarchyIndent?: number
  defaultHeaderRowHeight?: number
  defaultRowHeight?: number
  frozenColCount?: number
  rightFrozenColCount?: number
  [key: string]: unknown
}

export interface CommonTableSelectionChangePayload {
  rows: any[]
  keys: Array<string | number | undefined>
}

export interface CommonTableEditCellChangePayload {
  mode: Exclude<CommonTableOperationMode, 'idle' | 'delete'>
  row: any
  rowKey: string | number
  field: string
  value: unknown
  applyPatch: (patch: Record<string, unknown>) => void
}

export interface CommonTableSubmitPayload {
  rows: any[]
  keys: Array<string | number | undefined>
}

export type CommonTableSortConfig = {
  prop: string
  order: 'ascending' | 'descending' | null
}

export type CalculationMode = 'none' | 'sum' | 'avg' | 'min' | 'max'

export const calculationModeLabels: Record<CalculationMode, string> = {
  none: '',
  sum: '求和',
  avg: '平均值',
  min: '最小值',
  max: '最大值'
}

export type VTableSortOrder = 'asc' | 'desc' | 'normal'

export interface FilterSummaryItem {
  key: string
  label: string
  valuesText: string
}
